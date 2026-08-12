-- Etichete pe întrebări (Faza 2, grupa A — ultimul rând).
--
-- De ce: ierarhia `chapters → lessons` e unidimensională, iar materia nu e. Un eseu
-- despre *Ion* atinge simultan autorul, specia, curentul, perspectiva narativă și
-- competența de redactare. Ierarhia nu poate exprima asta fără să dubleze conținut.
--
-- Axa 1 (conținutul literar) rămâne ierarhie. Axele 2 și 3 — conceptele de teorie
-- literară și competențele de limbă — devin etichete care traversează ierarhia.
--
-- Etichetele sunt precondiția pentru:
--   • stăpânire per concept („ce știi / ce nu știi")
--   • FSRS — care programează CONCEPTE, nu întrebări. Un elev care răspunde corect
--     la întrebarea #47 n-a demonstrat că știe întrebarea #47 (n-o va mai vedea
--     niciodată), ci că știe conceptul. Recapitularea trebuie să-i dea altă întrebare
--     despre același concept.
--   • catalogul de neînțelegeri din secțiunea remedială
--
-- VOCABULAR ÎNCHIS, nu `text[]` liber. Motivul e concret: „perspectiva narativa" și
-- „perspectivă narativă" ar deveni două concepte diferite, tăcut. Stăpânirea elevului
-- s-ar împărți în două, FSRS ar programa două lucruri în loc de unul, și nimeni n-ar
-- observa luni de zile — nu e o eroare, e doar un număr ușor greșit.
--
-- SURSA: fiecare etichetă de mai jos are corespondent textual în programa de examen
-- în vigoare — Anexa nr. 2 la OMEN 4.923/2013, valabilă pentru BAC 2026 conform
-- Art. 3 alin. (4) din OMEC 6.059/2025. Detalii și verificare: docs/surse-oficiale.md.

-- ─────────────────────────────────────────────────────────────
-- tags — vocabularul
-- ─────────────────────────────────────────────────────────────
create table if not exists public.tags (
  id uuid primary key default gen_random_uuid(),

  -- Identificatorul stabil, folosit în cod și în API. Nu se schimbă la redenumire.
  slug text not null unique,

  -- Ce vede omul. Se poate schimba fără să atingă datele legate.
  name text not null,

  -- Axa din care face parte. 'concept' = teorie literară, 'limba' = nivelurile de
  -- constituire a mesajului, 'curent' = curente culturale/literare,
  -- 'competenta' = ce trebuie să știi să faci (eseu, text argumentativ).
  axis text not null check (axis in ('concept', 'limba', 'curent', 'competenta')),

  -- NULL = se aplică la ambele profiluri. 'uman' = doar filiera teoretică profil
  -- umanist și vocațional pedagogic. Cele două programe oficiale diferă în exact
  -- două puncte, deci nu ne trebuie parcursuri separate — doar filtrare.
  profile text check (profile in ('uman')),

  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- question_tags — legătura
-- ─────────────────────────────────────────────────────────────
create table if not exists public.question_tags (
  question_id uuid not null references public.questions(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete restrict,
  primary key (question_id, tag_id)
);

-- ON DELETE RESTRICT pe tag, deliberat: ștergerea unei etichete folosite ar rupe
-- tăcut istoricul de stăpânire pe conceptul respectiv. Dacă chiar trebuie scoasă,
-- se dezleagă întâi întrebările, conștient.

create index if not exists question_tags_tag_idx on public.question_tags (tag_id);

alter table public.tags enable row level security;
alter table public.question_tags enable row level security;

grant select on public.tags to service_role;
grant select, insert, delete on public.question_tags to service_role;

-- Vocabularul se administrează prin migrări, nu din aplicație: de aceea `tags` are
-- doar `select`. O etichetă nouă = o migrare nouă, revizuită la PR — exact bariera
-- care împiedică inventarea de duplicate.

-- ─────────────────────────────────────────────────────────────
-- Vocabularul inițial, din programa oficială
-- ─────────────────────────────────────────────────────────────
insert into public.tags (slug, name, axis, profile) values
  -- Concepte de teorie literară (competențele 2.1-2.5 din programă)
  ('tema-si-viziunea',            'Temă și viziune despre lume',            'concept', null),
  ('motiv-literar',               'Motiv literar',                          'concept', null),
  ('gen-epic',                    'Genul epic',                             'concept', null),
  ('gen-liric',                   'Genul liric',                            'concept', null),
  ('gen-dramatic',                'Genul dramatic',                         'concept', null),
  ('constructia-subiectului',     'Construcția subiectului',                'concept', null),
  ('incipit-si-final',            'Incipit și final',                       'concept', null),
  ('secvente-narative',           'Episoade/secvențe narative',             'concept', null),
  ('tehnici-narative',            'Tehnici narative',                       'concept', null),
  ('instantele-comunicarii',      'Instanțele comunicării',                 'concept', null),
  ('constructia-personajului',    'Construcția personajului',               'concept', null),
  ('caracterizarea-personajului', 'Modalități de caracterizare',            'concept', null),
  ('tipuri-de-personaje',         'Tipuri de personaje',                    'concept', null),
  ('perspectiva-narativa',        'Tipuri de perspectivă narativă',         'concept', null),
  ('basm-cult',                   'Basmul cult',                            'concept', null),
  ('nuvela',                      'Nuvela',                                 'concept', null),
  ('roman',                       'Romanul',                                'concept', null),
  ('comedia',                     'Comedia',                                'concept', null),
  ('drama',                       'Drama',                                  'concept', 'uman'),
  ('registre-stilistice',         'Registre stilistice',                    'concept', null),
  ('limbajul-personajelor',       'Limbajul personajelor',                  'concept', null),
  ('limbajul-naratorului',        'Limbajul naratorului',                   'concept', null),
  ('stil-direct-indirect',        'Stil direct, indirect, indirect liber',  'concept', null),
  ('notatiile-autorului',         'Notațiile autorului',                    'concept', null),
  ('cronica-de-spectacol',        'Cronica de spectacol',                   'concept', null),
  ('titlu',                       'Titlul',                                 'concept', null),
  ('opozitie-si-simetrie',        'Relații de opoziție și de simetrie',     'concept', null),
  ('motiv-poetic',                'Motiv poetic, laitmotiv, simbol central','concept', null),
  ('idee-poetica',                'Idee poetică',                           'concept', null),
  ('sugestie-si-ambiguitate',     'Sugestie și ambiguitate',                'concept', null),
  ('imaginar-poetic',             'Imaginar poetic',                        'concept', null),
  ('figuri-semantice',            'Figuri semantice (tropi)',               'concept', null),
  ('prozodie',                    'Elemente de prozodie',                   'concept', null),
  ('calitatile-stilului',         'Calitățile generale și particulare ale stilului', 'concept', 'uman'),

  -- Niveluri de constituire a mesajului (secțiunea B. Limbă și comunicare)
  ('nivel-fonetic',               'Nivelul fonetic',                        'limba', null),
  ('nivel-lexico-semantic',       'Nivelul lexico-semantic',                'limba', null),
  ('nivel-morfosintactic',        'Nivelul morfosintactic',                 'limba', null),
  ('nivel-ortografic',            'Nivelul ortografic și de punctuație',    'limba', null),
  ('nivel-stilistico-textual',    'Nivelul stilistico-textual',             'limba', null),

  -- Curente culturale/literare (competența 3.2)
  ('umanism',                     'Umanismul',                              'curent', null),
  ('iluminism',                   'Iluminismul',                            'curent', null),
  ('pasoptism',                   'Perioada pașoptistă',                    'curent', null),
  ('criticism-junimist',          'Criticismul junimist',                   'curent', null),
  ('romantism',                   'Romantismul',                            'curent', null),
  ('realism',                     'Realismul',                              'curent', null),
  ('simbolism',                   'Simbolismul',                            'curent', null),
  ('modernism',                   'Modernismul',                            'curent', null),
  ('traditionalism',              'Tradiționalismul',                       'curent', null),

  -- Competențe de examen (ce trebuie să știi să faci)
  ('text-argumentativ',           'Textul argumentativ',                    'competenta', null),
  ('eseu-structurat',             'Eseul structurat',                       'competenta', null),
  ('eseu-liber',                  'Eseul liber',                            'competenta', null)
on conflict (slug) do nothing;
