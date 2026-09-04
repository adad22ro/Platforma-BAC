import { describe, it, expect } from 'vitest'
import { normalizeazaEmail } from '@/lib/email-normalizat'
import { eDomeniuTemporar, NUMAR_DOMENII_TEMPORARE } from '@/lib/domenii-temporare'

describe('normalizeazaEmail', () => {
  it('taie eticheta +tag', () => {
    expect(normalizeazaEmail('elev+bac2@example.com')).toBe('elev@example.com')
  })

  it('scoate punctele la Gmail', () => {
    expect(normalizeazaEmail('e.l.e.v@gmail.com')).toBe('elev@gmail.com')
  })

  it('PASTREAZA punctele la alte domenii', () => {
    // Regresia care conteaza: la majoritatea furnizorilor `a.b@x.ro` si `ab@x.ro`
    // sunt doua casute diferite. Daca le-am uni, am refuza trial-ul unui om nevinovat.
    expect(normalizeazaEmail('ion.popescu@scoala.ro')).toBe('ion.popescu@scoala.ro')
  })

  it('googlemail.com si gmail.com sunt aceeasi casuta', () => {
    expect(normalizeazaEmail('E.lev+x@googlemail.com')).toBe('elev@gmail.com')
  })

  it('domeniul si partea locala trec in litere mici', () => {
    expect(normalizeazaEmail('  Elev@Example.COM ')).toBe('elev@example.com')
  })

  it('adresele fara forma local@domeniu dau null', () => {
    for (const rau of ['', '   ', 'fara-at', '@example.com', 'elev@', '+tag@gmail.com']) {
      expect(normalizeazaEmail(rau)).toBeNull()
    }
    expect(normalizeazaEmail(null)).toBeNull()
    expect(normalizeazaEmail(undefined)).toBeNull()
  })

  it('un @ in partea locala nu rupe normalizarea', () => {
    expect(normalizeazaEmail('"a@b"@example.com')).toBe('"a@b"@example.com')
  })
})

describe('eDomeniuTemporar', () => {
  it('prinde domeniile din lista', () => {
    expect(eDomeniuTemporar('cineva@mailinator.com')).toBe(true)
    expect(eDomeniuTemporar('cineva@yopmail.com')).toBe(true)
  })

  it('lasa sa treaca domeniile obisnuite', () => {
    expect(eDomeniuTemporar('elev@gmail.com')).toBe(false)
    expect(eDomeniuTemporar('elev@scoala.ro')).toBe(false)
  })

  it('null / adresa fara @ nu sunt temporare', () => {
    expect(eDomeniuTemporar(null)).toBe(false)
    expect(eDomeniuTemporar('fara-at')).toBe(false)
  })

  it('lista nu s-a golit dintr-o editare gresita', () => {
    expect(NUMAR_DOMENII_TEMPORARE).toBeGreaterThan(20)
  })
})
