@AGENTS.md

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
