import { describe, it, expect, beforeEach, vi } from 'vitest'

// --- Mock-uri hoisted (accesibile in factory-urile vi.mock) ---
const h = vi.hoisted(() => {
  const state = {
    insertResult: { error: null as unknown },
    updateResult: { error: null as unknown },
    constructThrows: false,
    subEndTs: 1_800_000_000, // secunde epoch pt. subscription retrieve
  }
  const insert = vi.fn(() => Promise.resolve(state.insertResult))
  const updateEq = vi.fn(() => Promise.resolve(state.updateResult))
  const update = vi.fn(() => ({ eq: updateEq }))
  const deleteEq = vi.fn(() => Promise.resolve({ error: null }))
  const del = vi.fn(() => ({ eq: deleteEq }))
  const from = vi.fn(() => ({ insert, update, delete: del }))

  const constructEventAsync = vi.fn(async (body: string) => {
    if (state.constructThrows) throw new Error('bad signature')
    return JSON.parse(body)
  })
  const subRetrieve = vi.fn(async () => ({
    items: { data: [{ current_period_end: state.subEndTs }] },
  }))
  const logError = vi.fn(async () => {})

  return {
    state,
    supa: { from, insert, update, updateEq, del, deleteEq },
    stripe: { constructEventAsync, subRetrieve },
    logError,
  }
})

vi.mock('@/lib/supabase-admin', () => ({ supabaseAdmin: { from: h.supa.from } }))
vi.mock('@/lib/stripe', () => ({
  stripe: {
    webhooks: { constructEventAsync: h.stripe.constructEventAsync },
    subscriptions: { retrieve: h.stripe.subRetrieve },
  },
}))
vi.mock('@/lib/log-error', () => ({ logError: h.logError }))

import { POST } from '@/app/api/webhooks/stripe/route'

// Construieste un Request cu body = event serializat (mock-ul de constructEvent il parseaza).
function req(event: unknown) {
  return new Request('http://x/api/webhooks/stripe', {
    method: 'POST',
    headers: { 'stripe-signature': 'sig' },
    body: JSON.stringify(event),
  }) as unknown as import('next/server').NextRequest
}

beforeEach(() => {
  vi.clearAllMocks()
  h.state.insertResult = { error: null }
  h.state.updateResult = { error: null }
  h.state.constructThrows = false
  h.state.subEndTs = 1_800_000_000
})

describe('POST /api/webhooks/stripe', () => {
  it('semnatura invalida -> 400 + alerta critica', async () => {
    h.state.constructThrows = true
    const res = await POST(req({ id: 'evt_1', type: 'ping' }))
    expect(res.status).toBe(400)
    expect(h.logError).toHaveBeenCalledWith(
      'stripe-webhook',
      'Verification failed',
      expect.anything(),
      'critical'
    )
    expect(h.supa.from).not.toHaveBeenCalled()
  })

  it('eveniment duplicat (23505) -> 200 fara procesare', async () => {
    h.state.insertResult = { error: { code: '23505' } }
    const res = await POST(req({ id: 'evt_dup', type: 'checkout.session.completed' }))
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('Duplicate ignored')
    // Nu s-a facut update pe users.
    expect(h.supa.update).not.toHaveBeenCalled()
  })

  it('checkout.session.completed -> user active + customer_id, match pe clerk_id', async () => {
    const event = {
      id: 'evt_co',
      type: 'checkout.session.completed',
      data: {
        object: {
          client_reference_id: 'user_clerk_1',
          customer: 'cus_123',
          subscription: 'sub_123',
        },
      },
    }
    const res = await POST(req(event))
    expect(res.status).toBe(200)
    expect(h.stripe.subRetrieve).toHaveBeenCalledWith('sub_123')
    expect(h.supa.update).toHaveBeenCalledWith({
      subscription_status: 'active',
      subscription_end_date: new Date(h.state.subEndTs * 1000).toISOString(),
      stripe_customer_id: 'cus_123',
    })
    expect(h.supa.updateEq).toHaveBeenCalledWith('clerk_id', 'user_clerk_1')
  })

  it('subscription.updated cu status activ -> active, match pe stripe_customer_id', async () => {
    const event = {
      id: 'evt_up',
      type: 'customer.subscription.updated',
      data: {
        object: {
          customer: 'cus_active',
          status: 'active',
          items: { data: [{ current_period_end: 1_900_000_000 }] },
          metadata: {},
        },
      },
    }
    await POST(req(event))
    expect(h.supa.update).toHaveBeenCalledWith({
      subscription_status: 'active',
      subscription_end_date: new Date(1_900_000_000 * 1000).toISOString(),
    })
    expect(h.supa.updateEq).toHaveBeenCalledWith('stripe_customer_id', 'cus_active')
  })

  it('subscription.updated cu status past_due -> cancelled', async () => {
    const event = {
      id: 'evt_pd',
      type: 'customer.subscription.updated',
      data: {
        object: {
          customer: 'cus_pd',
          status: 'past_due',
          items: { data: [{ current_period_end: 1_900_000_000 }] },
          metadata: {},
        },
      },
    }
    await POST(req(event))
    expect(h.supa.update).toHaveBeenCalledWith(
      expect.objectContaining({ subscription_status: 'cancelled' })
    )
  })

  it('subscription.deleted -> cancelled + end_date null', async () => {
    const event = {
      id: 'evt_del',
      type: 'customer.subscription.deleted',
      data: { object: { customer: 'cus_del', metadata: {} } },
    }
    await POST(req(event))
    expect(h.supa.update).toHaveBeenCalledWith({
      subscription_status: 'cancelled',
      subscription_end_date: null,
    })
    expect(h.supa.updateEq).toHaveBeenCalledWith('stripe_customer_id', 'cus_del')
  })

  it('eroare in handler -> elibereaza claim-ul + 500 + alerta critica', async () => {
    // Provocam eroare: subscription retrieve arunca in mijlocul procesarii.
    h.stripe.subRetrieve.mockRejectedValueOnce(new Error('stripe down'))
    const event = {
      id: 'evt_err',
      type: 'checkout.session.completed',
      data: { object: { client_reference_id: 'u1', customer: 'c1', subscription: 'sub_x' } },
    }
    const res = await POST(req(event))
    expect(res.status).toBe(500)
    // Claim-ul de idempotenta eliberat prin delete().eq('event_id', ...)
    expect(h.supa.del).toHaveBeenCalled()
    expect(h.supa.deleteEq).toHaveBeenCalledWith('event_id', 'evt_err')
    expect(h.logError).toHaveBeenCalledWith(
      'stripe-webhook',
      'Handler error',
      expect.anything(),
      'critical'
    )
  })

  it('eroare la update DB -> alerta critica (bani scrisi in tacere)', async () => {
    h.state.updateResult = { error: { code: 'XX', message: 'boom' } }
    const event = {
      id: 'evt_dberr',
      type: 'customer.subscription.deleted',
      data: { object: { customer: 'cus_z', metadata: {} } },
    }
    await POST(req(event))
    expect(h.logError).toHaveBeenCalledWith(
      'stripe-webhook',
      'Supabase update error',
      expect.anything(),
      'critical'
    )
  })
})
