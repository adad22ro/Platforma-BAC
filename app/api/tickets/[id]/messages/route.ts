import type { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getCurrentAppUser, isTeacher } from '@/lib/current-user'
import { logError } from '@/lib/log-error'
import { apiError } from '@/lib/api-error'

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
    .select('id, user_id, status')
    .eq('id', id)
    .single()

  if (!ticket) return apiError(404, 'Not found')

  const teacher = isTeacher(user)
  if (!teacher && ticket.user_id !== user.id) return apiError(404, 'Not found')

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
    return apiError(500, 'Database error')
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
