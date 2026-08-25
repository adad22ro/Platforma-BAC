-- Baremul oficial ca date (Faza 2, grupa C — primul rand).
--
-- De ce: baremul e o CONSTANTA administrativa. Rubrica de redactare de la Subiectul
-- III e identica caracter cu caracter in 9 din 11 bareme oficiale analizate
-- (2021-2026, docs/bac-barem-analiza.md). Codificat ca date, corectarea devine
-- „aplica criteriul X cu pragurile lui", nu `if`-uri imprastiate prin rute. Cand
-- Ministerul schimba baremul, se schimba datele — nu codul.
--
-- SURSA DE ADEVAR E `data/barem.json`, nu tabelul asta. Tabelele se populeaza cu
-- `npm run barem:import`. Motivul: baremul produce NOTE, iar un prag schimbat direct
-- in DB, fara diff si fara review, modifica tacit punctajele. In JSON, fiecare
-- corectura trece prin commit si se poate da inapoi.
--
-- ─────────────────────────────────────────────────────────────
-- DE CE VERSIONAM
-- ─────────────────────────────────────────────────────────────
-- O nota acordata trebuie sa ramana explicabila. Daca peste doua luni corectam un
-- prag transcris gresit si rescriem randurile existente, toate notele date pana
-- atunci devin imposibil de justificat: elevul are 7 pe ecran, sistemul recalculeaza
-- 8, si nimeni nu poate spune care e adevarul.
--
-- De aceea importul nu face UPDATE, ci INSEREAZA o versiune noua si o marcheaza
-- activa. Notarile viitoare vor referi `barem_criterii.id`, care apartine unei
-- versiuni anume — deci raman reproductibile pe vecie. Versiunile vechi nu se sterg.
-- E o coloana in plus acum si foarte scump de adaugat mai tarziu.

-- ─────────────────────────────────────────────────────────────
-- barem_versions — o linie per import care chiar aduce ceva nou
-- ─────────────────────────────────────────────────────────────
create table if not exists public.barem_versions (
  id uuid primary key default gen_random_uuid(),

  -- Data din `versiune_document` a fisierului. Informativ, pentru om.
  versiune_document text not null,

  -- Hash-ul continutului fisierului. Importul e idempotent pe baza lui: daca
  -- checksum-ul e acelasi cu al versiunii active, nu se insereaza nimic. Fara el,
  -- fiecare rulare ar crea o versiune noua identica si istoricul ar deveni zgomot.
  checksum text not null unique,

  sursa text not null,

  is_active boolean not null default false,

  created_at timestamptz not null default now()
);

-- O singura versiune activa la un moment dat, garantat de baza de date, nu de
-- disciplina scriptului. Daca importul crapa la jumatate, nu raman doua active.
create unique index if not exists barem_versions_una_activa
  on public.barem_versions (is_active)
  where is_active;

-- ─────────────────────────────────────────────────────────────
-- barem_rubrici — un subiect (sau o parte de subiect) cu punctajul lui
-- ─────────────────────────────────────────────────────────────
create table if not exists public.barem_rubrici (
  id uuid primary key default gen_random_uuid(),

  version_id uuid not null references public.barem_versions(id) on delete cascade,

  -- Stabil intre versiuni: 's3-redactare' inseamna acelasi lucru si peste doi ani.
  -- Unic doar in interiorul versiunii — acelasi slug reapare la fiecare import.
  slug text not null,

  -- 'I.A', 'I.B', 'II', 'III'. Text, nu enum: daca structura examenului se schimba,
  -- nu vrem o migrare doar ca sa putem scrie o valoare noua.
  subiect text not null,

  denumire text not null,

  -- NULL = se aplica la ambele profiluri. Aceeasi conventie ca la `tags.profile`.
  -- Deocamdata toate rubricile sunt NULL: baremele de real si de uman coincid la
  -- Subiectul II in toti anii analizati, iar la III difera cerinta, nu rubrica.
  profil text check (profil in ('uman')),

  puncte_total integer not null check (puncte_total > 0),

  -- Pragul explicit din barem: 50 la Subiectul II, 150 la I.B, 400 la III.
  minim_cuvinte integer check (minim_cuvinte > 0),

  observatii text,

  -- Ordinea in care se arata omului, nu alfabetic.
  order_index integer not null default 0,

  unique (version_id, slug)
);

create index if not exists barem_rubrici_version_idx
  on public.barem_rubrici (version_id);

-- ─────────────────────────────────────────────────────────────
-- barem_criterii — randul de barem pe care se dau punctele
-- ─────────────────────────────────────────────────────────────
create table if not exists public.barem_criterii (
  id uuid primary key default gen_random_uuid(),

  rubrica_id uuid not null references public.barem_rubrici(id) on delete cascade,

  slug text not null,
  denumire text not null,

  puncte_max integer not null check (puncte_max > 0),

  -- Stratul de corectare (docs/bac-barem-analiza.md §6):
  --   auto   — determinist, fara AI si fara mentor
  --   ai     — pre-notare pentru mentor, NICIODATA nota finala
  --   mentor — doar om
  strat text not null check (strat in ('auto', 'ai', 'mentor')),

  -- Ce unealta aplica criteriul. Obligatoriu pe stratul 'auto' si interzis in rest
  -- — un criteriu automat fara verificator ar trece tacut prin corectare si ar da
  -- mereu 0. Constrangerea e aici, nu doar in validator, ca sa nu depinda de care
  -- script a scris randul.
  verificator text check (verificator in (
    'numar_cuvinte', 'conectori', 'parti_componente', 'concluzie',
    'citat', 'raspuns_in_enunt', 'languagetool', 'acordat_implicit'
  )),
  constraint barem_criterii_verificator_doar_pe_auto check (
    (strat = 'auto' and verificator is not null)
    or (strat <> 'auto' and verificator is null)
  ),

  -- Pragurile, in ordinea din barem (descrescator dupa punctaj):
  --   [{"puncte": 2, "conditie": "0-1 greseli"}, {"puncte": 1, "conditie": "2 greseli"}]
  -- jsonb si nu tabel separat: se citesc mereu intregi, odata cu criteriul, si nu se
  -- interogheaza niciodata dupa continutul lor.
  praguri jsonb not null default '[]'::jsonb,

  -- Parametrii verificatorului, ex. {"minim": 150} pentru 'numar_cuvinte'.
  parametri jsonb,

  observatii text,

  order_index integer not null default 0,

  unique (rubrica_id, slug)
);

create index if not exists barem_criterii_rubrica_idx
  on public.barem_criterii (rubrica_id);

-- ─────────────────────────────────────────────────────────────
-- Acces
-- ─────────────────────────────────────────────────────────────
alter table public.barem_versions enable row level security;
alter table public.barem_rubrici enable row level security;
alter table public.barem_criterii enable row level security;

-- Fara `delete`: versiunile vechi nu se sterg, altfel notele acordate pe ele devin
-- neexplicabile. `update` exista doar ca importul sa poata muta steagul is_active.
grant select, insert, update on public.barem_versions to service_role;
grant select, insert on public.barem_rubrici to service_role;
grant select, insert on public.barem_criterii to service_role;
