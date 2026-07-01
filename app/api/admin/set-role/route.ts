import { currentUser } from '@clerk/nextjs/server'
import { getAdminEmails } from '@/lib/admin'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { logError } from '@/lib/log-error'

// Schimba rolul unui user (student <-> teacher). Doar pentru admini (allowlist ADMIN_EMAILS).
// Apelat din panoul /admin (butonul de promovare).
export async function POST(req: Request) {
  const user = await currentUser()
  const email = user?.emailAddresses[0]?.emailAddress?.toLowerCase() ?? ''
  if (!user || !getAdminEmails().includes(email)) {
    return new Response('Forbidden', { status: 403 })
  }

  const { clerk_id, role } = await req.json().catch(() => ({}))
  if (!clerk_id || (role !== 'student' && role !== 'teacher')) {
    return new Response('Bad request', { status: 400 })
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
    return new Response('Database error', { status: 500 })
  }

  return Response.json({ ok: true, role })
}
