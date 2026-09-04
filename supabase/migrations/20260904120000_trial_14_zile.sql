-- Trial de 14 zile, legat de emailul normalizat.
--
-- Ceasul trial-ului NU e aici: il tine Stripe (`trial_period_days` pe sesiunea de
-- Checkout). Daca ne-am fi scris propriile coloane `trial_start`/`trial_end`, am fi
-- avut a doua sursa de adevar langa `subscription_status`, care se desincronizeaza
-- de Stripe la primul webhook pierdut. Aici tinem un singur lucru, pe care Stripe
-- nu-l poate sti: CINE si-a consumat deja dreptul la trial.

-- ─────────────────────────────────────────────────────────────
-- users.email_normalizat — forma canonica a adresei
-- ─────────────────────────────────────────────────────────────
-- Scrisa de webhook-ul Clerk (lib/email-normalizat.ts). Nullable, fiindca randurile
-- existente nu o au inca si fiindca o adresa fara forma `local@domeniu` normalizeaza
-- la null. Fara UNIQUE pe ea: doi frati care folosesc acelasi Gmail cu `+tag` au
-- dreptul la doua conturi — le refuzam doar al doilea trial, nu contul.
alter table public.users
  add column if not exists email_normalizat text;

create index if not exists users_email_normalizat_idx
  on public.users (email_normalizat);

-- ─────────────────────────────────────────────────────────────
-- trialuri_consumate — un singur trial per casuta, nu per cont
-- ─────────────────────────────────────────────────────────────
-- Tabel separat, nu coloana pe `users`, dintr-un motiv concret: webhook-ul Clerk
-- STERGE randul din `users` la `user.deleted`. Daca dreptul la trial ar fi trait pe
-- acel rand, orice elev si-ar reseta trial-ul stergandu-si contul si facandu-si
-- altul — exact atacul pe care il inchidem. Aici randul ramane.
create table if not exists public.trialuri_consumate (
  email_normalizat text primary key,
  clerk_id text,
  stripe_subscription_id text,
  consumat_la timestamptz not null default now()
);

comment on table public.trialuri_consumate is
  'Casutele care si-au folosit trial-ul de 14 zile. Randurile NU se sterg la stergerea contului — asta e tot rostul tabelului.';

-- RLS: nimeni nu citeste tabelul asta din client. Scrie doar webhook-ul Stripe,
-- prin service_role (care ocoleste RLS). Activam RLS fara nicio politica, deci
-- cheia anon nu vede nimic.
alter table public.trialuri_consumate enable row level security;

grant select, insert, update, delete on public.trialuri_consumate to service_role;
