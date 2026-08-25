import type { Criteriu, Rubrica } from '@/lib/barem'

// Stratul 1 de corectare: criteriile care se pot acorda DETERMINIST, fara AI si
// fara mentor. Pe tot baremul inseamna ~20 din cele 90 de puncte ale examenului.
//
// Regula care guverneaza tot fisierul: mai bine spunem „nu pot verifica" decat sa
// dam 0. Un 0 nemeritat, dat tacit fiindca unealta lipseste, e mai rau decat un
// criteriu lasat nenotat — elevul crede ca a gresit ceva ce de fapt n-a fost masurat.
// De aceea fiecare rezultat are o `stare`, nu doar un punctaj.
//
// A doua regula: ce se poate verifica aici e PREZENTA si FORMA, nu calitatea. Putem
// spune ca exista trei paragrafe, nu ca introducerea e buna. Unde diferenta conteaza,
// explicatia intoarsa o spune pe fata, ca elevul sa nu citeasca mai mult decat e.

export type ContextCorectare = {
  // Ce a scris elevul.
  text: string
  // Textul-suport (la prima vedere), pentru verificarea citatului. Fara el,
  // verificatorul `citat` poate confirma doar ca exista ghilimele, nu si ca ce e
  // intre ele chiar vine din text.
  textSuport?: string
}

export type StareCriteriu =
  // Punctajul e stabilit determinist si se poate acorda.
  | 'acordat'
  // Criteriul e pe stratul 1, dar unealta nu e disponibila inca (LanguageTool).
  // NU inseamna 0 — inseamna „de notat de altcineva".
  | 'indisponibil'

export type RezultatCriteriu = {
  slug: string
  denumire: string
  din: number
  // `null` cand starea e 'indisponibil'. Deliberat nu 0.
  puncte: number | null
  stare: StareCriteriu
  // Ce s-a masurat, in romana, pentru elev. Nu „criteriu 3: 0p", ci de ce.
  explicatie: string
}

// ─────────────────────────────────────────────────────────────
// Unelte
// ─────────────────────────────────────────────────────────────

// Fara diacritice si cu litere mici, pentru cautari. Elevii scriu si cu, si fara
// diacritice; un conector n-are voie sa „dispara" din cauza asta.
function normalizeaza(text: string): string {
  return text
    .normalize('NFD')
    // Semnele diacritice combinante (U+0300-U+036F), scrise ca escape ca sa nu
    // depinda de codarea fisierului.
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
}

// Cuvant = secventa care contine cel putin o litera. Cifrele si semnele singure nu
// se pun la numaratoare, ca sa nu se poata umfla textul cu „1 2 3 4 5".
export function numaraCuvinte(text: string): number {
  return text
    .trim()
    .split(/\s+/)
    .filter((t) => /\p{L}/u.test(t)).length
}

// Lista inchisa, din baremele oficiale si din analiza (§6). Deliberat scurta: un
// conector inventat de noi ar da puncte pentru ceva ce baremul nu cere.
export const CONECTORI: readonly string[] = [
  'in primul rand',
  'in al doilea rand',
  'pe de o parte',
  'pe de alta parte',
  'de asemenea',
  'in plus',
  'prin urmare',
  'asadar',
  'in concluzie',
  'deoarece',
  'fiindca',
  'intrucat',
  'de aceea',
  'astfel',
  'totusi',
  'cu toate acestea',
  'in ceea ce priveste',
  'spre deosebire de',
  'in consecinta',
  'de exemplu',
]

export function conectoriGasiti(text: string): string[] {
  const t = normalizeaza(text)
  return CONECTORI.filter((c) => t.includes(c))
}

// Marcatori de concluzie: subset al conectorilor, plus formule de incheiere.
const MARCATORI_CONCLUZIE: readonly string[] = [
  'in concluzie',
  'asadar',
  'prin urmare',
  'in final',
  'ca urmare',
  'in consecinta',
  'concluzionand',
  'pentru a concluziona',
]

function paragrafe(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
}

// ─────────────────────────────────────────────────────────────
// Verificatoarele
// ─────────────────────────────────────────────────────────────
// Fiecare intoarce punctajul si explicatia. Nu stiu de barem — primesc criteriul
// si decid pe baza lui, ca pragurile sa ramana in date, nu in cod.

function verificaNumarCuvinte(c: Criteriu, ctx: ContextCorectare): RezultatCriteriu {
  const minim = c.parametri?.minim ?? 0
  const n = numaraCuvinte(ctx.text)
  const indeplinit = n >= minim

  return {
    slug: c.slug,
    denumire: c.denumire,
    din: c.puncte_max,
    puncte: indeplinit ? c.puncte_max : 0,
    stare: 'acordat',
    explicatie: indeplinit
      ? `Ai scris ${n} de cuvinte, peste minimul de ${minim}.`
      : `Ai scris ${n} de cuvinte, sub minimul de ${minim} cerut de barem.`,
  }
}

function verificaConectori(c: Criteriu, ctx: ContextCorectare): RezultatCriteriu {
  const gasiti = conectoriGasiti(ctx.text)
  const n = gasiti.length

  // Baremul cere conectori „utilizati corect". Determinist putem verifica doar
  // prezenta si varietatea — corectitudinea folosirii cere interpretare. Pragurile
  // de mai jos sunt operationalizarea NOASTRA, nu textul baremului, si de aceea
  // explicatia spune ce s-a masurat de fapt.
  let puncte: number
  if (n >= 3) puncte = c.puncte_max
  else if (n >= 1) puncte = Math.max(1, Math.floor(c.puncte_max / 2))
  else puncte = 0

  return {
    slug: c.slug,
    denumire: c.denumire,
    din: c.puncte_max,
    puncte: Math.min(puncte, c.puncte_max),
    stare: 'acordat',
    explicatie:
      n === 0
        ? 'Nu am gasit niciun conector din lista celor asteptate la textul argumentativ.'
        : `Am gasit ${n} ${n === 1 ? 'conector' : 'conectori'}: ${gasiti.join(', ')}. ` +
          'Verificarea automata masoara prezenta si varietatea, nu si potrivirea lor in fraza.',
  }
}

function verificaPartiComponente(c: Criteriu, ctx: ContextCorectare): RezultatCriteriu {
  const p = paragrafe(ctx.text)
  const areTrei = p.length >= 3

  return {
    slug: c.slug,
    denumire: c.denumire,
    din: c.puncte_max,
    puncte: areTrei ? c.puncte_max : 0,
    stare: 'acordat',
    explicatie: areTrei
      ? `Textul are ${p.length} paragrafe — introducere, cuprins si incheiere se pot distinge.`
      : `Textul are ${p.length} ${p.length === 1 ? 'paragraf' : 'paragrafe'}. ` +
        'Baremul cere toate cele trei parti: introducere, cuprins, incheiere.',
  }
}

function verificaConcluzie(c: Criteriu, ctx: ContextCorectare): RezultatCriteriu {
  const p = paragrafe(ctx.text)
  const ultimul = normalizeaza(p[p.length - 1] ?? '')
  const marcator = MARCATORI_CONCLUZIE.find((m) => ultimul.includes(m))

  return {
    slug: c.slug,
    denumire: c.denumire,
    din: c.puncte_max,
    puncte: marcator ? c.puncte_max : 0,
    stare: 'acordat',
    explicatie: marcator
      ? `Ultimul paragraf incepe concluzia cu „${marcator}".`
      : 'Nu am gasit un enunt final de concluzie. Baremul cere ca textul sa se incheie cu o concluzie explicita.',
  }
}

function verificaCitat(c: Criteriu, ctx: ContextCorectare): RezultatCriteriu {
  // Ghilimele romanesti („…"), drepte ("…") si franceze («…»).
  const potriviri = [...ctx.text.matchAll(/[„"«]([^”"»]{3,})[”"»]/g)].map((m) => m[1].trim())

  if (potriviri.length === 0) {
    return {
      slug: c.slug,
      denumire: c.denumire,
      din: c.puncte_max,
      puncte: 0,
      stare: 'acordat',
      explicatie: 'Nu am gasit niciun citat din textul-suport. Baremul cere valorificarea textului.',
    }
  }

  // Fara textul-suport putem confirma doar ca exista ghilimele — nu si ca ce e
  // intre ele chiar vine din text. Diferenta conteaza: baremul distinge
  // „valorificarea textului" de „simpla citare".
  if (!ctx.textSuport) {
    return {
      slug: c.slug,
      denumire: c.denumire,
      din: c.puncte_max,
      puncte: c.puncte_max,
      stare: 'acordat',
      explicatie: `Am gasit ${potriviri.length} ${potriviri.length === 1 ? 'citat' : 'citate'}. Nu am avut textul-suport ca sa verific provenienta.`,
    }
  }

  const suport = normalizeaza(ctx.textSuport)
  const dinText = potriviri.filter((p) => suport.includes(normalizeaza(p)))

  return {
    slug: c.slug,
    denumire: c.denumire,
    din: c.puncte_max,
    puncte: dinText.length > 0 ? c.puncte_max : 0,
    stare: 'acordat',
    explicatie:
      dinText.length > 0
        ? `Citatul folosit apare in textul-suport.`
        : 'Ai folosit ghilimele, dar fragmentul citat nu apare in textul-suport.',
  }
}

function verificaRaspunsInEnunt(c: Criteriu, ctx: ContextCorectare): RezultatCriteriu {
  const t = ctx.text.trim()
  // Enunt complet, verificabil fara interpretare: incepe cu majuscula, se termina
  // cu semn de punctuatie final si are macar cateva cuvinte. Baremul cere ca
  // raspunsul „sa dezvolte subiectul propus" — asta nu se poate masura aici, dar
  // forma de enunt, da.
  const incepeCuMajuscula = /^\p{Lu}/u.test(t)
  const areFinal = /[.!?]$/.test(t)
  const destuleCuvinte = numaraCuvinte(t) >= 4
  const ok = incepeCuMajuscula && areFinal && destuleCuvinte

  const lipsuri: string[] = []
  if (!incepeCuMajuscula) lipsuri.push('nu incepe cu majuscula')
  if (!areFinal) lipsuri.push('nu se termina cu punct')
  if (!destuleCuvinte) lipsuri.push('e prea scurt pentru un enunt')

  return {
    slug: c.slug,
    denumire: c.denumire,
    din: c.puncte_max,
    puncte: ok ? c.puncte_max : 0,
    stare: 'acordat',
    explicatie: ok
      ? 'Raspunsul e formulat ca enunt complet. Punctul se acorda chiar daca raspunsul e gresit la continut.'
      : `Raspunsul ${lipsuri.join(', ')}. Baremul cere formularea in enunt.`,
  }
}

function verificaAcordatImplicit(c: Criteriu): RezultatCriteriu {
  return {
    slug: c.slug,
    denumire: c.denumire,
    din: c.puncte_max,
    puncte: c.puncte_max,
    stare: 'acordat',
    explicatie: 'Criteriul nu are corespondent la un text scris digital, deci se acorda integral.',
  }
}

function verificaLanguageTool(c: Criteriu): RezultatCriteriu {
  // LanguageTool self-hostat e o sarcina separata (grupa F). Pana atunci NU dam 0:
  // criteriul ramane nenotat si trece la mentor.
  return {
    slug: c.slug,
    denumire: c.denumire,
    din: c.puncte_max,
    puncte: null,
    stare: 'indisponibil',
    explicatie: 'Verificarea ortografiei si a punctuatiei nu e inca disponibila. Criteriul ramane de notat.',
  }
}

// ─────────────────────────────────────────────────────────────
// Aplicarea
// ─────────────────────────────────────────────────────────────

export function aplicaCriteriu(c: Criteriu, ctx: ContextCorectare): RezultatCriteriu {
  switch (c.verificator) {
    case 'numar_cuvinte':
      return verificaNumarCuvinte(c, ctx)
    case 'conectori':
      return verificaConectori(c, ctx)
    case 'parti_componente':
      return verificaPartiComponente(c, ctx)
    case 'concluzie':
      return verificaConcluzie(c, ctx)
    case 'citat':
      return verificaCitat(c, ctx)
    case 'raspuns_in_enunt':
      return verificaRaspunsInEnunt(c, ctx)
    case 'acordat_implicit':
      return verificaAcordatImplicit(c)
    case 'languagetool':
      return verificaLanguageTool(c)
    default:
      // Criteriu pe stratul auto cu verificator necunoscut. Migrarea si validatorul
      // ar trebui sa faca asta imposibil; daca totusi ajunge aici, nu inventam un
      // punctaj.
      return {
        slug: c.slug,
        denumire: c.denumire,
        din: c.puncte_max,
        puncte: null,
        stare: 'indisponibil',
        explicatie: 'Criteriul nu are un verificator cunoscut, deci nu poate fi notat automat.',
      }
  }
}

export type RezultatStrat1 = {
  criterii: RezultatCriteriu[]
  // Punctele efectiv acordate.
  puncte: number
  // Din cate puncte s-a putut nota. NU e totalul rubricii — exclude criteriile
  // indisponibile si pe cele de pe straturile ai/mentor. Afisat ca „7 din 8", ca
  // elevul sa nu creada ca a pierdut restul.
  dinCatePosibile: number
  // Cate puncte au ramas nenotate fiindca unealta lipseste.
  puncteNenotate: number
}

export function corecteazaStrat1(r: Rubrica, ctx: ContextCorectare): RezultatStrat1 {
  const criterii = r.criterii
    .filter((c) => c.strat === 'auto')
    .map((c) => aplicaCriteriu(c, ctx))

  const acordate = criterii.filter((c) => c.stare === 'acordat')

  return {
    criterii,
    puncte: acordate.reduce((s, c) => s + (c.puncte ?? 0), 0),
    dinCatePosibile: acordate.reduce((s, c) => s + c.din, 0),
    puncteNenotate: criterii
      .filter((c) => c.stare === 'indisponibil')
      .reduce((s, c) => s + c.din, 0),
  }
}
