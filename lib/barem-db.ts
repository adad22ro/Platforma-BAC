import { supabaseAdmin } from '@/lib/supabase-admin'
import type { Json } from '@/types/database'
import type { Prag, Strat, Verificator } from '@/lib/barem'

// Citirea baremului ACTIV din DB.
//
// Sursa de adevar ramane `data/barem.json` (vezi lib/barem.ts). Aici citim ce e
// chiar in sistem, ceea ce e alta intrebare si singura care conteaza cand
// verifici: fisierul poate fi corect si importul poate lipsi.

export type CriteriuDb = {
  slug: string
  denumire: string
  puncte_max: number
  strat: Strat
  verificator: Verificator | null
  praguri: Prag[]
  parametri: Record<string, number> | null
  observatii: string | null
}

export type RubricaDb = {
  slug: string
  subiect: string
  denumire: string
  profil: string | null
  puncte_total: number
  minim_cuvinte: number | null
  observatii: string | null
  criterii: CriteriuDb[]
}

export type BaremActiv = {
  versiune_document: string
  sursa: string
  checksum: string
  created_at: string
  rubrici: RubricaDb[]
}

// `praguri` si `parametri` sunt `jsonb` in DB, deci generatorul le tipeaza `Json`.
// Forma lor reala e garantata la scriere de `npm run barem:check` si de importul
// care refuza un barem invalid, asa ca aici le readucem la tipurile din lib/barem.
function caPraguri(v: Json): Prag[] {
  return (v ?? []) as unknown as Prag[]
}

function caParametri(v: Json | null): Record<string, number> | null {
  return (v ?? null) as unknown as Record<string, number> | null
}

export async function citesteBaremActiv(): Promise<BaremActiv | null> {
  const { data: versiune, error } = await supabaseAdmin
    .from('barem_versions')
    .select('id, versiune_document, sursa, checksum, created_at')
    .eq('is_active', true)
    .maybeSingle()

  if (error) throw new Error(`Nu pot citi versiunea de barem: ${error.message}`)
  if (!versiune) return null

  const { data: rubrici, error: errRubrici } = await supabaseAdmin
    .from('barem_rubrici')
    // Un SINGUR literal, fara concatenare: Supabase deduce tipul randului din
    // textul selectului, iar un `+` il transforma in `string` si inferenta cade
    // in `GenericStringError`. Vezi ERRORS.md #020.
    .select('slug, subiect, denumire, profil, puncte_total, minim_cuvinte, observatii, order_index, barem_criterii (slug, denumire, puncte_max, strat, verificator, praguri, parametri, observatii, order_index)')
    .eq('version_id', versiune.id)
    .order('order_index')

  if (errRubrici) throw new Error(`Nu pot citi rubricile: ${errRubrici.message}`)

  return {
    versiune_document: versiune.versiune_document,
    sursa: versiune.sursa,
    checksum: versiune.checksum,
    created_at: versiune.created_at,
    rubrici: (rubrici ?? []).map((r) => ({
      slug: r.slug,
      subiect: r.subiect,
      denumire: r.denumire,
      profil: r.profil,
      puncte_total: r.puncte_total,
      minim_cuvinte: r.minim_cuvinte,
      observatii: r.observatii,
      // Supabase nu garanteaza ordinea randurilor imbricate, deci sortam aici.
      criterii: [...(r.barem_criterii ?? [])]
        .sort((a, b) => a.order_index - b.order_index)
        .map((c) => ({
          slug: c.slug,
          denumire: c.denumire,
          puncte_max: c.puncte_max,
          // `strat` si `verificator` sunt `text` cu CHECK in DB, deci generatorul
          // le da ca `string`. Constrangerea garanteaza multimea de valori.
          strat: c.strat as Strat,
          verificator: c.verificator as Verificator | null,
          praguri: caPraguri(c.praguri),
          parametri: caParametri(c.parametri),
          observatii: c.observatii,
        })),
    })),
  }
}
