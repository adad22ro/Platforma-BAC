import type { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getCurrentAppUser, poateCorecta } from '@/lib/current-user'
import { apiError } from '@/lib/api-error'
import { logError } from '@/lib/log-error'

// GET /api/lucrari/[id] — lucrarea, cu textul si cu toate notele pe criterii.
//
// Doar autorul sau un corector. O lucrare straina da 404, nu 403 — la fel ca la
// tichete: 403 ar confirma ca exista.
//
// Notele vin grupate pe criteriu, cu toate sursele una langa alta: autoevaluarea
// elevului, verificarea automata, pre-notarea AI, nota mentorului. Diferenta dintre
// ele e lucrul care il invata pe elev sa se autoevalueze — deci se afiseaza
// impreuna, nu se suprascriu.
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const user = await getCurrentAppUser()
  if (!user) return apiError(401, 'Unauthorized')

  const { data: lucrare, error } = await supabaseAdmin
    .from('lucrari')
    .select(
      'id, user_id, rubrica_slug, chapter_id, text, text_suport, status, created_at, updated_at, trimisa_la, barem_version_id, barem_rubrica_id'
    )
    .eq('id', id)
    .single()

  if (error || !lucrare) return apiError(404, 'Not found')
  if (!poateCorecta(user) && lucrare.user_id !== user.id) return apiError(404, 'Not found')

  const { data: note, error: nErr } = await supabaseAdmin
    .from('note_criterii')
    .select('id, criteriu_slug, denumire, din, puncte, stare, sursa, autor_id, explicatie, updated_at')
    .eq('lucrare_id', id)
    .order('criteriu_slug', { ascending: true })

  if (nErr) {
    await logError('lucrari', 'GET note error', { code: nErr.code, message: nErr.message, id })
    return apiError(500, 'Database error')
  }

  const randuri = note ?? []

  // Totalul se calculeaza DOAR din notele automate si ale mentorului, niciodata din
  // autoevaluare sau din pre-notarea AI. Autoevaluarea e un exercitiu, nu o nota;
  // pre-notarea AI exista ca sa-i scurteze mentorului munca, nu ca sa i-o ia.
  const cuNota = randuri.filter((n) => n.stare === 'acordat' && (n.sursa === 'auto' || n.sursa === 'mentor'))
  const puncte = cuNota.reduce((s, n) => s + (n.puncte ?? 0), 0)
  const din = cuNota.reduce((s, n) => s + n.din, 0)

  // Cate puncte asteapta inca pe cineva: unealta n-a raspuns, sau criteriul e pe
  // stratul mentorului. Se arata separat, ca elevul sa nu creada ca le-a pierdut.
  const inAsteptare = randuri
    .filter((n) => n.stare !== 'acordat')
    .reduce((s, n) => s + n.din, 0)

  const peCriteriu = new Map<string, typeof randuri>()
  for (const n of randuri) {
    const lista = peCriteriu.get(n.criteriu_slug) ?? []
    lista.push(n)
    peCriteriu.set(n.criteriu_slug, lista)
  }

  return Response.json({
    lucrare,
    note: randuri,
    criterii: [...peCriteriu.entries()].map(([slug, note]) => ({
      criteriu_slug: slug,
      denumire: note[0]?.denumire ?? slug,
      din: note[0]?.din ?? 0,
      note,
    })),
    total: { puncte, din, in_asteptare: inAsteptare },
  })
}
