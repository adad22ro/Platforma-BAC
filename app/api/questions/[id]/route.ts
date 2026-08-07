import type { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import type { Database } from '@/types/database'
import { getCurrentAppUser, isTeacher } from '@/lib/current-user'
import { logError } from '@/lib/log-error'

// GET /api/questions/[id] — intrebarea cu variantele ei, INCLUSIV is_correct.
// Doar profesor: elevul primeste testul (fara raspunsuri) din
// GET /api/chapters/[id]/questions.
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const user = await getCurrentAppUser()
  if (!isTeacher(user)) return new Response('Forbidden', { status: 403 })

  const { data: question, error } = await supabaseAdmin
    .from('questions')
    .select('id, chapter_id, text, explanation, order_index, published')
    .eq('id', id)
    .single()

  if (error || !question) return new Response('Not found', { status: 404 })

  const { data: answers } = await supabaseAdmin
    .from('answers')
    .select('id, question_id, text, is_correct, order_index')
    .eq('question_id', id)
    .order('order_index', { ascending: true })

  return Response.json({ question: { ...question, answers: answers ?? [] } })
}

// PATCH /api/questions/[id] — actualizeaza enuntul/metadatele. Doar profesor.
// Variantele se inlocuiesc separat (PUT pe /api/questions/[id]/answers, cand va fi
// nevoie) — aici nu le atingem, ca sa nu stricam invariantul "exact una corecta".
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const user = await getCurrentAppUser()
  if (!isTeacher(user)) return new Response('Forbidden', { status: 403 })

  const body = await req.json().catch(() => ({}))
  const fields: Database['public']['Tables']['questions']['Update'] = {}
  for (const k of ['text', 'explanation', 'order_index', 'published'] as const) {
    if (k in body) (fields as Record<string, unknown>)[k] = body[k]
  }
  if (Object.keys(fields).length === 0) {
    return new Response('Bad request: nothing to update', { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('questions')
    .update(fields)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    await logError('questions', 'PATCH error', { code: error.code, message: error.message, id })
    return new Response('Database error', { status: 500 })
  }
  if (!data) return new Response('Not found', { status: 404 })
  return Response.json({ question: data })
}

// DELETE /api/questions/[id] — sterge intrebarea (variantele cad prin CASCADE). Doar profesor.
export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const user = await getCurrentAppUser()
  if (!isTeacher(user)) return new Response('Forbidden', { status: 403 })

  const { error } = await supabaseAdmin.from('questions').delete().eq('id', id)
  if (error) {
    await logError('questions', 'DELETE error', { code: error.code, message: error.message, id })
    return new Response('Database error', { status: 500 })
  }
  return new Response(null, { status: 204 })
}
