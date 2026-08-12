import type { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import type { Database } from '@/types/database'
import { getCurrentAppUser, isTeacher } from '@/lib/current-user'
import { logError } from '@/lib/log-error'
import { apiError } from '@/lib/api-error'

// GET /api/chapters/[id] — un capitol. Elevul vede doar capitole publicate.
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const user = await getCurrentAppUser()

  const { data, error } = await supabaseAdmin
    .from('chapters')
    .select('id, title, description, order_index, is_free, published')
    .eq('id', id)
    .single()

  if (error || !data) return apiError(404, 'Not found')
  if (!isTeacher(user) && !data.published) return apiError(404, 'Not found')

  return Response.json({ chapter: data })
}

// PATCH /api/chapters/[id] — actualizeaza. Doar profesor.
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const user = await getCurrentAppUser()
  if (!isTeacher(user)) return apiError(403, 'Forbidden')

  const body = await req.json().catch(() => ({}))
  const fields: Database['public']['Tables']['chapters']['Update'] = {}
  for (const k of ['title', 'description', 'order_index', 'is_free', 'published'] as const) {
    if (k in body) (fields as Record<string, unknown>)[k] = body[k]
  }
  if (Object.keys(fields).length === 0) {
    return apiError(400, 'Bad request: nothing to update')
  }

  const { data, error } = await supabaseAdmin
    .from('chapters')
    .update(fields)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    await logError('chapters', 'PATCH error', { code: error.code, message: error.message, id })
    return apiError(500, 'Database error')
  }
  if (!data) return apiError(404, 'Not found')
  return Response.json({ chapter: data })
}

// DELETE /api/chapters/[id] — sterge (lectiile cad prin ON DELETE CASCADE). Doar profesor.
export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const user = await getCurrentAppUser()
  if (!isTeacher(user)) return apiError(403, 'Forbidden')

  const { error } = await supabaseAdmin.from('chapters').delete().eq('id', id)
  if (error) {
    await logError('chapters', 'DELETE error', { code: error.code, message: error.message, id })
    return apiError(500, 'Database error')
  }
  return new Response(null, { status: 204 })
}
