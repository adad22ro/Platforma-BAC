import type { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getCurrentAppUser } from '@/lib/current-user'
import { apiError } from '@/lib/api-error'
import { logError } from '@/lib/log-error'

// GET /api/greseli — intrebarile la care elevul sta prost ACUM.
//
// „Greselile mele" nu inseamna „tot ce am gresit vreodata": daca elevul a gresit o
// intrebare, a inteles conceptul si a nimerit-o data urmatoare, ea iese din lista.
// Altfel lista creste la nesfarsit si descurajeaza exact elevul care progreseaza.
// Semantica („ultimul raspuns per intrebare") e definita in vederea
// `latest_answer_per_question` — vezi migrarea, ca sa nu fie reinterpretata aici.
//
// Elevul isi vede DOAR propriile greseli: `user_id` vine din sesiune, nu din query.
// Un profesor nu are ce cauta aici — el are statistica agregata, la /api/questions/dificultate.
//
// Filtru optional: ?chapter_id=
export async function GET(req: NextRequest) {
  const user = await getCurrentAppUser()
  if (!user) return apiError(401, 'Unauthorized')

  const chapterId = new URL(req.url).searchParams.get('chapter_id')

  let query = supabaseAdmin
    .from('latest_answer_per_question')
    .select('question_id, chapter_id, chosen_answer_id, created_at')
    .eq('user_id', user.id)
    .eq('is_correct', false)
    .order('created_at', { ascending: false })

  if (chapterId) query = query.eq('chapter_id', chapterId)

  const { data: wrong, error } = await query
  if (error) {
    await logError('greseli', 'GET error', { code: error.code, message: error.message })
    return apiError(500, 'Database error')
  }

  if (!wrong?.length) return Response.json({ mistakes: [] })

  // Textele se iau separat: vederea n-are chei straine, deci nu se pot imbrica.
  // Vederile nu pastreaza NOT NULL din tabelele de sub ele, deci tipurile generate
  // ies nullable chiar daca datele nu sunt. Filtram explicit, nu fortam cu `!`.
  const questionIds = wrong.map((w) => w.question_id).filter((id): id is string => id !== null)
  const chapterIds = [
    ...new Set(wrong.map((w) => w.chapter_id).filter((id): id is string => id !== null)),
  ]

  const [{ data: questions }, { data: chapters }] = await Promise.all([
    supabaseAdmin.from('questions').select('id, text, explanation').in('id', questionIds),
    supabaseAdmin.from('chapters').select('id, title').in('id', chapterIds),
  ])

  const questionById = new Map((questions ?? []).map((q) => [q.id, q]))
  const chapterById = new Map((chapters ?? []).map((c) => [c.id, c]))

  // Intrebarea stearsa intre timp: evenimentul supravietuieste (question_id devine
  // NULL prin SET NULL), dar n-avem ce afisa. O sarim, in loc sa aratam un rand gol.
  const mistakes = wrong
    .filter((w) => w.question_id && questionById.has(w.question_id))
    .map((w) => {
      const q = questionById.get(w.question_id as string)!
      return {
        question_id: w.question_id,
        question_text: q.text,
        explanation: q.explanation,
        chapter_id: w.chapter_id,
        chapter_title: w.chapter_id ? chapterById.get(w.chapter_id)?.title ?? null : null,
        chosen_answer_id: w.chosen_answer_id,
        answered_at: w.created_at,
      }
    })

  return Response.json({ mistakes })
}
