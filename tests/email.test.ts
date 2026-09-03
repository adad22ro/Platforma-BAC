import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'

type LogError = (scope: string, msg: string, meta?: Record<string, unknown>) => Promise<void>
const h = vi.hoisted(() => ({ logError: vi.fn<LogError>(async () => {}) }))
vi.mock('@/lib/log-error', () => ({ logError: h.logError }))

import { trimiteEmail, escapeHtml } from '@/lib/email'

const fetchMock = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubGlobal('fetch', fetchMock)
  process.env.RESEND_API_KEY = 'rk_test'
  process.env.EMAIL_FROM = 'Test <noreply@test.ro>'
})

afterEach(() => {
  vi.unstubAllGlobals()
  delete process.env.RESEND_API_KEY
  delete process.env.EMAIL_FROM
})

const mesaj = {
  catre: 'elev@example.com',
  subiect: 'Subiect',
  html: '<p>salut</p>',
  text: 'salut',
}

describe('trimiteEmail', () => {
  // Cazul care conteaza cel mai mult: fara cheie, NU aruncam si NU logam eroare.
  // Apelantul (ruta de mesaje) a scris deja raspunsul profesorului in DB.
  it('fara RESEND_API_KEY -> neconfigurat, fara fetch, fara log de eroare', async () => {
    delete process.env.RESEND_API_KEY
    const r = await trimiteEmail(mesaj)
    expect(r).toEqual({ trimis: false, motiv: 'neconfigurat' })
    expect(fetchMock).not.toHaveBeenCalled()
    expect(h.logError).not.toHaveBeenCalled()
  })

  it('succes -> trimis + id, cu Bearer si expeditorul din EMAIL_FROM', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ id: 'em_1' }) })
    const r = await trimiteEmail(mesaj)
    expect(r).toEqual({ trimis: true, id: 'em_1' })

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://api.resend.com/emails')
    expect(init.headers.Authorization).toBe('Bearer rk_test')
    const body = JSON.parse(init.body)
    expect(body.from).toBe('Test <noreply@test.ro>')
    expect(body.to).toEqual(['elev@example.com'])
    // Varianta text pleaca mereu alaturi de HTML — un email doar-HTML cade in spam.
    expect(body.text).toBe('salut')
  })

  it('Resend refuza (domeniu neverificat) -> eroare + log cu detaliul', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 403,
      text: async () => 'The domain is not verified',
    })
    const r = await trimiteEmail(mesaj)
    expect(r).toEqual({ trimis: false, motiv: 'eroare' })
    expect(h.logError).toHaveBeenCalledOnce()
    const meta = h.logError.mock.calls[0][2] as { status: number; detaliu: string }
    expect(meta.status).toBe(403)
    expect(meta.detaliu).toContain('not verified')
  })

  it('reteaua cade -> eroare, fara sa arunce', async () => {
    fetchMock.mockRejectedValue(new Error('ECONNRESET'))
    await expect(trimiteEmail(mesaj)).resolves.toEqual({ trimis: false, motiv: 'eroare' })
    expect(h.logError).toHaveBeenCalledOnce()
  })
})

describe('escapeHtml', () => {
  it('neutralizeaza caracterele care ar rupe HTML-ul', () => {
    expect(escapeHtml('a < b & "c"')).toBe('a &lt; b &amp; &quot;c&quot;')
  })

  it('lasa textul obisnuit neatins, inclusiv diacritice', () => {
    expect(escapeHtml('Răspuns corect, felicitări!')).toBe('Răspuns corect, felicitări!')
  })
})
