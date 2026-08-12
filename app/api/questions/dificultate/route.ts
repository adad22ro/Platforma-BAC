import type { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getCurrentAppUser, isTeacher } from '@/lib/current-user'
import { apiError } from '@/lib/api-error'
import { logError } from '@/lib/log-error'

// GET /api/questions/dificultate — cat de grea e fiecare intrebare, pentru profesor.
//
// Masura e procentul de elevi care au gresit la PRIMA intalnire cu intrebarea, nu la
// toate raspunsurile: reluarile de test umfla rata de succes si fac intrebarea sa
// para mai usoara decat e. Definitia sta in vederea `question_difficulty`.
//
// Doar profesor. Un elev n-are ce face cu asta, iar „82% au gresit" i-ar spune
// indirect ca varianta pe care a ales-o el, ca majoritatea, e probabil gresita.
//
// Filtru optional: ?chapter_id=
export async function GET(req: NextRequest) {
  const user = await getCurrentAppUser()
  if (!isTeacher(user)) return apiError(403, 'Forbidden')

  const chapterId = new URL(req.url).searchParams.get('chapter_id')

  // Intai intrebarile (ca sa putem filtra pe capitol si sa avem textele), apoi
  // statistica. Intrebarile fara niciun raspuns inca NU dispar din lista — pentru
  // profesor „n-a incercat-o nimeni" e o informatie, nu o absenta.
  let qQuery = supabaseAdmin.from('questions').select('id, chapter_id, text, published')
  if (chapterId) qQuery = qQuery.eq('chapter_id', chapterId)

  const { data: questions, error: qErr } = await qQuery
  if (qErr) {
    await logError('questions', 'dificultate questions error', { code: qErr.code, message: qErr.message })
    return apiError(500, 'Database error')
  }
  if (!questions?.length) return Response.json({ questions: [] })

  const { data: stats, error: sErr } = await supabaseAdmin
    .from('question_difficulty')
    .select('question_id, students, wrong, wrong_pct')
    .in(
      'question_id',
      questions.map((q) => q.id)
    )

  if (sErr) {
    await logError('questions', 'dificultate stats error', { code: sErr.code, message: sErr.message })
    return apiError(500, 'Database error')
  }

  const statByQuestion = new Map((stats ?? []).map((s) => [s.question_id, s]))

  const rows = questions.map((q) => {
    const s = statByQuestion.get(q.id)
    return {
      question_id: q.id,
      chapter_id: q.chapter_id,
      text: q.text,
      published: q.published,
      students: s?.students ?? 0,
      wrong: s?.wrong ?? 0,
      // null, nu 0: „niciun elev n-a incercat-o" si „niciun elev n-a gresit-o" sunt
      // lucruri opuse, iar 0% le-ar face sa arate la fel.
      wrong_pct: s?.wrong_pct ?? null,
    }
  })

  // Cele mai gresite intai — acolo se uita profesorul. Cele neincercate la coada.
  rows.sort((a, b) => (b.wrong_pct ?? -1) - (a.wrong_pct ?? -1))

  return Response.json({ questions: rows })
}
