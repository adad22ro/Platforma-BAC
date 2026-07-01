# Baza de date

> Actualizat la: 2026-06-26
> Serviciu: Supabase (PostgreSQL)

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
| created_at | timestamptz | Data creării |

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
