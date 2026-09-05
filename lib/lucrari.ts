import { supabaseAdmin } from '@/lib/supabase-admin'
import { citesteBaremActiv, type RubricaDb } from '@/lib/barem-db'
import { verificaLimba } from '@/lib/languagetool'
import { corecteazaStrat1, type RezultatStrat1 } from '@/lib/corectare-strat1'
import type { Rubrica } from '@/lib/barem'
import { logError } from '@/lib/log-error'

export const MAX_TEXT = 20_000
export const MAX_SUPORT = 20_000

export type RubricaGasita = {
  versiuneId: string
  rubricaId: string | null
  rubrica: RubricaDb
  /** id-ul de rand al fiecarui criteriu, dupa slug. Vezi `scrieNoteAutomate`. */
  idCriterii: Map<string, string>
}

/**
 * Gaseste rubrica ceruta in versiunea ACTIVA de barem si intoarce si id-urile ei
 * din baza de date, ca lucrarea sa le poata ingheta.
 *
 * De ce id-urile si nu doar slug-ul: slug-ul spune CE criteriu, versiunea spune CU
 * CE praguri. O lucrare notata azi trebuie sa insemne peste un an ce insemna azi,
 * chiar daca intre timp intra un barem nou.
 */
export async function gasesteRubrica(slug: string): Promise<RubricaGasita | null> {
  const barem = await citesteBaremActiv()
  if (!barem) return null

  const rubrica = barem.rubrici.find((r) => r.slug === slug)
  if (!rubrica) return null

  // `citesteBaremActiv` nu intoarce id-urile de rand, doar continutul. Le luam
  // separat: sunt cheile de care depinde inghetarea versiunii.
  const { data: versiune } = await supabaseAdmin
    .from('barem_versions')
    .select('id')
    .eq('checksum', barem.checksum)
    .maybeSingle()

  if (!versiune) return null

  const { data: randRubrica } = await supabaseAdmin
    .from('barem_rubrici')
    .select('id')
    .eq('version_id', versiune.id)
    .eq('slug', slug)
    .maybeSingle()

  // Id-urile criteriilor, ca fiecare nota sa arate catre criteriul exact din
  // versiunea asta de barem — nu doar catre un slug care se repeta la fiecare
  // versiune. Fara ele, legatura ar fi doar un text, iar baza n-ar putea garanta
  // ca notam un criteriu care chiar exista.
  const idCriterii = new Map<string, string>()
  if (randRubrica) {
    const { data: criterii } = await supabaseAdmin
      .from('barem_criterii')
      .select('id, slug')
      .eq('rubrica_id', randRubrica.id)

    for (const c of criterii ?? []) idCriterii.set(c.slug, c.id)
  }

  return { versiuneId: versiune.id, rubricaId: randRubrica?.id ?? null, rubrica, idCriterii }
}

/**
 * Ruleaza stratul 1 (criteriile deterministe) pe textul lucrarii.
 *
 * LanguageTool e optional prin proiectare: daca nu e configurat sau nu raspunde,
 * `verificaLimba` intoarce null, iar criteriile de limba raman `indisponibil` —
 * NU pe 0. Un 0 nemeritat, dat fiindca o unealta lipsea, e mai rau decat un
 * criteriu lasat nenotat: elevul crede ca a gresit ceva ce nu s-a masurat.
 */
export async function corecteazaAutomat(
  rubrica: RubricaDb,
  text: string,
  textSuport?: string | null
): Promise<RezultatStrat1> {
  let limba = null
  try {
    limba = await verificaLimba(text)
  } catch (err) {
    await logError('lucrari', 'LanguageTool a esuat — criteriile de limba raman nenotate', {
      error: err instanceof Error ? err.message : String(err),
    })
  }

  // `RubricaDb` are aceleasi campuri ca `Rubrica`, dar tipate din generatorul
  // Supabase. Conversia e sigura fiindca importul de barem refuza un barem invalid
  // (`npm run barem:check`), deci forma e garantata la scriere.
  return corecteazaStrat1(rubrica as unknown as Rubrica, {
    text,
    textSuport: textSuport ?? undefined,
    limba,
  })
}

/**
 * Scrie notele automate, inlocuindu-le pe cele din rularea precedenta.
 *
 * Indexul unic pe (lucrare, criteriu, sursa) face operatia idempotenta: o a doua
 * rulare rescrie aceleasi randuri in loc sa adauge un istoric de incercari
 * identice, si nu atinge notele mentorului sau autoevaluarea elevului.
 */
export async function scrieNoteAutomate(
  lucrareId: string,
  idCriterii: Map<string, string>,
  rezultat: RezultatStrat1
): Promise<void> {
  if (rezultat.criterii.length === 0) return

  const acum = new Date().toISOString()

  const randuri = rezultat.criterii.map((c) => ({
    lucrare_id: lucrareId,
    criteriu_id: idCriterii.get(c.slug) ?? null,
    criteriu_slug: c.slug,
    denumire: c.denumire,
    din: c.din,
    puncte: c.puncte,
    stare: c.stare,
    sursa: 'auto',
    explicatie: c.explicatie,
    updated_at: acum,
  }))

  const { error } = await supabaseAdmin
    .from('note_criterii')
    .upsert(randuri, { onConflict: 'lucrare_id,criteriu_slug,sursa' })

  if (error) {
    await logError('lucrari', 'Scrierea notelor automate a esuat', {
      code: error.code,
      message: error.message,
      lucrare_id: lucrareId,
    })
    throw new Error('Nu am putut scrie notele automate')
  }
}
