import { auth, currentUser } from '@clerk/nextjs/server'
import { stripe } from '@/lib/stripe'
import { getCurrentAppUser } from '@/lib/current-user'
import { logError } from '@/lib/log-error'
import { apiError } from '@/lib/api-error'
import { decideTrial, ZILE_TRIAL } from '@/lib/trial'

// Creeaza o sesiune Stripe Checkout pentru abonamentul lunar premium.
// Frontend-ul apeleaza POST /api/checkout si redirectioneaza userul la `url`.
export async function POST() {
  const { userId } = await auth()
  if (!userId) {
    return apiError(401, 'Unauthorized')
  }

  // Profesorii si mentorii au acces prin rol, nu prin abonament — o plata de la ei
  // ar fi bani luati degeaba, cu rambursare si abonament de anulat manual.
  //
  // Verificarea sta AICI, nu in UI. Butoanele de upgrade sunt deja ascunse pentru
  // `teacher` (`/dashboard`, `/profil`), dar ascunderea unui buton nu inchide o
  // ruta: `/upgrade` porneste checkout-ul din `useEffect`, deci simpla vizitare a
  // adresei duce pe Stripe. Singurul loc care opreste asta e ruta de API.
  const appUser = await getCurrentAppUser()
  if (appUser && appUser.role !== 'student') {
    return apiError(403, `Rolul ${appUser.role} are acces prin rol, nu prin abonament`)
  }

  const priceId = process.env.STRIPE_PRICE_ID_MONTHLY
  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  if (!priceId) {
    await logError('stripe-checkout', 'STRIPE_PRICE_ID_MONTHLY lipseste')
    return apiError(500, 'Stripe nu este configurat')
  }

  const user = await currentUser()
  const email = user?.emailAddresses[0]?.emailAddress

  // Trial-ul se decide aici, nu in UI: pretul si conditiile ofertei sunt
  // intotdeauna ale serverului. `metadata.trial` spune webhook-ului daca are ce
  // marca drept consumat cand plata reuseste.
  const trial = await decideTrial(email)

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: email,
      // Leaga sesiunea de userul Clerk; folosit de webhook ca sa stie pe cine sa actualizeze.
      client_reference_id: userId,
      metadata: {
        clerk_id: userId,
        trial: trial.acordat ? 'da' : 'nu',
        ...(trial.emailNormalizat ? { email_normalizat: trial.emailNormalizat } : {}),
      },
      subscription_data: {
        metadata: { clerk_id: userId },
        // Ceasul e al lui Stripe: el trimite `customer.subscription.trial_will_end`
        // si trece singur la plata. Noi nu tinem nicio data de trial in DB.
        ...(trial.acordat ? { trial_period_days: ZILE_TRIAL } : {}),
      },
      success_url: `${appUrl}/dashboard?checkout=success`,
      cancel_url: `${appUrl}/dashboard?checkout=cancel`,
    })

    return Response.json({ url: session.url })
  } catch (err) {
    console.error('Stripe checkout error:', err)
    await logError(
      'stripe-checkout',
      'Crearea sesiunii a esuat',
      { clerk_id: userId, error: err instanceof Error ? err.message : String(err) },
      'critical'
    )
    return apiError(500, 'Eroare la crearea sesiunii de plata')
  }
}
