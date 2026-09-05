import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { AppUser } from '@/lib/current-user'

const h = vi.hoisted(() => {
  const state = {
    user: null as AppUser | null,
    // Rezultatele per tabel, consumate in ordinea apelurilor.
    results: {} as Record<string, { data: unknown; error: unknown }[]>,
    limba: null as unknown,
    limbaArunca: false,
  }
  const fromCalls: { table: string; calls: unknown[][] }[] = []

  function next(table: string) {
    const q = state.results[table]
    if (!q?.length) return { data: null, error: null }
    return q.length === 1 ? q[0] : q.shift()!
  }

  function from(table: string) {
    const rez = next(table)
    const record = { table, calls: [] as unknown[][] }
    fromCalls.push(record)
    const b: Record<string, unknown> = {}
    const chain =
      (name: string) =>
      (...args: unknown[]) => {
        record.calls.push([name, ...args])
        return b
      }
    for (const m of ['select', 'order', 'eq', 'neq', 'in', 'is', 'or', 'range', 'limit', 'insert', 'update', 'upsert', 'delete']) {
      b[m] = chain(m)
    }
    b.single = () => Promise.resolve(rez)
    b.maybeSingle = () => Promise.resolve(rez)
    b.then = (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) =>
      Promise.resolve(rez).then(res, rej)
    return b
  }

  return {
    state,
    fromCalls,
    supabaseAdmin: { from: vi.fn(from) },
    logError: vi.fn(async () => {}),
    getCurrentAppUser: vi.fn(async () => state.user),
    verificaLimba: vi.fn(async () => {
      if (state.limbaArunca) throw new Error('languagetool jos')
      return state.limba
    }),
  }
})

vi.mock('@/lib/supabase-admin', () => ({ supabaseAdmin: h.supabaseAdmin }))
vi.mock('@/lib/log-error', () => ({ logError: h.logError }))
vi.mock('@/lib/languagetool', () => ({ verificaLimba: h.verificaLimba }))
vi.mock('@/lib/current-user', async () => {
  const real = await vi.importActual<typeof import('@/lib/current-user')>('@/lib/current-user')
  return { ...real, getCurrentAppUser: h.getCurrentAppUser }
})

// Baremul activ: o rubrica cu doua criterii deterministe si unul de mentor.
const RUBRICA = {
  slug: 's3-redactare',
  subiect: 'III',
  denumire: 'Redactarea textului',
  profil: null,
  puncte_total: 10,
  minim_cuvinte: 150,
  observatii: null,
  criterii: [
    {
      slug: 'parti-componente',
      denumire: 'Existenta partilor componente',
      puncte_max: 2,
      strat: 'auto',
      verificator: 'parti_componente',
      praguri: [],
      parametri: null,
      observatii: null,
    },
    {
      slug: 'numar-cuvinte',
      denumire: 'Respectarea numarului minim de cuvinte',
      puncte_max: 1,
      strat: 'auto',
      verificator: 'numar_cuvinte',
      praguri: [],
      parametri: { minim: 5 },
      observatii: null,
    },
    {
      slug: 'continut',
      denumire: 'Calitatea argumentarii',
      puncte_max: 7,
      strat: 'mentor',
      verificator: null,
      praguri: [],
      parametri: null,
      observatii: null,
    },
  ],
}

vi.mock('@/lib/barem-db', () => ({
  citesteBaremActiv: vi.fn(async () => ({
    versiune_document: '2013',
    sursa: 'test',
    checksum: 'abc123',
    created_at: '2026-01-01T00:00:00Z',
    rubrici: [RUBRICA],
  })),
}))

import { GET as lucrariGET, POST as lucrariPOST } from '@/app/api/lucrari/route'
import { GET as lucrareGET } from '@/app/api/lucrari/[id]/route'

const elev: AppUser = { id: 'u-elev', clerk_id: 'c1', role: 'student', subscription_status: 'active', subscription_end_date: null }
const altElev: AppUser = { id: 'u-alt', clerk_id: 'c2', role: 'student', subscription_status: 'active', subscription_end_date: null }
const mentor: AppUser = { id: 'u-mentor', clerk_id: 'c3', role: 'mentor', subscription_status: 'free', subscription_end_date: null }

const TEXT_BUN = 'Primul paragraf al lucrarii mele.\n\nAl doilea paragraf, cuprinsul.\n\nIn concluzie, al treilea.'

function req(url = 'http://localhost/api/lucrari') {
  return new Request(url)
}
function jsonReq(body: unknown) {
  return new Request('http://localhost/api/lucrari', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}
function ctx(id = 'l1') {
  return { params: Promise.resolve({ id }) }
}

// Ce intorc interogarile pentru o creare reusita, in ordinea in care sunt facute.
function pregatesteCreare() {
  h.state.results = {
    barem_versions: [{ data: { id: 'v1' }, error: null }],
    barem_rubrici: [{ data: { id: 'r1' }, error: null }],
    barem_criterii: [
      { data: [{ id: 'c-parti', slug: 'parti-componente' }, { id: 'c-cuv', slug: 'numar-cuvinte' }], error: null },
    ],
    lucrari: [{ data: { id: 'l1', user_id: 'u-elev', rubrica_slug: 's3-redactare' }, error: null }],
    note_criterii: [{ data: null, error: null }],
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  h.fromCalls.length = 0
  h.state.user = elev
  h.state.results = {}
  h.state.limba = null
  h.state.limbaArunca = false
})

describe('POST /api/lucrari', () => {
  it('401 fara sesiune', async () => {
    h.state.user = null
    expect((await lucrariPOST(jsonReq({ text: 'x', rubrica_slug: 's3-redactare' }))).status).toBe(401)
  })

  it('400 fara rubrica sau fara text', async () => {
    expect((await lucrariPOST(jsonReq({ text: TEXT_BUN }))).status).toBe(400)
    expect((await lucrariPOST(jsonReq({ rubrica_slug: 's3-redactare' }))).status).toBe(400)
    expect((await lucrariPOST(jsonReq({ rubrica_slug: 's3-redactare', text: '   ' }))).status).toBe(400)
  })

  it('400 pentru text peste limita', async () => {
    const res = await lucrariPOST(jsonReq({ rubrica_slug: 's3-redactare', text: 'x'.repeat(20_001) }))
    expect(res.status).toBe(400)
  })

  it('400 pentru o rubrica inexistenta in baremul activ', async () => {
    const res = await lucrariPOST(jsonReq({ rubrica_slug: 'nu-exista', text: TEXT_BUN }))
    expect(res.status).toBe(400)
    expect(await res.text()).toContain('nu-exista')
  })

  it('salveaza lucrarea cu versiunea de barem INGHETATA pe ea', async () => {
    pregatesteCreare()
    const res = await lucrariPOST(jsonReq({ rubrica_slug: 's3-redactare', text: TEXT_BUN }))
    expect(res.status).toBe(201)

    const insert = h.fromCalls.find((c) => c.table === 'lucrari')?.calls.find((x) => x[0] === 'insert')
    // Fara versiune inghetata, o nota data azi s-ar raporta tacit la criterii care
    // s-au schimbat sub ea la urmatorul import de barem.
    expect(insert?.[1]).toMatchObject({
      user_id: 'u-elev',
      barem_version_id: 'v1',
      barem_rubrica_id: 'r1',
      rubrica_slug: 's3-redactare',
      status: 'trimisa',
    })
  })

  it('ruleaza stratul 1 si scrie notele automate', async () => {
    pregatesteCreare()
    const res = await lucrariPOST(jsonReq({ rubrica_slug: 's3-redactare', text: TEXT_BUN }))
    const body = await res.json()

    // Trei paragrafe si peste 5 cuvinte => amandoua criteriile automate, integral.
    expect(body.corectare.puncte).toBe(3)
    expect(body.corectare.dinCatePosibile).toBe(3)

    const upsert = h.fromCalls.find((c) => c.table === 'note_criterii')?.calls.find((x) => x[0] === 'upsert')
    const randuri = upsert?.[1] as Array<Record<string, unknown>>
    expect(randuri).toHaveLength(2)
    expect(randuri.every((r) => r.sursa === 'auto')).toBe(true)
    // Legatura catre criteriul din versiunea asta de barem, nu doar un text.
    expect(randuri.map((r) => r.criteriu_id).sort()).toEqual(['c-cuv', 'c-parti'])
  })

  it('scrierea notelor e idempotenta: upsert pe (lucrare, criteriu, sursa)', async () => {
    pregatesteCreare()
    await lucrariPOST(jsonReq({ rubrica_slug: 's3-redactare', text: TEXT_BUN }))
    const upsert = h.fromCalls.find((c) => c.table === 'note_criterii')?.calls.find((x) => x[0] === 'upsert')
    expect(upsert?.[2]).toEqual({ onConflict: 'lucrare_id,criteriu_slug,sursa' })
  })

  it('criteriile de mentor NU sunt notate automat', async () => {
    pregatesteCreare()
    await lucrariPOST(jsonReq({ rubrica_slug: 's3-redactare', text: TEXT_BUN }))
    const upsert = h.fromCalls.find((c) => c.table === 'note_criterii')?.calls.find((x) => x[0] === 'upsert')
    const sluguri = (upsert?.[1] as Array<{ criteriu_slug: string }>).map((r) => r.criteriu_slug)
    expect(sluguri).not.toContain('continut')
  })

  // Textul scris de un elev e munca lui. O unealta care nu raspunde n-are voie s-o arunce.
  it('daca scrierea notelor esueaza, lucrarea RAMANE salvata', async () => {
    pregatesteCreare()
    h.state.results.note_criterii = [{ data: null, error: { code: '42501', message: 'denied' } }]

    const res = await lucrariPOST(jsonReq({ rubrica_slug: 's3-redactare', text: TEXT_BUN }))
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.lucrare.id).toBe('l1')
    expect(body.corectare).toBeNull()
    expect(body.avertisment).toBeTruthy()
    expect(h.logError).toHaveBeenCalled()
  })

  it('daca LanguageTool cade, criteriile de limba nu devin 0 — lucrarea trece mai departe', async () => {
    pregatesteCreare()
    h.state.limbaArunca = true
    const res = await lucrariPOST(jsonReq({ rubrica_slug: 's3-redactare', text: TEXT_BUN }))
    expect(res.status).toBe(201)
    expect((await res.json()).corectare.puncte).toBe(3)
  })
})

describe('GET /api/lucrari', () => {
  it('elevul primeste doar lucrarile lui', async () => {
    h.state.results = { lucrari: [{ data: [], error: null }] }
    await lucrariGET(req('http://localhost/api/lucrari?user_id=altcineva'))
    const calls = h.fromCalls.find((c) => c.table === 'lucrari')?.calls ?? []
    expect(calls).toContainEqual(['eq', 'user_id', 'u-elev'])
    expect(calls.some(([, col, val]) => col === 'user_id' && val === 'altcineva')).toBe(false)
  })

  it('corectorul le vede pe toate', async () => {
    h.state.user = mentor
    h.state.results = { lucrari: [{ data: [], error: null }] }
    await lucrariGET(req())
    const calls = h.fromCalls.find((c) => c.table === 'lucrari')?.calls ?? []
    expect(calls.some(([name, col]) => name === 'eq' && col === 'user_id')).toBe(false)
  })

  it('e paginat si NU intoarce textul lucrarilor', async () => {
    h.state.results = { lucrari: [{ data: [], error: null }] }
    const res = await lucrariGET(req())
    const calls = h.fromCalls.find((c) => c.table === 'lucrari')?.calls ?? []
    expect(calls).toContainEqual(['range', 0, 50])
    // O lucrare are mii de cuvinte; o pagina de 50 ar fi sute de kilobytes.
    const select = calls.find((x) => x[0] === 'select')?.[1] as string
    expect(select).not.toContain('text')
    expect(await res.json()).toMatchObject({ meta: { limit: 50, has_more: false } })
  })
})

describe('GET /api/lucrari/[id]', () => {
  const lucrare = { id: 'l1', user_id: 'u-elev', rubrica_slug: 's3-redactare', text: TEXT_BUN, status: 'trimisa' }

  const note = [
    { id: 'n1', criteriu_slug: 'parti-componente', denumire: 'Parti', din: 2, puncte: 2, stare: 'acordat', sursa: 'auto', autor_id: null, explicatie: 'ok', updated_at: 'x' },
    { id: 'n2', criteriu_slug: 'parti-componente', denumire: 'Parti', din: 2, puncte: 1, stare: 'acordat', sursa: 'elev', autor_id: 'u-elev', explicatie: 'cred ca 1', updated_at: 'x' },
    { id: 'n3', criteriu_slug: 'continut', denumire: 'Argumentare', din: 7, puncte: null, stare: 'nenotat', sursa: 'mentor', autor_id: null, explicatie: null, updated_at: 'x' },
  ]

  it('404 pentru o lucrare straina — nu confirmam ca exista', async () => {
    h.state.user = altElev
    h.state.results = { lucrari: [{ data: lucrare, error: null }] }
    expect((await lucrareGET(req() as never, ctx())).status).toBe(404)
  })

  it('corectorul poate deschide orice lucrare', async () => {
    h.state.user = mentor
    h.state.results = { lucrari: [{ data: lucrare, error: null }], note_criterii: [{ data: note, error: null }] }
    expect((await lucrareGET(req() as never, ctx())).status).toBe(200)
  })

  it('grupeaza notele pe criteriu, cu toate sursele una langa alta', async () => {
    h.state.results = { lucrari: [{ data: lucrare, error: null }], note_criterii: [{ data: note, error: null }] }
    const body = await (await lucrareGET(req() as never, ctx())).json()

    const parti = body.criterii.find((c: { criteriu_slug: string }) => c.criteriu_slug === 'parti-componente')
    expect(parti.note.map((n: { sursa: string }) => n.sursa).sort()).toEqual(['auto', 'elev'])
  })

  // Autoevaluarea e un exercitiu, nu o nota. Daca ar intra in total, elevul si-ar
  // putea da singur punctajul.
  it('totalul NU include autoevaluarea elevului', async () => {
    h.state.results = { lucrari: [{ data: lucrare, error: null }], note_criterii: [{ data: note, error: null }] }
    const body = await (await lucrareGET(req() as never, ctx())).json()
    expect(body.total.puncte).toBe(2)
    expect(body.total.din).toBe(2)
  })

  it('punctele care asteapta pe cineva se arata separat, nu ca pierdute', async () => {
    h.state.results = { lucrari: [{ data: lucrare, error: null }], note_criterii: [{ data: note, error: null }] }
    const body = await (await lucrareGET(req() as never, ctx())).json()
    expect(body.total.in_asteptare).toBe(7)
  })
})
