// Formatul unic de eroare al API-ului.
//
// De ce exista: rutele intorceau text simplu (`new Response('Forbidden', ...)`).
// Frontendul web se descurca fiindca se uita doar la codul HTTP, dar un al doilea
// client — o aplicatie mobila — are nevoie de un cod stabil, pe care sa-l poata
// mapa la un mesaj tradus, fara sa parseze text englezesc. Cat exista un singur
// client, normalizarea e ieftina; cu doi devine schimbare cu ruptura in ambele.
//
// Forma: { error: "<cod>", message?: "<text pentru dezvoltator>" }
//
// `error` ramane un STRING la nivelul de sus, nu un obiect imbricat, ca sa fie
// superset peste singurul corp de eroare deja folosit — `{ error: "premium_required" }`
// de la 402. Asa nimic din ce exista nu se strica.
//
// `message` e pentru developer si pentru log-uri, NU pentru afisare la utilizator:
// clientul isi alege textul dupa `error`. De aceea nu se traduce.

export type ApiErrorCode =
  | 'bad_request'
  | 'unauthorized'
  | 'forbidden'
  | 'not_found'
  | 'premium_required'
  | 'conflict'
  | 'rate_limited'
  | 'server_error'

const CODE_BY_STATUS: Record<number, ApiErrorCode> = {
  400: 'bad_request',
  401: 'unauthorized',
  402: 'premium_required',
  403: 'forbidden',
  404: 'not_found',
  409: 'conflict',
  429: 'rate_limited',
  500: 'server_error',
}

export function apiError(status: number, message?: string, code?: ApiErrorCode): Response {
  const error = code ?? CODE_BY_STATUS[status] ?? 'server_error'
  return Response.json({ error, ...(message ? { message } : {}) }, { status })
}
