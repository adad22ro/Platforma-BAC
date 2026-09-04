// Domenii de email de unica folosinta.
//
// Al doilea val de abuz, dupa normalizare: cine intelege ca `+tag` nu mai merge
// trece la mailinator. Lista, NU euristica — orice euristica ("domeniu tanar",
// "fara MX de mult timp", "nume scurt") ar respinge si adrese legitime de scoala
// sau de furnizor mic, iar un elev refuzat la inregistrare nu se mai intoarce.
//
// Consecinta acceptata: lista e incompleta prin definitie si trebuie improspatata
// periodic (vezi sectiunea de intretinere recurenta din TASKS). Prefera sa scape
// un abuz decat sa blocheze un elev real.
const DOMENII_TEMPORARE = new Set([
  '0-mail.com',
  '10minutemail.com',
  '20minutemail.com',
  'discard.email',
  'dispostable.com',
  'emailondeck.com',
  'fakeinbox.com',
  'getairmail.com',
  'getnada.com',
  'guerrillamail.com',
  'guerrillamail.info',
  'guerrillamail.net',
  'guerrillamailblock.com',
  'inboxbear.com',
  'mailcatch.com',
  'maildrop.cc',
  'mailinator.com',
  'mailnesia.com',
  'mintemail.com',
  'moakt.com',
  'mohmal.com',
  'mytemp.email',
  'sharklasers.com',
  'spam4.me',
  'temp-mail.io',
  'temp-mail.org',
  'tempmail.com',
  'tempmailo.com',
  'tempr.email',
  'throwawaymail.com',
  'trashmail.com',
  'trashmail.de',
  'yopmail.com',
  'yopmail.fr',
  'yopmail.net',
])

/** Cate domenii contine lista — folosit de `/admin` si de testul de regresie. */
export const NUMAR_DOMENII_TEMPORARE = DOMENII_TEMPORARE.size

/**
 * Adresa vine de la un furnizor de casute temporare?
 *
 * Asteapta o adresa deja normalizata (`normalizeazaEmail`), fiindca acolo se
 * rezolva aliasurile de domeniu si literele mari.
 */
export function eDomeniuTemporar(emailNormalizat: string | null | undefined): boolean {
  if (!emailNormalizat) return false
  const at = emailNormalizat.lastIndexOf('@')
  if (at < 0) return false
  return DOMENII_TEMPORARE.has(emailNormalizat.slice(at + 1))
}
