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

### Conținut — capitole și lecții

Toate sub `/api`, protejate de `proxy.ts` (necesită login). Autorizarea de rol se
face în handler (`lib/current-user.ts`): **scrierea** (POST/PATCH/DELETE) e doar
pentru `role = teacher`; **citirea** e filtrată după `published` / `is_free` / abonament.

| Rută | Metodă | Scop | Acces |
|---|---|---|---|
| `/api/chapters` | GET | listă capitole | elev: publicate · profesor: toate |
| `/api/chapters` | POST | creează capitol | teacher |
| `/api/chapters/[id]` | GET | un capitol | elev: doar publicat |
| `/api/chapters/[id]` | PATCH | actualizează | teacher |
| `/api/chapters/[id]` | DELETE | șterge (cascade lecții) | teacher |
| `/api/chapters/[id]/lessons` | GET | lecțiile capitolului (titluri) | elev: publicate — vezi gating |
| `/api/lessons` | POST | creează lecție | teacher |
| `/api/lessons/[id]` | GET | o lecție (conținut) | elev: publicat + acces |
| `/api/lessons/[id]` | PATCH | actualizează | teacher |
| `/api/lessons/[id]` | DELETE | șterge | teacher |

**Gating premium (model produs):** userul free vede **lista completă** de capitole și
lecții (titluri). Conținutul (text/video/teste) e blocat:
- `GET /api/chapters/[id]/lessons` — la capitol premium fără acces, întoarce lista de
  titluri cu `content`/`video_url` = `null` și `locked: true` pe fiecare lecție (titlurile
  se văd, conținutul nu se scurge). `200`.
- `GET /api/lessons/[id]` — la conținutul unei lecții premium fără acces → **`402`**
  `{ error: "premium_required" }`. Aici frontend-ul afișează mesajul + butonul de upgrade.

„Acces" = capitol `is_free = true` **sau** abonament `active` (și `subscription_end_date`
în viitor, dacă e setat — apărare în adâncime).

Date placeholder: `npm run seed:content` (3 capitole + lecții demo, idempotent).

### POST /api/admin/set-role
Scop: schimbă rolul unui user (`student` ↔ `teacher`).

Request:
- Headers: user admin (email în `ADMIN_EMAILS`)
- Body: `{ clerk_id: string, role: "student" | "teacher" }`

Response:
- 200: `{ ok: true, role }` · 400: body invalid · 403: neadmin · 500: eroare DB

Cine o apelează: butonul de promovare din panoul `/admin`.

### POST /api/webhooks/clerk
Scop: sincronizează userii Clerk în tabelul `users` (`user.created` / `updated` / `deleted`).
Detalii în `docs/auth.md` și `docs/database.md`. Rută publică, verificată cu `CLERK_WEBHOOK_SIGNING_SECRET`.
