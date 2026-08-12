import { supabaseAdmin } from '@/lib/supabase-admin'
import { getCurrentAppUser, isTeacher } from '@/lib/current-user'
import { logError } from '@/lib/log-error'
import { apiError } from '@/lib/api-error'

type AnswerInput = {
  text?: unknown
  is_correct?: unknown
  order_index?: unknown
  explanation?: unknown
}

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
  // Explicatia e optionala, dar daca vine trebuie sa fie text — altfel un obiect
  // trimis din greseala ar ajunge in DB si ar fi randat ca "[object Object]".
  if (
    input.some(
      (a: AnswerInput) => a?.explanation != null && typeof a.explanation !== 'string'
    )
  ) {
    return { error: 'answer explanation must be a string' }
  }
  return { answers: input as AnswerInput[] }
}

// Randul de `answers` pentru DB, din varianta validata. Extras aici pentru ca
// POST /api/questions si PUT /api/questions/[id]/answers trebuie sa scrie exact
// aceleasi coloane — altfel una din ele uita explicatia si o pierde tacut.
export function answerRow(a: AnswerInput, i: number, question_id: string) {
  return {
    question_id,
    text: a.text as string,
    is_correct: a.is_correct === true,
    order_index: Number.isInteger(a.order_index) ? (a.order_index as number) : i,
    explanation: (a.explanation as string | undefined) ?? null,
  }
}

// POST /api/questions — creeaza o intrebare CU variantele ei. Doar profesor.
// Intrebarea si variantele se creeaza impreuna: o intrebare fara variante nu e
// utila si ar strica testul, deci daca variantele esueaza stergem si intrebarea.
export async function POST(req: Request) {
  const user = await getCurrentAppUser()
  if (!isTeacher(user)) return apiError(403, 'Forbidden')

  const body = await req.json().catch(() => ({}))
  const { chapter_id, text, explanation, order_index, published, answers } = body
  if (!chapter_id || !text || typeof text !== 'string') {
    return apiError(400, 'Bad request: chapter_id and text required')
  }

  const validated = validateAnswers(answers)
  if ('error' in validated) {
    return apiError(400, `Bad request: ${validated.error}`)
  }

  // Etichetele se dau ca slug-uri si se rezolva la id-uri INAINTE de a scrie ceva.
  // Un slug necunoscut e 400, nu o eticheta creata din mers: vocabularul e inchis
  // tocmai ca sa nu apara duplicate scrise gresit, care ar imparti tacut staparea
  // elevului pe acelasi concept in doua.
  const tagSlugs = Array.isArray(body?.tags) ? body.tags.filter((t: unknown) => typeof t === 'string') : []
  let tagIds: string[] = []
  if (tagSlugs.length) {
    const { data: found, error: tErr } = await supabaseAdmin
      .from('tags')
      .select('id, slug')
      .in('slug', tagSlugs)

    if (tErr) {
      await logError('questions', 'POST tags lookup error', { code: tErr.code, message: tErr.message })
      return apiError(500, 'Database error')
    }

    const known = new Set((found ?? []).map((t) => t.slug))
    const unknown = tagSlugs.filter((s: string) => !known.has(s))
    if (unknown.length) {
      return apiError(400, `Bad request: unknown tags: ${unknown.join(', ')}`)
    }
    tagIds = (found ?? []).map((t) => t.id)
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
    if (error?.code === '23503') return apiError(400, 'Bad request: chapter not found')
    await logError('questions', 'POST error', { code: error?.code, message: error?.message })
    return apiError(500, 'Database error')
  }

  const rows = validated.answers.map((a, i) => answerRow(a, i, question.id))

  const { data: created, error: aErr } = await supabaseAdmin.from('answers').insert(rows).select()
  if (aErr) {
    await supabaseAdmin.from('questions').delete().eq('id', question.id)
    await logError('questions', 'POST answers error', { code: aErr.code, message: aErr.message })
    return apiError(500, 'Database error')
  }

  if (tagIds.length) {
    const { error: qtErr } = await supabaseAdmin
      .from('question_tags')
      .insert(tagIds.map((tag_id) => ({ question_id: question.id, tag_id })))

    if (qtErr) {
      // Intrebarea si variantele sunt deja scrise si sunt valide fara etichete.
      // Nu le stergem pentru atat — dar o intrebare neetichetata e invizibila
      // pentru FSRS si pentru statistica pe concept, deci se logheaza.
      await logError('questions', 'POST question_tags error', {
        code: qtErr.code,
        message: qtErr.message,
        question_id: question.id,
      })
    }
  }

  return Response.json(
    { question: { ...question, answers: created, tags: tagSlugs } },
    { status: 201 }
  )
}
