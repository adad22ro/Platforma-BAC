// Populeaza chapters + lessons cu date PLACEHOLDER pentru dezvoltare.
// NU e structura reala BAC — doar continut generic ca sa aiba Bogdan cu ce lucra la UI.
// Rulare: npm run seed:content   (idempotent: nu insereaza daca exista deja capitole)

import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const { count } = await sb.from('chapters').select('*', { count: 'exact', head: true })
if (count && count > 0) {
  console.log(`Exista deja ${count} capitole — nu inserez nimic (idempotent).`)
  process.exit(0)
}

const chapters = [
  {
    title: 'Capitol introductiv (demo gratuit)',
    description: 'Capitol de proba, accesibil fara abonament.',
    order_index: 0,
    is_free: true,
    published: true,
    lessons: [
      { title: 'Lectia 1 — Bine ai venit', content: 'Continut placeholder pentru lectia introductiva.', order_index: 0, published: true },
      { title: 'Lectia 2 — Cum functioneaza platforma', content: 'Text demo despre navigare si teste.', video_url: 'https://www.youtube.com/embed/dQw4w9WgXcQ', order_index: 1, published: true },
    ],
  },
  {
    title: 'Capitolul 1 (premium)',
    description: 'Primul capitol premium — necesita abonament.',
    order_index: 1,
    is_free: false,
    published: true,
    lessons: [
      { title: 'Lectia 1.1', content: 'Continut placeholder 1.1.', order_index: 0, published: true },
      { title: 'Lectia 1.2', content: 'Continut placeholder 1.2.', order_index: 1, published: true },
      { title: 'Lectia 1.3 (draft)', content: 'Lectie inca nepublicata.', order_index: 2, published: false },
    ],
  },
  {
    title: 'Capitolul 2 (premium, draft)',
    description: 'Capitol in lucru — nepublicat, vizibil doar profesorului.',
    order_index: 2,
    is_free: false,
    published: false,
    lessons: [
      { title: 'Lectia 2.1', content: 'Continut placeholder 2.1.', order_index: 0, published: false },
    ],
  },
]

for (const ch of chapters) {
  const { lessons, ...chapter } = ch
  const { data: inserted, error } = await sb.from('chapters').insert(chapter).select().single()
  if (error) {
    console.error('Eroare la capitol:', chapter.title, error.message)
    continue
  }
  const withChapter = lessons.map((l) => ({ ...l, chapter_id: inserted.id }))
  const { error: lErr } = await sb.from('lessons').insert(withChapter)
  if (lErr) console.error('Eroare la lectii pentru', chapter.title, lErr.message)
  else console.log(`OK: "${chapter.title}" + ${lessons.length} lectii`)
}

console.log('Gata — date placeholder inserate.')
