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
