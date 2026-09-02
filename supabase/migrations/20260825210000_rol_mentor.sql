-- Rolul de mentor.
--
-- De ce exista separat de `teacher`: modelul de corectare stratificat presupune doi
-- oameni cu volum de munca foarte diferit. Profesorul SCRIE continut (capitole,
-- lectii, intrebari) — munca in valuri, la inceput. Mentorul CORECTEAZA lucrari si
-- raspunde la tichete — munca recurenta, care creste liniar cu numarul de elevi.
-- Amandoi corecteaza; doar profesorul scrie continut.
--
-- Pana acum rolurile erau doar 'student' si 'teacher', iar coloana n-avea CHECK:
-- orice sir trecea, inclusiv un 'techer' scris gresit dintr-un apel de API. Adaugam
-- si constrangerea, ca multimea de roluri sa fie garantata de baza de date.

-- Constrangerea se adauga acum, deci intai ne asiguram ca datele existente o
-- respecta. Orice rol necunoscut ajuns in tabel inainte de CHECK devine 'student' —
-- varianta cea mai putin permisiva, ca o valoare stricata sa nu dea din greseala
-- drepturi de profesor.
update public.users
set role = 'student'
where role not in ('student', 'teacher', 'mentor');

alter table public.users drop constraint if exists users_role_check;
alter table public.users add constraint users_role_check
  check (role in ('student', 'teacher', 'mentor'));

-- Mesajele din firul de tichet retin cine a scris. Mentorul raspunde la tichete la
-- fel ca profesorul, deci are nevoie de propria valoare — nu-l trecem drept
-- 'teacher', fiindca elevul are dreptul sa stie cu cine vorbeste, iar mai tarziu
-- vrem sa putem numara raspunsurile per rol.
alter table public.ticket_messages drop constraint if exists ticket_messages_author_role_check;
alter table public.ticket_messages add constraint ticket_messages_author_role_check
  check (author_role in ('student', 'teacher', 'mentor'));
