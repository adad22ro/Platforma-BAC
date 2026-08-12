import type { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getCurrentAppUser, isTeacher, canAccessPremium } from '@/lib/current-user'
import { logError } from '@/lib/log-error'
import { apiError } from '@/lib/api-error'

// GET /api/chapters/[id]/lessons — lectiile unui capitol.
// Profesor: toate. Elev: doar publicate, si doar daca are acces (capitol free sau abonament activ).
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const user = await getCurrentAppUser()

  const { data: chapter, error: chErr } = await supabaseAdmin
    .from('chapters')
    .select('id, is_free, published')
    .eq('id', id)
    .single()

  if (chErr || !chapter) return apiError(404, 'Not found')

  const teacher = isTeacher(user)
  if (!teacher && !chapter.published) return apiError(404, 'Not found')

  let query = supabaseAdmin
    .from('lessons')
    .select('id, chapter_id, title, content, video_url, order_index, published')
    .eq('chapter_id', id)
    .order('order_index', { ascending: true })

  if (!teacher) query = query.eq('published', true)

  const { data, error } = await query
  if (error) {
    await logError('lessons', 'GET by chapter error', { code: error.code, message: error.message, id })
    return apiError(500, 'Database error')
  }

  // Gating premium: userul free vede lista de titluri, dar la capitol platit fara
  // acces continutul (text/video) e ascuns si lectia e marcata `locked`. Paywall-ul
  // real (mesaj + buton upgrade) e pe GET /api/lessons/[id].
  const locked = !teacher && !chapter.is_free && !canAccessPremium(user)
  const lessons = (data ?? []).map((l) => ({
    ...l,
    content: locked ? null : l.content,
    video_url: locked ? null : l.video_url,
    locked,
  }))

  return Response.json({ lessons })
}
