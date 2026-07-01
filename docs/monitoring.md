# Monitorizare și robustețe

> Actualizat la: 2026-07-01

Principiu: monitorizăm ce ne doare dacă se strică **în tăcere** — la noi, zona
**plăți + webhook** (cod care manevrează bani și rulează fără ochi pe el).

## Ce există acum

### 1. Jurnal de erori (`error_logs`)
Toate erorile aplicației trec prin `lib/log-error.ts` (`logError`) și ajung în
tabelul `error_logs`, vizibil în `/admin` și în `npm run debug`. Pasiv — trebuie
să te uiți ca să vezi.

### 2. Alerte instant pe Discord
`logError(source, message, context, 'critical')` trimite, pe lângă scrierea în DB,
o alertă instant pe Discord (dacă `DISCORD_ALERT_WEBHOOK_URL` e setat). Activ —
afli în secunde.

Marcate `critical` (bani/acces stricat în tăcere):
- webhook Stripe: verificare semnătură eșuată, scriere DB eșuată, eroare în handler
- checkout: crearea sesiunii de plată eșuată

Restul erorilor (ex: `user.created` duplicat de la Clerk) rămân `error` — doar în DB,
fără alertă (zgomot redus).

**Configurare Discord:** Server Settings → Integrations → Webhooks → New Webhook →
Copy Webhook URL → pune-l în `DISCORD_ALERT_WEBHOOK_URL` (local în `.env.local`,
pe Vercel în Environment Variables). Fără el, alertele sunt pur și simplu sărite.

### 3. Idempotență webhook (`processed_events`)
Stripe poate livra același eveniment de mai multe ori. Webhook-ul „revendică"
`event.id` în `processed_events` înainte de procesare; duplicatele primesc `200`
fără reprocesare. La eroare, claim-ul e șters ca retry-ul Stripe să funcționeze.
Detalii: `docs/stripe.md`, `docs/database.md`.

### 4. Sondă de sănătate (`/api/health`)
Rută publică (`GET /api/health`, vezi `proxy.ts`) pentru monitorizare uptime.
Verifică conexiunile:
- **Supabase** (critic) — dacă e jos → `503`, `status: "down"`
- **Stripe** (informativ) — dacă e jos dar DB e ok → `200`, `status: "degraded"`

Răspuns: `{ status, checks: { database, stripe }, timestamp }`. Nu se cache-uiește.
Leag-o la un uptime monitor (UptimeRobot/BetterStack) care alertează pe `!= 200`.
Testată în `tests/health.test.ts`.

## Amânat intenționat (prematur la stadiul actual)

- **Uptime monitor extern** (UptimeRobot/BetterStack) legat la `/api/health` — de
  configurat când există useri care depind de uptime (endpoint-ul e deja gata).
- **Sentry** — captură automată de excepții; merită când crește traficul.
- **Teste E2E (Playwright), load testing** — după ce se stabilizează frontend-ul.

## Test rapid al alertelor

Setează `DISCORD_ALERT_WEBHOOK_URL`, apoi provoacă o eroare critică controlată
(ex: `stripe trigger` cu un `STRIPE_WEBHOOK_SECRET` greșit → „Verification failed")
și verifică sosirea mesajului pe Discord + intrarea în `error_logs`.
