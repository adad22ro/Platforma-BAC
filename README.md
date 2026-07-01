# Platformă BAC

Platformă educațională pentru pregătirea la BAC — lecții și teste, cu abonament lunar
premium. Echipă de 2: backend (Andrei) + frontend (Bogdan).

## Stack

- **Next.js 16** (App Router, React 19, TypeScript) — ⚠️ middleware-ul se numește `proxy.ts`, nu `middleware.ts`
- **Clerk** — autentificare (email + Google)
- **Supabase** — PostgreSQL (users, conținut, loguri)
- **Stripe** — abonamente recurente
- **Vercel** — hosting + deploy automat din `main`

## Setup rapid

```bash
npm install            # instalează deps + activează hook-ul pre-push
# obține .env.local (vezi docs/onboarding-secrets.md — dotenv-vault)
npm run dev            # http://localhost:3000
```

Variabilele de mediu sunt validate la pornire (`lib/env.ts`) — dacă lipsește una
obligatorie, serverul crapă cu mesaj clar.

## Scripturi

| Comandă | Ce face |
|---|---|
| `npm run dev` / `build` / `start` | Next.js |
| `npm run lint` · `typecheck` · `test` | verificări (rulate și de CI + hook pre-push) |
| `npm run debug` | raport consolidat Clerk/Supabase/Stripe/Vercel |
| `npm run seed:content` | date demo (capitole + lecții) |
| `npm run db:types` | regenerează tipurile Supabase (necesită `supabase link`) |

## Colaborare

- **Niciodată commit direct pe `main`** — branch + PR. CI (lint + typecheck + test)
  trebuie verde înainte de merge.
- Actualizează `DEVLOG.md` (la final de sesiune) și `TASKS.md` (status).
- La fiecare eroare rezolvată → intrare în `ERRORS.md`.

## Documentație (`docs/`)

| Fișier | Despre |
|---|---|
| [architecture.md](docs/architecture.md) | structura proiectului, servicii, flux |
| [auth.md](docs/auth.md) | autentificare, roluri, protejarea rutelor |
| [database.md](docs/database.md) | tabele (schema în `supabase/migrations/`) |
| [api.md](docs/api.md) | rutele API + gating premium |
| [stripe.md](docs/stripe.md) | plăți și abonamente |
| [monitoring.md](docs/monitoring.md) | erori, alerte, idempotență, `/api/health` |
| [admin.md](docs/admin.md) | panoul `/admin` |
| [testing.md](docs/testing.md) | teste + CI + hook pre-push |
| [onboarding-secrets.md](docs/onboarding-secrets.md) | cum obții `.env.local` |

Instrucțiuni pentru agenți: `CLAUDE.md` + `AGENTS.md`.
