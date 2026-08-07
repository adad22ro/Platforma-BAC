import type { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getCurrentAppUser, isTeacher } from '@/lib/current-user'
import { logError } from '@/lib/log-error'

const MAX_ANSWER = 5000

// POST /api/tickets/[id]/answer — profesorul raspunde la un tichet.
//
// Notificarea pe email a elevului NU e inca implementata (nu avem serviciu de email
// configurat). Cand va exista, se trimite de aici, DUPA scrierea in DB si fara sa
// blocheze raspunsul: un email nelivrat nu trebuie sa piarda raspunsul profesorului.
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const user = await getCurrentAppUser()
  if (!isTeacher(user)) return new Response('Forbidden', { status: 403 })

  const body = await req.json().catch(() => ({}))
  const answer = typeof body?.answer === 'string' ? body.answer.trim() : ''
  if (!answer) return new Response('Bad request: answer required', { status: 400 })
  if (answer.length > MAX_ANSWER) {
    return new Response(`Bad request: answer too long (max ${MAX_ANSWER})`, { status: 400 })
  }

  const now = new Date().toISOString()
  const { data, error } = await supabaseAdmin
    .from('tickets')
    .update({
      answer,
      answered_by: user!.id,
      answered_at: now,
      status: 'answered',
      updated_at: now,
    })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    await logError('tickets', 'answer error', { code: error.code, message: error.message, id })
    return new Response('Database error', { status: 500 })
  }
  if (!data) return new Response('Not found', { status: 404 })

  return Response.json({ ticket: data })
}
