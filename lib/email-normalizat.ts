// Normalizarea adresei de email, pentru "un singur trial per elev".
//
// Problema: `e.l.e.v+bac2@gmail.com` si `elev@gmail.com` sunt aceeasi casuta la
// Gmail, dar siruri diferite in baza noastra de date. Fara normalizare, un elev
// isi ia trial dupa trial din acelasi cont de email, fara sa faca nimic special.
//
// Normalizarea NU e o masura de securitate — e o masura de frictiune. Prinde cazul
// lenes, care e majoritatea. Cine chiar vrea sa ocoleasca isi face alt cont; pentru
// asta exista verificarea prin SMS (vezi TASKS, `antiabuz-telefon`).

// Furnizorii la care punctul din partea locala e ignorat de server. NU e o regula
// generala de email: la majoritatea domeniilor `a.b@x.ro` si `ab@x.ro` sunt doua
// casute diferite, iar daca le-am uni am refuza trial-ul unui om nevinovat. De
// aceea scoatem punctele DOAR aici, pe lista, nu peste tot.
const DOMENII_FARA_PUNCTE = new Set(['gmail.com', 'googlemail.com'])

// Aliasuri de domeniu care duc la aceeasi casuta.
const ALIAS_DOMENIU: Record<string, string> = {
  'googlemail.com': 'gmail.com',
}

// Separatorul de eticheta (`+tag`) e insa aproape universal — Gmail, Outlook,
// Fastmail, Proton, majoritatea serverelor self-hosted. Il taiem peste tot.
const SEPARATOR_ETICHETA = '+'

/**
 * Forma canonica a unei adrese: domeniu in litere mici, `+eticheta` taiata,
 * puncte scoase la furnizorii care le ignora, alias de domeniu rezolvat.
 *
 * Intoarce `null` daca adresa nu are forma `local@domeniu` — apelantul decide
 * ce face cu asta (noi nu blocam inregistrarea, doar nu acordam trial).
 */
export function normalizeazaEmail(email: string | null | undefined): string | null {
  if (!email) return null

  const taiat = email.trim()
  const at = taiat.lastIndexOf('@')
  if (at <= 0 || at === taiat.length - 1) return null

  let local = taiat.slice(0, at)
  let domeniu = taiat.slice(at + 1).toLowerCase()

  domeniu = ALIAS_DOMENIU[domeniu] ?? domeniu

  // Partea locala e, in standard, sensibila la litere mari. In practica niciun
  // furnizor relevant nu o trateaza asa, iar noi comparam casute, nu adrese.
  local = local.toLowerCase()

  const eticheta = local.indexOf(SEPARATOR_ETICHETA)
  if (eticheta > 0) local = local.slice(0, eticheta)
  // `+tag@...` fara parte locala inseamna adresa invalida, nu casuta goala.
  if (eticheta === 0) return null

  if (DOMENII_FARA_PUNCTE.has(domeniu)) local = local.replaceAll('.', '')

  if (!local) return null
  return `${local}@${domeniu}`
}
