import { supabaseAdmin } from '@/lib/supabase-admin'
import { getCurrentAppUser, isTeacher } from '@/lib/current-user'
import { logError } from '@/lib/log-error'
import { apiError } from '@/lib/api-error'

// POST /api/lessons — creeaza o lectie intr-un capitol. Doar profesor.
export async function POST(req: Request) {
  const user = await getCurrentAppUser()
  if (!isTeacher(user)) return apiError(403, 'Forbidden')

  const body = await req.json().catch(() => ({}))
  const { chapter_id, title, content, video_url, order_index, published } = body
  if (!chapter_id || !title || typeof title !== 'string') {
    return apiError(400, 'Bad request: chapter_id and title required')
  }

  const { data, error } = await supabaseAdmin
    .from('lessons')
    .insert({
      chapter_id,
      title,
      content: content ?? null,
      video_url: video_url ?? null,
      order_index: Number.isInteger(order_index) ? order_index : 0,
      published: published === true,
    })
    .select()
    .single()

  if (error) {
    // 23503 = foreign key violation (chapter_id inexistent)
    if (error.code === '23503') return apiError(400, 'Bad request: chapter not found')
    await logError('lessons', 'POST error', { code: error.code, message: error.message })
    return apiError(500, 'Database error')
  }
  return Response.json({ lesson: data }, { status: 201 })
}
