-- Lucrarile elevilor (text liber) si notele pe criterii de barem.
--
-- Pana acum baremul exista ca date si `lib/corectare-strat1.ts` stia sa acorde
-- criteriile deterministe, dar n-avea ce nota: nu exista niciun tabel care sa tina
-- un text scris de elev. Astea doua inchid golul.
--
-- De ce NU intra peste `answer_events`: acolo o linie inseamna „a bifat varianta X
-- la intrebarea Y, verdictul e adevarat/fals" — o valoare, inghetata. O lucrare e
-- text liber, notat pe mai multe criterii, de mai multe ori, de autori diferiti
-- (elevul insusi, verificarea automata, AI-ul, mentorul). Aceeasi masa ar fi facut
-- prost amandoua treburile.

-- ─────────────────────────────────────────────────────────────
-- lucrari — textul scris de elev
-- ─────────────────────────────────────────────────────────────
create table if not exists public.lucrari (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null references public.users(id) on delete cascade,

  -- VERSIUNEA de barem fata de care a fost notata lucrarea, inghetata la creare.
  --
  -- Baremul e versionat: peste un an poate intra alta versiune, cu alte praguri.
  -- Fara legatura asta, notele vechi s-ar raporta tacit la criterii care s-au
  -- schimbat sub ele. RESTRICT, nu CASCADE: o versiune de barem la care exista
  -- lucrari nu are voie sa dispara si sa ia notele cu ea.
  barem_version_id uuid not null references public.barem_versions(id) on delete restrict,
  barem_rubrica_id uuid references public.barem_rubrici(id) on delete set null,

  -- Slug-ul rubricii, copiat: e stabil intre versiuni ('s3-redactare' inseamna
  -- acelasi lucru si peste doi ani), deci pe el se pot face statistici care
  -- traverseaza versiunile, fara join prin trei tabele.
  rubrica_slug text not null,

  -- Context optional. SET NULL: daca profesorul sterge capitolul, lucrarea ramane.
  chapter_id uuid references public.chapters(id) on delete set null,

  text text not null,

  -- Textul-suport (subiectul de la „prima vedere"), pentru verificarea citatului.
  -- Fara el, verificatorul poate confirma doar ca exista ghilimele, nu si ca ce e
  -- intre ele chiar vine din text — iar baremul distinge cele doua lucruri.
  text_suport text,

  status text not null default 'ciorna',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  trimisa_la timestamptz
);

alter table public.lucrari drop constraint if exists lucrari_status_check;
alter table public.lucrari add constraint lucrari_status_check
  check (status in ('ciorna', 'trimisa', 'corectata'));

-- O lucrare „trimisa" trebuie sa aiba si momentul trimiterii. Altfel cozile de
-- corectare s-ar ordona dupa o data care lipseste.
alter table public.lucrari drop constraint if exists lucrari_trimisa_la_check;
alter table public.lucrari add constraint lucrari_trimisa_la_check
  check (status = 'ciorna' or trimisa_la is not null);

create index if not exists lucrari_user_idx on public.lucrari (user_id, created_at desc);
create index if not exists lucrari_rubrica_idx on public.lucrari (rubrica_slug);
-- Coada de corectare: ce e trimis si inca necorectat, cel mai vechi primul.
create index if not exists lucrari_coada_idx
  on public.lucrari (trimisa_la)
  where status = 'trimisa';

-- ─────────────────────────────────────────────────────────────
-- note_criterii — cate un rand per criteriu SI per autor
-- ─────────────────────────────────────────────────────────────
-- Cheia intregului model: acelasi criteriu poate avea mai multe note, de la autori
-- diferiti. Elevul isi da 2 puncte, verificarea automata zice 1, mentorul da 2.
-- Toate trei se pastreaza, fiindca diferenta dintre ele e lucrul care il invata pe
-- elev sa se autoevalueze — nu nota finala.
create table if not exists public.note_criterii (
  id uuid primary key default gen_random_uuid(),

  lucrare_id uuid not null references public.lucrari(id) on delete cascade,

  -- Criteriul din versiunea de barem a lucrarii. SET NULL ca masura de siguranta;
  -- in practica versiunile nu se sterg (nu exista grant de delete pe ele).
  criteriu_id uuid references public.barem_criterii(id) on delete set null,

  -- Copii ale criteriului, ca randul sa ramana citibil singur, fara join, si
  -- corect chiar daca denumirea se schimba intr-o versiune viitoare.
  criteriu_slug text not null,
  denumire text not null,
  din integer not null check (din > 0),

  -- NULL cand starea nu e 'acordat'. Deliberat NULL, nu 0: „n-am putut verifica"
  -- si „ai luat zero" sunt lucruri opuse, iar 0 le-ar face sa arate la fel.
  puncte integer check (puncte is null or puncte >= 0),

  -- 'acordat'      — punctajul e stabilit si se poate acorda
  -- 'indisponibil' — criteriul e automatizabil, dar unealta n-a raspuns
  -- 'nenotat'      — asteapta pe cineva (AI sau mentor)
  stare text not null,

  -- Cine a dat nota. 'elev' = autoevaluare, stratul 0.
  sursa text not null,

  -- Pentru 'mentor' si 'elev': cine anume. SET NULL, ca nota sa nu dispara odata
  -- cu contul.
  autor_id uuid references public.users(id) on delete set null,

  -- In romana, pentru elev: ce s-a masurat, nu doar cat s-a dat.
  explicatie text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.note_criterii drop constraint if exists note_criterii_stare_check;
alter table public.note_criterii add constraint note_criterii_stare_check
  check (stare in ('acordat', 'indisponibil', 'nenotat'));

alter table public.note_criterii drop constraint if exists note_criterii_sursa_check;
alter table public.note_criterii add constraint note_criterii_sursa_check
  check (sursa in ('auto', 'ai', 'mentor', 'elev'));

-- Punctajul nu poate depasi maximul criteriului. Constrangerea sta in baza, nu doar
-- in cod: un mentor care tasteaza 12 in loc de 2 e o greseala de om, iar baza de
-- date e singurul loc care o poate opri indiferent de unde vine scrierea.
alter table public.note_criterii drop constraint if exists note_criterii_puncte_max_check;
alter table public.note_criterii add constraint note_criterii_puncte_max_check
  check (puncte is null or puncte <= din);

-- „Acordat" fara punctaj n-are inteles; punctaj fara „acordat", nici atat.
alter table public.note_criterii drop constraint if exists note_criterii_coerenta_check;
alter table public.note_criterii add constraint note_criterii_coerenta_check
  check ((stare = 'acordat') = (puncte is not null));

-- O singura nota per criteriu SI per autor. Face reluarea corectarii automate
-- idempotenta: se rescrie randul lui 'auto', fara sa atinga nota mentorului si
-- fara sa lase in urma un istoric de incercari identice.
create unique index if not exists note_criterii_unic_idx
  on public.note_criterii (lucrare_id, criteriu_slug, sursa);

create index if not exists note_criterii_lucrare_idx on public.note_criterii (lucrare_id);

-- Model de acces identic cu restul proiectului: RLS pornit, fara politici (deci
-- cheia publica nu vede nimic), scrierea si citirea doar prin service_role, din
-- rutele de API, unde se face si autorizarea.
alter table public.lucrari enable row level security;
alter table public.note_criterii enable row level security;

grant select, insert, update, delete on public.lucrari to service_role;
grant select, insert, update, delete on public.note_criterii to service_role;
