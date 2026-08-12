# Migrări bază de date (Supabase)

Schema bazei de date trăiește aici, ca fișiere SQL versionate — **sursa de adevăr**.
Înainte, SQL-ul era împrăștiat în `docs/database.md` și aplicat manual; acum e
reproductibil și verificabil la PR. Descrierea pe coloane rămâne în
[docs/database.md](../docs/database.md).

## Structură

```
supabase/migrations/
  20260701120000_baseline.sql   ← schema completă la data adoptării (squash idempotent)
  <timestamp>_<nume>.sql        ← fiecare modificare viitoare = fișier NOU
```

- **Nu edita** `..._baseline.sql`. Orice schimbare de schemă = fișier nou cu
  timestamp mai mare (`YYYYMMDDHHMMSS_descriere.sql`).
- Scrie migrări idempotente (`if not exists`, `drop ... if exists` înainte de
  `add`), ca să fie sigure de rulat de mai multe ori.

## Cum aplici o migrare

### Cu Supabase CLI — ce folosim (de la 2026-08-12)

Proiectul e deja legat. La fiecare migrare nouă:
```bash
npx supabase migration list --linked   # ce e local vs. ce e aplicat in productie
npx supabase db push --dry-run         # ce s-ar aplica, fara sa aplice
npx supabase db push                   # aplica migrarile nerulate
```

**Rulează întotdeauna `--dry-run` întâi.** `db push` scrie direct în producție și
poate aplica mai multe migrări deodată, dacă cineva a uitat una în urmă — vrei să
vezi lista înainte, nu după.

Un avertisment despre Docker (`failed to cache migrations catalog`) la `db push` e
normal pe o mașină fără Docker Desktop: e doar cache-ul local de catalog, migrarea
se aplică oricum. Verifică cu `migration list` că `local` și `remote` coincid.

Setup unic, dacă cineva pornește de la zero (creează `supabase/config.toml` + leagă
proiectul; sunt gitignored):
```bash
npx supabase login
npx supabase init               # detectează migrările existente din supabase/migrations
npx supabase link --project-ref <PROJECT_REF>   # PROJECT_REF = din URL-ul proiectului Supabase
```

### Varianta fără CLI (de avarie)
Deschide fișierul, copiază SQL-ul în **Supabase → SQL Editor → Run**. Merge, dar
**nu înregistrează migrarea** în evidența Supabase, deci `migration list` va arăta în
continuare `remote` gol și următorul `db push` va încerca s-o aplice din nou. Cu
migrări idempotente nu strică nimic, dar evidența rămâne mincinoasă — folosește-o
doar dacă CLI-ul nu e disponibil.

## Regenerarea tipurilor TypeScript

`types/database.ts` conține tipurile tabelelor, folosite de clienții Supabase
(`lib/supabase.ts`, `lib/supabase-admin.ts`) ca query-urile să fie tipate.
După ce schimbi schema, regenerează-le:

```bash
npm run db:types     # necesită `supabase link` făcut o dată (vezi mai sus)
```

> Dacă modifici schema manual (fără CLI), actualizează și `types/database.ts` de mână,
> ca tipurile să rămână sincronizate cu baza reală.

## Note

- **Baseline-ul e best-effort.** A fost scris ca să reflecte producția existentă și
  aliniat cu tipurile generate (`types/database.ts`), sursa de adevăr pentru shape-ul
  tabelelor. Un dump perfect (`supabase db dump`) necesită Docker Desktop.
- Producția a fost marcată drept „migrare aplicată" (`supabase migration repair
  --status applied 20260701120000`), ca `db push` să aplice doar migrările **noi**,
  nu baseline-ul peste schema existentă.
