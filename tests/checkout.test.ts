import { describe, it, expect, beforeEach, vi } from 'vitest'

const h = vi.hoisted(() => {
  const state = {
    userId: 'user_1' as string | null,
    email: 'elev@example.com' as string | undefined,
    sessionUrl: 'https://checkout.stripe.com/s/test' as string | null,
    createThrows: false,
    role: 'student' as 'student' | 'teacher' | 'mentor' | null,
    trialAcordat: true,
  }
  const auth = vi.fn(async () => ({ userId: state.userId }))
  const currentUser = vi.fn(async () => ({
    emailAddresses: state.email ? [{ emailAddress: state.email }] : [],
  }))
  // Parametrul e tipat (si folosit trivial) ca `mock.calls[0][0]` sa nu fie `never`:
  // vrem sa putem inspecta ce s-a trimis la Stripe, nu doar sa comparam cu un obiect.
  const sessionsCreate = vi.fn(async (params: Record<string, unknown>) => {
    void params
    if (state.createThrows) throw new Error('stripe error')
    return { url: state.sessionUrl }
  })
  const logError = vi.fn(async () => {})
  const getCurrentAppUser = vi.fn(async () =>
    h_role() === null ? null : { id: 'u1', clerk_id: 'user_1', role: h_role() }
  )
  function h_role() {
    return state.role
  }
  const decideTrial = vi.fn(async () => ({
    acordat: state.trialAcordat,
    motiv: state.trialAcordat ? 'acordat' : 'deja-consumat',
    emailNormalizat: 'elev@example.com',
  }))
  return { state, auth, currentUser, sessionsCreate, logError, getCurrentAppUser, decideTrial }
})

vi.mock('@clerk/nextjs/server', () => ({ auth: h.auth, currentUser: h.currentUser }))
vi.mock('@/lib/stripe', () => ({
  stripe: { checkout: { sessions: { create: h.sessionsCreate } } },
}))
vi.mock('@/lib/log-error', () => ({ logError: h.logError }))
vi.mock('@/lib/current-user', () => ({ getCurrentAppUser: h.getCurrentAppUser }))
vi.mock('@/lib/trial', () => ({ decideTrial: h.decideTrial, ZILE_TRIAL: 14 }))

import { POST } from '@/app/api/checkout/route'

beforeEach(() => {
  vi.clearAllMocks()
  h.state.userId = 'user_1'
  h.state.email = 'elev@example.com'
  h.state.sessionUrl = 'https://checkout.stripe.com/s/test'
  h.state.createThrows = false
  h.state.role = 'student'
  h.state.trialAcordat = true
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
        metadata: expect.objectContaining({ clerk_id: 'user_1' }),
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

// Profesorii si mentorii au acces prin rol. Butoanele de upgrade le sunt deja
// ascunse, dar `/upgrade` porneste checkout-ul dintr-un `useEffect`, deci simpla
// vizitare a adresei ii ducea pe Stripe si puteau plati degeaba.
describe('POST /api/checkout — rolul cu acces prin rol nu plateste', () => {
  it('profesor -> 403, fara sesiune Stripe', async () => {
    h.state.role = 'teacher'
    const res = await POST()
    expect(res.status).toBe(403)
    expect(await res.json()).toMatchObject({ error: 'forbidden' })
    expect(h.sessionsCreate).not.toHaveBeenCalled()
  })

  it('mentor -> 403, fara sesiune Stripe', async () => {
    h.state.role = 'mentor'
    const res = await POST()
    expect(res.status).toBe(403)
    expect(h.sessionsCreate).not.toHaveBeenCalled()
  })

  it('elev -> trece mai departe la Stripe', async () => {
    h.state.role = 'student'
    const res = await POST()
    expect(res.status).toBe(200)
    expect(h.sessionsCreate).toHaveBeenCalledOnce()
  })

  // Un cont fara rand in `users` (inregistrat, dar inca nesincronizat) NU e blocat:
  // altfel un elev nou n-ar putea plati exact in fereastra in care vrea sa o faca.
  // Riscul invers — un profesor fara rand — nu exista: rolul se da tocmai pe rand.
  it('fara rand in users -> nu blocheaza plata', async () => {
    h.state.role = null
    const res = await POST()
    expect(res.status).toBe(200)
    expect(h.sessionsCreate).toHaveBeenCalledOnce()
  })
})

// Trial-ul e o conditie a ofertei, deci se decide pe server. UI-ul nu are cuvant:
// pretul si zilele gratuite nu se negociaza din browser.
describe('POST /api/checkout — trial de 14 zile', () => {
  it('elev eligibil -> trial_period_days pe abonament', async () => {
    await POST()
    expect(h.sessionsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        subscription_data: expect.objectContaining({ trial_period_days: 14 }),
        metadata: expect.objectContaining({
          trial: 'da',
          email_normalizat: 'elev@example.com',
        }),
      })
    )
  })

  it('trial deja consumat -> sesiune FARA trial_period_days', async () => {
    h.state.trialAcordat = false
    await POST()
    const arg = h.sessionsCreate.mock.calls[0]?.[0] as {
      subscription_data: Record<string, unknown>
      metadata: Record<string, string>
    }
    expect(arg.subscription_data).not.toHaveProperty('trial_period_days')
    expect(arg.metadata.trial).toBe('nu')
  })

  // Fara asta, webhook-ul ar marca drept consumat un trial pe care nu l-a dat nimeni.
  it('profesorul nici nu ajunge la decizia de trial', async () => {
    h.state.role = 'teacher'
    await POST()
    expect(h.decideTrial).not.toHaveBeenCalled()
  })
})
