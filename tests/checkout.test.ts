import { describe, it, expect, beforeEach, vi } from 'vitest'

const h = vi.hoisted(() => {
  const state = {
    userId: 'user_1' as string | null,
    email: 'elev@example.com' as string | undefined,
    sessionUrl: 'https://checkout.stripe.com/s/test' as string | null,
    createThrows: false,
  }
  const auth = vi.fn(async () => ({ userId: state.userId }))
  const currentUser = vi.fn(async () => ({
    emailAddresses: state.email ? [{ emailAddress: state.email }] : [],
  }))
  const sessionsCreate = vi.fn(async () => {
    if (state.createThrows) throw new Error('stripe error')
    return { url: state.sessionUrl }
  })
  const logError = vi.fn(async () => {})
  return { state, auth, currentUser, sessionsCreate, logError }
})

vi.mock('@clerk/nextjs/server', () => ({ auth: h.auth, currentUser: h.currentUser }))
vi.mock('@/lib/stripe', () => ({
  stripe: { checkout: { sessions: { create: h.sessionsCreate } } },
}))
vi.mock('@/lib/log-error', () => ({ logError: h.logError }))

import { POST } from '@/app/api/checkout/route'

beforeEach(() => {
  vi.clearAllMocks()
  h.state.userId = 'user_1'
  h.state.email = 'elev@example.com'
  h.state.sessionUrl = 'https://checkout.stripe.com/s/test'
  h.state.createThrows = false
  process.env.STRIPE_PRICE_ID_MONTHLY = 'price_123'
  process.env.NEXT_PUBLIC_APP_URL = 'https://app.test'
})

describe('POST /api/checkout', () => {
  it('user nelogat -> 401', async () => {
    h.state.userId = null
    const res = await POST()
    expect(res.status).toBe(401)
    expect(h.sessionsCreate).not.toHaveBeenCalled()
  })

  it('lipseste STRIPE_PRICE_ID_MONTHLY -> 500 + log', async () => {
    delete process.env.STRIPE_PRICE_ID_MONTHLY
    const res = await POST()
    expect(res.status).toBe(500)
    expect(h.logError).toHaveBeenCalledWith('stripe-checkout', expect.stringContaining('STRIPE_PRICE_ID_MONTHLY'))
    expect(h.sessionsCreate).not.toHaveBeenCalled()
  })

  it('succes -> { url } + sesiune legata de userul Clerk', async () => {
    const res = await POST()
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ url: 'https://checkout.stripe.com/s/test' })
    expect(h.sessionsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'subscription',
        client_reference_id: 'user_1',
        customer_email: 'elev@example.com',
        line_items: [{ price: 'price_123', quantity: 1 }],
        metadata: { clerk_id: 'user_1' },
      })
    )
  })

  it('Stripe arunca -> 500 + alerta critica', async () => {
    h.state.createThrows = true
    const res = await POST()
    expect(res.status).toBe(500)
    expect(h.logError).toHaveBeenCalledWith(
      'stripe-checkout',
      'Crearea sesiunii a esuat',
      expect.anything(),
      'critical'
    )
  })
})
