import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { AppUser } from '@/lib/current-user'

const ORA = 3_600_000

const h = vi.hoisted(() => {
  const state = {
    user: null as AppUser | null,
    // Ce intoarce citirea tichetului
    ticket: null as unknown,
    // Randurile intoarse de UPDATE-ul conditionat. Lista goala = cursa pierduta.
    actualizate: [] as unknown[],
    eroareUpdate: null as unknown,
  }
  // Lantul de apeluri pe `update`, ca sa verificam ca `.is('preluat_la', null)`
  // chiar ajunge in scriere — acolo sta corectitudinea, nu in citirea de dinainte.
  const updateCalls: unknown[][] = []

  function from() {
    const b: Record<string, unknown> = {}
    const chain =
      (name: string) =>
      (...args: unknown[]) => {
        updateCalls.push([name, ...args])
        return b
      }
    for (const m of ['select', 'eq', 'is', 'update', 'order', 'in', 'neq', 'limit', 'insert']) {
      b[m] = chain(m)
    }
    b.single = () => Promise.resolve({ data: state.ticket, error: null })
    b.maybeSingle = () => Promise.resolve({ data: state.ticket, error: null })
    b.then = (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) =>
      Promise.resolve({ data: state.actualizate, error: state.eroareUpdate }).then(res, rej)
    return b
  }

  return {
    state,
    updateCalls,
    supabaseAdmin: { from: vi.fn(from) },
    logError: vi.fn(async () => {}),
    getCurrentAppUser: vi.fn(async () => state.user),
  }
})

vi.mock('@/lib/supabase-admin', () => ({ supabaseAdmin: h.supabaseAdmin }))
vi.mock('@/lib/log-error', () => ({ logError: h.logError }))
vi.mock('@/lib/current-user', async () => {
  const real = await vi.importActual<typeof import('@/lib/current-user')>('@/lib/current-user')
  return { ...real, getCurrentAppUser: h.getCurrentAppUser }
})

import { POST as preia } from '@/app/api/tickets/[id]/preia/route'
import {
  ePool,
  eIntarziat,
  expirareRezervare,
  ORE_REZERVARE,
  ORE_INTARZIERE,
  type AlocareTichet,
} from '@/lib/alocare-tichete'

const mentor: AppUser = { id: 'm1', clerk_id: 'c_m1', role: 'mentor', subscription_status: 'free', subscription_end_date: null }
const altMentor: AppUser = { id: 'm2', clerk_id: 'c_m2', role: 'mentor', subscription_status: 'free', subscription_end_date: null }
const elev: AppUser = { id: 'e1', clerk_id: 'c_e1', role: 'student', subscription_status: 'active', subscription_end_date: null }

const ACUM = new Date('2026-09-04T12:00:00.000Z')

function tichet(over: Partial<AlocareTichet> = {}): AlocareTichet & { id: string } {
  return {
    id: 't1',
    mentor_rezervat_id: null,
    rezervat_pana: null,
    preluat_la: null,
    created_at: ACUM.toISOString(),
    status: 'open',
    ...over,
  }
}

function ctx(id = 't1') {
  return { params: Promise.resolve({ id }) }
}
const req = () => new Request('http://x/api/tickets/t1/preia', { method: 'POST' }) as never

beforeEach(() => {
  vi.clearAllMocks()
  h.updateCalls.length = 0
  h.state.user = mentor
  h.state.ticket = tichet()
  h.state.actualizate = [{ id: 't1', mentor_rezervat_id: 'm1', preluat_la: ACUM.toISOString(), status: 'open' }]
  h.state.eroareUpdate = null
})

// -- Logica pura de alocare ---------------------------------------------

describe('ePool', () => {
  it('fara mentor rezervat -> in pool', () => {
    expect(ePool(tichet(), ACUM)).toBe(true)
  })

  it('rezervat si inca valabil -> NU e in pool', () => {
    const t = tichet({
      mentor_rezervat_id: 'm1',
      rezervat_pana: new Date(ACUM.getTime() + ORA).toISOString(),
    })
    expect(ePool(t, ACUM)).toBe(false)
  })

  it('rezervare expirata -> cade singur in pool, fara sa-l atinga nimeni', () => {
    const t = tichet({
      mentor_rezervat_id: 'm1',
      rezervat_pana: new Date(ACUM.getTime() - ORA).toISOString(),
    })
    expect(ePool(t, ACUM)).toBe(true)
  })

  it('preluat ferm -> nu mai intra in pool niciodata', () => {
    const t = tichet({
      mentor_rezervat_id: 'm1',
      preluat_la: new Date(ACUM.getTime() - 100 * ORA).toISOString(),
    })
    expect(ePool(t, ACUM)).toBe(false)
  })
})

describe('eIntarziat', () => {
  it('mai vechi decat pragul si nepreluat -> intarziat', () => {
    const t = tichet({ created_at: new Date(ACUM.getTime() - 25 * ORA).toISOString() })
    expect(eIntarziat(t, ACUM)).toBe(true)
  })

  it('proaspat -> nu', () => {
    expect(eIntarziat(tichet(), ACUM)).toBe(false)
  })

  it('preluat -> NU e intarziat oricat ar sta: are un om pe el', () => {
    const t = tichet({
      created_at: new Date(ACUM.getTime() - 200 * ORA).toISOString(),
      preluat_la: ACUM.toISOString(),
    })
    expect(eIntarziat(t, ACUM)).toBe(false)
  })

  it('inchis -> nu se mai numara', () => {
    const t = tichet({
      created_at: new Date(ACUM.getTime() - 200 * ORA).toISOString(),
      status: 'closed',
    })
    expect(eIntarziat(t, ACUM)).toBe(false)
  })
})

describe('praguri', () => {
  it('expirareRezervare cade la ORE_REZERVARE dupa acum', () => {
    expect(expirareRezervare(ACUM)).toBe(
      new Date(ACUM.getTime() + ORE_REZERVARE * ORA).toISOString()
    )
  })

  it('pragurile decise: 8 si 24 de ore', () => {
    expect(ORE_REZERVARE).toBe(8)
    expect(ORE_INTARZIERE).toBe(24)
  })
})

// -- POST /api/tickets/[id]/preia ---------------------------------------

describe('POST /api/tickets/[id]/preia', () => {
  it('nelogat -> 401', async () => {
    h.state.user = null
    expect((await preia(req(), ctx())).status).toBe(401)
  })

  it('elev -> 403, nu 404: raspunsul nu depinde de ce tichet a cerut', async () => {
    h.state.user = elev
    const res = await preia(req(), ctx())
    expect(res.status).toBe(403)
  })

  it('tichet inexistent -> 404', async () => {
    h.state.ticket = null
    expect((await preia(req(), ctx())).status).toBe(404)
  })

  it('tichet inchis -> 409', async () => {
    h.state.ticket = tichet({ status: 'closed' })
    expect((await preia(req(), ctx())).status).toBe(409)
  })

  it('din pool -> preluat, cu preluat_la si termenul golit', async () => {
    const res = await preia(req(), ctx())
    expect(res.status).toBe(200)
    const update = h.updateCalls.find((c) => c[0] === 'update')
    expect(update?.[1]).toMatchObject({ mentor_rezervat_id: 'm1', rezervat_pana: null })
    expect((update?.[1] as { preluat_la: string }).preluat_la).toBeTruthy()
  })

  it('UPDATE-ul poarta conditia preluat_la is null — aici sta corectitudinea', async () => {
    await preia(req(), ctx())
    expect(h.updateCalls).toContainEqual(['is', 'preluat_la', null])
  })

  it('rezervat pentru altcineva, inca valabil -> 409, fara scriere', async () => {
    h.state.ticket = tichet({
      mentor_rezervat_id: 'm2',
      rezervat_pana: new Date(Date.now() + ORA).toISOString(),
    })
    const res = await preia(req(), ctx())
    expect(res.status).toBe(409)
    expect(h.updateCalls.some((c) => c[0] === 'update')).toBe(false)
  })

  it('propria rezervare se poate prelua — asta E exercitarea dreptului de prim refuz', async () => {
    h.state.ticket = tichet({
      mentor_rezervat_id: 'm1',
      rezervat_pana: new Date(Date.now() + ORA).toISOString(),
    })
    const res = await preia(req(), ctx())
    expect(res.status).toBe(200)
  })

  it('rezervarea EXPIRATA a altcuiva -> se poate prelua', async () => {
    h.state.ticket = tichet({
      mentor_rezervat_id: 'm2',
      rezervat_pana: new Date(Date.now() - ORA).toISOString(),
    })
    expect((await preia(req(), ctx())).status).toBe(200)
  })

  // Testul care justifica intreaga ruta: doi mentori apasa in aceeasi secunda.
  // Amandoi trec de citire (tichetul chiar era liber), dar UPDATE-ul conditionat
  // atinge zero randuri pentru al doilea.
  it('cursa: cel care pierde primeste 409, nu 500 si nu un tichet furat', async () => {
    h.state.user = altMentor
    h.state.actualizate = []
    const res = await preia(req(), ctx())
    expect(res.status).toBe(409)
    expect(h.logError).not.toHaveBeenCalled()
  })

  it('eroare reala de DB -> 500 + log', async () => {
    h.state.eroareUpdate = { code: '08006', message: 'connection failed' }
    const res = await preia(req(), ctx())
    expect(res.status).toBe(500)
    expect(h.logError).toHaveBeenCalled()
  })
})
