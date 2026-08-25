import { supabaseAdmin } from '@/lib/supabase-admin'
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

// Tabelele de barem sunt adaugate de migrarea 20260825200000. `types/database.ts`
// e generat din baza legata (`npm run db:types`), deci pana cand migrarea e
// aplicata in productie si tipurile regenerate, clientul tipat nu le cunoaste.
//
// Cast-ul e izolat aici, intr-un singur loc, ca restul codului sa lucreze cu
// tipurile de mai sus. DE SCOS dupa `npm run db:types` — atunci `supabaseAdmin`
// stie singur tabelele si randurile vin tipate din generator.
const sb = supabaseAdmin as unknown as {
  from: (t: string) => any // eslint-disable-line @typescript-eslint/no-explicit-any
}

export async function citesteBaremActiv(): Promise<BaremActiv | null> {
  const { data: versiune, error } = await sb
    .from('barem_versions')
    .select('id, versiune_document, sursa, checksum, created_at')
    .eq('is_active', true)
    .maybeSingle()

  if (error) throw new Error(`Nu pot citi versiunea de barem: ${error.message}`)
  if (!versiune) return null

  const { data: rubrici, error: errRubrici } = await sb
    .from('barem_rubrici')
    .select(
      'slug, subiect, denumire, profil, puncte_total, minim_cuvinte, observatii, order_index, ' +
        'barem_criterii (slug, denumire, puncte_max, strat, verificator, praguri, parametri, observatii, order_index)'
    )
    .eq('version_id', versiune.id)
    .order('order_index')

  if (errRubrici) throw new Error(`Nu pot citi rubricile: ${errRubrici.message}`)

  return {
    versiune_document: versiune.versiune_document,
    sursa: versiune.sursa,
    checksum: versiune.checksum,
    created_at: versiune.created_at,
    rubrici: (rubrici ?? []).map(
      (r: RubricaDb & { barem_criterii: (CriteriuDb & { order_index: number })[] }) => ({
        slug: r.slug,
        subiect: r.subiect,
        denumire: r.denumire,
        profil: r.profil,
        puncte_total: r.puncte_total,
        minim_cuvinte: r.minim_cuvinte,
        observatii: r.observatii,
        // Supabase nu garanteaza ordinea randurilor imbricate, deci sortam aici.
        criterii: [...(r.barem_criterii ?? [])].sort((a, b) => a.order_index - b.order_index),
      })
    ),
  }
}
