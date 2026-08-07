-- Sistem de mentorat prin tichete (Săpt. 9-10).
--
-- Elevul apasă „Nu am înțeles" într-o lecție/test; se creează un tichet cu contextul
-- automat (capitol + lecție). Profesorul răspunde; elevul vede răspunsul.
--
-- Un singur tabel, cu răspunsul ca **coloane pe tichet**, nu ca fir de mesaje: fluxul
-- e o întrebare → un răspuns. Dacă ajungem la conversații (mai multe schimburi), se
-- adaugă atunci un tabel `ticket_messages` — nu construim acum pentru un flux ipotetic.
--
-- Model de acces: RLS activat, fără politici pentru anon (deny), grant service_role —
-- autorizarea în API routes (elevul își vede doar tichetele proprii; profesorul, toate).

create table if not exists public.tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,

  -- Contextul de unde a fost trimis tichetul. Ambele opționale și cu ON DELETE SET
  -- NULL: dacă profesorul șterge lecția, întrebarea elevului NU trebuie să dispară.
  chapter_id uuid references public.chapters(id) on delete set null,
  lesson_id uuid references public.lessons(id) on delete set null,

  message text not null,
  status text not null default 'open',

  answer text,
  answered_by uuid references public.users(id) on delete set null,
  answered_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Valorile permise pentru status (aliniate cu codul — vezi ERRORS #013 pentru
-- ce se întâmplă când constraint-ul și codul diverg).
alter table public.tickets drop constraint if exists tickets_status_check;
alter table public.tickets add constraint tickets_status_check
  check (status in ('open', 'answered', 'closed'));

-- Un tichet „answered" trebuie să aibă efectiv un răspuns — altfel elevul vede
-- „ai primit răspuns" și deschide un tichet gol.
alter table public.tickets drop constraint if exists tickets_answer_present_check;
alter table public.tickets add constraint tickets_answer_present_check
  check (status <> 'answered' or (answer is not null and answered_at is not null));

alter table public.tickets enable row level security;
grant select, insert, update, delete on public.tickets to service_role;

-- Elevul își listează tichetele proprii; profesorul le grupează pe capitol și
-- filtrează pe status (coada de „open").
create index if not exists tickets_user_id_idx on public.tickets (user_id);
create index if not exists tickets_chapter_id_idx on public.tickets (chapter_id);
create index if not exists tickets_status_created_idx on public.tickets (status, created_at desc);
