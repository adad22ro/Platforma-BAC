import type { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getCurrentAppUser, poateCorecta } from '@/lib/current-user'
import { logError } from '@/lib/log-error'
import { apiError } from '@/lib/api-error'
import { ePool } from '@/lib/alocare-tichete'

// POST /api/tickets/[id]/preia — un corector ia un tichet din pool.
//
// Miezul rutei e o singura scriere conditionata. Doi mentori care apasa in aceeasi
// secunda: `where preluat_la is null` face ca al doilea UPDATE sa nu atinga niciun
// rand, iar Supabase intoarce lista goala. Nu exista fereastra intre verificare si
// scriere, fiindca nu exista verificare separata.
//
// Rezervarea ALTCUIVA, inca valabila, e tratata ca "ocupat" (409): dreptul de prim
// refuz al mentorului precedent tine pana expira. Diferenta fata de un tichet preluat
// e doar ca asta se stinge singura, prin trecerea timpului.
//
// Propria rezervare se poate insa prelua oricand — asta ESTE exercitarea dreptului
// de prim refuz, si o transforma din termen care curge in revendicare ferma.
export async function POST(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const user = await getCurrentAppUser()
  if (!user) return apiError(401, 'Unauthorized')

  // Elevii n-au ce prelua. 403, nu 404: ruta exista si nu ascundem nimic despre
  // un tichet anume — raspunsul nu depinde de ce tichet a fost cerut.
  if (!poateCorecta(user)) {
    return apiError(403, 'Doar un corector poate prelua tichete')
  }

  const acum = new Date()
  const { data: ticket } = await supabaseAdmin
    .from('tickets')
    .select('id, status, mentor_rezervat_id, rezervat_pana, preluat_la, created_at')
    .eq('id', id)
    .single()

  if (!ticket) return apiError(404, 'Not found')
  if (ticket.status === 'closed') {
    return apiError(409, 'Tichetul e inchis')
  }

  // Doua cazuri au voie sa preia: tichetul e in pool, sau e rezervarea MEA, inca
  // valabila. Al doilea nu e o exceptie, e chiar sensul rezervarii — dreptul de prim
  // refuz se exercita acceptand, iar acceptarea inseamna sa nu-ti mai expire sub maini.
  const rezervarePropie = ticket.mentor_rezervat_id === user.id && !ticket.preluat_la
  if (!ePool(ticket, acum) && !rezervarePropie) {
    return apiError(409, 'Tichetul e luat de altcineva')
  }

  const acumIso = acum.toISOString()
  const { data: actualizate, error } = await supabaseAdmin
    .from('tickets')
    .update({
      mentor_rezervat_id: user.id,
      preluat_la: acumIso,
      // Preluarea e ferma: nu mai expira. Golim termenul ca sa nu ramana in rand o
      // data care nu mai inseamna nimic si pe care cineva ar putea-o citi ca atare.
      rezervat_pana: null,
      updated_at: acumIso,
    })
    .eq('id', id)
    // Conditia de curse, in scriere. Acopera si rezervarea expirata a altcuiva:
    // dupa termen, tichetul e al oricui apuca primul.
    .is('preluat_la', null)
    .select('id, mentor_rezervat_id, preluat_la, status')

  if (error) {
    await logError('tickets', 'preia error', { code: error.code, message: error.message, id })
    return apiError(500, 'Database error')
  }

  // Zero randuri = altcineva a scris intre citire si UPDATE. Nu e o eroare de
  // server, e rezultatul normal al cursei — pierdutul primeste acelasi 409.
  if (!actualizate || actualizate.length === 0) {
    return apiError(409, 'Tichetul tocmai a fost luat de altcineva')
  }

  return Response.json({ ticket: actualizate[0] })
}
