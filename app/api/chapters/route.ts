import { supabaseAdmin } from '@/lib/supabase-admin'
import { getCurrentAppUser, isTeacher } from '@/lib/current-user'
import { logError } from '@/lib/log-error'
import { apiError } from '@/lib/api-error'

// GET /api/chapters — lista capitolelor.
// Profesor: toate (inclusiv draft). Elev: doar publicate.
export async function GET() {
  const user = await getCurrentAppUser()

  let query = supabaseAdmin
    .from('chapters')
    .select('id, title, description, order_index, is_free, published')
    .order('order_index', { ascending: true })

  if (!isTeacher(user)) {
    query = query.eq('published', true)
  }

  const { data, error } = await query
  if (error) {
    await logError('chapters', 'GET error', { code: error.code, message: error.message })
    return apiError(500, 'Database error')
  }
  return Response.json({ chapters: data })
}

// POST /api/chapters — creeaza un capitol. Doar profesor.
export async function POST(req: Request) {
  const user = await getCurrentAppUser()
  if (!isTeacher(user)) return apiError(403, 'Forbidden')

  const body = await req.json().catch(() => ({}))
  const { title, description, order_index, is_free, published } = body
  if (!title || typeof title !== 'string') {
    return apiError(400, 'Bad request: title required')
  }

  const { data, error } = await supabaseAdmin
    .from('chapters')
    .insert({
      title,
      description: description ?? null,
      order_index: Number.isInteger(order_index) ? order_index : 0,
      is_free: is_free === true,
      published: published === true,
    })
    .select()
    .single()

  if (error) {
    await logError('chapters', 'POST error', { code: error.code, message: error.message })
    return apiError(500, 'Database error')
  }
  return Response.json({ chapter: data }, { status: 201 })
}
