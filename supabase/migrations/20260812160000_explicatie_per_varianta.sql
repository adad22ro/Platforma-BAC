-- Explicație per variantă de răspuns (Faza 2, grupa A).
--
-- `questions.explanation` spune de ce răspunsul corect e corect. Asta nu ajunge:
-- un elev care alege „perspectivă obiectivă" în loc de „subiectivă" are o confuzie
-- *specifică*, iar dacă îi arăți doar răspunsul bun, o repetă. Explicația per
-- variantă răspunde la „de ce e greșit exact ce am ales eu".
--
-- Opțională: întrebările existente rămân valide fără ea, iar profesorul o poate
-- completa treptat.
--
-- ATENȚIE la citiri: coloana NU pleacă spre elev înainte de corectare. Textul
-- „varianta asta e greșită pentru că…" dezvăluie răspunsul corect la fel de sigur
-- ca `is_correct`. Se întoarce doar din POST /api/chapters/[id]/submit, după ce
-- elevul a răspuns, și doar pentru varianta pe care a ales-o.

alter table public.answers add column if not exists explanation text;
