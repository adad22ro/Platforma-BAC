-- Alocarea tichetelor: lipicioasa, cu revenire in pool.
--
-- Tichetul nou se rezerva pentru mentorul care a raspuns ultima data acelui elev.
-- Rezervarea are TERMEN: mentorul are drept de prim refuz, nu proprietate pe elev.
-- La expirare tichetul cade singur in pool-ul comun si il poate lua oricine.
--
-- Trei coloane, nicio tabela de alocari si NICIUN job de fundal: expirarea e o
-- comparatie de timp la citire. Un job care "elibereaza" rezervari ar fi a doua
-- sursa de adevar peste ceas — daca nu ruleaza, tichetele raman blocate tacut.

alter table public.tickets
  -- Cine il are. Inainte de preluare inseamna "rezervat pentru"; dupa preluare,
  -- "al lui". SET NULL la stergerea contului: tichetul se intoarce in pool, nu dispare.
  add column if not exists mentor_rezervat_id uuid references public.users(id) on delete set null,
  -- Pana cand tine rezervarea. Trecut => tichetul e in pool, fara sa-l atinga nimeni.
  add column if not exists rezervat_pana timestamptz,
  -- Cand a fost revendicat ferm. NOT NULL inseamna ca nu mai expira niciodata —
  -- si e exact conditia pe care se sprijina preluarea atomica din pool.
  add column if not exists preluat_la timestamptz;

-- Coada corectorului: tichetele deschise, nepreluate, ordonate dupa vechime.
-- Index partial — tichetele preluate si cele inchise nu se cauta niciodata asa.
create index if not exists tickets_pool_idx
  on public.tickets (created_at)
  where preluat_la is null and status <> 'closed';

-- "Ale mele": ce am rezervat sau preluat eu.
create index if not exists tickets_mentor_rezervat_idx
  on public.tickets (mentor_rezervat_id, last_message_at desc);

comment on column public.tickets.preluat_la is
  'Revendicare ferma. Preluarea din pool se face cu UPDATE ... where preluat_la is null — conditie in scriere, nu verificare-apoi-scriere.';
