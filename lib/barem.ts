import barem from '@/data/barem.json'

// Baremul oficial de BAC la romana, codificat ca DATE, nu ca logica.
//
// De ce date: baremul e o constanta administrativa, nu o decizie a noastra. Rubrica
// de redactare de la Subiectul III e identica caracter cu caracter in 9 din 11
// bareme oficiale analizate (2021-2026). Nu-l imbunatatim — il transcriem. Cand se
// schimba ceva, se schimba datele; codul de corectare ramane la fel.
//
// De ce JSON in repo si nu un ecran de administrare: baremul produce NOTE. Un prag
// schimbat dintr-un click, fara diff si fara review, modifica tacit punctajele —
// inclusiv retroactiv. In `data/barem.json` fiecare corectura trece prin commit, se
// vede la review si se poate da inapoi. Precedentul din `tags` (vocabular
// administrat prin migrari) merge in aceeasi directie; diferenta e ca baremul e
// mult mai mare si se transcrie dintr-un document extern, iar un diff pe JSON e mai
// citibil decat unul pe 200 de randuri de SQL.
//
// Fisierul ajunge in DB prin `npm run barem:import`, VERSIONAT: fiecare corectura
// creeaza o versiune noua, iar notele deja acordate raman legate de versiunea pe
// care au fost calculate. Fara asta, o corectura ar face notele vechi imposibil de
// explicat — elevul vede 7, sistemul recalculeaza 8, si nimeni nu stie care e adevarul.

// ─────────────────────────────────────────────────────────────
// Tipuri
// ─────────────────────────────────────────────────────────────

// Stratul de corectare, din docs/bac-barem-analiza.md §6.
//   auto   — determinist, fara AI si fara mentor. Prag explicit in barem.
//   ai     — AI cu barem, pre-notare pentru mentor. NICIODATA nota finala.
//   mentor — doar om.
export type Strat = 'auto' | 'ai' | 'mentor'

export const STRATURI: readonly Strat[] = ['auto', 'ai', 'mentor']

// Ce unealta aplica criteriul, pentru stratul `auto`. Fiecare are un corespondent
// in stratul 1 de corectare; `acordat_implicit` e singurul care nu verifica nimic.
export type Verificator =
  | 'numar_cuvinte'
  | 'conectori'
  | 'parti_componente'
  | 'concluzie'
  | 'citat'
  | 'raspuns_in_enunt'
  | 'languagetool'
  | 'acordat_implicit'

export const VERIFICATOARE: readonly Verificator[] = [
  'numar_cuvinte',
  'conectori',
  'parti_componente',
  'concluzie',
  'citat',
  'raspuns_in_enunt',
  'languagetool',
  'acordat_implicit',
]

export type Prag = {
  puncte: number
  conditie: string
  // Pragul NUMERIC, pentru criteriile de ortografie/punctuatie: cate greseli sunt
  // inca acceptate la punctajul asta. „0-1 greseli - 1 punct" devine
  // `max_greseli: 1`. Textul din `conditie` e pentru om; corectarea are nevoie de
  // cifra, iar parsarea propozitiei ar fi fost fragila exact acolo unde nu ne
  // permitem: la note.
  max_greseli?: number
}

// Ce anume numara LanguageTool pentru criteriul asta. Baremul le trateaza uneori
// separat (Subiectul III: ortografia 2p, punctuatia 2p) si uneori impreuna
// (Subiectul I.B: „ortografie si punctuatie", 1p).
export type CategorieLimba = 'ortografie' | 'punctuatie' | 'gramatica' | 'toate'

export const CATEGORII_LIMBA: readonly CategorieLimba[] = [
  'ortografie',
  'punctuatie',
  // Acord, topica, stil — „respectarea normelor limbii literare" din barem.
  'gramatica',
  'toate',
]

export type Criteriu = {
  slug: string
  denumire: string
  puncte_max: number
  strat: Strat
  verificator: Verificator | null
  praguri: Prag[]
  parametri?: Record<string, number | string>
  observatii?: string
}

export type Rubrica = {
  slug: string
  subiect: string
  denumire: string
  profil: string | null
  puncte_total: number
  minim_cuvinte: number | null
  criterii: Criteriu[]
  observatii?: string
}

export type Barem = {
  versiune_document: string
  sursa: string
  note?: string
  rubrici: Rubrica[]
}

// ─────────────────────────────────────────────────────────────
// Acces
// ─────────────────────────────────────────────────────────────

export function incarcaBarem(): Barem {
  return barem as Barem
}

export function rubricaDupaSlug(slug: string): Rubrica | undefined {
  return incarcaBarem().rubrici.find((r) => r.slug === slug)
}

// Cate puncte din rubrica se pot acorda fara AI si fara mentor. Numarul asta e
// motivul pentru care exista stratul 1: pe rubricile modelate da 17 puncte.
export function puncteAutomatizabile(r: Rubrica): number {
  return r.criterii
    .filter((c) => c.strat === 'auto')
    .reduce((s, c) => s + c.puncte_max, 0)
}

// ─────────────────────────────────────────────────────────────
// Validare
// ─────────────────────────────────────────────────────────────

// Intoarce lista de probleme, in romana, ca sa poata fi citita de cine corecteaza
// fisierul fara sa stie TypeScript. Lista goala = fisier valid.
//
// Rulata si de `npm run barem:check`, si din teste: o greseala de transcriere se
// vede la commit, nu in productie peste trei saptamani.
export function valideazaBarem(b: Barem): string[] {
  const probleme: string[] = []
  const slugsRubrici = new Set<string>()
  const slugsCriterii = new Set<string>()

  if (!b.rubrici?.length) {
    return ['Baremul nu contine nicio rubrica.']
  }

  for (const r of b.rubrici) {
    const unde = `rubrica "${r.slug}"`

    if (slugsRubrici.has(r.slug)) {
      probleme.push(`${unde}: slug duplicat.`)
    }
    slugsRubrici.add(r.slug)

    if (!r.criterii?.length) {
      probleme.push(`${unde}: nu are niciun criteriu.`)
      continue
    }

    // Verificarea care prinde cele mai multe greseli de transcriere: suma
    // punctelor pe criterii trebuie sa dea exact punctajul declarat al rubricii.
    const suma = r.criterii.reduce((s, c) => s + c.puncte_max, 0)
    if (suma !== r.puncte_total) {
      probleme.push(
        `${unde}: criteriile insumeaza ${suma} puncte, dar rubrica declara ${r.puncte_total}.`
      )
    }

    for (const c of r.criterii) {
      const undeC = `${unde}, criteriul "${c.slug}"`

      if (slugsCriterii.has(c.slug)) {
        probleme.push(`${undeC}: slug duplicat (slugurile de criterii sunt unice global).`)
      }
      slugsCriterii.add(c.slug)

      if (!Number.isInteger(c.puncte_max) || c.puncte_max <= 0) {
        probleme.push(`${undeC}: puncte_max trebuie sa fie un intreg pozitiv.`)
      }

      if (!STRATURI.includes(c.strat)) {
        probleme.push(`${undeC}: strat necunoscut "${c.strat}" (asteptat: ${STRATURI.join(', ')}).`)
      }

      // Un criteriu automat fara verificator n-are cum sa fie aplicat — ar trece
      // tacut prin corectare si ar da mereu 0.
      if (c.strat === 'auto' && !c.verificator) {
        probleme.push(`${undeC}: e pe stratul "auto" dar nu are verificator.`)
      }
      if (c.strat !== 'auto' && c.verificator) {
        probleme.push(
          `${undeC}: are verificator "${c.verificator}" dar nu e pe stratul "auto".`
        )
      }
      if (c.verificator && !VERIFICATOARE.includes(c.verificator)) {
        probleme.push(`${undeC}: verificator necunoscut "${c.verificator}".`)
      }

      if (c.verificator === 'numar_cuvinte' && typeof c.parametri?.minim !== 'number') {
        probleme.push(`${undeC}: verificatorul "numar_cuvinte" cere parametri.minim.`)
      }

      if (c.verificator === 'languagetool') {
        const categorie = c.parametri?.categorie
        if (typeof categorie !== 'string' || !CATEGORII_LIMBA.includes(categorie as CategorieLimba)) {
          probleme.push(
            `${undeC}: verificatorul "languagetool" cere parametri.categorie (${CATEGORII_LIMBA.join(', ')}).`
          )
        }
        // Pragurile cu punctaj > 0 au nevoie de cifra; cel de 0 e cazul „in rest".
        for (const p of c.praguri ?? []) {
          if (p.puncte > 0 && typeof p.max_greseli !== 'number') {
            probleme.push(
              `${undeC}: pragul de ${p.puncte} puncte n-are max_greseli, deci nu poate fi aplicat automat.`
            )
          }
        }
      }

      for (const p of c.praguri ?? []) {
        if (p.puncte > c.puncte_max) {
          probleme.push(
            `${undeC}: pragul de ${p.puncte} puncte depaseste puncte_max (${c.puncte_max}).`
          )
        }
        if (p.puncte < 0) {
          probleme.push(`${undeC}: prag cu punctaj negativ.`)
        }
        if (!p.conditie?.trim()) {
          probleme.push(`${undeC}: pragul de ${p.puncte} puncte n-are conditie scrisa.`)
        }
      }

      // Pragurile se citesc de sus in jos la corectare, ca in barem.
      const puncte = (c.praguri ?? []).map((p) => p.puncte)
      const descrescator = [...puncte].sort((a, b) => b - a)
      if (puncte.join(',') !== descrescator.join(',')) {
        probleme.push(`${undeC}: pragurile nu sunt in ordine descrescatoare a punctajului.`)
      }
    }
  }

  return probleme
}
