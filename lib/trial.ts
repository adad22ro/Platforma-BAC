import { supabaseAdmin } from '@/lib/supabase-admin'
import { normalizeazaEmail } from '@/lib/email-normalizat'
import { eDomeniuTemporar } from '@/lib/domenii-temporare'
import { logError } from '@/lib/log-error'

/** Cate zile de trial primeste un elev nou. Stripe tine ceasul, nu noi. */
export const ZILE_TRIAL = 14

export type DecizieTrial = {
  acordat: boolean
  // De ce nu — pentru log si pentru `/admin`, nu pentru elev. Elevului nu-i
  // spunem "adresa ta pare temporara": i-am da harta ca sa ocoleasca.
  motiv: 'acordat' | 'email-invalid' | 'domeniu-temporar' | 'deja-consumat' | 'eroare-db'
  emailNormalizat: string | null
}

/**
 * Are elevul asta dreptul la cele 14 zile?
 *
 * Trei filtre, in ordinea costului: forma adresei, lista de domenii temporare,
 * apoi o citire din DB. La eroare de DB acordam trial-ul — un elev real care nu-si
 * primeste trial-ul din cauza unei caderi de baza de date e o pierdere mai mare
 * decat un trial in plus dat unui abuzator.
 */
export async function decideTrial(email: string | null | undefined): Promise<DecizieTrial> {
  const emailNormalizat = normalizeazaEmail(email)
  if (!emailNormalizat) {
    return { acordat: false, motiv: 'email-invalid', emailNormalizat: null }
  }
  if (eDomeniuTemporar(emailNormalizat)) {
    return { acordat: false, motiv: 'domeniu-temporar', emailNormalizat }
  }

  const { data, error } = await supabaseAdmin
    .from('trialuri_consumate')
    .select('email_normalizat')
    .eq('email_normalizat', emailNormalizat)
    .maybeSingle()

  if (error) {
    await logError('trial', 'Citirea trialuri_consumate a esuat — acordam trial', {
      code: error.code,
      message: error.message,
    })
    return { acordat: true, motiv: 'eroare-db', emailNormalizat }
  }

  if (data) return { acordat: false, motiv: 'deja-consumat', emailNormalizat }
  return { acordat: true, motiv: 'acordat', emailNormalizat }
}

/**
 * Marcheaza trial-ul drept consumat.
 *
 * Se apeleaza din webhook-ul Stripe, la `checkout.session.completed`, NU la crearea
 * sesiunii: intre "am apasat Upgrade" si "am terminat pe Stripe" elevul poate
 * renunta, iar un trial ars pe un checkout abandonat e un bug pe care nimeni nu-l
 * poate repara singur.
 *
 * Conflictul pe cheia primara (23505) nu e eroare: inseamna ca stim deja.
 */
export async function marcheazaTrialConsumat(fields: {
  emailNormalizat: string
  clerkId?: string | null
  stripeSubscriptionId?: string | null
}): Promise<void> {
  const { error } = await supabaseAdmin.from('trialuri_consumate').insert({
    email_normalizat: fields.emailNormalizat,
    clerk_id: fields.clerkId ?? null,
    stripe_subscription_id: fields.stripeSubscriptionId ?? null,
  })

  if (error && error.code !== '23505') {
    await logError(
      'trial',
      'Marcarea trial-ului consumat a esuat',
      { code: error.code, message: error.message, email_normalizat: fields.emailNormalizat },
      'critical'
    )
  }
}
