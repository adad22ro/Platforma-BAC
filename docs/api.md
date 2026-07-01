# Rute API

> Actualizat la: 2026-06-29

## Cum sunt organizate

Rutele API se află în `/app/api/`. Fiecare rută va fi documentată aici după ce e creată.

### Format standard

```
### METHOD /api/nume-ruta
Scop: ce face această rută

Request:
- Headers: ce headers sunt necesare (ex: autentificare)
- Body: { camp: tip — descriere }

Response:
- 200: { ... } — descriere succes
- 400: { error: "..." } — când apare
- 401: neautorizat — când apare

Cine o apelează: (ex: componenta X, webhook Stripe)
```

---

## Rute existente

### POST /api/checkout
Scop: creează o sesiune Stripe Checkout pentru abonamentul lunar și întoarce URL-ul de plată.

Request:
- Headers: necesită user autentificat (sesiune Clerk) — ruta e protejată de `proxy.ts`
- Body: niciun body (planul e fix: `STRIPE_PRICE_ID_MONTHLY`)

Response:
- 200: `{ url: string }` — URL-ul Stripe Checkout pentru redirect
- 401: neautorizat — user nelogat
- 500: Stripe neconfigurat (`STRIPE_PRICE_ID_MONTHLY` lipsă) sau eroare la creare

Cine o apelează: pagina `/upgrade` (după sign-up cu `?plan=premium` sau butonul „Upgrade").

### POST /api/webhooks/stripe
Scop: primește evenimentele Stripe și sincronizează abonamentul în `users`.

Request:
- Headers: `stripe-signature` (verificat cu `STRIPE_WEBHOOK_SECRET`)
- Body: payload Stripe (raw)
- Rută publică (`/api/webhooks(.*)` în `proxy.ts`)

Response:
- 200: `OK` — procesat (sau eveniment ignorat)
- 400: semnătură invalidă
- 500: eroare în handler

Evenimente tratate: `checkout.session.completed`, `customer.subscription.updated`,
`customer.subscription.deleted` (detalii în `docs/stripe.md`).

Idempotent (dedup prin `processed_events`) și cu alerte critice pe Discord la
eșec — vezi `docs/monitoring.md`.

### POST /api/webhooks/clerk
Scop: sincronizează userii Clerk în tabelul `users` (`user.created` / `updated` / `deleted`).
Detalii în `docs/auth.md` și `docs/database.md`. Rută publică, verificată cu `CLERK_WEBHOOK_SIGNING_SECRET`.
