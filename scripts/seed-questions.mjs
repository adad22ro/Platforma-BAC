// Populeaza questions + answers cu date PLACEHOLDER pentru dezvoltare.
// NU sunt intrebari reale de BAC — doar continut generic ca sa aiba Bogdan cu ce lucra la UI.
// Rulare: npm run seed:questions   (idempotent: nu insereaza daca exista deja intrebari)
//
// Presupune ca `npm run seed:content` a rulat deja (are nevoie de capitole).

import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const { count } = await sb.from('questions').select('*', { count: 'exact', head: true })
if (count && count > 0) {
  console.log(`Exista deja ${count} intrebari — nu inserez nimic (idempotent).`)
  process.exit(0)
}

const { data: chapters, error: chErr } = await sb
  .from('chapters')
  .select('id, title')
  .order('order_index')

if (chErr) {
  console.error('Nu pot citi capitolele:', chErr.message)
  process.exit(1)
}
if (!chapters?.length) {
  console.error('Nu exista capitole — ruleaza mai intai `npm run seed:content`.')
  process.exit(1)
}

// 6 intrebari per capitol, cu 4 variante fiecare (exact una corecta).
function questionsFor(chapterTitle) {
  return Array.from({ length: 6 }, (_, i) => ({
    text: `Intrebarea ${i + 1} din "${chapterTitle}" — care afirmatie este corecta?`,
    explanation: `Explicatie placeholder pentru intrebarea ${i + 1}.`,
    order_index: i,
    published: true,
    answers: [
      { text: `Varianta A (corecta) — intrebarea ${i + 1}`, is_correct: true, order_index: 0 },
      { text: `Varianta B — intrebarea ${i + 1}`, is_correct: false, order_index: 1 },
      { text: `Varianta C — intrebarea ${i + 1}`, is_correct: false, order_index: 2 },
      { text: `Varianta D — intrebarea ${i + 1}`, is_correct: false, order_index: 3 },
    ],
  }))
}

for (const chapter of chapters) {
  const items = questionsFor(chapter.title)
  let ok = 0

  for (const item of items) {
    const { answers, ...question } = item
    const { data: inserted, error } = await sb
      .from('questions')
      .insert({ ...question, chapter_id: chapter.id })
      .select()
      .single()

    if (error) {
      console.error('Eroare la intrebare:', question.text, error.message)
      continue
    }

    const withQuestion = answers.map((a) => ({ ...a, question_id: inserted.id }))
    const { error: aErr } = await sb.from('answers').insert(withQuestion)
    if (aErr) console.error('Eroare la variante pentru', question.text, aErr.message)
    else ok++
  }

  console.log(`OK: "${chapter.title}" — ${ok}/${items.length} intrebari x 4 variante`)
}

console.log('Gata — intrebari placeholder inserate.')
