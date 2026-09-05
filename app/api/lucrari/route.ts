import { supabaseAdmin } from '@/lib/supabase-admin'
import { getCurrentAppUser, poateCorecta } from '@/lib/current-user'
import { apiError } from '@/lib/api-error'
import { logError } from '@/lib/log-error'
import { citestePaginarea, taiePagina } from '@/lib/paginare'
import {
  gasesteRubrica,
  corecteazaAutomat,
  scrieNoteAutomate,
  MAX_TEXT,
  MAX_SUPORT,
} from '@/lib/lucrari'

const CAMPURI =
  'id, user_id, rubrica_slug, chapter_id, status, created_at, updated_at, trimisa_la, barem_version_id'

// GET /api/lucrari — lista lucrarilor.
// Elev: doar ale lui. Corector: toate, filtrabil prin ?status= si ?rubrica_slug=.
// Paginat (?limit=, ?offset=) — lista creste cu fiecare lucrare scrisa vreodata.
//
// Textul NU se intoarce in lista: o lucrare are mii de cuvinte, iar o pagina de 50
// ar fi ajuns la sute de kilobytes pentru un ecran care arata doar titluri si date.
// Se citeste la deschiderea unei lucrari anume, in /api/lucrari/[id].
export async function GET(req: Request) {
  const user = await getCurrentAppUser()
  if (!user) return apiError(401, 'Unauthorized')

  const url = new URL(req.url)
  const status = url.searchParams.get('status')
  const rubrica = url.searchParams.get('rubrica_slug')
  const p = citestePaginarea(url)

  let query = supabaseAdmin
    .from('lucrari')
    .select(CAMPURI)
    .order('created_at', { ascending: false })

  // Elevul e legat de lucrarile lui indiferent ce trimite in query string.
  if (!poateCorecta(user)) query = query.eq('user_id', user.id)

  if (status) query = query.eq('status', status)
  if (rubrica) query = query.eq('rubrica_slug', rubrica)

  const { data, error } = await query.range(p.offset, p.rangeTo)
  if (error) {
    await logError('lucrari', 'GET error', { code: error.code, message: error.message })
    return apiError(500, 'Database error')
  }

  const { pagina, meta } = taiePagina(data ?? [], p)
  return Response.json({ lucrari: pagina, meta })
}

// POST /api/lucrari — elevul trimite o lucrare si primeste inapoi corectarea
// automata.
//
// Ce se intampla, in ordine: se gaseste rubrica in versiunea ACTIVA de barem, se
// scrie lucrarea cu versiunea inghetata pe ea, se ruleaza stratul 1 si se scriu
// notele. Daca notele nu se pot scrie, lucrarea ramane — textul elevului nu se
// pierde pentru ca a esuat corectarea. Se poate relua.
export async function POST(req: Request) {
  const user = await getCurrentAppUser()
  if (!user) return apiError(401, 'Unauthorized')

  const body = await req.json().catch(() => ({}))
  const text = typeof body?.text === 'string' ? body.text.trim() : ''
  const rubricaSlug = typeof body?.rubrica_slug === 'string' ? body.rubrica_slug.trim() : ''
  const textSuport = typeof body?.text_suport === 'string' ? body.text_suport.trim() : null
  const chapterId = typeof body?.chapter_id === 'string' ? body.chapter_id : null

  if (!rubricaSlug) return apiError(400, 'Bad request: rubrica_slug required')
  if (!text) return apiError(400, 'Bad request: text required')
  if (text.length > MAX_TEXT) {
    return apiError(400, `Bad request: text too long (max ${MAX_TEXT})`)
  }
  if (textSuport && textSuport.length > MAX_SUPORT) {
    return apiError(400, `Bad request: text_suport too long (max ${MAX_SUPORT})`)
  }

  const gasita = await gasesteRubrica(rubricaSlug)
  if (!gasita) {
    // 400, nu 404: ruta exista, cererea e cea gresita. Se ajunge aici si daca nu e
    // niciun barem activ in baza — caz in care nu e vina clientului, dar tot nu
    // avem cu ce nota.
    return apiError(400, `Bad request: rubrica "${rubricaSlug}" nu exista in baremul activ`)
  }

  const acum = new Date().toISOString()
  const { data: lucrare, error } = await supabaseAdmin
    .from('lucrari')
    .insert({
      user_id: user.id,
      barem_version_id: gasita.versiuneId,
      barem_rubrica_id: gasita.rubricaId,
      rubrica_slug: rubricaSlug,
      chapter_id: chapterId,
      text,
      text_suport: textSuport,
      status: 'trimisa',
      trimisa_la: acum,
    })
    .select(CAMPURI)
    .single()

  if (error || !lucrare) {
    await logError('lucrari', 'POST error', { code: error?.code, message: error?.message })
    return apiError(500, 'Database error')
  }

  // Corectarea automata e un pas SEPARAT de salvare, si esecul ei nu sterge
  // lucrarea. Textul scris de un elev e munca lui; o unealta care nu raspunde n-are
  // voie s-o arunce. Ruta intoarce lucrarea si spune ca notarea n-a mers.
  try {
    const rezultat = await corecteazaAutomat(gasita.rubrica, text, textSuport)
    await scrieNoteAutomate(lucrare.id, gasita.idCriterii, rezultat)

    return Response.json({ lucrare, corectare: rezultat }, { status: 201 })
  } catch (err) {
    await logError('lucrari', 'Corectarea automata a esuat', {
      lucrare_id: lucrare.id,
      error: err instanceof Error ? err.message : String(err),
    })
    return Response.json(
      { lucrare, corectare: null, avertisment: 'Lucrarea e salvata, dar corectarea automata nu a rulat.' },
      { status: 201 }
    )
  }
}
