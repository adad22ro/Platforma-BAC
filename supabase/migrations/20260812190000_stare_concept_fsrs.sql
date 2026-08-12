-- Starea de repetiție spațiată, per (elev × concept) — Faza 2, grupa H.
--
-- FSRS programează CONCEPTE, nu întrebări. Un elev care răspunde corect la
-- întrebarea #47 despre perspectiva narativă n-a demonstrat că știe întrebarea #47
-- (n-o va mai vedea niciodată la examen), ci că știe conceptul. Recapitularea
-- trebuie să-i dea altă întrebare despre același concept — de aceea cheia e
-- (user_id, tag_id), nu (user_id, question_id).
--
-- De ce un tabel de stare, deși avem deja jurnalul de evenimente: FSRS e un model
-- cu stare (stabilitate + dificultate), care se actualizează incremental la fiecare
-- recenzie. Recalcularea din tot istoricul la fiecare citire ar fi risipă. Jurmalul
-- rămâne sursa de adevăr — starea de aici se poate reconstrui din el oricând,
-- exact ca `student_progress`.
--
-- Câmpurile sunt cele ale unui „card" FSRS (ts-fsrs, FSRS-6). Le păstrăm cu numele
-- din bibliotecă, nu traduse: la citire se dau direct planificatorului, iar o
-- redenumire ar însemna doar un strat de mapare în plus și o ocazie de greșeală.

create table if not exists public.concept_states (
  user_id uuid not null references public.users(id) on delete cascade,
  tag_id  uuid not null references public.tags(id)  on delete cascade,

  -- Când e programată următoarea recapitulare. Coloana pe care se interoghează.
  due timestamptz not null,

  -- Cât de bine e fixat conceptul (zile până când reamintirea scade la pragul dorit)
  stability double precision not null default 0,
  -- Cât de greu i se pare elevului conceptul, 1-10
  difficulty double precision not null default 0,

  elapsed_days   int not null default 0,
  scheduled_days int not null default 0,
  learning_steps int not null default 0,
  reps           int not null default 0,
  lapses         int not null default 0,

  -- 0 New · 1 Learning · 2 Review · 3 Relearning
  state int not null default 0,

  last_review timestamptz,
  updated_at  timestamptz not null default now(),

  primary key (user_id, tag_id)
);

-- Interogarea de zi cu zi: „ce am de recapitulat acum".
create index if not exists concept_states_due_idx on public.concept_states (user_id, due);

alter table public.concept_states enable row level security;

grant select, insert, update on public.concept_states to service_role;

-- Fără delete: o stare ștearsă ar însemna că elevul o ia de la zero pe conceptul
-- respectiv, fără urmă că a știut vreodată. Dacă chiar e nevoie, se reconstruiește
-- din `answer_events`.
