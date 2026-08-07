import { supabaseAdmin } from '@/lib/supabase-admin'
import { getCurrentAppUser, isTeacher } from '@/lib/current-user'
import { logError } from '@/lib/log-error'

type AnswerInput = { text?: unknown; is_correct?: unknown; order_index?: unknown }

// Validare variante: minim 2, exact una corecta. Indexul unic partial din DB
// garanteaza "cel mult una"; "cel putin una" se poate exprima doar aici.
export function validateAnswers(input: unknown): { error: string } | { answers: AnswerInput[] } {
  if (!Array.isArray(input) || input.length < 2) {
    return { error: 'answers must be an array of at least 2' }
  }
  const correct = input.filter((a: AnswerInput) => a?.is_correct === true).length
  if (correct !== 1) return { error: 'exactly one answer must be correct' }
  if (input.some((a: AnswerInput) => !a?.text || typeof a.text !== 'string')) {
    return { error: 'each answer needs a text' }
  }
  return { answers: input as AnswerInput[] }
}

// POST /api/questions — creeaza o intrebare CU variantele ei. Doar profesor.
// Intrebarea si variantele se creeaza impreuna: o intrebare fara variante nu e
// utila si ar strica testul, deci daca variantele esueaza stergem si intrebarea.
export async function POST(req: Request) {
  const user = await getCurrentAppUser()
  if (!isTeacher(user)) return new Response('Forbidden', { status: 403 })

  const body = await req.json().catch(() => ({}))
  const { chapter_id, text, explanation, order_index, published, answers } = body
  if (!chapter_id || !text || typeof text !== 'string') {
    return new Response('Bad request: chapter_id and text required', { status: 400 })
  }

  const validated = validateAnswers(answers)
  if ('error' in validated) {
    return new Response(`Bad request: ${validated.error}`, { status: 400 })
  }

  const { data: question, error } = await supabaseAdmin
    .from('questions')
    .insert({
      chapter_id,
      text,
      explanation: explanation ?? null,
      order_index: Number.isInteger(order_index) ? order_index : 0,
      published: published === true,
    })
    .select()
    .single()

  if (error || !question) {
    // 23503 = foreign key violation (chapter_id inexistent)
    if (error?.code === '23503') return new Response('Bad request: chapter not found', { status: 400 })
    await logError('questions', 'POST error', { code: error?.code, message: error?.message })
    return new Response('Database error', { status: 500 })
  }

  const rows = validated.answers.map((a, i) => ({
    question_id: question.id,
    text: a.text as string,
    is_correct: a.is_correct === true,
    order_index: Number.isInteger(a.order_index) ? (a.order_index as number) : i,
  }))

  const { data: created, error: aErr } = await supabaseAdmin.from('answers').insert(rows).select()
  if (aErr) {
    await supabaseAdmin.from('questions').delete().eq('id', question.id)
    await logError('questions', 'POST answers error', { code: aErr.code, message: aErr.message })
    return new Response('Database error', { status: 500 })
  }

  return Response.json({ question: { ...question, answers: created } }, { status: 201 })
}
