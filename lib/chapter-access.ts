import { supabaseAdmin } from '@/lib/supabase-admin'
import { isTeacher, canAccessPremium, type AppUser } from '@/lib/current-user'
import { apiError } from '@/lib/api-error'

export type ChapterAccess =
  | { ok: true; teacher: boolean }
  // 404 = capitol inexistent sau draft (nu confirmam existenta unui draft)
  // 402 = capitol premium fara abonament activ
  | { ok: false; status: 404 | 402 }

// Verificarea de acces la un capitol, identica cu cea de la lectii:
// profesorul vede tot; elevul doar capitole publicate, iar cele premium doar cu
// abonament activ. Extrasa aici ca sa nu se rescrie la fiecare ruta noua —
// gating-ul duplicat e exact locul unde apar scaparile.
export async function checkChapterAccess(
  chapterId: string,
  user: AppUser | null
): Promise<ChapterAccess> {
  const { data: chapter, error } = await supabaseAdmin
    .from('chapters')
    .select('id, is_free, published')
    .eq('id', chapterId)
    .single()

  if (error || !chapter) return { ok: false, status: 404 }

  if (isTeacher(user)) return { ok: true, teacher: true }
  if (!chapter.published) return { ok: false, status: 404 }
  if (!chapter.is_free && !canAccessPremium(user)) return { ok: false, status: 402 }

  return { ok: true, teacher: false }
}

export function accessErrorResponse(status: 404 | 402): Response {
  // Corpul de la 402 ramane identic cu cel dinainte — `{ error: 'premium_required' }`.
  // Formatul comun din `apiError` a fost ales ca superset peste el tocmai ca sa nu
  // fie nevoie de o schimbare cu ruptura aici.
  return status === 402 ? apiError(402) : apiError(404, 'Not found')
}
