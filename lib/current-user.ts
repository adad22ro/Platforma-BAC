import { auth } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export type AppUser = {
  clerk_id: string
  role: 'student' | 'teacher'
  subscription_status: 'free' | 'active' | 'cancelled'
  subscription_end_date: string | null
}

// Userul aplicatiei (rol + abonament) din tabelul users, pe baza sesiunii Clerk.
// Rutele /api sunt deja protejate de proxy.ts (necesita login), dar returnam null
// defensiv daca nu exista sesiune sau rand in DB.
export async function getCurrentAppUser(): Promise<AppUser | null> {
  const { userId } = await auth()
  if (!userId) return null

  const { data, error } = await supabaseAdmin
    .from('users')
    .select('clerk_id, role, subscription_status, subscription_end_date')
    .eq('clerk_id', userId)
    .single()

  if (error || !data) return null
  return data as AppUser
}

export function isTeacher(user: AppUser | null): boolean {
  return user?.role === 'teacher'
}

// Acces la continut premium: abonament activ. Aparare in adancime: daca stim data
// de sfarsit si a trecut, blocam (webhook de anulare posibil pierdut). Fara data
// (null) => permitem, ca sa nu blocam un platitor din cauza unei date lipsa.
export function canAccessPremium(user: AppUser | null): boolean {
  if (user?.subscription_status !== 'active') return false
  if (user.subscription_end_date && new Date(user.subscription_end_date) <= new Date()) {
    return false
  }
  return true
}
