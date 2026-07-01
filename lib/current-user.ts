import { auth } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export type AppUser = {
  clerk_id: string
  role: 'student' | 'teacher'
  subscription_status: 'free' | 'active' | 'cancelled'
}

// Userul aplicatiei (rol + abonament) din tabelul users, pe baza sesiunii Clerk.
// Rutele /api sunt deja protejate de proxy.ts (necesita login), dar returnam null
// defensiv daca nu exista sesiune sau rand in DB.
export async function getCurrentAppUser(): Promise<AppUser | null> {
  const { userId } = await auth()
  if (!userId) return null

  const { data, error } = await supabaseAdmin
    .from('users')
    .select('clerk_id, role, subscription_status')
    .eq('clerk_id', userId)
    .single()

  if (error || !data) return null
  return data as AppUser
}

export function isTeacher(user: AppUser | null): boolean {
  return user?.role === 'teacher'
}

// Acces la continut premium: gratuit daca e capitol free, altfel abonament activ.
export function canAccessPremium(user: AppUser | null): boolean {
  return user?.subscription_status === 'active'
}
