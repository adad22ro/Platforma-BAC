@AGENTS.md

# Starea proiectului — verifică ÎNTOTDEAUNA și branch-urile

> **Regulă obligatorie.** `main` nu spune adevărul întreg. Lucrăm pe branch-uri, iar
> munca nemergeată e invizibilă dacă te uiți doar la istoricul lui `main`.

La **începutul fiecărei conversații** și la **orice** întrebare despre starea
proiectului, ce s-a lucrat, cine ce a făcut sau ce e pe GitHub — verifică toate
branch-urile, nu doar `main`:

```bash
git fetch --all --prune
for b in $(git branch -r --format='%(refname:short)' | grep -v 'HEAD\|origin/main'); do
  printf "%-50s ahead:%-3s behind:%-4s %s\n" "$b" \
    "$(git rev-list --count origin/main..$b)" \
    "$(git rev-list --count $b..origin/main)" \
    "$(git log -1 --format='%ad|%an|%s' --date=short $b)"
done
gh pr list --state all --limit 15
```

Ce urmărești, dincolo de „există commituri noi":

- **`ahead`** — muncă nemergeată. Cine a scris-o și când.
- **`behind`** — cât de veche e baza branch-ului. Un branch rămas mult în urmă
  riscă conflicte și, mai grav, poate fi construit pe **contracte API care s-au
  schimbat între timp** în `main`. Verifică asta explicit înainte de a spune că
  ceva „e gata".
- **PR-uri cu CI roșu**, inclusiv cele de la dependabot.

**De ce există regula:** pe 2026-08-11 s-a raportat că „Bogdan n-a lucrat de două
săptămâni", pentru că verificarea s-a oprit la `main`. În realitate avea ~2.600 de
linii de frontend pe un branch nemergeat, iar o parte era scrisă pe un contract de
API pe care backendul îl schimbase deja. Ambele lucruri se vedeau imediat din
comanda de mai sus.

# Ce afectează pe altcineva se notează ȘI se urcă în `main`

> **Regulă de echipă.** Lucrăm pe branch-uri lungi și în domenii separate — Andrei
> backend, Bogdan frontend. Ce rămâne pe un branch nemergeat, pentru celălalt **nu
> există**.

Orice schimbare care afectează munca celuilalt se **notează concret** și se **duce în
`main`**, nu se lasă pe branch. Intră aici:

- contracte de API schimbate sau rute care dispar;
- câmpuri noi în răspunsuri, sau câmpuri care nu mai există;
- feature flag-uri care ascund UI;
- formate de eroare;
- coloane noi pe care formularele trebuie să le trimită.

Cum se notează, ca să folosească:

- **Numele exact**, nu descrierea. „De reconectat" nu ajută pe nimeni. „`POST
  /api/tickets/[id]/answer` nu mai există, e `/messages`, iar `lesson_id` e obligatoriu
  la creare" ajută.
- **`TASKS.md`** primește rândul de sarcină; **`DEVLOG.md`**, motivul deciziei.
- **Dacă ceva rămâne ascuns după un feature flag, reactivarea e un rând separat în
  TASKS.** Altfel se face reconectarea corect și munca rămâne invizibilă în producție,
  fără ca cineva să înțeleagă de ce.

**De ce există regula:** pe 2026-08-12, UI-ul de tichete al lui Bogdan (~2.600 de linii)
era scris pe contractul vechi — `POST /api/tickets/[id]/answer`, câmpuri
`answer`/`answered_at` — înlocuit între timp de firul de mesaje. **Nu crăpa**, și de
aceea era periculos: `GET /api/tickets` răspundea, dar UI-ul citea câmpuri inexistente,
deci toate tichetele apăreau „În așteptare", inclusiv cele la care profesorul răspunsese.

# Jurnalul de erori (ERRORS.md)

- **Înainte** de a investiga o eroare nouă, citește `ERRORS.md` — verifică dacă eroarea (sau una similară) a mai apărut și cum a fost rezolvată.
- **După** ce o eroare nouă a fost rezolvată, adaugă o intrare în `ERRORS.md` (număr incremental, dată, context, cauză, soluție) urmând formatul intrărilor existente.

# Secrete și variabile de mediu

- Secretele NU sunt în Git în clar. Local: `.env.local` (gitignored), obținut prin decriptarea `.env.vault` cu `DOTENV_KEY` (dotenv-vault). Detalii și pași în `docs/onboarding-secrets.md`.
- Nu scrie niciodată valori reale de secrete sau `DOTENV_KEY` într-un fișier comis și nu sugera trimiterea `.env.local` prin email/chat.
- Pe Vercel, variabilele se gestionează în dashboard / prin `vercel env` (nu prin dotenv-vault).

# Teste și CI

- Logica de plăți (checkout + webhook Stripe) e acoperită de teste Vitest: `npm test` (sau `npm run test:watch`). Rulează fără secrete — dependențele externe sunt mock-uite.
- CI (GitHub Actions) rulează `lint` + `typecheck` (`tsc --noEmit`) + `test` la fiecare push/PR pe `main`; nu strica build-ul verde. La modificări în rutele de plăți, adaugă/actualizează testele. Detalii în `docs/testing.md`.
- Un **hook Git pre-push** (`.githooks/pre-push`, activat automat prin `prepare`) rulează aceleași verificări local înainte de push. Dacă e nevoie să sari peste: `git push --no-verify`.

# Variabile de mediu — validare la boot

- Toate variabilele server sunt validate o dată la pornire în `instrumentation.ts` → `lib/env.ts` (schema Zod). Dacă lipsește/e invalidă una obligatorie, serverul crapă imediat cu mesaj clar (fail-fast). Când adaugi o variabilă nouă, actualizează schema din `lib/env.ts` și `.env.example`.

# Unelte de debug

- Pentru o imagine consolidată a stării celor 4 platforme (Clerk, Supabase, Stripe, Vercel) și a erorilor aplicației, rulează `npm run debug`. Util la depanare.
- Panoul `/admin` și tabelul `error_logs` oferă aceleași date vizual. Detalii complete în `docs/admin.md`.
- Erorile critice (plăți/webhook) trimit alertă instant pe Discord prin `logError(..., 'critical')`; webhook-ul Stripe e idempotent (`processed_events`). Detalii în `docs/monitoring.md`.
