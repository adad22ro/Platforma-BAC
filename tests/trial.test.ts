import { describe, it, expect, beforeEach, vi } from 'vitest'

const h = vi.hoisted(() => {
  const state = {
    // Ce intoarce citirea din `trialuri_consumate`
    gasit: null as unknown,
    eroareCitire: null as unknown,
    eroareInsert: null as unknown,
  }
  const insert = vi.fn(async () => ({ error: state.eroareInsert }))
  const maybeSingle = vi.fn(async () => ({ data: state.gasit, error: state.eroareCitire }))
  const logError = vi.fn(async () => {})
  return { state, insert, maybeSingle, logError }
})

vi.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: {
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: h.maybeSingle }) }),
      insert: h.insert,
    }),
  },
}))
vi.mock('@/lib/log-error', () => ({ logError: h.logError }))

import { decideTrial, marcheazaTrialConsumat, ZILE_TRIAL } from '@/lib/trial'

beforeEach(() => {
  vi.clearAllMocks()
  h.state.gasit = null
  h.state.eroareCitire = null
  h.state.eroareInsert = null
})

describe('decideTrial', () => {
  it('elev nou, adresa normala -> trial acordat', async () => {
    const d = await decideTrial('Elev+scoala@Gmail.com')
    expect(d).toEqual({ acordat: true, motiv: 'acordat', emailNormalizat: 'elev@gmail.com' })
  })

  it('adresa fara forma local@domeniu -> fara trial, fara citire in DB', async () => {
    const d = await decideTrial('fara-at')
    expect(d.acordat).toBe(false)
    expect(d.motiv).toBe('email-invalid')
    expect(h.maybeSingle).not.toHaveBeenCalled()
  })

  it('domeniu temporar -> fara trial, fara citire in DB', async () => {
    const d = await decideTrial('elev@mailinator.com')
    expect(d.acordat).toBe(false)
    expect(d.motiv).toBe('domeniu-temporar')
    expect(h.maybeSingle).not.toHaveBeenCalled()
  })

  it('casuta si-a folosit deja trial-ul -> refuzat', async () => {
    h.state.gasit = { email_normalizat: 'elev@gmail.com' }
    const d = await decideTrial('e.l.e.v@gmail.com')
    expect(d.acordat).toBe(false)
    expect(d.motiv).toBe('deja-consumat')
  })

  it('acelasi cont, alt +tag -> tot refuzat (miezul masurii)', async () => {
    h.state.gasit = { email_normalizat: 'elev@gmail.com' }
    const d = await decideTrial('elev+bac3@googlemail.com')
    expect(d.emailNormalizat).toBe('elev@gmail.com')
    expect(d.acordat).toBe(false)
  })

  it('eroare de DB -> acordam trial si logam', async () => {
    // Un elev real care nu-si primeste trial-ul din cauza unei caderi de DB e o
    // pierdere mai mare decat un trial in plus dat unui abuzator.
    h.state.eroareCitire = { code: '08006', message: 'connection failed' }
    const d = await decideTrial('elev@gmail.com')
    expect(d.acordat).toBe(true)
    expect(d.motiv).toBe('eroare-db')
    expect(h.logError).toHaveBeenCalled()
  })
})

describe('marcheazaTrialConsumat', () => {
  it('scrie randul', async () => {
    await marcheazaTrialConsumat({ emailNormalizat: 'elev@gmail.com', clerkId: 'user_1' })
    expect(h.insert).toHaveBeenCalledWith(
      expect.objectContaining({ email_normalizat: 'elev@gmail.com', clerk_id: 'user_1' })
    )
    expect(h.logError).not.toHaveBeenCalled()
  })

  it('conflictul pe cheia primara nu e eroare', async () => {
    h.state.eroareInsert = { code: '23505', message: 'duplicate key' }
    await marcheazaTrialConsumat({ emailNormalizat: 'elev@gmail.com' })
    expect(h.logError).not.toHaveBeenCalled()
  })

  it('alta eroare de scriere se logheaza critic', async () => {
    h.state.eroareInsert = { code: '42501', message: 'permission denied' }
    await marcheazaTrialConsumat({ emailNormalizat: 'elev@gmail.com' })
    expect(h.logError).toHaveBeenCalledWith('trial', expect.any(String), expect.any(Object), 'critical')
  })
})

describe('ZILE_TRIAL', () => {
  it('e 14, cat s-a decis', () => {
    expect(ZILE_TRIAL).toBe(14)
  })
})
