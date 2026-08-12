import type { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getCurrentAppUser } from '@/lib/current-user'
import { apiError } from '@/lib/api-error'
import { logError } from '@/lib/log-error'

// GET /api/tags — vocabularul de etichete.
//
// Filtre optionale: ?axis=concept|limba|curent|competenta si ?profile=uman.
// Fara ?profile, se intorc doar etichetele comune ambelor profiluri plus, daca se
// cere explicit, cele de uman — cele doua programe oficiale difera in exact doua
// puncte (drama si calitatile stilului), deci filtrarea e tot ce ne trebuie.
//
// Vocabularul e administrat prin migrari, nu din aplicatie: nu exista POST aici.
// O eticheta noua = o migrare noua, revizuita la PR. Bariera asta e intentionata —
// fara ea, "perspectiva narativa" si "perspectivă narativă" ar deveni doua concepte
// diferite, tacit, iar staparea elevului s-ar imparti in doua.
export async function GET(req: NextRequest) {
  const user = await getCurrentAppUser()
  if (!user) return apiError(401, 'Unauthorized')

  const url = new URL(req.url)
  const axis = url.searchParams.get('axis')
  const profile = url.searchParams.get('profile')

  let query = supabaseAdmin
    .from('tags')
    .select('id, slug, name, axis, profile')
    .order('axis', { ascending: true })
    .order('slug', { ascending: true })

  if (axis) query = query.eq('axis', axis)
  // profile null = valabil la ambele profiluri; se intorc mereu.
  if (profile !== 'uman') query = query.is('profile', null)

  const { data, error } = await query
  if (error) {
    await logError('tags', 'GET error', { code: error.code, message: error.message })
    return apiError(500, 'Database error')
  }

  return Response.json({ tags: data ?? [] })
}
