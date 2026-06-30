@AGENTS.md

# Jurnalul de erori (ERRORS.md)

- **Înainte** de a investiga o eroare nouă, citește `ERRORS.md` — verifică dacă eroarea (sau una similară) a mai apărut și cum a fost rezolvată.
- **După** ce o eroare nouă a fost rezolvată, adaugă o intrare în `ERRORS.md` (număr incremental, dată, context, cauză, soluție) urmând formatul intrărilor existente.

# Secrete și variabile de mediu

- Secretele NU sunt în Git în clar. Local: `.env.local` (gitignored), obținut prin decriptarea `.env.vault` cu `DOTENV_KEY` (dotenv-vault). Detalii și pași în `docs/onboarding-secrets.md`.
- Nu scrie niciodată valori reale de secrete sau `DOTENV_KEY` într-un fișier comis și nu sugera trimiterea `.env.local` prin email/chat.
- Pe Vercel, variabilele se gestionează în dashboard / prin `vercel env` (nu prin dotenv-vault).

# Unelte de debug

- Pentru o imagine consolidată a stării celor 4 platforme (Clerk, Supabase, Stripe, Vercel) și a erorilor aplicației, rulează `npm run debug`. Util la depanare.
- Panoul `/admin` și tabelul `error_logs` oferă aceleași date vizual. Detalii complete în `docs/admin.md`.
