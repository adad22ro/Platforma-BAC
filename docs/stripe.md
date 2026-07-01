# Plăți și abonamente

> Actualizat la: 2026-06-29
> Serviciu: Stripe

## Cum funcționează

Stripe gestionează plățile și abonamentele recurente. Noi nu stocăm date de card — Stripe se ocupă de securitate PCI.

## Flux abonament (implementat)

```
1. Elevul ajunge la /upgrade (din butonul "Upgrade" sau direct după
   înregistrare cu ?plan=premium) → POST /api/checkout
2. /api/checkout creează o Stripe Checkout Session (mode: subscription)
   și întoarce { url }; pagina redirectează browserul acolo
3. Elevul completează cardul pe pagina Stripe (nu pe site-ul nostru)
4. Stripe confirmă plata → trimite webhook la /api/webhooks/stripe
5. Webhook-ul setează subscription_status = active în Supabase
   (+ stripe_customer_id, subscription_end_date)
```

### Alegerea planului la înregistrare

Pagina de prețuri (UI: Bogdan) trimite:
- „Premium" → `/sign-up?plan=premium` → după sign-up `forceRedirectUrl=/upgrade` → checkout
- „Gratuit" → `/sign-up` → `forceRedirectUrl=/dashboard` (rămâne `free`)

Userii noi pornesc `free` (default DB, setat la `user.created` prin webhook-ul Clerk).

## Legarea sesiunii de user

`/api/checkout` pune `client_reference_id` + `metadata.clerk_id` pe sesiune.
Webhook-ul caută userul după `stripe_customer_id`, cu fallback pe `clerk_id`
din metadata (la prima plată, când `stripe_customer_id` încă nu e salvat).

## Webhook-uri Stripe folosite

| Eveniment | Ce face aplicația |
|---|---|
| `checkout.session.completed` | `subscription_status = active` + salvează `stripe_customer_id` |
| `customer.subscription.updated` | `active` dacă statusul Stripe e `active`/`trialing`, altfel `cancelled` |
| `customer.subscription.deleted` | `subscription_status = cancelled` |

> **Atenție (API `2026-06-24.dahlia`):** `current_period_end` este per-item, nu pe
> obiectul `Subscription`. Codul îl citește defensiv din ambele locuri (`getPeriodEnd`).

> **Valori `subscription_status`:** `free` / `active` / `cancelled` — trebuie să fie
> identice între cod și CHECK constraint-ul din DB (vezi `ERRORS.md` #013).

### Idempotență și alerte

- **Idempotență:** fiecare `event.id` e „revendicat" în tabelul `processed_events`
  înainte de procesare. Dacă evenimentul a mai fost procesat → răspuns `200` imediat,
  fără reprocesare. La eroare în handler, claim-ul e șters ca Stripe să poată reîncerca.
- **Alerte:** erorile critice (verificare semnătură, scriere DB, handler) apelează
  `logError(..., 'critical')`, care trimite o alertă instant pe Discord dacă
  `DISCORD_ALERT_WEBHOOK_URL` e setat. Vezi `docs/monitoring.md`.

## Prețuri

- Abonament lunar: 60-90 RON (preț final de testat cu utilizatori reali)
- Nivel gratuit: acces la 2-3 capitole introductive (fără Stripe)

---

## Conexiunea la Stripe

Fișier: `lib/stripe.ts`

Exportă un client `stripe` de server creat cu cheia secretă. Se importă doar în cod de server (route handlers, server actions):

```ts
import { stripe } from '@/lib/stripe'
```

Pentru browser (redirect la pagina de plată) se folosește `@stripe/stripe-js` cu cheia publică `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`. Aceasta e sigură pentru browser — nu poate face operații sensibile.

**Regulă:** niciodată `STRIPE_SECRET_KEY` în cod de browser.

---

## Configurare

Variabile de mediu necesare (`.env.local` local, Vercel pe producție):

| Variabilă | De unde |
|---|---|
| `STRIPE_SECRET_KEY` | Stripe Dashboard → Developers → API keys (`sk_test_…`) |
| `STRIPE_PRICE_ID_MONTHLY` | Produsul abonament → Price ID (`price_…`) |
| `STRIPE_WEBHOOK_SECRET` | local: din `stripe listen`; producție: din endpoint-ul webhook din dashboard (`whsec_…`) |
| `NEXT_PUBLIC_APP_URL` | URL-ul aplicației (pentru success/cancel) |

## Testare locală (Stripe CLI)

```bash
# terminal 1
npm run dev
# terminal 2 — forwarding (dă whsec_ pentru .env.local; repornește dev după ce-l pui)
stripe listen --forward-to localhost:3000/api/webhooks/stripe
# terminal 3 — declanșare (cu un clerk_id real din tabelul users)
stripe trigger checkout.session.completed --add checkout_session:client_reference_id=user_XXX
```

Verifică în Supabase / `npm run debug` că userul a trecut pe `active`.
