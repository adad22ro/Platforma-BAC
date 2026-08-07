-- Tichete v2: fir de mesaje + context bogat de lecție.
--
-- Două schimbări față de migrarea precedentă (aceeași zi, branch nemerge-uit —
-- de aceea o migrare nouă, nu editarea celei vechi):
--
-- 1. Răspunsul nu mai e o pereche de coloane pe tichet, ci un **fir de mesaje**
--    (`ticket_messages`): elevul poate reveni cu „tot nu am înțeles", profesorul
--    poate cere lămuriri. Coloanele `answer` / `answered_by` / `answered_at` dispar,
--    iar conținutul lor existent (dacă există) e mutat în fir, nu pierdut.
-- 2. Tichetul se deschide **doar din fereastra lecției**, iar profesorul trebuie să
--    știe exact unde era elevul: lecția, poziția în ea, fragmentul selectat și cât
--    de bine stă la testul capitolului.

-- ─────────────────────────────────────────────────────────────
-- ticket_messages — firul de discuție
-- ─────────────────────────────────────────────────────────────
create table if not exists public.ticket_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets(id) on delete cascade,
  -- SET NULL: dacă un cont dispare, mesajele din fir rămân lizibile.
  author_id uuid references public.users(id) on delete set null,
  -- Rolul autorului la momentul scrierii, înghețat: dacă un elev devine profesor,
  -- mesajele lui vechi nu trebuie să se transforme retroactiv în răspunsuri oficiale.
  author_role text not null default 'student',
  body text not null,
  created_at timestamptz not null default now()
);

alter table public.ticket_messages drop constraint if exists ticket_messages_author_role_check;
alter table public.ticket_messages add constraint ticket_messages_author_role_check
  check (author_role in ('student', 'teacher'));

create index if not exists ticket_messages_ticket_id_idx
  on public.ticket_messages (ticket_id, created_at);

-- ─────────────────────────────────────────────────────────────
-- Context de lecție pe tichet (capturat pe server la creare)
-- ─────────────────────────────────────────────────────────────
alter table public.tickets
  -- Titlul lecției, înghețat: `lesson_id` e ON DELETE SET NULL, deci după ștergerea
  -- lecției tichetul ar rămâne fără niciun indiciu despre subiect. Snapshot-ul îl salvează.
  add column if not exists lesson_title text,
  -- Fragmentul selectat de elev înainte să apese „Nu am înțeles".
  add column if not exists selection text,
  -- Cât din lecție parcursese (0-100), ca profesorul să vadă unde s-a blocat.
  add column if not exists scroll_percent int,
  -- Progresul la testul capitolului în momentul întrebării — înghețat, nu citit la
  -- afișare: profesorul trebuie să vadă cum stătea elevul CÂND a întrebat, nu acum.
  add column if not exists progress_score int,
  add column if not exists progress_total int,
  add column if not exists progress_attempts int,
  add column if not exists last_message_at timestamptz;

alter table public.tickets drop constraint if exists tickets_scroll_percent_check;
alter table public.tickets add constraint tickets_scroll_percent_check
  check (scroll_percent is null or (scroll_percent >= 0 and scroll_percent <= 100));

-- ─────────────────────────────────────────────────────────────
-- Migrarea răspunsurilor existente în fir, apoi eliminarea coloanelor
-- ─────────────────────────────────────────────────────────────
-- Mesajul inițial al elevului devine primul mesaj din fir.
insert into public.ticket_messages (ticket_id, author_id, author_role, body, created_at)
select t.id, t.user_id, 'student', t.message, t.created_at
from public.tickets t
where not exists (select 1 from public.ticket_messages m where m.ticket_id = t.id);

-- Răspunsul profesorului (dacă exista) devine al doilea mesaj.
insert into public.ticket_messages (ticket_id, author_id, author_role, body, created_at)
select t.id, t.answered_by, 'teacher', t.answer, coalesce(t.answered_at, t.updated_at)
from public.tickets t
where t.answer is not null;

alter table public.tickets
  drop constraint if exists tickets_answer_present_check;

alter table public.tickets
  drop column if exists answer,
  drop column if exists answered_by,
  drop column if exists answered_at;

update public.tickets t
set last_message_at = coalesce(
  (select max(m.created_at) from public.ticket_messages m where m.ticket_id = t.id),
  t.created_at
)
where t.last_message_at is null;

alter table public.ticket_messages enable row level security;
grant select, insert, update, delete on public.ticket_messages to service_role;
