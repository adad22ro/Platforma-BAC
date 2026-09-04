import { supabaseAdmin } from '@/lib/supabase-admin'
import { getCurrentAppUser, poateCorecta } from '@/lib/current-user'
import { checkChapterAccess, accessErrorResponse } from '@/lib/chapter-access'
import { logError } from '@/lib/log-error'
import { apiError } from '@/lib/api-error'
import {
  ePool,
  eAlMeu,
  eIntarziat,
  expirareRezervare,
  ultimulMentorAlElevului,
} from '@/lib/alocare-tichete'

const MAX_MESSAGE = 2000
const MAX_SELECTION = 1000

// GET /api/tickets — lista tichetelor.
// Elev: doar ale lui. Profesor: toate (filtrabil prin ?status=, ?chapter_id=,
// ?lesson_id=), ordonate dupa ultima activitate — coada de lucru, nu arhiva.
//
// Pentru corectori raspunsul contine, PE LANGA `tickets`, doua liste derivate:
// `alemele` (rezervate pentru mine si inca valabile, sau preluate de mine) si `pool`
// (nerevendicate, ordonate cu intarziatele in cap). `tickets` ramane neschimbat
// intentionat — e contractul pe care UI-ul existent se sprijina deja, iar noile
// campuri se adauga langa el, nu in locul lui.
export async function GET(req: Request) {
  const user = await getCurrentAppUser()
  if (!user) return apiError(401, 'Unauthorized')

  const url = new URL(req.url)
  const status = url.searchParams.get('status')
  const chapterId = url.searchParams.get('chapter_id')
  const lessonId = url.searchParams.get('lesson_id')

  let query = supabaseAdmin
    .from('tickets')
    .select('id, user_id, chapter_id, lesson_id, lesson_title, message, selection, scroll_percent, progress_score, progress_total, progress_attempts, status, created_at, last_message_at, mentor_rezervat_id, rezervat_pana, preluat_la')
    .order('last_message_at', { ascending: false })

  // Elevul e legat de propriile tichete indiferent ce trimite in query string.
  // Profesorii si mentorii vad toate tichetele; elevul, doar pe ale lui.
  if (!poateCorecta(user)) query = query.eq('user_id', user.id)

  if (status) query = query.eq('status', status)
  if (chapterId) query = query.eq('chapter_id', chapterId)
  if (lessonId) query = query.eq('lesson_id', lessonId)

  const { data, error } = await query
  if (error) {
    await logError('tickets', 'GET error', { code: error.code, message: error.message })
    return apiError(500, 'Database error')
  }

  const tickets = data ?? []
  if (!poateCorecta(user)) return Response.json({ tickets })

  const acum = new Date()
  const cuIntarziere = tickets.map((t) => ({ ...t, intarziat: eIntarziat(t, acum) }))

  const alemele = cuIntarziere.filter((t) => eAlMeu(t, user.id, acum))
  const pool = cuIntarziere
    .filter((t) => ePool(t, acum))
    // Intarziatele in cap, apoi cel mai vechi primul. Pool-ul e o coada FIFO: cine a
    // asteptat cel mai mult are prioritate. Ordinea din `tickets` (ultima activitate
    // intai) e potrivita pentru arhiva, dar ar lasa ultimul exact tichetul uitat.
    .sort((a, b) => {
      if (a.intarziat !== b.intarziat) return a.intarziat ? -1 : 1
      return a.created_at.localeCompare(b.created_at)
    })

  return Response.json({ tickets: cuIntarziere, alemele, pool })
}

// POST /api/tickets — elevul deschide un tichet DIN fereastra lectiei.
//
// `lesson_id` e obligatoriu: tichetele exista doar in contextul unei lectii.
// Tot contextul pe care il vede profesorul (titlu lectie, capitol, progres la test)
// se citeste pe SERVER din DB — clientul trimite doar ce nu are de unde sti serverul:
// pozitia in pagina si fragmentul selectat.
export async function POST(req: Request) {
  const user = await getCurrentAppUser()
  if (!user) return apiError(401, 'Unauthorized')

  const body = await req.json().catch(() => ({}))
  const message = typeof body?.message === 'string' ? body.message.trim() : ''
  const lessonId = typeof body?.lesson_id === 'string' ? body.lesson_id : ''

  if (!lessonId) return apiError(400, 'Bad request: lesson_id required')
  if (!message) return apiError(400, 'Bad request: message required')
  if (message.length > MAX_MESSAGE) {
    return apiError(400, `Bad request: message too long (max ${MAX_MESSAGE})`)
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

  if (!lesson) return apiError(400, 'Bad request: lesson not found')

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

  // Continuitatea, atat cat se poate: tichetul se rezerva pentru ultimul om care i-a
  // raspuns elevului. Daca nu exista niciunul, intra direct in pool — nu inventam un
  // proprietar ca sa avem unul.
  const acum = new Date()
  const now = acum.toISOString()
  const mentor = await ultimulMentorAlElevului(user.id)

  const { data: ticket, error } = await supabaseAdmin
    .from('tickets')
    .insert({
      user_id: user.id,
      mentor_rezervat_id: mentor,
      // Fara mentor nu are sens un termen: n-are cine sa refuze primul.
      rezervat_pana: mentor ? expirareRezervare(acum) : null,
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
    return apiError(500, 'Database error')
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
    return apiError(500, 'Database error')
  }

  return Response.json({ ticket }, { status: 201 })
}
