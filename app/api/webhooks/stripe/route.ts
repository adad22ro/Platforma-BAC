import { NextRequest } from 'next/server'
import Stripe from 'stripe'
import { stripe } from '@/lib/stripe'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { logError } from '@/lib/log-error'

// La versiunea API 2026-06-24.dahlia `current_period_end` este per-item,
// nu pe obiectul Subscription. Citim defensiv ambele variante.
function getPeriodEnd(sub: Stripe.Subscription): string | null {
  const ts =
    (sub as unknown as { current_period_end?: number }).current_period_end ??
    sub.items?.data?.[0]?.current_period_end
  return ts ? new Date(ts * 1000).toISOString() : null
}

// Statusurile Stripe care inseamna acces premium activ.
const ACTIVE_STATUSES: Stripe.Subscription.Status[] = ['active', 'trialing']

// Actualizeaza userul in DB dupa stripe_customer_id (sursa de adevar pentru abonament),
// cu fallback pe clerk_id din metadata (prima oara cand inca nu avem customer_id salvat).
async function updateUserSubscription(
  fields: {
    subscription_status: 'free' | 'active' | 'cancelled'
    subscription_end_date: string | null
    stripe_customer_id?: string
  },
  match: { stripe_customer_id?: string; clerk_id?: string }
) {
  let query = supabaseAdmin.from('users').update(fields)
  if (match.stripe_customer_id) {
    query = query.eq('stripe_customer_id', match.stripe_customer_id)
  } else if (match.clerk_id) {
    query = query.eq('clerk_id', match.clerk_id)
  } else {
    return
  }
  const { error } = await query
  if (error) {
    console.error('Supabase update error (stripe):', error)
    await logError(
      'stripe-webhook',
      'Supabase update error',
      { code: error.code, message: error.message, ...match },
      'critical'
    )
  }
}

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')
  const secret = process.env.STRIPE_WEBHOOK_SECRET

  let event: Stripe.Event
  try {
    event = await stripe.webhooks.constructEventAsync(body, sig!, secret!)
  } catch (err) {
    console.error('Stripe webhook verification failed:', err)
    await logError(
      'stripe-webhook',
      'Verification failed',
      { error: err instanceof Error ? err.message : String(err) },
      'critical'
    )
    return new Response('Verification failed', { status: 400 })
  }

  // Idempotenta: Stripe poate livra acelasi eveniment de mai multe ori (retry-uri).
  // "Revendicam" event.id printr-un insert; daca exista deja (23505), l-am procesat.
  const { error: claimErr } = await supabaseAdmin
    .from('processed_events')
    .insert({ event_id: event.id, type: event.type })
  if (claimErr) {
    if (claimErr.code === '23505') {
      return new Response('Duplicate ignored', { status: 200 })
    }
    // Alta eroare la revendicare: logam, dar continuam procesarea (nu blocam plata).
    console.error('processed_events insert error:', claimErr)
    await logError('stripe-webhook', 'processed_events insert error', {
      code: claimErr.code,
      message: claimErr.message,
      event_id: event.id,
    })
  }

  try {
    switch (event.type) {
      // Plata initiala reusita: salvam customer_id si activam premium.
      case 'checkout.session.completed': {
        const session = event.data.object
        const clerkId = session.client_reference_id ?? session.metadata?.clerk_id
        const customerId =
          typeof session.customer === 'string' ? session.customer : session.customer?.id

        let endDate: string | null = null
        if (typeof session.subscription === 'string') {
          const sub = await stripe.subscriptions.retrieve(session.subscription)
          endDate = getPeriodEnd(sub)
        }

        await updateUserSubscription(
          {
            subscription_status: 'active',
            subscription_end_date: endDate,
            stripe_customer_id: customerId ?? undefined,
          },
          { clerk_id: clerkId ?? undefined }
        )
        break
      }

      // Reinnoire / schimbare de status (ex: plata esuata -> past_due, anulare programata).
      case 'customer.subscription.updated': {
        const sub = event.data.object
        const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id
        const isActive = ACTIVE_STATUSES.includes(sub.status)
        await updateUserSubscription(
          {
            subscription_status: isActive ? 'active' : 'cancelled',
            subscription_end_date: getPeriodEnd(sub),
          },
          { stripe_customer_id: customerId, clerk_id: sub.metadata?.clerk_id }
        )
        break
      }

      // Abonament terminat definitiv: revenire la free.
      case 'customer.subscription.deleted': {
        const sub = event.data.object
        const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id
        await updateUserSubscription(
          { subscription_status: 'cancelled', subscription_end_date: null },
          { stripe_customer_id: customerId, clerk_id: sub.metadata?.clerk_id }
        )
        break
      }
    }
  } catch (err) {
    console.error('Stripe webhook handler error:', err)
    // Eliberam claim-ul de idempotenta ca Stripe sa poata reincerca evenimentul.
    await supabaseAdmin.from('processed_events').delete().eq('event_id', event.id)
    await logError(
      'stripe-webhook',
      'Handler error',
      { type: event.type, error: err instanceof Error ? err.message : String(err) },
      'critical'
    )
    return new Response('Handler error', { status: 500 })
  }

  return new Response('OK', { status: 200 })
}
