import type { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getCurrentAppUser, isTeacher } from '@/lib/current-user'
import { logError } from '@/lib/log-error'

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
  if (!user) return new Response('Unauthorized', { status: 401 })

  const payload = await req.json().catch(() => ({}))
  const body = typeof payload?.body === 'string' ? payload.body.trim() : ''
  if (!body) return new Response('Bad request: body required', { status: 400 })
  if (body.length > MAX_BODY) {
    return new Response(`Bad request: body too long (max ${MAX_BODY})`, { status: 400 })
  }

  const { data: ticket } = await supabaseAdmin
    .from('tickets')
    .select('id, user_id, status')
    .eq('id', id)
    .single()

  if (!ticket) return new Response('Not found', { status: 404 })

  const teacher = isTeacher(user)
  if (!teacher && ticket.user_id !== user.id) return new Response('Not found', { status: 404 })

  const now = new Date().toISOString()
  const { data: message, error } = await supabaseAdmin
    .from('ticket_messages')
    .insert({
      ticket_id: id,
      author_id: user.id,
      // Rolul se ingheata la momentul scrierii — vezi migrarea.
      author_role: teacher ? 'teacher' : 'student',
      body,
      created_at: now,
    })
    .select()
    .single()

  if (error) {
    await logError('tickets', 'POST message error', { code: error.code, message: error.message, id })
    return new Response('Database error', { status: 500 })
  }

  const { error: tErr } = await supabaseAdmin
    .from('tickets')
    .update({
      status: teacher ? 'answered' : 'open',
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

  // Aici se va trimite notificarea pe email catre elev (cand profesorul raspunde):
  // DUPA scrierea in DB si fara sa blocheze raspunsul — un email nelivrat nu
  // trebuie sa piarda munca profesorului. Serviciul de email nu e inca ales.

  return Response.json({ message }, { status: 201 })
}
