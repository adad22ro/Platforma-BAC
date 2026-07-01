import type { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getCurrentAppUser, isTeacher, canAccessPremium } from '@/lib/current-user'
import { logError } from '@/lib/log-error'

// GET /api/lessons/[id] — o lectie. Elevul: doar daca e publicata si are acces la capitol.
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const user = await getCurrentAppUser()

  const { data: lesson, error } = await supabaseAdmin
    .from('lessons')
    .select('id, chapter_id, title, content, video_url, order_index, published')
    .eq('id', id)
    .single()

  if (error || !lesson) return new Response('Not found', { status: 404 })

  if (isTeacher(user)) return Response.json({ lesson })

  if (!lesson.published) return new Response('Not found', { status: 404 })

  const { data: chapter } = await supabaseAdmin
    .from('chapters')
    .select('is_free, published')
    .eq('id', lesson.chapter_id)
    .single()

  if (!chapter || !chapter.published) return new Response('Not found', { status: 404 })
  if (!chapter.is_free && !canAccessPremium(user)) {
    return Response.json({ error: 'premium_required' }, { status: 402 })
  }

  return Response.json({ lesson })
}

// PATCH /api/lessons/[id] — actualizeaza. Doar profesor.
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const user = await getCurrentAppUser()
  if (!isTeacher(user)) return new Response('Forbidden', { status: 403 })

  const body = await req.json().catch(() => ({}))
  const fields: Record<string, unknown> = {}
  for (const k of ['title', 'content', 'video_url', 'order_index', 'published'] as const) {
    if (k in body) fields[k] = body[k]
  }
  if (Object.keys(fields).length === 0) {
    return new Response('Bad request: nothing to update', { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('lessons')
    .update(fields)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    await logError('lessons', 'PATCH error', { code: error.code, message: error.message, id })
    return new Response('Database error', { status: 500 })
  }
  if (!data) return new Response('Not found', { status: 404 })
  return Response.json({ lesson: data })
}

// DELETE /api/lessons/[id] — sterge. Doar profesor.
export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const user = await getCurrentAppUser()
  if (!isTeacher(user)) return new Response('Forbidden', { status: 403 })

  const { error } = await supabaseAdmin.from('lessons').delete().eq('id', id)
  if (error) {
    await logError('lessons', 'DELETE error', { code: error.code, message: error.message, id })
    return new Response('Database error', { status: 500 })
  }
  return new Response(null, { status: 204 })
}
