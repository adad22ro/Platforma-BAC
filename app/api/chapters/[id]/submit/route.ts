import type { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getCurrentAppUser } from '@/lib/current-user'
import { checkChapterAccess, accessErrorResponse } from '@/lib/chapter-access'
import { logError } from '@/lib/log-error'
import { apiError } from '@/lib/api-error'
import { reviewConcept, aggregateVerdict } from '@/lib/fsrs'

type Submission = { question_id?: unknown; answer_id?: unknown }

// POST /api/chapters/[id]/submit — corectarea testului.
//
// Clientul trimite DOAR ce a bifat elevul ({ question_id, answer_id }); scorul se
// calculeaza exclusiv aici, din DB. Nu acceptam niciun scor venit de la client si
// nu am expus niciodata `is_correct` inainte de submit.
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const user = await getCurrentAppUser()
  if (!user) return apiError(401, 'Unauthorized')

  const access = await checkChapterAccess(id, user)
  if (!access.ok) return accessErrorResponse(access.status)

  const body = await req.json().catch(() => ({}))
  if (!Array.isArray(body?.answers)) {
    return apiError(400, 'Bad request: answers array required')
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
    return apiError(500, 'Database error')
  }
  if (!questions?.length) {
    return apiError(400, 'Bad request: chapter has no published questions')
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
    return apiError(500, 'Database error')
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

  await updateConceptStates(user.id, results, id)

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

// Actualizeaza starea de repetitie spatiata pentru conceptele atinse de test.
//
// Nu blocheaza raspunsul: daca pica, elevul isi vede scorul, iar starea se poate
// reconstrui din `answer_events`, care e sursa de adevar. Se logheaza insa —
// planificarea recapitularilor devine tacut gresita altfel.
async function updateConceptStates(
  userId: string,
  results: { question_id: string; correct: boolean }[],
  chapterId: string
): Promise<void> {
  const questionIds = results.map((r) => r.question_id)

  const { data: links, error: lErr } = await supabaseAdmin
    .from('question_tags')
    .select('question_id, tag_id')
    .in('question_id', questionIds)

  if (lErr) {
    await logError('fsrs', 'question_tags lookup error', {
      code: lErr.code,
      message: lErr.message,
      chapterId,
    })
    return
  }
  // Intrebari neetichetate inca: nu e o eroare, doar n-avem ce programa.
  if (!links?.length) return

  const correctByQuestion = new Map(results.map((r) => [r.question_id, r.correct]))

  // Un concept atins de mai multe intrebari primeste O SINGURA recenzie — altfel
  // un test cu 5 intrebari pe acelasi concept ar umfla stabilitatea de cinci ori.
  const byTag = new Map<string, boolean[]>()
  for (const l of links) {
    const correct = correctByQuestion.get(l.question_id)
    if (correct === undefined) continue
    byTag.set(l.tag_id, [...(byTag.get(l.tag_id) ?? []), correct])
  }

  const tagIds = [...byTag.keys()]
  const { data: previous, error: pErr } = await supabaseAdmin
    .from('concept_states')
    .select('*')
    .eq('user_id', userId)
    .in('tag_id', tagIds)

  if (pErr) {
    await logError('fsrs', 'concept_states read error', {
      code: pErr.code,
      message: pErr.message,
      chapterId,
    })
    return
  }

  const previousByTag = new Map((previous ?? []).map((s) => [s.tag_id, s]))
  const now = new Date()

  const rows = tagIds.map((tag_id) =>
    reviewConcept({
      user_id: userId,
      tag_id,
      correct: aggregateVerdict(byTag.get(tag_id) ?? []),
      previous: previousByTag.get(tag_id) ?? null,
      now,
    })
  )

  const { error: uErr } = await supabaseAdmin
    .from('concept_states')
    .upsert(rows, { onConflict: 'user_id,tag_id' })

  if (uErr) {
    await logError('fsrs', 'concept_states upsert error', {
      code: uErr.code,
      message: uErr.message,
      chapterId,
    })
  }
}
