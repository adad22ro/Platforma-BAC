-- Teste grilă și progres (Săpt. 7-8).
--
-- questions        — întrebările grilă, legate de un capitol
-- answers          — variantele de răspuns ale unei întrebări (una singură corectă)
-- student_progress — scorul unui elev pe un capitol (o linie per elev × capitol)
--
-- Model de acces identic cu chapters/lessons: RLS activat, fără politici pentru
-- anon (deny by default), grant la service_role — autorizarea se face în API routes.
--
-- Notă de securitate: `answers.is_correct` NU se trimite niciodată către client.
-- Variantele sunt tabel separat (nu jsonb în questions) tocmai ca filtrarea să fie
-- explicită la fiecare citire, iar corectarea să se facă exclusiv pe server.

-- ─────────────────────────────────────────────────────────────
-- questions
-- ─────────────────────────────────────────────────────────────
create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  text text not null,
  explanation text,
  order_index int not null default 0,
  published boolean not null default false,
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- answers
-- ─────────────────────────────────────────────────────────────
create table if not exists public.answers (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions(id) on delete cascade,
  text text not null,
  is_correct boolean not null default false,
  order_index int not null default 0,
  created_at timestamptz not null default now()
);

-- Cel mult un răspuns corect per întrebare (grilă cu răspuns unic).
-- "Cel puțin unul" nu se poate exprima ca index — se validează în API la scriere.
create unique index if not exists answers_one_correct_per_question_idx
  on public.answers (question_id)
  where is_correct;

-- ─────────────────────────────────────────────────────────────
-- student_progress — o linie per (elev, capitol), actualizată la reîncercare
-- ─────────────────────────────────────────────────────────────
create table if not exists public.student_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  score int not null default 0,
  total int not null default 0,
  attempts int not null default 1,
  completed_at timestamptz not null default now()
);

-- Upsert pe (user_id, chapter_id): o reîncercare suprascrie linia existentă.
create unique index if not exists student_progress_user_chapter_idx
  on public.student_progress (user_id, chapter_id);

alter table public.student_progress drop constraint if exists student_progress_score_check;
alter table public.student_progress add constraint student_progress_score_check
  check (score >= 0 and total >= 0 and score <= total);

-- ─────────────────────────────────────────────────────────────
-- RLS + privilegii
-- ─────────────────────────────────────────────────────────────
alter table public.questions enable row level security;
alter table public.answers enable row level security;
alter table public.student_progress enable row level security;

grant select, insert, update, delete on public.questions to service_role;
grant select, insert, update, delete on public.answers to service_role;
grant select, insert, update, delete on public.student_progress to service_role;

create index if not exists questions_chapter_id_idx on public.questions (chapter_id);
create index if not exists answers_question_id_idx on public.answers (question_id);
create index if not exists student_progress_user_id_idx on public.student_progress (user_id);
