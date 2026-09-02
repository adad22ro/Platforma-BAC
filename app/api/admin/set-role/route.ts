import { currentUser } from '@clerk/nextjs/server'
import { getAdminEmails } from '@/lib/admin'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { logError } from '@/lib/log-error'
import { apiError } from '@/lib/api-error'

// Schimba rolul unui user (student / teacher / mentor). Doar pentru admini
// (allowlist ADMIN_EMAILS).
// Apelat din panoul /admin (butonul de promovare).
export async function POST(req: Request) {
  const user = await currentUser()
  const email = user?.primaryEmailAddress?.emailAddress?.toLowerCase() ?? ''
  if (!user || !email || !getAdminEmails().includes(email)) {
    return apiError(403, 'Forbidden')
  }

  const { clerk_id, role } = await req.json().catch(() => ({}))
  const ROLURI = ['student', 'teacher', 'mentor']
  if (!clerk_id || !ROLURI.includes(role)) {
    return apiError(400, 'Bad request')
  }

  const { error } = await supabaseAdmin.from('users').update({ role }).eq('clerk_id', clerk_id)
  if (error) {
    console.error('set-role error:', error)
    await logError('admin-set-role', 'Supabase update error', {
      code: error.code,
      message: error.message,
      clerk_id,
      role,
    })
    return apiError(500, 'Database error')
  }

  return Response.json({ ok: true, role })
}
