// Aplica migrarile in baza de date, citind conexiunea din `.env.local`.
//
// De ce exista fisierul asta, in loc sa rulam direct `supabase db push`:
//
// 1. `supabase db push --linked` cere login in browser. Intr-o sesiune fara om in
//    fata — cum sunt cele in care Andrei lucreaza de pe telefon — nu se poate face.
//    Cu `--db-url` nu e nevoie de login deloc.
// 2. Comanda intreaba „esti sigur?" la tastatura si ar ramane blocata la nesfarsit
//    daca nimeni nu raspunde. Aici ii dam raspunsul programatic.
// 3. Sirul de conexiune contine PAROLA bazei. Orice mesaj de eroare de la unealta
//    l-ar putea afisa intreg, iar de acolo ar ajunge in log-uri si in conversatii.
//    Tot ce iese pe ecran trece printr-un filtru care sterge parola.
//
// Folosire:
//   npm run db:plan   — arata ce s-ar aplica, FARA sa schimbe nimic
//   npm run db:push   — aplica efectiv
//
// Regula de lucru: intai `db:plan`, se citeste ce iese, apoi `db:push`.

import { spawn } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const radacina = join(dirname(fileURLToPath(import.meta.url)), '..')
const caleEnv = join(radacina, '.env.local')

const NUME = 'SUPABASE_DB_URL'

function iesiCuInstructiuni(motiv) {
  console.error(`\n  ✖ ${motiv}\n`)
  console.error(`  Ca sa mearga, ai de facut un singur lucru, o singura data:\n`)
  console.error(`  1. Deschide panoul Supabase → proiectul Platforma BAC.`)
  console.error(`  2. Butonul "Connect" (sus, langa numele proiectului).`)
  console.error(`  3. Sectiunea "Connection string" → alege "Session pooler".`)
  console.error(`  4. Copiaza adresa si inlocuieste [YOUR-PASSWORD] cu parola bazei.`)
  console.error(`  5. Adauga in fisierul .env.local, pe un rand nou:\n`)
  console.error(`     ${NUME}="postgresql://...adresa copiata..."\n`)
  console.error(`  Fisierul .env.local NU ajunge in git. Detalii: docs/onboarding-secrets.md\n`)
  process.exit(1)
}

if (!existsSync(caleEnv)) iesiCuInstructiuni('Nu gasesc fisierul .env.local.')

// Citim doar variabila care ne trebuie. Nu incarcam tot fisierul in mediu — n-are
// rost sa plimbam cheile de Stripe si Clerk printr-un proces care pune migrari.
const linii = readFileSync(caleEnv, 'utf8').split(/\r?\n/)
let url = null
for (const linie of linii) {
  const m = /^\s*(?:export\s+)?SUPABASE_DB_URL\s*=\s*(.*)$/.exec(linie)
  if (m) url = m[1].trim().replace(/^["']|["']$/g, '')
}

if (!url) iesiCuInstructiuni(`Nu gasesc ${NUME} in .env.local.`)
if (!/^postgres(ql)?:\/\//.test(url)) {
  iesiCuInstructiuni(`${NUME} nu arata a adresa de baza de date (trebuie sa inceapa cu postgresql://).`)
}

// Parola, ca s-o putem sterge din tot ce se afiseaza.
const parola = (() => {
  const m = /^postgres(?:ql)?:\/\/[^:]+:([^@]+)@/.exec(url)
  return m ? m[1] : null
})()

function curata(text) {
  let t = text
  if (parola) t = t.split(parola).join('«parola ascunsa»')
  // Plasa de siguranta: orice alta adresa de conexiune scapata in mesaj.
  return t.replace(/postgres(ql)?:\/\/[^\s"']+/g, 'postgresql://«adresa ascunsa»')
}

const doarPlan = process.argv.includes('--plan')
const argumente = ['db', 'push', '--db-url', url]
if (doarPlan) argumente.push('--dry-run')

console.log(
  doarPlan
    ? '\n  Verific ce migrari ar fi aplicate. NU se schimba nimic in baza de date.\n'
    : '\n  Aplic migrarile in baza de date.\n'
)

// Pornim direct intermediarul in JavaScript al uneltei, cu acelasi Node, si NU
// prin `node_modules/.bin`. Pe Windows, acolo e un fisier .cmd care ar fi cerut un
// interpretor de comenzi — iar atunci o parola cu caractere speciale (`&`, `^`, `%`)
// ar fi fost interpretata de el, nu trimisa mai departe. Asa, adresa ajunge intacta.
const intermediar = join(radacina, 'node_modules', 'supabase', 'dist', 'supabase.js')
if (!existsSync(intermediar)) {
  iesiCuInstructiuni('Unealta Supabase nu e instalata. Ruleaza intai: npm install')
}

const copil = spawn(process.execPath, [intermediar, ...argumente], {
  cwd: radacina,
  stdio: ['pipe', 'pipe', 'pipe'],
})

// Comanda intreaba "Do you want to push these migrations?". Fara raspuns ar astepta
// la nesfarsit intr-o sesiune fara om in fata.
copil.stdin.write('y\n')
copil.stdin.end()

copil.stdout.on('data', (d) => process.stdout.write(curata(d.toString())))
copil.stderr.on('data', (d) => process.stderr.write(curata(d.toString())))

copil.on('close', (cod) => {
  if (cod === 0) {
    console.log(
      doarPlan
        ? '\n  Verificare terminata. Daca lista de mai sus e in regula: npm run db:push\n'
        : '\n  Gata. Migrarile sunt aplicate.\n'
    )
  } else {
    console.error(`\n  ✖ Comanda a esuat (cod ${cod}). Nimic din ce urma nu s-a aplicat.\n`)
  }
  process.exit(cod ?? 1)
})
