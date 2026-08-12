import type { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getCurrentAppUser } from '@/lib/current-user'
import { checkChapterAccess, accessErrorResponse } from '@/lib/chapter-access'
import { logError } from '@/lib/log-error'

// GET /api/chapters/[id]/questions — testul grila al unui capitol.
// Profesor: toate intrebarile (inclusiv draft). Elev: doar publicate, si doar cu
// acces la capitol (404 draft / 402 premium).
//
// REGULA: `is_correct` NU pleaca niciodata catre client de aici — nici pentru
// profesor (el are GET /api/questions/[id] pentru asta). Corectarea se face
// server-side, in POST /api/chapters/[id]/submit.
//
// Aceeasi regula pentru `answers.explanation`: un text de forma "varianta asta e
// gresita pentru ca…" dezvaluie raspunsul corect la fel de sigur ca `is_correct`.
// Explicatia variantei alese se intoarce doar din submit, dupa ce elevul a raspuns.
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const user = await getCurrentAppUser()

  const access = await checkChapterAccess(id, user)
  if (!access.ok) return accessErrorResponse(access.status)

  let query = supabaseAdmin
    .from('questions')
    .select('id, chapter_id, text, order_index, published')
    .eq('chapter_id', id)
    .order('order_index', { ascending: true })

  if (!access.teacher) query = query.eq('published', true)

  const { data: questions, error } = await query
  if (error) {
    await logError('questions', 'GET by chapter error', { code: error.code, message: error.message, id })
    return new Response('Database error', { status: 500 })
  }

  if (!questions?.length) return Response.json({ questions: [] })

  const { data: answers, error: aErr } = await supabaseAdmin
    .from('answers')
    // fara is_correct si fara explanation — vezi regula de mai sus
    .select('id, question_id, text, order_index')
    .in(
      'question_id',
      questions.map((q) => q.id)
    )
    .order('order_index', { ascending: true })

  if (aErr) {
    await logError('questions', 'GET answers error', { code: aErr.code, message: aErr.message, id })
    return new Response('Database error', { status: 500 })
  }

  const byQuestion = new Map<string, typeof answers>()
  for (const a of answers ?? []) {
    const list = byQuestion.get(a.question_id) ?? []
    list.push(a)
    byQuestion.set(a.question_id, list)
  }

  return Response.json({
    questions: questions.map((q) => ({ ...q, answers: byQuestion.get(q.id) ?? [] })),
  })
}
