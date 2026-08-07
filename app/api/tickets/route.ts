import { supabaseAdmin } from '@/lib/supabase-admin'
import { getCurrentAppUser, isTeacher } from '@/lib/current-user'
import { checkChapterAccess, accessErrorResponse } from '@/lib/chapter-access'
import { logError } from '@/lib/log-error'

const MAX_MESSAGE = 2000

// GET /api/tickets — lista tichetelor.
// Elev: doar ale lui. Profesor: toate (filtrabil prin ?status= si ?chapter_id=,
// ca sa poata lucra pe coada de "open" si grupat pe capitol).
export async function GET(req: Request) {
  const user = await getCurrentAppUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const url = new URL(req.url)
  const status = url.searchParams.get('status')
  const chapterId = url.searchParams.get('chapter_id')

  let query = supabaseAdmin
    .from('tickets')
    .select('id, user_id, chapter_id, lesson_id, message, status, answer, answered_at, created_at')
    .order('created_at', { ascending: false })

  // Elevul e legat de propriile tichete indiferent ce trimite in query string.
  if (!isTeacher(user)) query = query.eq('user_id', user.id)

  if (status) query = query.eq('status', status)
  if (chapterId) query = query.eq('chapter_id', chapterId)

  const { data, error } = await query
  if (error) {
    await logError('tickets', 'GET error', { code: error.code, message: error.message })
    return new Response('Database error', { status: 500 })
  }
  return Response.json({ tickets: data ?? [] })
}

// POST /api/tickets — elevul trimite o intrebare, cu contextul din pagina.
// Contextul (lesson_id / chapter_id) e optional, dar daca vine o lectie ii derivam
// capitolul din DB — nu ne bazam pe ce spune clientul despre unde se afla.
export async function POST(req: Request) {
  const user = await getCurrentAppUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const body = await req.json().catch(() => ({}))
  const message = typeof body?.message === 'string' ? body.message.trim() : ''
  if (!message) return new Response('Bad request: message required', { status: 400 })
  if (message.length > MAX_MESSAGE) {
    return new Response(`Bad request: message too long (max ${MAX_MESSAGE})`, { status: 400 })
  }

  const lessonId: string | null = typeof body?.lesson_id === 'string' ? body.lesson_id : null
  let chapterId: string | null = typeof body?.chapter_id === 'string' ? body.chapter_id : null

  if (lessonId) {
    const { data: lesson } = await supabaseAdmin
      .from('lessons')
      .select('id, chapter_id')
      .eq('id', lessonId)
      .single()

    if (!lesson) return new Response('Bad request: lesson not found', { status: 400 })
    chapterId = lesson.chapter_id
  }

  // Nu se pot pune intrebari despre continut la care nu ai acces (capitol draft sau
  // premium fara abonament) — altfel tichetul devine o cale laterala de a afla ce e acolo.
  if (chapterId) {
    const access = await checkChapterAccess(chapterId, user)
    if (!access.ok) return accessErrorResponse(access.status)
  }

  const { data, error } = await supabaseAdmin
    .from('tickets')
    .insert({
      user_id: user.id,
      chapter_id: chapterId,
      lesson_id: lessonId,
      message,
      status: 'open',
    })
    .select()
    .single()

  if (error) {
    await logError('tickets', 'POST error', { code: error.code, message: error.message })
    return new Response('Database error', { status: 500 })
  }
  return Response.json({ ticket: data }, { status: 201 })
}
