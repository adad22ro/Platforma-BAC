import { supabaseAdmin } from '@/lib/supabase-admin'

// Cat tine rezervarea pentru ultimul mentor al elevului, in ore.
//
// Decizia a fost "8 ore lucratoare"; implementarea foloseste 8 ore de ceas, nu de
// program. Orele lucratoare ar fi cerut un calendar (weekenduri, sarbatori, fusul
// fiecarui mentor) pentru un castig care nu exista: expirarea nu ia nimic nimanui,
// doar face tichetul vizibil si pentru altii. Un tichet care cade in pool sambata
// dimineata e exact ce vrem — elevul nu asteapta pana luni.
export const ORE_REZERVARE = 8

// Al doilea prag: dupa atat, un tichet nepreluat urca in capul cozii si e marcat
// ca intarziat. Fara el, un tichet pe care nu-l vrea nimeni sta in pool la
// nesfarsit — exact esecul tacut pe care modelul il evita.
export const ORE_INTARZIERE = 24

const MS_ORA = 3_600_000

/** Campurile de alocare de care depind functiile de mai jos. */
export type AlocareTichet = {
  mentor_rezervat_id: string | null
  rezervat_pana: string | null
  preluat_la: string | null
  created_at: string
  status: string
}

/** Momentul pana la care tine o rezervare pornita acum. */
export function expirareRezervare(acum: Date = new Date()): string {
  return new Date(acum.getTime() + ORE_REZERVARE * MS_ORA).toISOString()
}

/**
 * E tichetul in pool-ul comun?
 *
 * Foloseste-o pentru UN tichet deja citit (vezi ruta de preluare). Pentru LISTA
 * tichetelor din pool, conditia e scrisa direct in interogare, in `GET /api/tickets` —
 * o lista nu se poate filtra in memorie odata ce e paginata.
 *
 * Da, daca nu l-a revendicat nimeni ferm SI (n-are rezervare, sau rezervarea a
 * expirat). Expirarea se citeste, nu se scrie: niciun proces nu trebuie sa "elibereze"
 * nimic, deci nu exista proces care sa poata sa nu ruleze.
 */
export function ePool(t: AlocareTichet, acum: Date = new Date()): boolean {
  if (t.preluat_la) return false
  if (!t.mentor_rezervat_id) return true
  if (!t.rezervat_pana) return true
  return new Date(t.rezervat_pana) <= acum
}

/**
 * Tichet intarziat: deschis, nerevendicat de nimeni, mai vechi decat al doilea prag.
 *
 * Un tichet preluat NU e intarziat oricat ar sta: are un om pe el, iar problema pe
 * care o semnalam aici e alta — ca nu-l vrea nimeni.
 */
export function eIntarziat(t: AlocareTichet, acum: Date = new Date()): boolean {
  if (t.preluat_la) return false
  if (t.status === 'closed') return false
  return acum.getTime() - new Date(t.created_at).getTime() >= ORE_INTARZIERE * MS_ORA
}

/**
 * Ultimul mentor al elevului = autorul ultimului mesaj non-elev din firele lui.
 *
 * Intoarce `null` daca elevul n-a mai vorbit cu nimeni — atunci tichetul intra
 * direct in pool, fara rezervare. Tot `null` la eroare de citire: continuitatea e
 * un lucru bun, nu unul obligatoriu, si nu merita sa blocheze deschiderea unui tichet.
 */
export async function ultimulMentorAlElevului(userId: string): Promise<string | null> {
  // O singura interogare, cu join intern pe tichet. Varianta in doi pasi (intai
  // id-urile tichetelor elevului, apoi mesajele cu `in`) creste lista de id-uri cu
  // fiecare intrebare pusa vreodata de acel elev — un `in` care se lungeste la
  // nesfarsit e o problema care apare abia dupa cateva luni de folosire.
  const { data } = await supabaseAdmin
    .from('ticket_messages')
    .select('author_id, created_at, tickets!inner(user_id)')
    .eq('tickets.user_id', userId)
    .neq('author_role', 'student')
    .order('created_at', { ascending: false })
    .limit(1)

  return data?.[0]?.author_id ?? null
}
