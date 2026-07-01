import type { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getCurrentAppUser, isTeacher } from '@/lib/current-user'
import { logError } from '@/lib/log-error'

// GET /api/chapters/[id] — un capitol. Elevul vede doar capitole publicate.
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const user = await getCurrentAppUser()

  const { data, error } = await supabaseAdmin
    .from('chapters')
    .select('id, title, description, order_index, is_free, published')
    .eq('id', id)
    .single()

  if (error || !data) return new Response('Not found', { status: 404 })
  if (!isTeacher(user) && !data.published) return new Response('Not found', { status: 404 })

  return Response.json({ chapter: data })
}

// PATCH /api/chapters/[id] — actualizeaza. Doar profesor.
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const user = await getCurrentAppUser()
  if (!isTeacher(user)) return new Response('Forbidden', { status: 403 })

  const body = await req.json().catch(() => ({}))
  const fields: Record<string, unknown> = {}
  for (const k of ['title', 'description', 'order_index', 'is_free', 'published'] as const) {
    if (k in body) fields[k] = body[k]
  }
  if (Object.keys(fields).length === 0) {
    return new Response('Bad request: nothing to update', { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('chapters')
    .update(fields)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    await logError('chapters', 'PATCH error', { code: error.code, message: error.message, id })
    return new Response('Database error', { status: 500 })
  }
  if (!data) return new Response('Not found', { status: 404 })
  return Response.json({ chapter: data })
}

// DELETE /api/chapters/[id] — sterge (lectiile cad prin ON DELETE CASCADE). Doar profesor.
export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const user = await getCurrentAppUser()
  if (!isTeacher(user)) return new Response('Forbidden', { status: 403 })

  const { error } = await supabaseAdmin.from('chapters').delete().eq('id', id)
  if (error) {
    await logError('chapters', 'DELETE error', { code: error.code, message: error.message, id })
    return new Response('Database error', { status: 500 })
  }
  return new Response(null, { status: 204 })
}
