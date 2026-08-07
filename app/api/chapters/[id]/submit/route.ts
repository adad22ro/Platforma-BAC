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

  const { data: correctAnswers, error: aErr } = await supabaseAdmin
    .from('answers')
    .select('id, question_id')
    .eq('is_correct', true)
    .in(
      'question_id',
      questions.map((q) => q.id)
    )

  if (aErr) {
    await logError('questions', 'submit answers error', { code: aErr.code, message: aErr.message, id })
    return new Response('Database error', { status: 500 })
  }

  const correctByQuestion = new Map((correctAnswers ?? []).map((a) => [a.question_id, a.id]))

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
    }
  })

  const score = results.filter((r) => r.correct).length
  const total = questions.length

  // Profesorul poate rula testul ca sa-l verifice, dar nu-i inregistram progres.
  if (access.teacher) return Response.json({ score, total, results, saved: false })

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
