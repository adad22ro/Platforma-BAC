-- Vederi peste jurnalul de răspunsuri (Faza 2, grupa B).
--
-- Amândouă răspund la întrebări care par simple, dar au fiecare o capcană de
-- semantică. Le definim o dată aici, în SQL, ca să nu fie reinterpretate diferit
-- de fiecare rută care le folosește.

-- ─────────────────────────────────────────────────────────────
-- 1. latest_answer_per_question — ULTIMUL răspuns al fiecărui elev, per întrebare
-- ─────────────────────────────────────────────────────────────
--
-- Folosită de „Greșelile mele".
--
-- Capcana: „greșelile mele" NU înseamnă „tot ce am greșit vreodată". Dacă elevul a
-- greșit o întrebare, a învățat conceptul și a nimerit-o data următoare, ea nu mai
-- are ce căuta în listă — altfel lista crește la nesfârșit și devine descurajantă
-- exact pentru elevul care progresează.
--
-- Deci: starea CURENTĂ, dată de ultimul răspuns.
create or replace view public.latest_answer_per_question as
select distinct on (e.user_id, e.question_id)
  e.user_id,
  e.question_id,
  e.chapter_id,
  e.chosen_answer_id,
  e.is_correct,
  e.created_at
from public.answer_events e
where e.question_id is not null
order by e.user_id, e.question_id, e.created_at desc;

-- ─────────────────────────────────────────────────────────────
-- 2. question_difficulty — cât de grea e o întrebare, obiectiv
-- ─────────────────────────────────────────────────────────────
--
-- Folosită de statistica pentru profesor.
--
-- Capcana: dacă numeri toate răspunsurile, întrebarea pare mai ușoară decât e —
-- elevii care reiau testul o nimeresc a doua oară, iar reluările îi umflă rata de
-- succes. Măsura onestă e **prima întâlnire** a fiecărui elev cu întrebarea; e și
-- ce se numește în psihometrie „p-value" al itemului.
--
-- `students` numără elevi distincți, nu răspunsuri: un elev = un vot.
create or replace view public.question_difficulty as
with first_answer as (
  select distinct on (e.user_id, e.question_id)
    e.user_id,
    e.question_id,
    e.is_correct
  from public.answer_events e
  where e.question_id is not null
  order by e.user_id, e.question_id, e.created_at asc
)
select
  question_id,
  count(*)::int                                         as students,
  count(*) filter (where not is_correct)::int           as wrong,
  round(
    100.0 * count(*) filter (where not is_correct) / nullif(count(*), 0)
  )::int                                                as wrong_pct
from first_answer
group by question_id;

-- Privilegii: doar service_role, ca la tabelele de sub ele. Autorizarea rămâne în
-- rutele API — un elev vede doar propriile greșeli, statistica e doar pentru profesor.
grant select on public.latest_answer_per_question to service_role;
grant select on public.question_difficulty to service_role;
