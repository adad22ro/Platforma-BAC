import { supabaseAdmin } from '@/lib/supabase-admin'
import { getCurrentAppUser, poateCorecta } from '@/lib/current-user'
import { checkChapterAccess, accessErrorResponse } from '@/lib/chapter-access'
import { logError } from '@/lib/log-error'
import { apiError } from '@/lib/api-error'
import {
  eIntarziat,
  expirareRezervare,
  ultimulMentorAlElevului,
} from '@/lib/alocare-tichete'
import { citestePaginarea, taiePagina } from '@/lib/paginare'

const MAX_MESSAGE = 2000
const MAX_SELECTION = 1000

const CAMPURI_TICHET =
  'id, user_id, chapter_id, lesson_id, lesson_title, message, selection, scroll_percent, progress_score, progress_total, progress_attempts, status, created_at, last_message_at, mentor_rezervat_id, rezervat_pana, preluat_la'

// GET /api/tickets — lista tichetelor.
// Elev: doar ale lui. Profesor: toate (filtrabil prin ?status=, ?chapter_id=,
// ?lesson_id=), ordonate dupa ultima activitate — coada de lucru, nu arhiva.
//
// Pentru corectori raspunsul contine, PE LANGA `tickets`, doua liste: `alemele`
// (rezervate pentru mine si inca valabile, sau preluate de mine) si `pool`
// (nerevendicate). Toate trei sunt paginate independent, cu ?limit= si ?offset=.
//
// Cele doua liste se cer acum din DB, nu se filtreaza in JS peste tot tabelul.
// Filtrarea in memorie era corecta doar cat timp raspunsul continea TOATE tichetele:
// pe o pagina de 50, un `pool` derivat din ea ar fi fost „ce s-a nimerit in primele
// 50 dupa ultima activitate", adica o lista falsa, nu o coada.
export async function GET(req: Request) {
  const user = await getCurrentAppUser()
  if (!user) return apiError(401, 'Unauthorized')

  const url = new URL(req.url)
  const status = url.searchParams.get('status')
  const chapterId = url.searchParams.get('chapter_id')
  const lessonId = url.searchParams.get('lesson_id')
  const p = citestePaginarea(url)

  // Filtrele din query string, aplicate la fel pe toate cele trei liste.
  const filtre = (q: ReturnType<typeof cerereTichete>) => {
    if (status) q = q.eq('status', status)
    if (chapterId) q = q.eq('chapter_id', chapterId)
    if (lessonId) q = q.eq('lesson_id', lessonId)
    return q
  }

  let query = filtre(cerereTichete()).order('last_message_at', { ascending: false })

  // Elevul e legat de propriile tichete indiferent ce trimite in query string.
  // Profesorii si mentorii vad toate tichetele; elevul, doar pe ale lui.
  if (!poateCorecta(user)) query = query.eq('user_id', user.id)

  const { data, error } = await query.range(p.offset, p.rangeTo)
  if (error) {
    await logError('tickets', 'GET error', { code: error.code, message: error.message })
    return apiError(500, 'Database error')
  }

  const acum = new Date()
  const { pagina, meta } = taiePagina(data ?? [], p)
  const tickets = pagina.map((t) => ({ ...t, intarziat: eIntarziat(t, acum) }))

  if (!poateCorecta(user)) return Response.json({ tickets, meta })

  const acumIso = acum.toISOString()

  // „Ale mele": rezervate pentru mine si inca valabile, sau preluate de mine.
  const cereAleMele = filtre(cerereTichete())
    .eq('mentor_rezervat_id', user.id)
    .or(`preluat_la.not.is.null,rezervat_pana.gt.${acumIso}`)
    .order('last_message_at', { ascending: false })
    .range(p.offset, p.rangeTo)

  // Pool: nepreluate, fara rezervare valabila, si care nu sunt inchise.
  //
  // Ordonarea dupa `created_at` crescator e suficienta si pentru cerinta
  // „intarziatele in cap": intarziat inseamna exact „mai vechi de 24 de ore", deci
  // e o functie monotona de created_at. Sortarea pe doua chei pe care o scrisesem
  // producea aceeasi ordine cu mai multa munca — si nu mai era exprimabila in SQL.
  const cerePool = filtre(cerereTichete())
    .is('preluat_la', null)
    .neq('status', 'closed')
    .or(`mentor_rezervat_id.is.null,rezervat_pana.is.null,rezervat_pana.lte.${acumIso}`)
    .order('created_at', { ascending: true })
    .range(p.offset, p.rangeTo)

  const [rAleMele, rPool] = await Promise.all([cereAleMele, cerePool])

  if (rAleMele.error || rPool.error) {
    await logError('tickets', 'GET liste error', {
      alemele: rAleMele.error?.message,
      pool: rPool.error?.message,
    })
    return apiError(500, 'Database error')
  }

  const aleMele = taiePagina(rAleMele.data ?? [], p)
  const pool = taiePagina(rPool.data ?? [], p)

  return Response.json({
    tickets,
    meta,
    alemele: aleMele.pagina.map((t) => ({ ...t, intarziat: eIntarziat(t, acum) })),
    alemele_meta: aleMele.meta,
    pool: pool.pagina.map((t) => ({ ...t, intarziat: eIntarziat(t, acum) })),
    pool_meta: pool.meta,
  })
}

// Selectul comun celor trei liste. Un singur literal, fara concatenare: Supabase
// deduce tipul randului din textul selectului, iar `a + b` il face `string`.
function cerereTichete() {
  return supabaseAdmin.from('tickets').select(CAMPURI_TICHET)
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
