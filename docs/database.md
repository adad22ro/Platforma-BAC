# Baza de date

> Actualizat la: 2026-07-01
> Serviciu: Supabase (PostgreSQL)

> **Sursa de adevăr pentru schemă = [`supabase/migrations/`](../supabase/migrations)**
> (fișiere SQL versionate). Acest document descrie tabelele pe înțelesul oamenilor;
> DDL-ul canonic și cum se aplică migrările sunt în [supabase/README.md](../supabase/README.md).
> Tipurile TypeScript ale tabelelor: [`types/database.ts`](../types/database.ts)
> (regenerabile cu `npm run db:types`).

## Tabele

### users
Scop: oglindește utilizatorii din Clerk în baza de date. Populat automat prin
webhook-ul Clerk (`app/api/webhooks/clerk/route.ts`) la `user.created` /
`user.updated` / `user.deleted`.

| Coloană | Tip | Descriere |
|---|---|---|
| id | uuid | Identificator unic (PK) |
| clerk_id | text | ID-ul utilizatorului în Clerk |
| email | text | Email principal (NOT NULL) |
| full_name | text | Nume complet |
| role | text | `student` / `teacher` (default `student`) |
| subscription_status | text | `free` / `active` / `cancelled` (default `free`) — CHECK constraint |
| stripe_customer_id | text | ID-ul clientului în Stripe (setat la prima plată) |
| subscription_end_date | timestamptz | Sfârșitul perioadei plătite curente |
| created_at | timestamptz | Data creării (default `now()`) |
| updated_at | timestamptz | Ultima actualizare (default `now()`) |

> `id` nu are default — aplicația îl setează explicit (`crypto.randomUUID()` în
> webhook-ul Clerk); `clerk_id` e NOT NULL. (Confirmat prin `types/database.ts`.)

Relații: `clerk_id` corespunde utilizatorului din Clerk (sursa de adevăr pentru auth).
`stripe_customer_id` leagă userul de abonamentul din Stripe; actualizat de
webhook-ul Stripe (`app/api/webhooks/stripe/route.ts`) la
`checkout.session.completed` / `customer.subscription.updated` / `.deleted`.

> **Migrare** (coloane adăugate pentru abonamente Stripe):
> ```sql
> ALTER TABLE public.users
>   ADD COLUMN IF NOT EXISTS stripe_customer_id text,
>   ADD COLUMN IF NOT EXISTS subscription_end_date timestamptz;
> ```

> **Notă privilegii:** după creare, rolul `service_role` a avut nevoie de grant
> explicit (altfel insert-ul din webhook dădea `42501 permission denied`):
> ```sql
> GRANT INSERT, SELECT, UPDATE, DELETE ON public.users TO service_role;
> ```

### error_logs
Scop: jurnal persistent de erori ale aplicației (varianta automată a `ERRORS.md`).
Scris prin `lib/log-error.ts`; afișat în panoul `/admin`.

| Coloană | Tip | Descriere |
|---|---|---|
| id | uuid | Identificator unic (PK, default `gen_random_uuid()`) |
| source | text | De unde vine eroarea (ex: `clerk-webhook`) |
| message | text | Mesajul erorii |
| context | jsonb | Detalii suplimentare (cod, user, etc.) |
| created_at | timestamptz | Data (default `now()`) |

SQL de creare:
```sql
create table if not exists public.error_logs (
  id uuid primary key default gen_random_uuid(),
  source text,
  message text,
  context jsonb,
  created_at timestamptz not null default now()
);
grant insert, select on public.error_logs to service_role;
```

### processed_events
Scop: idempotență pentru webhook-ul Stripe. Stripe poate livra același eveniment
de mai multe ori (retry-uri); înregistrăm `event.id` ca să nu-l reprocesăm. Vezi
`app/api/webhooks/stripe/route.ts` și `docs/stripe.md`.

| Coloană | Tip | Descriere |
|---|---|---|
| event_id | text | ID-ul evenimentului Stripe (PK — unicitatea dă dedup-ul) |
| type | text | Tipul evenimentului (ex: `checkout.session.completed`) |
| processed_at | timestamptz | Data procesării (default `now()`) |

SQL de creare:
```sql
create table if not exists public.processed_events (
  event_id text primary key,
  type text,
  processed_at timestamptz not null default now()
);
grant insert, select, delete on public.processed_events to service_role;
```

### chapters
Scop: capitolele de conținut. Gestionate de profesori din panelul lor; citite de elevi.

| Coloană | Tip | Descriere |
|---|---|---|
| id | uuid | PK (`gen_random_uuid()`) |
| title | text | Titlul capitolului (NOT NULL) |
| description | text | Descriere scurtă |
| order_index | int | Ordinea de afișare (NOT NULL default 0) |
| is_free | boolean | Preview gratuit; default `false` (capitolele sunt premium implicit) |
| published | boolean | Draft vs. publicat; default `false` |
| created_at | timestamptz | default `now()` |

### lessons
Scop: lecțiile dintr-un capitol (text + video embed).

| Coloană | Tip | Descriere |
|---|---|---|
| id | uuid | PK (`gen_random_uuid()`) |
| chapter_id | uuid | FK → `chapters(id)` ON DELETE CASCADE |
| title | text | Titlul lecției (NOT NULL) |
| content | text | Corpul lecției (text/markdown) |
| video_url | text | Link video embed |
| order_index | int | Ordinea în capitol (NOT NULL default 0) |
| published | boolean | Draft vs. publicat; default `false` |
| created_at | timestamptz | default `now()` |

Model de acces: RLS activat, fără politici pentru `anon` (deny), grant la `service_role`
— autorizarea se face în API routes (citire filtrată după `published`/`is_free`/abonament;
scriere doar `role = teacher`), la fel ca pentru `users`.

SQL de creare:
```sql
create table if not exists public.chapters (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  order_index int not null default 0,
  is_free boolean not null default false,
  published boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.lessons (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  title text not null,
  content text,
  video_url text,
  order_index int not null default 0,
  published boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.chapters enable row level security;
alter table public.lessons enable row level security;

grant select, insert, update, delete on public.chapters to service_role;
grant select, insert, update, delete on public.lessons to service_role;

create index if not exists lessons_chapter_id_idx on public.lessons (chapter_id);
```

### questions
Scop: întrebările grilă ale unui capitol. Gestionate de profesori; citite de elevi la test.

| Coloană | Tip | Descriere |
|---|---|---|
| id | uuid | PK (`gen_random_uuid()`) |
| chapter_id | uuid | FK → `chapters(id)` ON DELETE CASCADE |
| text | text | Enunțul întrebării (NOT NULL) |
| explanation | text | Explicația răspunsului corect (afișată după corectare) |
| order_index | int | Ordinea în test (NOT NULL default 0) |
| published | boolean | Draft vs. publicat; default `false` |
| created_at | timestamptz | default `now()` |

### answers
Scop: variantele de răspuns ale unei întrebări (grilă cu **răspuns unic**).

| Coloană | Tip | Descriere |
|---|---|---|
| id | uuid | PK (`gen_random_uuid()`) |
| question_id | uuid | FK → `questions(id)` ON DELETE CASCADE |
| text | text | Textul variantei (NOT NULL) |
| is_correct | boolean | Varianta corectă; default `false` |
| order_index | int | Ordinea de afișare (NOT NULL default 0) |
| created_at | timestamptz | default `now()` |

> **Securitate — regula de aur:** `is_correct` **nu se trimite niciodată către client**.
> Variantele stau în tabel separat (nu `jsonb` în `questions`) tocmai ca filtrarea să fie
> explicită la fiecare citire, iar corectarea să se facă exclusiv pe server.
>
> Un index unic parțial (`answers_one_correct_per_question_idx`) garantează **cel mult**
> un răspuns corect per întrebare. „Cel puțin unul" nu se poate exprima ca index — se
> validează în API la scriere.

### student_progress
Scop: scorul unui elev pe un capitol. **O singură linie per (elev, capitol)** — o
reîncercare face upsert peste ea și incrementează `attempts`.

| Coloană | Tip | Descriere |
|---|---|---|
| id | uuid | PK (`gen_random_uuid()`) |
| user_id | uuid | FK → `users(id)` ON DELETE CASCADE |
| chapter_id | uuid | FK → `chapters(id)` ON DELETE CASCADE |
| score | int | Răspunsuri corecte (default 0) |
| total | int | Număr total de întrebări (default 0) |
| attempts | int | Câte încercări a făcut elevul (default 1) |
| completed_at | timestamptz | Ultima încercare (default `now()`) |

CHECK: `score >= 0 and total >= 0 and score <= total`.
UNIQUE: `(user_id, chapter_id)`.

Model de acces (toate trei): RLS activat, fără politici pentru `anon` (deny), grant la
`service_role` — autorizarea în API routes (scriere doar `role = teacher`; citirea
testului respectă gating-ul premium al capitolului, ca la lecții).

DDL-ul canonic: [`supabase/migrations/20260806120000_teste_progres.sql`](../supabase/migrations/20260806120000_teste_progres.sql).

Date placeholder: `npm run seed:questions` (6 întrebări × 4 variante per capitol;
necesită `npm run seed:content` rulat înainte).

### answer_events
Scop: **jurnalul de răspunsuri** — o linie per răspuns dat de un elev la o întrebare,
append-only. `student_progress` rămâne ca vedere agregată, dar **sursa de adevăr e
aici**: agregatul suprascrie la fiecare reîncercare, jurnalul nu pierde nimic.

Din el se construiesc „greșelile mele", dificultatea reală per întrebare, nota
estimată și repetiția spațiată (FSRS) — vezi Faza 2 în `TASKS.md`.

| Coloană | Tip | Descriere |
|---|---|---|
| id | uuid | PK (`gen_random_uuid()`) |
| user_id | uuid | FK → `users(id)` ON DELETE CASCADE |
| chapter_id | uuid | FK → `chapters(id)` ON DELETE CASCADE — păstrat explicit, nu dedus prin întrebare |
| question_id | uuid \| null | FK → `questions(id)` **ON DELETE SET NULL** |
| chosen_answer_id | uuid \| null | FK → `answers(id)` ON DELETE SET NULL. `null` = întrebare lăsată fără răspuns |
| is_correct | boolean | Verdictul, **înghețat** la momentul corectării |
| attempt_id | uuid | Grupează răspunsurile dintr-o singură trimitere |
| created_at | timestamptz | default `now()` |

Fără constrângere de unicitate — același elev poate răspunde de mai multe ori la
aceeași întrebare, iar asta e exact istoricul care ne trebuie.

Trei decizii care se pierd ușor dacă nu sunt scrise:
- **`question_id` e SET NULL, nu CASCADE.** Dacă profesorul șterge o întrebare, faptul
  că elevul a dat testul nu dispare din istoric. Statisticile per întrebare ignoră
  rândurile fără întrebare.
- **`is_correct` nu se recalculează la citire.** Dacă profesorul schimbă ulterior
  varianta corectă, istoricul trebuie să arate ce i s-a spus elevului atunci.
- **Profesorul nu generează evenimente.** Altfel statisticile de dificultate ar
  conține răspunsurile celui care a scris întrebările.

Model de acces: RLS activat, fără politici pentru `anon` (deny), grant la
`service_role` **doar `select, insert`** — fără `update`/`delete`, ca „append-only" să
fie garantat de privilegii, nu doar de convenție.

Scris din `POST /api/chapters/[id]/submit`, **înainte** de `student_progress`: dacă
pică ceva, preferăm evenimentele fără agregat (agregatul se reconstruiește din ele)
decât invers. O eroare la scriere se loghează dar nu ascunde scorul elevului.

DDL-ul canonic: [`supabase/migrations/20260812150000_answer_events.sql`](../supabase/migrations/20260812150000_answer_events.sql).

### tickets
Scop: sistemul de mentorat „Nu am înțeles". Elevul trimite o întrebare cu contextul
paginii; profesorul răspunde.

| Coloană | Tip | Descriere |
|---|---|---|
| id | uuid | PK (`gen_random_uuid()`) |
| user_id | uuid | FK → `users(id)` ON DELETE CASCADE — autorul |
| chapter_id | uuid | FK → `chapters(id)` ON DELETE **SET NULL** — context |
| lesson_id | uuid | FK → `lessons(id)` ON DELETE **SET NULL** — context |
| lesson_title | text | Titlul lecției, **snapshot** la creare |
| message | text | Întrebarea inițială (NOT NULL) — rezumat pentru liste |
| selection | text | Fragmentul selectat de elev din lecție |
| scroll_percent | int | Cât parcursese din lecție (0-100, CHECK) |
| progress_score / _total / _attempts | int | Progresul la testul capitolului, **înghețat** la momentul întrebării |
| status | text | `open` / `answered` / `closed` (default `open`) — CHECK |
| last_message_at | timestamptz | Ultima activitate — după ea se ordonează coada |
| created_at / updated_at | timestamptz | default `now()` |

### ticket_messages
Scop: firul de discuție al unui tichet. Fluxul nu e o pereche întrebare/răspuns:
elevul poate reveni, profesorul poate cere lămuriri.

| Coloană | Tip | Descriere |
|---|---|---|
| id | uuid | PK (`gen_random_uuid()`) |
| ticket_id | uuid | FK → `tickets(id)` ON DELETE CASCADE |
| author_id | uuid | FK → `users(id)` ON DELETE SET NULL |
| author_role | text | `student` / `teacher` — **înghețat** la momentul scrierii (CHECK) |
| body | text | Conținutul mesajului (NOT NULL, max 5000 în API) |
| created_at | timestamptz | default `now()` |

> **De ce `author_role` înghețat:** dacă un elev e promovat profesor, mesajele lui vechi
> nu trebuie să devină retroactiv răspunsuri oficiale.
>
> **De ce snapshot la `lesson_title` și la progres:** `lesson_id` e ON DELETE SET NULL,
> deci după ștergerea lecției tichetul ar rămâne fără subiect; iar profesorul trebuie să
> vadă cum stătea elevul **când a întrebat**, nu cum stă când citește.

> **De ce SET NULL pe context:** dacă profesorul șterge lecția, întrebarea elevului
> **nu** trebuie să dispară — se pierde doar legătura, nu și subiectul (vezi `lesson_title`).

Tichetele se deschid **doar din fereastra unei lecții** — `lesson_id` e obligatoriu în API.
Coloana rămâne totuși nullable în DB, ca ștergerea lecției să poată face SET NULL fără să
piardă tichetul.

DDL: [`20260807100000_tichete_mentorat.sql`](../supabase/migrations/20260807100000_tichete_mentorat.sql)
+ [`20260807120000_tichete_mesaje_context.sql`](../supabase/migrations/20260807120000_tichete_mesaje_context.sql)
(firul de mesaje + contextul de lecție).

---

## Conexiunea la Supabase

Fișier: `lib/supabase.ts`

Exportă un client `supabase` creat cu URL-ul și cheia publică (`anon`) din variabilele de mediu. Se importă în orice fișier care are nevoie să citească sau să scrie date:

```ts
import { supabase } from '@/lib/supabase'
```

Cheia `anon` e sigură pentru browser — are acces limitat, controlat prin regulile RLS (Row Level Security) definite în Supabase. Cheia `service_role` (acces total, fără restricții RLS) se folosește doar în cod de server și niciodată în browser.

Pentru operațiuni de server (webhook, panou admin) se folosește clientul admin din
`lib/supabase-admin.ts`, care creează clientul cu cheia `service_role`.

---

> Actualizat la: 2026-07-01 — adăugat `processed_events` (idempotență webhook Stripe).
> Schema mutată în migrări versionate (`supabase/migrations/`) + tipuri generate (`types/database.ts`).
