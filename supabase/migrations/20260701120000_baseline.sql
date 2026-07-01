-- Baseline — schema completă a bazei de date, așa cum e în producție la 2026-07-01.
--
-- Adoptăm migrări pe o bază DEJA existentă, deci acest fișier este un "squash"
-- idempotent (IF NOT EXISTS / DROP ... IF EXISTS): rularea lui peste producția
-- curentă NU strică nimic și nu pierde date. Migrările viitoare = fișiere noi,
-- cu timestamp mai mare, cu modificări incrementale (NU edita acest baseline).
--
-- Sursa de adevăr pentru schemă. Descrierea pe coloane: docs/database.md.

-- ─────────────────────────────────────────────────────────────
-- users — oglindește utilizatorii din Clerk (populat de webhook-ul Clerk)
-- ─────────────────────────────────────────────────────────────
-- Notă: `id` nu are default — aplicația îl setează explicit (crypto.randomUUID()
-- în webhook-ul Clerk). `clerk_id` e NOT NULL. Reflectă schema reală din producție
-- (confirmat prin tipurile generate — types/database.ts).
create table if not exists public.users (
  id uuid primary key,
  clerk_id text not null,
  email text not null,
  full_name text,
  role text not null default 'student',
  subscription_status text not null default 'free',
  stripe_customer_id text,
  subscription_end_date timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Coloanele Stripe au fost adăugate ulterior; le păstrăm idempotent pentru
-- instanțe create înainte de migrarea abonamentelor.
alter table public.users
  add column if not exists stripe_customer_id text,
  add column if not exists subscription_end_date timestamptz;

-- Valorile permise pentru subscription_status (aliniate cu codul — vezi ERRORS #013).
alter table public.users drop constraint if exists users_subscription_status_check;
alter table public.users add constraint users_subscription_status_check
  check (subscription_status in ('free', 'active', 'cancelled'));

alter table public.users enable row level security;
-- Fără politici pentru anon (deny by default). Autorizarea se face în API routes;
-- accesul de server folosește service_role (bypass RLS).
grant select, insert, update, delete on public.users to service_role;

-- ─────────────────────────────────────────────────────────────
-- error_logs — jurnal persistent de erori (scris de lib/log-error.ts)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.error_logs (
  id uuid primary key default gen_random_uuid(),
  source text,
  message text,
  context jsonb,
  created_at timestamptz not null default now()
);
grant insert, select on public.error_logs to service_role;

-- ─────────────────────────────────────────────────────────────
-- processed_events — idempotență webhook Stripe (dedup pe event.id)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.processed_events (
  event_id text primary key,
  type text,
  processed_at timestamptz not null default now()
);
grant insert, select, delete on public.processed_events to service_role;

-- ─────────────────────────────────────────────────────────────
-- chapters + lessons — conținut educațional (scriere doar teacher, din API)
-- ─────────────────────────────────────────────────────────────
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
