import { auth } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export type AppUser = {
  // id-ul din tabelul users (nu cel din Clerk) — cheia folosita de FK-uri
  // interne, ex. student_progress.user_id.
  id: string
  clerk_id: string
  role: 'student' | 'teacher' | 'mentor'
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
    .select('id, clerk_id, role, subscription_status, subscription_end_date')
    .eq('clerk_id', userId)
    .single()

  if (error || !data) return null
  return data as AppUser
}

// Profesorul SCRIE continut: capitole, lectii, intrebari. Mentorul nu — de aceea
// verificarea asta ramane strict pe 'teacher' si nu include mentorii.
export function isTeacher(user: AppUser | null): boolean {
  return user?.role === 'teacher'
}

// Cine poate corecta si raspunde la tichete: si profesorul, si mentorul.
//
// Separarea fata de `isTeacher` e miezul rolului de mentor. Cele doua munci au
// volume complet diferite: scrisul de continut vine in valuri, la inceput;
// corectarea creste liniar cu numarul de elevi si e articolul cu cel mai mare volum
// din sistem. Daca le-am fi tinut pe acelasi rol, n-am fi putut adauga oameni doar
// pe corectare fara sa le dam si drept de scris in materie.
export function poateCorecta(user: AppUser | null): boolean {
  return user?.role === 'teacher' || user?.role === 'mentor'
}

// Ce se scrie in `ticket_messages.author_role`, ca elevul sa vada cu cine vorbeste.
export function rolInFir(user: AppUser | null): 'student' | 'teacher' | 'mentor' {
  return user?.role === 'teacher' || user?.role === 'mentor' ? user.role : 'student'
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
