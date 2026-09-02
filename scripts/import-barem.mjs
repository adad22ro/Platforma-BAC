// Incarca `data/barem.json` in DB, VERSIONAT.
//
// Rulare:  npm run barem:import           (aplica)
//          npm run barem:import -- --dry  (spune ce ar face, fara sa scrie)
//
// Idempotent pe continut: daca fisierul e identic cu versiunea activa, nu scrie
// nimic. Poate fi rulat de cate ori vrei.
//
// DE CE NU FACE UPDATE: notele deja acordate refera criterii dintr-o versiune
// anume. Daca am rescrie randurile existente, orice corectura ar face notele vechi
// imposibil de explicat. Fiecare modificare a fisierului creeaza o versiune noua;
// cele vechi raman, doar ca nu mai sunt active.

import { createClient } from '@supabase/supabase-js'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const DRY = process.argv.includes('--dry')

const caleBarem = fileURLToPath(new URL('../data/barem.json', import.meta.url))
const brut = readFileSync(caleBarem, 'utf8')
const barem = JSON.parse(brut)

// Checksum pe continutul fisierului. Normalizam capetele de linie ca aceeasi
// versiune sa nu para diferita doar fiindca a trecut prin Windows.
const checksum = createHash('sha256')
  .update(brut.replace(/\r\n/g, '\n'))
  .digest('hex')

// ─────────────────────────────────────────────────────────────
// Verificare defensiva
// ─────────────────────────────────────────────────────────────
// Validarea completa sta in `lib/barem.ts` si ruleaza la `npm run barem:check`.
// Aici repetam doar cele doua verificari care ar strica NOTE daca ar trece:
// punctajul care nu se aduna, si criteriul automat fara verificator. Mai bine
// refuzam importul decat sa scriem in DB un barem care noteaza gresit.
const probleme = []
for (const r of barem.rubrici) {
  const suma = r.criterii.reduce((s, c) => s + c.puncte_max, 0)
  if (suma !== r.puncte_total) {
    probleme.push(
      `rubrica "${r.slug}": criteriile insumeaza ${suma}, dar rubrica declara ${r.puncte_total}`
    )
  }
  for (const c of r.criterii) {
    if (c.strat === 'auto' && !c.verificator) {
      probleme.push(`criteriul "${c.slug}": e pe stratul auto dar n-are verificator`)
    }
  }
}
if (probleme.length) {
  console.error('Baremul nu e valid — nu import nimic:\n')
  for (const p of probleme) console.error('  •', p)
  console.error('\nRuleaza `npm run barem:check` pentru lista completa.')
  process.exit(1)
}

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

function opreste(mesaj, err) {
  console.error(mesaj, err?.message ?? err)
  process.exit(1)
}

// ─────────────────────────────────────────────────────────────
// Exista deja?
// ─────────────────────────────────────────────────────────────
const { data: existenta, error: errCauta } = await sb
  .from('barem_versions')
  .select('id, versiune_document, is_active, created_at')
  .eq('checksum', checksum)
  .maybeSingle()

if (errCauta) opreste('Nu pot citi versiunile de barem:', errCauta)

if (existenta?.is_active) {
  console.log(
    `Baremul din fisier e deja versiunea activa (${existenta.versiune_document}, importata ${existenta.created_at.slice(0, 10)}). Nu scriu nimic.`
  )
  process.exit(0)
}

const rubrici = barem.rubrici.length
const criterii = barem.rubrici.reduce((s, r) => s + r.criterii.length, 0)
const puncteAuto = barem.rubrici.reduce(
  (s, r) => s + r.criterii.filter((c) => c.strat === 'auto').reduce((a, c) => a + c.puncte_max, 0),
  0
)

if (existenta) {
  // Acelasi continut ca o versiune veche — se intampla la revenirea pe o varianta
  // anterioara. Reactivam versiunea existenta in loc sa inseram un duplicat.
  console.log(`Continutul corespunde unei versiuni deja importate (${existenta.versiune_document}).`)
  if (DRY) {
    console.log('--dry: as reactiva versiunea aceea.')
    process.exit(0)
  }
  await dezactiveazaActiva()
  const { error } = await sb
    .from('barem_versions')
    .update({ is_active: true })
    .eq('id', existenta.id)
  if (error) opreste('Nu pot reactiva versiunea:', error)
  console.log('Versiune reactivata.')
  process.exit(0)
}

console.log(
  `Versiune noua de barem: ${barem.versiune_document} — ${rubrici} rubrici, ${criterii} criterii, ${puncteAuto} puncte pe stratul automat.`
)

if (DRY) {
  console.log('--dry: nu scriu nimic.')
  process.exit(0)
}

// ─────────────────────────────────────────────────────────────
// Scriere
// ─────────────────────────────────────────────────────────────
// Ordinea conteaza: inseram intai tot continutul cu versiunea INACTIVA, si abia la
// final mutam steagul. Daca scriptul crapa la jumatate, ramane o versiune
// incompleta dar inactiva — aplicatia continua sa foloseasca baremul vechi, corect.
const { data: versiune, error: errVersiune } = await sb
  .from('barem_versions')
  .insert({
    versiune_document: barem.versiune_document,
    checksum,
    sursa: barem.sursa,
    is_active: false,
  })
  .select('id')
  .single()

if (errVersiune) opreste('Nu pot crea versiunea:', errVersiune)

for (const [i, r] of barem.rubrici.entries()) {
  const { data: rubrica, error: errRubrica } = await sb
    .from('barem_rubrici')
    .insert({
      version_id: versiune.id,
      slug: r.slug,
      subiect: r.subiect,
      denumire: r.denumire,
      profil: r.profil ?? null,
      puncte_total: r.puncte_total,
      minim_cuvinte: r.minim_cuvinte ?? null,
      observatii: r.observatii ?? null,
      order_index: i,
    })
    .select('id')
    .single()

  if (errRubrica) opreste(`Nu pot insera rubrica "${r.slug}":`, errRubrica)

  const randuri = r.criterii.map((c, j) => ({
    rubrica_id: rubrica.id,
    slug: c.slug,
    denumire: c.denumire,
    puncte_max: c.puncte_max,
    strat: c.strat,
    verificator: c.verificator ?? null,
    praguri: c.praguri ?? [],
    parametri: c.parametri ?? null,
    observatii: c.observatii ?? null,
    order_index: j,
  }))

  const { error: errCriterii } = await sb.from('barem_criterii').insert(randuri)
  if (errCriterii) opreste(`Nu pot insera criteriile rubricii "${r.slug}":`, errCriterii)

  console.log(`  ✓ ${r.slug} — ${r.criterii.length} criterii`)
}

// Indexul partial din migrare permite o singura versiune activa, deci intai o
// stingem pe cea veche si abia apoi o aprindem pe cea noua.
await dezactiveazaActiva()

const { error: errActivare } = await sb
  .from('barem_versions')
  .update({ is_active: true })
  .eq('id', versiune.id)

if (errActivare) {
  opreste(
    'Versiunea noua e scrisa, dar n-am putut sa o activez (acum nu e activa niciuna!). Reruleaza scriptul:',
    errActivare
  )
}

console.log(`\nGata. Versiunea ${barem.versiune_document} e activa.`)

async function dezactiveazaActiva() {
  const { error } = await sb
    .from('barem_versions')
    .update({ is_active: false })
    .eq('is_active', true)
  if (error) opreste('Nu pot dezactiva versiunea curenta:', error)
}
