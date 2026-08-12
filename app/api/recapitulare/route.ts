import type { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getCurrentAppUser } from '@/lib/current-user'
import { apiError } from '@/lib/api-error'
import { logError } from '@/lib/log-error'

// GET /api/recapitulare — conceptele pe care elevul e pe cale sa le uite.
//
// Intoarce ETICHETE, nu intrebari: planificatorul lucreaza pe concepte. Alegerea
// intrebarilor concrete pentru o sesiune de recapitulare e alt pas — si e bine sa
// fie, ca elevul sa primeasca de fiecare data alte intrebari despre acelasi
// concept, nu aceleasi memorate.
//
// Elevul isi vede doar propriile concepte: `user_id` din sesiune.
//
// ?limit= (implicit 20, maxim 100).
export async function GET(req: NextRequest) {
  const user = await getCurrentAppUser()
  if (!user) return apiError(401, 'Unauthorized')

  const raw = Number(new URL(req.url).searchParams.get('limit'))
  const limit = Number.isFinite(raw) && raw > 0 ? Math.min(raw, 100) : 20

  const { data: states, error } = await supabaseAdmin
    .from('concept_states')
    .select('tag_id, due, stability, difficulty, reps, lapses, state, last_review')
    .eq('user_id', user.id)
    .lte('due', new Date().toISOString())
    .order('due', { ascending: true })
    .limit(limit)

  if (error) {
    await logError('fsrs', 'recapitulare GET error', { code: error.code, message: error.message })
    return apiError(500, 'Database error')
  }

  if (!states?.length) return Response.json({ due: [] })

  const { data: tags } = await supabaseAdmin
    .from('tags')
    .select('id, slug, name, axis')
    .in(
      'id',
      states.map((s) => s.tag_id)
    )

  const tagById = new Map((tags ?? []).map((t) => [t.id, t]))

  const due = states
    .filter((s) => tagById.has(s.tag_id))
    .map((s) => {
      const t = tagById.get(s.tag_id)!
      return {
        tag_id: s.tag_id,
        slug: t.slug,
        name: t.name,
        axis: t.axis,
        due: s.due,
        // Cat de fixat e conceptul, in zile. Util pentru ordonare si pentru a
        // arata elevului ce e fragil — nu doar ca „a venit randul".
        stability: s.stability,
        lapses: s.lapses,
        state: s.state,
      }
    })

  return Response.json({ due })
}
