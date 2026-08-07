import type { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getCurrentAppUser, isTeacher } from '@/lib/current-user'
import { logError } from '@/lib/log-error'

// GET /api/tickets/[id] — tichetul CU firul de mesaje. Doar autorul sau un profesor.
// 404 (nu 403) pentru un tichet strain: nu confirmam existenta lui.
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const user = await getCurrentAppUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const { data: ticket, error } = await supabaseAdmin
    .from('tickets')
    // Un singur literal, fara concatenare: Supabase deduce tipul randului din textul
    // selectului, iar `a + b` il face `string` si pierde tiparea.
    .select('id, user_id, chapter_id, lesson_id, lesson_title, message, selection, scroll_percent, progress_score, progress_total, progress_attempts, status, created_at, last_message_at')
    .eq('id', id)
    .single()

  if (error || !ticket) return new Response('Not found', { status: 404 })
  if (!isTeacher(user) && ticket.user_id !== user.id) {
    return new Response('Not found', { status: 404 })
  }

  const { data: messages, error: mErr } = await supabaseAdmin
    .from('ticket_messages')
    .select('id, ticket_id, author_id, author_role, body, created_at')
    .eq('ticket_id', id)
    .order('created_at', { ascending: true })

  if (mErr) {
    await logError('tickets', 'GET messages error', { code: mErr.code, message: mErr.message, id })
    return new Response('Database error', { status: 500 })
  }

  return Response.json({ ticket: { ...ticket, messages: messages ?? [] } })
}

// PATCH /api/tickets/[id] — inchide sau redeschide un tichet. Autorul sau un profesor.
//
// Se pot seta doar `closed` si `open`. `answered` NU e o stare pe care o alege cineva
// manual: ea rezulta din faptul ca profesorul a scris in fir (vezi ruta de mesaje).
// Daca ar fi setabila aici, un tichet ar putea aparea "raspuns" fara niciun raspuns.
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const user = await getCurrentAppUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const body = await req.json().catch(() => ({}))
  const status = body?.status
  if (status !== 'closed' && status !== 'open') {
    return new Response('Bad request: status must be "closed" or "open"', { status: 400 })
  }

  const { data: ticket } = await supabaseAdmin
    .from('tickets')
    .select('id, user_id')
    .eq('id', id)
    .single()

  if (!ticket) return new Response('Not found', { status: 404 })
  if (!isTeacher(user) && ticket.user_id !== user.id) {
    return new Response('Not found', { status: 404 })
  }

  const { data, error: uErr } = await supabaseAdmin
    .from('tickets')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (uErr) {
    await logError('tickets', 'PATCH error', { code: uErr.code, message: uErr.message, id })
    return new Response('Database error', { status: 500 })
  }

  return Response.json({ ticket: data })
}
