// Paginare pentru rutele care intorc liste ce cresc cu folosirea aplicatiei.
//
// De ce acum: pana azi nicio ruta de lista n-avea limita. Pe web, pe fibra, nu se
// vede. Pe telefon, pe date celulare, se plateste de doua ori — transfer si baterie —
// iar o lista de tichete a unui corector creste cu fiecare intrebare pusa vreodata.
//
// `limit` + `offset`, nu cursor. Cursorul (keyset) e mai corect sub inserari
// concurente, dar cere o cheie de ordonare stabila si expusa in raspuns, adica un
// contract mai greu de consumat. La volumele astea — mii de randuri, nu milioane —
// offset-ul e corect si mult mai simplu de folosit dintr-un „incarca mai mult".

export const LIMITA_IMPLICITA = 50
export const LIMITA_MAXIMA = 100

export type Paginare = {
  limit: number
  offset: number
  /** Capatul pentru `.range()`, cu un rand in plus — vezi `taiePagina`. */
  rangeTo: number
}

export type MetaPaginare = {
  limit: number
  offset: number
  has_more: boolean
}

/**
 * Citeste `?limit=` si `?offset=` din cerere.
 *
 * Valorile invalide (text, negative, zero) cad pe implicite in loc sa dea 400: un
 * `?limit=abc` e o greseala de client, nu un motiv sa refuzi datele. `limit` e
 * plafonat la LIMITA_MAXIMA — altfel parametrul devine o cale de a cere toata baza.
 */
export function citestePaginarea(url: URL): Paginare {
  const limitBrut = Number(url.searchParams.get('limit'))
  const offsetBrut = Number(url.searchParams.get('offset'))

  const limit =
    Number.isInteger(limitBrut) && limitBrut > 0
      ? Math.min(limitBrut, LIMITA_MAXIMA)
      : LIMITA_IMPLICITA
  const offset = Number.isInteger(offsetBrut) && offsetBrut > 0 ? offsetBrut : 0

  // Cerem un rand in plus ca sa stim daca mai urmeaza ceva, fara un COUNT separat.
  // Un `count: 'exact'` ar fi insemnat inca o interogare peste tot tabelul la
  // FIECARE pagina, ca sa afisam un numar pe care interfata oricum nu-l foloseste.
  return { limit, offset, rangeTo: offset + limit }
}

/**
 * Taie randul suplimentar si spune daca mai urmeaza o pagina.
 *
 * Se apeleaza pe rezultatul unei interogari facute cu `.range(offset, rangeTo)`.
 */
export function taiePagina<T>(randuri: T[], p: Paginare): { pagina: T[]; meta: MetaPaginare } {
  const has_more = randuri.length > p.limit
  return {
    pagina: has_more ? randuri.slice(0, p.limit) : randuri,
    meta: { limit: p.limit, offset: p.offset, has_more },
  }
}
