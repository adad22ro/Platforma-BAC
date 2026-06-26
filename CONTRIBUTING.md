# Ghid de colaborare — Platformă BAC

Acest document definește regulile de lucru în echipă pentru Andrei și Bogdan. Claude Code trebuie să le respecte și să le reamintească utilizatorului când e cazul.

---

## Flux Git

1. **Niciodată direct pe `main`.** Main = versiune funcțională și testată mereu.
2. **Branch nou pentru fiecare funcționalitate**, pornit din `main` actualizat:
   ```
   git checkout main
   git pull
   git checkout -b nume-functionalitate
   ```
3. **Commit-uri dese și mici**, cu mesaje clare (română sau engleză):
   - ✅ `Adaug formular înregistrare elev`
   - ✅ `Fix: redirect după login nu funcționa pe mobile`
   - ❌ `Update` / `Fix stuff` / `WIP`
4. **La finalul unei funcționalități** → `git push origin nume-branch` + Pull Request pe GitHub.
5. **Celălalt membru revizuiește PR-ul** înainte de merge în `main`.

---

## Zone de responsabilitate

Actualizate în [`TASKS.md`](TASKS.md). Înainte de a edita un fișier dintr-o zonă marcată `🔄 În lucru` de celălalt, confirmă cu el.

---

## Rezolvarea conflictelor de merge

Când apare un conflict:

1. **Claude Code nu alege automat o variantă.** Prezintă conflictul clar: ce fișier, ce linii, ce conține fiecare variantă.
2. **Dacă e vorba de formatare/spații** → se poate rezolva automat, fără întrebare.
3. **Dacă e vorba de logică sau design** → se oprește și întreabă utilizatorul care variantă e corectă.
4. **Dacă nu ești sigur** → întreabă. Mai bine o întrebare în plus decât cod stricat.

### Cine are prioritate?

Nu există prioritate automată bazată pe persoană. Prioritate are **varianta mai recentă și mai corectă tehnic**, stabilită după discuție — nu automat cea a lui Andrei sau a lui Bogdan.

---

## Secretele și variabilele de mediu

- **Niciodată** fișiere `.env` în Git.
- Fișierul [`.env.example`](.env.example) conține lista completă a variabilelor necesare, fără valori reale.
- Când adaugi o variabilă nouă în `.env`, adaug-o imediat și în `.env.example` (fără valoarea reală).
- Cheile API se schimbă între membrii echipei pe un canal privat (nu în cod, nu în comentarii, nu în PR-uri).

---

## Sincronizare zilnică

- La **începutul sesiunii**: citește ultimele intrări din [`DEVLOG.md`](DEVLOG.md) și starea din [`TASKS.md`](TASKS.md).
- La **sfârșitul sesiunii**: adaugă o intrare în `DEVLOG.md` și actualizează statusurile în `TASKS.md`.
- Dacă lucrezi pe o sarcină mai mult de o zi, actualizează Note-ul din `TASKS.md` cu progresul curent.
