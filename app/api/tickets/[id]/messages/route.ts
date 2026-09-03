import type { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getCurrentAppUser, poateCorecta, rolInFir } from '@/lib/current-user'
import { logError } from '@/lib/log-error'
import { apiError } from '@/lib/api-error'
import { trimiteEmail, escapeHtml } from '@/lib/email'

const MAX_BODY = 5000

// POST /api/tickets/[id]/messages — adauga un mesaj in fir.
// Participanti: autorul tichetului si profesorii. Oricine altcineva primeste 404
// (nu 403) — nu confirmam ca tichetul exista.
//
// Statusul urmeaza ultimul vorbitor: raspunsul profesorului inchide asteptarea
// (`answered`), o revenire a elevului o redeschide (`open`) si tichetul reintra in
// coada profesorului. Un tichet `closed` ramane inchis pana il redeschide cineva
// explicit — de asta se ocupa un PATCH viitor, cand va exista UI pentru inchidere.
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const user = await getCurrentAppUser()
  if (!user) return apiError(401, 'Unauthorized')

  const payload = await req.json().catch(() => ({}))
  const body = typeof payload?.body === 'string' ? payload.body.trim() : ''
  if (!body) return apiError(400, 'Bad request: body required')
  if (body.length > MAX_BODY) {
    return apiError(400, `Bad request: body too long (max ${MAX_BODY})`)
  }

  const { data: ticket } = await supabaseAdmin
    .from('tickets')
    .select('id, user_id, status, lesson_title')
    .eq('id', id)
    .single()

  if (!ticket) return apiError(404, 'Not found')

  const corector = poateCorecta(user)
  if (!corector && ticket.user_id !== user.id) return apiError(404, 'Not found')

  const now = new Date().toISOString()
  const { data: message, error } = await supabaseAdmin
    .from('ticket_messages')
    .insert({
      ticket_id: id,
      author_id: user.id,
      // Rolul se ingheata la momentul scrierii — vezi migrarea.
      author_role: rolInFir(user),
      body,
      created_at: now,
    })
    .select()
    .single()

  if (error) {
    await logError('tickets', 'POST message error', { code: error.code, message: error.message, id })
    return apiError(500, 'Database error')
  }

  const { error: tErr } = await supabaseAdmin
    .from('tickets')
    .update({
      status: corector ? 'answered' : 'open',
      last_message_at: now,
      updated_at: now,
    })
    .eq('id', id)

  if (tErr) {
    // Mesajul e deja in fir si vizibil; nu-l pierdem pentru ca metadatele
    // tichetului n-au apucat sa se actualizeze. Logam si mergem mai departe.
    await logError('tickets', 'message status update error', {
      code: tErr.code,
      message: tErr.message,
      id,
    })
  }

  // Notificarea pe email catre elev, cand raspunde un corector.
  //
  // Ordinea conteaza: mesajul e DEJA in DB in acest punct. `trimiteEmail` nu arunca
  // niciodata — intoarce un rezultat — tocmai ca un email nelivrat sa nu piarda
  // munca profesorului. Daca serviciul nu e configurat, nu se logheaza nimic: e o
  // stare asteptata, nu o eroare.
  if (corector) {
    // `try` in plus peste promisiunea lui `trimiteEmail` ca nu arunca: aici mai e
    // si o interogare in `users`, iar contractul functiei se poate schimba fara ca
    // cineva sa se uite inapoi la acest apel. Un efect secundar nu are voie sa
    // darame o ruta care si-a facut deja treaba.
    try {
      await notificaElevul(ticket.user_id, id, ticket.lesson_title, body)
    } catch (err) {
      await logError('tickets', 'Notificarea pe email a esuat', {
        id,
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }

  return Response.json({ message }, { status: 201 })
}

// Trimite elevului un email ca are raspuns. Esecurile se logheaza si se inghit:
// apelantul a terminat deja treaba importanta.
//
// NU punem raspunsul intreg in email, ci doar inceputul. Doua motive: raspunsul
// unui profesor contine adesea corectura personala a elevului, iar emailul e un
// canal pe care nu-l controlam — ajunge pe telefonul familiei, in inbox-uri
// partajate. Si, practic, vrem ca elevul sa revina in aplicatie, unde vede firul
// intreg si poate raspunde.
async function notificaElevul(
  userId: string,
  ticketId: string,
  lesson_title: string | null,
  raspuns: string
): Promise<void> {
  const { data: elev } = await supabaseAdmin
    .from('users')
    .select('email, full_name')
    .eq('id', userId)
    .single()

  if (!elev?.email) {
    await logError('tickets', 'Elev fara email la notificare', { ticketId })
    return
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
  const link = `${appUrl}/intrebari?tichet=${ticketId}`
  const despre = lesson_title ? `intrebarea ta despre „${lesson_title}"` : 'intrebarea ta'
  const prenume = elev.full_name?.split(' ')[0]
  const salut = prenume ? `Salut, ${prenume}!` : 'Salut!'

  const fragment = raspuns.length > 200 ? raspuns.slice(0, 200) + '…' : raspuns

  await trimiteEmail({
    catre: elev.email,
    subiect: `Ai primit raspuns la ${despre}`,
    text: `${salut}

Ai primit un raspuns la ${despre}:

"${fragment}"

Citeste raspunsul intreg si continua discutia aici:
${link}

Platforma BAC`,
    html: `<p>${escapeHtml(salut)}</p>
<p>Ai primit un raspuns la ${escapeHtml(despre)}:</p>
<blockquote style="margin:0 0 16px;padding:12px 16px;border-left:3px solid #6366f1;background:#f4f4f5;color:#3f3f46">${escapeHtml(fragment)}</blockquote>
<p><a href="${link}" style="display:inline-block;padding:10px 18px;border-radius:9999px;background:#4f46e5;color:#fff;text-decoration:none">Vezi raspunsul intreg</a></p>
<p style="color:#71717a;font-size:13px">Platforma BAC</p>`,
  })
}
