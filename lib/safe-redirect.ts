// Gazdele catre care avem voie sa redirectionam userul in fluxul de plata.
// Sesiunea de Checkout e creata de noi, pe server, si `url` vine de la Stripe —
// deci in practica e mereu o adresa Stripe. Validarea de aici e aparare in
// adancime: daca vreodata raspunsul rutei ajunge sa poata fi influentat, un
// `window.location.href = url` neverificat devine open redirect, adica o pagina
// de phishing servita de pe domeniul nostru, catre un elev care tocmai a apasat
// „Plateste".
const GAZDA_PERMISA = 'stripe.com'

export function isAllowedCheckoutUrl(raw: unknown): raw is string {
  if (typeof raw !== 'string' || raw.length === 0) return false

  let u: URL
  try {
    u = new URL(raw)
  } catch {
    // Adresele relative ajung tot aici: nu sunt URL-uri absolute valide. E in
    // regula — fluxul de plata nu are ce cauta pe o ruta interna.
    return false
  }

  if (u.protocol !== 'https:') return false

  // Egal sau subdomeniu. Punctul din fata conteaza: fara el, `notstripe.com` ar
  // trece prin `endsWith('stripe.com')`.
  return u.hostname === GAZDA_PERMISA || u.hostname.endsWith(`.${GAZDA_PERMISA}`)
}

// Varianta care INTOARCE adresa, in loc sa confirme doar ca e buna.
//
// Motivul pentru care exista: nu poti folosi adresa fara sa fi trecut prin
// verificare. Cu garda booleana, `url`-ul brut ramane la indemana in acelasi scop si
// e usor de scris din greseala `window.location.href = url` in loc de valoarea
// verificata. Aici valoarea verificata e singura pe care o ai.
//
// A fost incercata si ca sa scape de fals-pozitivul „Open Redirect" al lui Snyk Code
// (2026-08-25). N-a mers — Snyk urmareste tot lantul pana la `fetch` si raporteaza
// la fel. Ignorarea trebuie facuta din interfata Snyk, nu din `.snyk`, care acopera
// doar dependentele.
export function urlCheckoutSigur(raw: unknown): string | null {
  if (!isAllowedCheckoutUrl(raw)) return null
  return new URL(raw).toString()
}
