import { auth, currentUser } from '@clerk/nextjs/server'
import { stripe } from '@/lib/stripe'
import { logError } from '@/lib/log-error'
import { apiError } from '@/lib/api-error'

// Creeaza o sesiune Stripe Checkout pentru abonamentul lunar premium.
// Frontend-ul apeleaza POST /api/checkout si redirectioneaza userul la `url`.
export async function POST() {
  const { userId } = await auth()
  if (!userId) {
    return apiError(401, 'Unauthorized')
  }

  const priceId = process.env.STRIPE_PRICE_ID_MONTHLY
  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  if (!priceId) {
    await logError('stripe-checkout', 'STRIPE_PRICE_ID_MONTHLY lipseste')
    return apiError(500, 'Stripe nu este configurat')
  }

  const user = await currentUser()
  const email = user?.emailAddresses[0]?.emailAddress

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: email,
      // Leaga sesiunea de userul Clerk; folosit de webhook ca sa stie pe cine sa actualizeze.
      client_reference_id: userId,
      metadata: { clerk_id: userId },
      subscription_data: { metadata: { clerk_id: userId } },
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
