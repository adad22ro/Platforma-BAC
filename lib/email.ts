// Trimiterea de email, prin Resend.
//
// De ce Resend si nu Postmark/SendGrid: se integreaza printr-un singur POST, nu
// cere pachet in plus, iar nivelul gratuit acopera cu mult volumul nostru.
//
// De ce `fetch` si nu SDK-ul oficial: API-ul e o singura ruta cu un Bearer. Un
// pachet in plus ar insemna inca o dependenta de urmarit la fiecare bump, pentru
// zece randuri de cod.
//
// DACA `RESEND_API_KEY` LIPSESTE, functia intoarce `{ trimis: false, motiv:
// 'neconfigurat' }` si NU arunca. Acelasi principiu ca la LanguageTool: un serviciu
// extern nepornit nu trebuie sa strice fluxul din care e apelat. Aici miza e mai
// mare decat pare — apelul vine dupa ce profesorul a scris un raspuns, iar o
// exceptie l-ar face sa creada ca raspunsul lui s-a pierdut. Nu s-a pierdut: e in
// DB inainte de a ajunge aici.

import { logError } from '@/lib/log-error'

export type RezultatEmail =
  | { trimis: true; id: string }
  | { trimis: false; motiv: 'neconfigurat' | 'eroare' }

type Mesaj = {
  catre: string
  subiect: string
  html: string
  // Varianta text a aceluiasi mesaj. Nu e optionala din politete: un email
  // doar-HTML e un semnal clasic de spam si scade livrabilitatea.
  text: string
}

// Adresa expeditorului. Domeniul TREBUIE verificat in Resend, altfel API-ul
// refuza trimiterea catre orice adresa in afara de a proprietarului contului.
const EXPEDITOR_IMPLICIT = 'Platforma BAC <noreply@platformabac.ro>'

export async function trimiteEmail(mesaj: Mesaj): Promise<RezultatEmail> {
  const cheie = process.env.RESEND_API_KEY
  if (!cheie) return { trimis: false, motiv: 'neconfigurat' }

  const from = process.env.EMAIL_FROM || EXPEDITOR_IMPLICIT

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${cheie}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [mesaj.catre],
        subject: mesaj.subiect,
        html: mesaj.html,
        text: mesaj.text,
      }),
    })

    if (!res.ok) {
      // Corpul erorii de la Resend spune exact ce lipseste (domeniu neverificat,
      // cheie invalida, adresa respinsa) — fara el, depanarea e ghicit.
      const detaliu = await res.text().catch(() => '')
      await logError('email', 'Resend a refuzat trimiterea', {
        status: res.status,
        detaliu: detaliu.slice(0, 500),
      })
      return { trimis: false, motiv: 'eroare' }
    }

    const data = (await res.json()) as { id?: string }
    return { trimis: true, id: data.id ?? '' }
  } catch (err) {
    await logError('email', 'Trimiterea a esuat', {
      error: err instanceof Error ? err.message : String(err),
    })
    return { trimis: false, motiv: 'eroare' }
  }
}

// Scapa textul introdus de om inainte de a-l pune in HTML. Continutul vine din
// mesajul profesorului, deci nu e ostil — dar un `<` intr-o formula matematica ar
// rupe tacit restul emailului, si asta e destul ca sa merite patru randuri.
export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
