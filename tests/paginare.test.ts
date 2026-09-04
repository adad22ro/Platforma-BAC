import { describe, it, expect } from 'vitest'
import {
  citestePaginarea,
  taiePagina,
  LIMITA_IMPLICITA,
  LIMITA_MAXIMA,
} from '@/lib/paginare'

function u(qs: string) {
  return new URL(`http://x/api/orice${qs}`)
}

describe('citestePaginarea', () => {
  it('fara parametri -> implicite', () => {
    const p = citestePaginarea(u(''))
    expect(p).toEqual({ limit: LIMITA_IMPLICITA, offset: 0, rangeTo: LIMITA_IMPLICITA })
  })

  it('cere un rand in plus fata de limit, ca sa stie daca mai urmeaza ceva', () => {
    // Fara randul suplimentar ar fi trebuit un COUNT separat la fiecare pagina,
    // peste tot tabelul, pentru un numar pe care interfata nu-l afiseaza.
    const p = citestePaginarea(u('?limit=10&offset=20'))
    expect(p.rangeTo - p.offset).toBe(p.limit)
    expect(p).toEqual({ limit: 10, offset: 20, rangeTo: 30 })
  })

  it('limit peste maxim e plafonat, nu respins', () => {
    expect(citestePaginarea(u('?limit=5000')).limit).toBe(LIMITA_MAXIMA)
  })

  it('valori invalide cad pe implicite, nu dau 400', () => {
    // Un `?limit=abc` e o greseala de client, nu un motiv sa refuzi datele.
    for (const qs of ['?limit=abc', '?limit=0', '?limit=-3', '?limit=1.5']) {
      expect(citestePaginarea(u(qs)).limit).toBe(LIMITA_IMPLICITA)
    }
    for (const qs of ['?offset=abc', '?offset=-10', '?offset=2.5']) {
      expect(citestePaginarea(u(qs)).offset).toBe(0)
    }
  })
})

describe('taiePagina', () => {
  const p = citestePaginarea(u('?limit=3'))

  it('randul suplimentar e taiat si semnalat', () => {
    const { pagina, meta } = taiePagina([1, 2, 3, 4], p)
    expect(pagina).toEqual([1, 2, 3])
    expect(meta).toEqual({ limit: 3, offset: 0, has_more: true })
  })

  it('pagina exact plina, fara rand suplimentar -> nu mai urmeaza nimic', () => {
    const { pagina, meta } = taiePagina([1, 2, 3], p)
    expect(pagina).toEqual([1, 2, 3])
    expect(meta.has_more).toBe(false)
  })

  it('lista goala', () => {
    const { pagina, meta } = taiePagina([], p)
    expect(pagina).toEqual([])
    expect(meta.has_more).toBe(false)
  })
})
