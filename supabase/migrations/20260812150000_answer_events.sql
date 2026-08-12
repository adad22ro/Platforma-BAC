-- Jurnal de răspunsuri (Faza 2, grupa A).
--
-- answer_events — o linie per răspuns dat de un elev la o întrebare, append-only.
--
-- De ce: `student_progress` face upsert pe (user_id, chapter_id), deci fiecare
-- reîncercare suprascrie precedenta. Știm scorul final, dar nu ce a răspuns elevul
-- și când. Fără istoric la nivel de răspuns nu se pot construi „greșelile mele",
-- dificultatea reală per întrebare, nota estimată sau repetiția spațiată (FSRS).
--
-- `student_progress` NU dispare: rămâne ca vedere agregată, citită direct de
-- `/api/progress`. Sursa de adevăr devine acest tabel.
--
-- Model de acces identic cu restul: RLS activat, fără politici pentru anon
-- (deny by default), grant la service_role — autorizarea se face în API routes.

create table if not exists public.answer_events (
  id uuid primary key default gen_random_uuid(),

  -- Cine. Ștergerea contului șterge și istoricul lui.
  user_id uuid not null references public.users(id) on delete cascade,

  -- Unde. Capitolul e păstrat explicit, nu dedus prin întrebare: întrebarea poate
  -- fi ștearsă, capitolul rămâne unitatea la care se raportează progresul.
  chapter_id uuid not null references public.chapters(id) on delete cascade,

  -- La ce întrebare. ON DELETE SET NULL, nu CASCADE: dacă profesorul șterge o
  -- întrebare, faptul că elevul a dat testul nu trebuie să dispară din istoric.
  -- Statisticile per întrebare ignoră oricum rândurile fără întrebare.
  question_id uuid references public.questions(id) on delete set null,

  -- Ce a bifat. NULL = a lăsat întrebarea fără răspuns (se poate întâmpla: testul
  -- se poate trimite și incomplet). Tot ON DELETE SET NULL, din același motiv.
  chosen_answer_id uuid references public.answers(id) on delete set null,

  -- Verdictul, înghețat la momentul corectării. Deliberat NU se recalculează la
  -- citire: dacă profesorul schimbă ulterior varianta corectă, istoricul trebuie
  -- să arate ce i s-a spus elevului atunci, nu ce ar fi azi.
  is_correct boolean not null,

  -- Grupează răspunsurile dintr-o singură trimitere, ca o încercare să poată fi
  -- reconstituită întreagă (a câta oară a dat testul, ce a schimbat între ori).
  attempt_id uuid not null,

  created_at timestamptz not null default now()
);

-- Fără constrângere de unicitate: tabelul e append-only, iar același elev poate
-- răspunde de mai multe ori la aceeași întrebare — exact istoricul care ne trebuie.

alter table public.answer_events enable row level security;

grant select, insert on public.answer_events to service_role;

-- Interogările pe care le știm de pe acum:
--   „greșelile mele"            → user_id + is_correct, cele mai recente întâi
--   dificultatea per întrebare  → group by question_id
--   o încercare completă        → attempt_id
create index if not exists answer_events_user_created_idx
  on public.answer_events (user_id, created_at desc);
create index if not exists answer_events_question_idx
  on public.answer_events (question_id);
create index if not exists answer_events_attempt_idx
  on public.answer_events (attempt_id);
