# Testare & CI

> Actualizat la: 2026-07-01

Testele automate acoperă **logica de bani** (Stripe checkout + webhook) — zona
deja live, unde o regresie costă direct. Rulează fără servicii reale sau secrete:
toate dependențele externe (Stripe, Supabase, Clerk, `logError`) sunt mock-uite.

## Cum rulezi

```bash
npm test          # ruleaza o data (folosit si de CI)
npm run test:watch  # re-ruleaza la fiecare modificare (dev)
```

- Framework: **Vitest 3**, mediu `node`.
- Config: [`vitest.config.mts`](../vitest.config.mts) — include `tests/**/*.test.ts`, alias `@` → rădăcina proiectului.
- Testele NU ating rețeaua: `vi.mock` înlocuiește `@/lib/stripe`, `@/lib/supabase-admin`, `@/lib/log-error` și `@clerk/nextjs/server`.

## Ce e acoperit

### `tests/stripe-webhook.test.ts` — [`app/api/webhooks/stripe/route.ts`](../app/api/webhooks/stripe/route.ts)

| Scenariu | Așteptare |
|---|---|
| Semnătură invalidă | `400` + alertă `critical` |
| Eveniment duplicat (`23505` pe `processed_events`) | `200` „Duplicate ignored", fără reprocesare (idempotență) |
| `checkout.session.completed` | user `active` + `stripe_customer_id`, match pe `clerk_id`, `end_date` din subscription |
| `customer.subscription.updated` status activ | `active`, match pe `stripe_customer_id` |
| `customer.subscription.updated` status `past_due` | `cancelled` |
| `customer.subscription.deleted` | `cancelled` + `end_date` null |
| Eroare în handler | eliberează claim-ul de idempotență (`delete`), `500` + alertă `critical` |
| Eroare la update DB | alertă `critical` (bani scriși în tăcere) |

### `tests/env.test.ts` — [`lib/env.ts`](../lib/env.ts)

Validarea variabilelor de mediu (schema Zod, rulată la boot din `instrumentation.ts`):
trece cu setul complet, aruncă la variabilă obligatorie lipsă sau URL invalid,
acceptă lipsa celor opționale (Discord/Vercel/ADMIN_EMAILS).

### `tests/checkout.test.ts` — [`app/api/checkout/route.ts`](../app/api/checkout/route.ts)

| Scenariu | Așteptare |
|---|---|
| User nelogat | `401`, fără apel Stripe |
| Lipsă `STRIPE_PRICE_ID_MONTHLY` | `500` + log |
| Succes | `{ url }`, sesiune legată de userul Clerk (`client_reference_id`, `metadata.clerk_id`) |
| Stripe aruncă | `500` + alertă `critical` |

## CI — GitHub Actions

[`.github/workflows/ci.yml`](../.github/workflows/ci.yml) rulează la fiecare **push** și **pull request** către `main`:

```
npm ci  →  npm run lint  →  npm run typecheck  →  npm test
```

- Node 24, cache npm.
- Fără secrete: mock-urile fac testele deterministe, deci CI merge pe orice PR (inclusiv de la Bogdan).
- Dacă lint-ul, typecheck-ul sau testele pică, PR-ul devine roșu → se prinde regresia înainte de merge.

## Hook pre-push (local)

[`.githooks/pre-push`](../.githooks/pre-push) rulează aceleași verificări ca CI
(`lint` + `typecheck` + `test`) **înainte** de push, ca să nu vezi CI roșu după.
E activat automat: scriptul `prepare` din `package.json` setează
`git config core.hooksPath .githooks` la `npm install`.

- Sari peste (rar, când chiar știi ce faci): `git push --no-verify`.
- Dacă hook-ul nu se declanșează, rulează o dată `npm install` (sau manual
  `git config core.hooksPath .githooks`).

> Notă: `npm run lint` verifică **tot** proiectul. Prima rulare CI a expus datorie
> de lint pre-existentă în `/admin` — vezi [ERRORS.md](../ERRORS.md) #014.

## Convenții pentru teste noi

- Fișierele trăiesc în `tests/`, denumite `*.test.ts`.
- Mock-uiește dependențele externe cu `vi.mock` + `vi.hoisted` (starea controlabilă per test).
- Testează prin handler-ul real al rutei (`POST`), nu prin funcții extrase — acoperă fluxul de producție fără a rescrie codul.

## Amânat (până există useri/frontend)

`/api/health`, Sentry, teste E2E (Playwright). Vezi DEVLOG (Sesiunea 6-7) pentru raționament.
