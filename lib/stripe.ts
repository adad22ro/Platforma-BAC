import Stripe from 'stripe'

// Client pentru server (are acces complet, nu se foloseste in browser)
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-07-29.dahlia',
})
