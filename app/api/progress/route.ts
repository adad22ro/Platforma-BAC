import { supabaseAdmin } from '@/lib/supabase-admin'
import { getCurrentAppUser } from '@/lib/current-user'
import { logError } from '@/lib/log-error'
import { apiError } from '@/lib/api-error'

// GET /api/progress — progresul elevului curent, pe capitole.
// Fiecare user isi vede doar propriul progres (filtrat pe user.id din sesiune,
// niciodata pe un id venit din query string).
export async function GET() {
  const user = await getCurrentAppUser()
  if (!user) return apiError(401, 'Unauthorized')

  const { data, error } = await supabaseAdmin
    .from('student_progress')
    .select('chapter_id, score, total, attempts, completed_at')
    .eq('user_id', user.id)

  if (error) {
    await logError('progress', 'GET error', { code: error.code, message: error.message })
    return apiError(500, 'Database error')
  }

  return Response.json({ progress: data ?? [] })
}
