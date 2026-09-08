import type { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getCurrentAppUser, poateCorecta } from '@/lib/current-user'
import { apiError } from '@/lib/api-error'
import { logError } from '@/lib/log-error'
import { gasesteRubrica } from '@/lib/lucrari'

const MAX_EXPLICATIE = 2000

// PUT /api/lucrari/[id]/note — scrie nota unui om pe un criteriu.
//
// Aceeasi ruta serveste doua roluri, si asta e deliberat:
//   corector (profesor/mentor) -> sursa 'mentor', nota care CONTEAZA la total
//   autorul lucrarii           -> sursa 'elev',  autoevaluare, nu intra in total
//
// SURSA NU VINE DE LA CLIENT. Se deduce pe server, din cine esti. Daca ar fi fost
// un camp trimis in cerere, un elev ar fi putut trimite `sursa: 'mentor'` si si-ar
// fi dat singur nota finala. Nu e o scapare ipotetica: e chiar fluxul in care
// aceeasi ruta e folosita de amandoi.
export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const user = await getCurrentAppUser()
  if (!user) return apiError(401, 'Unauthorized')

  const body = await req.json().catch(() => ({}))
  const criteriuSlug = typeof body?.criteriu_slug === 'string' ? body.criteriu_slug.trim() : ''
  const explicatie =
    typeof body?.explicatie === 'string' ? body.explicatie.trim().slice(0, MAX_EXPLICATIE) : null

  if (!criteriuSlug) return apiError(400, 'Bad request: criteriu_slug required')

  // `puncte: null` e o valoare valida, nu o omisiune: inseamna „las criteriul
  // nenotat". Un mentor trebuie sa poata retrage o nota data din greseala, fara sa
  // fie obligat sa puna 0 — care ar insemna cu totul altceva pentru elev.
  const arePuncte = body?.puncte !== undefined
  const puncte = body?.puncte === null ? null : Number(body?.puncte)
  if (!arePuncte) return apiError(400, 'Bad request: puncte required (foloseste null pentru nenotat)')
  if (puncte !== null && (!Number.isInteger(puncte) || puncte < 0)) {
    return apiError(400, 'Bad request: puncte must be a non-negative integer or null')
  }

  const { data: lucrare } = await supabaseAdmin
    .from('lucrari')
    .select('id, user_id, rubrica_slug, status')
    .eq('id', id)
    .single()

  if (!lucrare) return apiError(404, 'Not found')

  const corector = poateCorecta(user)
  const eAutorul = lucrare.user_id === user.id
  // Nici corector, nici autor: 404, nu 403 — nu confirmam ca lucrarea exista.
  if (!corector && !eAutorul) return apiError(404, 'Not found')

  const sursa = corector ? 'mentor' : 'elev'

  // Criteriul trebuie sa existe in rubrica lucrarii, cu punctajul lui maxim. Fara
  // verificarea asta s-ar putea inventa criterii care nu sunt in barem, iar `din`
  // ar veni de la client — deci si plafonul propriului punctaj.
  const gasita = await gasesteRubrica(lucrare.rubrica_slug)
  if (!gasita) return apiError(409, 'Rubrica lucrarii nu mai exista in baremul activ')

  const criteriu = gasita.rubrica.criterii.find((c) => c.slug === criteriuSlug)
  if (!criteriu) {
    return apiError(400, `Bad request: criteriul "${criteriuSlug}" nu exista in rubrica lucrarii`)
  }
  if (puncte !== null && puncte > criteriu.puncte_max) {
    return apiError(400, `Bad request: maximul criteriului e ${criteriu.puncte_max}`)
  }

  const acum = new Date().toISOString()
  const { data: nota, error } = await supabaseAdmin
    .from('note_criterii')
    .upsert(
      {
        lucrare_id: id,
        criteriu_id: gasita.idCriterii.get(criteriuSlug) ?? null,
        criteriu_slug: criteriuSlug,
        denumire: criteriu.denumire,
        din: criteriu.puncte_max,
        puncte,
        stare: puncte === null ? 'nenotat' : 'acordat',
        sursa,
        autor_id: user.id,
        explicatie,
        updated_at: acum,
      },
      { onConflict: 'lucrare_id,criteriu_slug,sursa' }
    )
    .select()
    .single()

  if (error) {
    await logError('lucrari', 'PUT nota error', { code: error.code, message: error.message, id })
    return apiError(500, 'Database error')
  }

  // Lucrarea trece in 'corectata' cand un corector a notat, nu cand s-a autoevaluat
  // elevul. Marcam la prima nota de mentor si o lasam asa: „corectata" inseamna
  // „a trecut pe la un om", nu „toate criteriile sunt completate".
  if (corector && lucrare.status !== 'corectata') {
    const { error: sErr } = await supabaseAdmin
      .from('lucrari')
      .update({ status: 'corectata', updated_at: acum })
      .eq('id', id)

    if (sErr) {
      // Nota e deja scrisa si vizibila. Nu o pierdem pentru ca n-a mers eticheta.
      await logError('lucrari', 'Actualizarea statusului a esuat', {
        code: sErr.code,
        message: sErr.message,
        id,
      })
    }
  }

  return Response.json({ nota })
}
