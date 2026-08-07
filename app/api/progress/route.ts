import { supabaseAdmin } from '@/lib/supabase-admin'
import { getCurrentAppUser } from '@/lib/current-user'
import { logError } from '@/lib/log-error'

// GET /api/progress — progresul elevului curent, pe capitole.
// Fiecare user isi vede doar propriul progres (filtrat pe user.id din sesiune,
// niciodata pe un id venit din query string).
export async function GET() {
  const user = await getCurrentAppUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const { data, error } = await supabaseAdmin
    .from('student_progress')
    .select('chapter_id, score, total, attempts, completed_at')
    .eq('user_id', user.id)

  if (error) {
    await logError('progress', 'GET error', { code: error.code, message: error.message })
    return new Response('Database error', { status: 500 })
  }

  return Response.json({ progress: data ?? [] })
}
