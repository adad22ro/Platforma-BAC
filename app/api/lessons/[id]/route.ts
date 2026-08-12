import type { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import type { Database } from '@/types/database'
import { getCurrentAppUser, isTeacher, canAccessPremium } from '@/lib/current-user'
import { logError } from '@/lib/log-error'
import { apiError } from '@/lib/api-error'

// GET /api/lessons/[id] — o lectie. Elevul: doar daca e publicata si are acces la capitol.
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const user = await getCurrentAppUser()

  const { data: lesson, error } = await supabaseAdmin
    .from('lessons')
    .select('id, chapter_id, title, content, video_url, order_index, published')
    .eq('id', id)
    .single()

  if (error || !lesson) return apiError(404, 'Not found')

  if (isTeacher(user)) return Response.json({ lesson })

  if (!lesson.published) return apiError(404, 'Not found')

  const { data: chapter } = await supabaseAdmin
    .from('chapters')
    .select('is_free, published')
    .eq('id', lesson.chapter_id)
    .single()

  if (!chapter || !chapter.published) return apiError(404, 'Not found')
  if (!chapter.is_free && !canAccessPremium(user)) {
    return Response.json({ error: 'premium_required' }, { status: 402 })
  }

  return Response.json({ lesson })
}

// PATCH /api/lessons/[id] — actualizeaza. Doar profesor.
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const user = await getCurrentAppUser()
  if (!isTeacher(user)) return apiError(403, 'Forbidden')

  const body = await req.json().catch(() => ({}))
  const fields: Database['public']['Tables']['lessons']['Update'] = {}
  for (const k of ['title', 'content', 'video_url', 'order_index', 'published'] as const) {
    if (k in body) (fields as Record<string, unknown>)[k] = body[k]
  }
  if (Object.keys(fields).length === 0) {
    return apiError(400, 'Bad request: nothing to update')
  }

  const { data, error } = await supabaseAdmin
    .from('lessons')
    .update(fields)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    await logError('lessons', 'PATCH error', { code: error.code, message: error.message, id })
    return apiError(500, 'Database error')
  }
  if (!data) return apiError(404, 'Not found')
  return Response.json({ lesson: data })
}

// DELETE /api/lessons/[id] — sterge. Doar profesor.
export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const user = await getCurrentAppUser()
  if (!isTeacher(user)) return apiError(403, 'Forbidden')

  const { error } = await supabaseAdmin.from('lessons').delete().eq('id', id)
  if (error) {
    await logError('lessons', 'DELETE error', { code: error.code, message: error.message, id })
    return apiError(500, 'Database error')
  }
  return new Response(null, { status: 204 })
}
