import type { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getCurrentAppUser } from '@/lib/current-user'
import { checkChapterAccess, accessErrorResponse } from '@/lib/chapter-access'
import { logError } from '@/lib/log-error'

type Submission = { question_id?: unknown; answer_id?: unknown }

// POST /api/chapters/[id]/submit — corectarea testului.
//
// Clientul trimite DOAR ce a bifat elevul ({ question_id, answer_id }); scorul se
// calculeaza exclusiv aici, din DB. Nu acceptam niciun scor venit de la client si
// nu am expus niciodata `is_correct` inainte de submit.
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const user = await getCurrentAppUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const access = await checkChapterAccess(id, user)
  if (!access.ok) return accessErrorResponse(access.status)

  const body = await req.json().catch(() => ({}))
  if (!Array.isArray(body?.answers)) {
    return new Response('Bad request: answers array required', { status: 400 })
  }

  // Ce a bifat elevul, indexat pe intrebare (ultima bifa castiga).
  const chosen = new Map<string, string>()
  for (const a of body.answers as Submission[]) {
    if (typeof a?.question_id === 'string' && typeof a?.answer_id === 'string') {
      chosen.set(a.question_id, a.answer_id)
    }
  }

  const { data: questions, error: qErr } = await supabaseAdmin
    .from('questions')
    .select('id, explanation, order_index')
    .eq('chapter_id', id)
    .eq('published', true)
    .order('order_index', { ascending: true })

  if (qErr) {
    await logError('questions', 'submit questions error', { code: qErr.code, message: qErr.message, id })
    return new Response('Database error', { status: 500 })
  }
  if (!questions?.length) {
    return new Response('Bad request: chapter has no published questions', { status: 400 })
  }

  // Toate variantele, nu doar cele corecte: ne trebuie si explicatia celei alese
  // de elev. Nimic din ce se citeste aici nu pleaca intreg spre client — vezi mai
  // jos ce se compune in `results`.
  const { data: allAnswers, error: aErr } = await supabaseAdmin
    .from('answers')
    .select('id, question_id, is_correct, explanation')
    .in(
      'question_id',
      questions.map((q) => q.id)
    )

  if (aErr) {
    await logError('questions', 'submit answers error', { code: aErr.code, message: aErr.message, id })
    return new Response('Database error', { status: 500 })
  }

  const correctByQuestion = new Map(
    (allAnswers ?? []).filter((a) => a.is_correct).map((a) => [a.question_id, a.id])
  )
  const explanationByAnswer = new Map((allAnswers ?? []).map((a) => [a.id, a.explanation]))

  const results = questions.map((q) => {
    const correct_answer_id = correctByQuestion.get(q.id) ?? null
    const chosen_answer_id = chosen.get(q.id) ?? null
    return {
      question_id: q.id,
      chosen_answer_id,
      correct_answer_id,
      // Fara raspuns corect in DB (date incomplete) intrebarea nu se poate corecta:
      // o marcam gresita, nu corecta — nu dam puncte pe necunoscut.
      correct: correct_answer_id !== null && chosen_answer_id === correct_answer_id,
      explanation: q.explanation,
      // De ce e gresit exact ce a ales elevul. Doar pentru varianta lui — celelalte
      // explicatii raman pe server, altfel testul devine o cheie de raspunsuri.
      // Se trimite abia acum, dupa ce a raspuns.
      chosen_explanation: chosen_answer_id ? explanationByAnswer.get(chosen_answer_id) ?? null : null,
    }
  })

  const score = results.filter((r) => r.correct).length
  const total = questions.length

  // Profesorul poate rula testul ca sa-l verifice, dar nu-i inregistram progres.
  // Nici evenimente: altfel statisticile de dificultate per intrebare ar contine
  // raspunsurile celui care a scris intrebarile.
  if (access.teacher) return Response.json({ score, total, results, saved: false })

  // Jurnalul de raspunsuri — sursa de adevar. Se scrie INAINTE de progres: daca
  // pica ceva, preferam sa avem evenimentele fara agregat (agregatul se poate
  // reconstrui din ele) decat invers.
  //
  // `attempt_id` leaga raspunsurile dintr-o singura trimitere, ca o incercare sa
  // poata fi reconstituita intreaga.
  const attempt_id = crypto.randomUUID()
  const { error: eErr } = await supabaseAdmin.from('answer_events').insert(
    results.map((r) => ({
      user_id: user.id,
      chapter_id: id,
      question_id: r.question_id,
      chosen_answer_id: r.chosen_answer_id,
      is_correct: r.correct,
      attempt_id,
    }))
  )

  if (eErr) {
    // Nu intoarcem eroare: scorul e corect calculat si elevul are dreptul sa-l
    // vada. Pierdem insa istoricul acestei incercari, iar din el se construiesc
    // „greselile mele" si repetitia — de aceea se logheaza, nu se inghite.
    await logError('progress', 'answer_events insert error', {
      code: eErr.code,
      message: eErr.message,
      id,
      attempt_id,
    })
  }

  const { data: existing } = await supabaseAdmin
    .from('student_progress')
    .select('attempts')
    .eq('user_id', user.id)
    .eq('chapter_id', id)
    .maybeSingle()

  const { error: pErr } = await supabaseAdmin.from('student_progress').upsert(
    {
      user_id: user.id,
      chapter_id: id,
      score,
      total,
      attempts: (existing?.attempts ?? 0) + 1,
      completed_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,chapter_id' }
  )

  if (pErr) {
    await logError('progress', 'upsert error', { code: pErr.code, message: pErr.message, id })
    // Scorul e deja calculat corect; nu ascundem rezultatul elevului pentru o
    // eroare de salvare — semnalam doar ca nu s-a inregistrat progresul.
    return Response.json({ score, total, results, saved: false })
  }

  return Response.json({ score, total, results, saved: true })
}
