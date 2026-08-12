import type { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getCurrentAppUser, isTeacher } from '@/lib/current-user'
import { validateAnswers, answerRow } from '@/app/api/questions/route'
import { logError } from '@/lib/log-error'

// PUT /api/questions/[id]/answers — inlocuieste TOATE variantele unei intrebari.
// Doar profesor.
//
// De ce inlocuire completa si nu PATCH pe variante individuale: invariantul
// "exact un raspuns corect" nu poate fi mentinut daca variantele se editeaza una
// cate una (intre doua cereri intrebarea ar avea zero sau doua raspunsuri corecte).
// Aici setul nou e validat INTREG inainte sa se atinga DB-ul.
export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const user = await getCurrentAppUser()
  if (!isTeacher(user)) return new Response('Forbidden', { status: 403 })

  const body = await req.json().catch(() => ({}))
  const validated = validateAnswers(body?.answers)
  if ('error' in validated) {
    return new Response(`Bad request: ${validated.error}`, { status: 400 })
  }

  const { data: question } = await supabaseAdmin
    .from('questions')
    .select('id')
    .eq('id', id)
    .single()

  if (!question) return new Response('Not found', { status: 404 })

  // Pastram vechiul set ca sa-l putem pune la loc daca inserarea celui nou esueaza.
  // Supabase-js nu ne da o tranzactie, iar o intrebare ramasa fara variante ar
  // strica testul pentru toti elevii — deci restaurarea manuala e plasa de siguranta.
  // Selectul trebuie sa contina TOATE coloanele: ce lipseste de aici se pierde
  // tacut la restaurare. (`explanation` a fost adaugata ulterior — de aceea nota.)
  const { data: previous } = await supabaseAdmin
    .from('answers')
    .select('id, question_id, text, is_correct, order_index, explanation, created_at')
    .eq('question_id', id)
    .order('order_index', { ascending: true })

  const { error: delErr } = await supabaseAdmin.from('answers').delete().eq('question_id', id)
  if (delErr) {
    await logError('questions', 'PUT answers delete error', {
      code: delErr.code,
      message: delErr.message,
      id,
    })
    return new Response('Database error', { status: 500 })
  }

  const rows = validated.answers.map((a, i) => answerRow(a, i, id))

  const { data: created, error: insErr } = await supabaseAdmin.from('answers').insert(rows).select()

  if (insErr) {
    // Punem la loc setul vechi; daca nici asta nu reuseste, e o eroare critica —
    // intrebarea ramane fara variante si trebuie reparata manual.
    if (previous?.length) {
      const { error: restoreErr } = await supabaseAdmin.from('answers').insert(previous)
      if (restoreErr) {
        await logError(
          'questions',
          'PUT answers restore FAILED — intrebarea a ramas fara variante',
          { code: restoreErr.code, message: restoreErr.message, id },
          'critical'
        )
      }
    }

    await logError('questions', 'PUT answers insert error', {
      code: insErr.code,
      message: insErr.message,
      id,
    })
    return new Response('Database error', { status: 500 })
  }

  return Response.json({ answers: created })
}
