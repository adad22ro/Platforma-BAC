import type { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getCurrentAppUser, isTeacher } from '@/lib/current-user'

// GET /api/tickets/[id] — un tichet. Doar autorul sau un profesor.
// 404 (nu 403) pentru un tichet strain: nu confirmam existenta lui.
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const user = await getCurrentAppUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const { data: ticket, error } = await supabaseAdmin
    .from('tickets')
    .select('id, user_id, chapter_id, lesson_id, message, status, answer, answered_by, answered_at, created_at')
    .eq('id', id)
    .single()

  if (error || !ticket) return new Response('Not found', { status: 404 })
  if (!isTeacher(user) && ticket.user_id !== user.id) {
    return new Response('Not found', { status: 404 })
  }

  return Response.json({ ticket })
}
