import { supabaseAdmin } from '@/lib/supabase-admin'
import { getCurrentAppUser, isTeacher } from '@/lib/current-user'
import { checkChapterAccess, accessErrorResponse } from '@/lib/chapter-access'
import { logError } from '@/lib/log-error'

const MAX_MESSAGE = 2000
const MAX_SELECTION = 1000

// GET /api/tickets — lista tichetelor.
// Elev: doar ale lui. Profesor: toate (filtrabil prin ?status=, ?chapter_id=,
// ?lesson_id=), ordonate dupa ultima activitate — coada de lucru, nu arhiva.
export async function GET(req: Request) {
  const user = await getCurrentAppUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const url = new URL(req.url)
  const status = url.searchParams.get('status')
  const chapterId = url.searchParams.get('chapter_id')
  const lessonId = url.searchParams.get('lesson_id')

  let query = supabaseAdmin
    .from('tickets')
    .select('id, user_id, chapter_id, lesson_id, lesson_title, message, selection, scroll_percent, progress_score, progress_total, progress_attempts, status, created_at, last_message_at')
    .order('last_message_at', { ascending: false })

  // Elevul e legat de propriile tichete indiferent ce trimite in query string.
  if (!isTeacher(user)) query = query.eq('user_id', user.id)

  if (status) query = query.eq('status', status)
  if (chapterId) query = query.eq('chapter_id', chapterId)
  if (lessonId) query = query.eq('lesson_id', lessonId)

  const { data, error } = await query
  if (error) {
    await logError('tickets', 'GET error', { code: error.code, message: error.message })
    return new Response('Database error', { status: 500 })
  }
  return Response.json({ tickets: data ?? [] })
}

// POST /api/tickets — elevul deschide un tichet DIN fereastra lectiei.
//
// `lesson_id` e obligatoriu: tichetele exista doar in contextul unei lectii.
// Tot contextul pe care il vede profesorul (titlu lectie, capitol, progres la test)
// se citeste pe SERVER din DB — clientul trimite doar ce nu are de unde sti serverul:
// pozitia in pagina si fragmentul selectat.
export async function POST(req: Request) {
  const user = await getCurrentAppUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const body = await req.json().catch(() => ({}))
  const message = typeof body?.message === 'string' ? body.message.trim() : ''
  const lessonId = typeof body?.lesson_id === 'string' ? body.lesson_id : ''

  if (!lessonId) return new Response('Bad request: lesson_id required', { status: 400 })
  if (!message) return new Response('Bad request: message required', { status: 400 })
  if (message.length > MAX_MESSAGE) {
    return new Response(`Bad request: message too long (max ${MAX_MESSAGE})`, { status: 400 })
  }

  const selection =
    typeof body?.selection === 'string' ? body.selection.trim().slice(0, MAX_SELECTION) : null

  const rawPercent = body?.scroll_percent
  const scrollPercent =
    Number.isFinite(rawPercent) && rawPercent >= 0 && rawPercent <= 100
      ? Math.round(rawPercent as number)
      : null

  // Lectia si capitolul vin din DB, nu din ce declara clientul.
  const { data: lesson } = await supabaseAdmin
    .from('lessons')
    .select('id, chapter_id, title')
    .eq('id', lessonId)
    .single()

  if (!lesson) return new Response('Bad request: lesson not found', { status: 400 })

  // Nu se pot pune intrebari despre continut la care nu ai acces (capitol draft sau
  // premium fara abonament) — altfel tichetul devine o cale laterala de a afla ce e acolo.
  const access = await checkChapterAccess(lesson.chapter_id, user)
  if (!access.ok) return accessErrorResponse(access.status)

  // Progresul la testul capitolului, INGHETAT la momentul intrebarii: profesorul
  // trebuie sa vada cum statea elevul cand a intrebat, nu cum sta cand citeste.
  const { data: progress } = await supabaseAdmin
    .from('student_progress')
    .select('score, total, attempts')
    .eq('user_id', user.id)
    .eq('chapter_id', lesson.chapter_id)
    .maybeSingle()

  const now = new Date().toISOString()
  const { data: ticket, error } = await supabaseAdmin
    .from('tickets')
    .insert({
      user_id: user.id,
      chapter_id: lesson.chapter_id,
      lesson_id: lesson.id,
      lesson_title: lesson.title,
      message,
      selection,
      scroll_percent: scrollPercent,
      progress_score: progress?.score ?? null,
      progress_total: progress?.total ?? null,
      progress_attempts: progress?.attempts ?? null,
      status: 'open',
      last_message_at: now,
    })
    .select()
    .single()

  if (error || !ticket) {
    await logError('tickets', 'POST error', { code: error?.code, message: error?.message })
    return new Response('Database error', { status: 500 })
  }

  // Mesajul initial al elevului e primul mesaj din fir — `tickets.message` ramane
  // doar ca rezumat pentru liste, ca sa nu cerem firul la fiecare randare.
  const { error: mErr } = await supabaseAdmin.from('ticket_messages').insert({
    ticket_id: ticket.id,
    author_id: user.id,
    author_role: 'student',
    body: message,
    created_at: now,
  })

  if (mErr) {
    await supabaseAdmin.from('tickets').delete().eq('id', ticket.id)
    await logError('tickets', 'POST first message error', { code: mErr.code, message: mErr.message })
    return new Response('Database error', { status: 500 })
  }

  return Response.json({ ticket }, { status: 201 })
}
