# Jurnal de dezvoltare — Platformă BAC

> Adaugă o intrare la **sfârșitul fiecărei sesiuni de lucru**.
> Format: `## YYYY-MM-DD — Andrei / Bogdan`
> Fii scurt și concret: ce s-a făcut, ce decizii s-au luat, ce probleme au rămas deschise.

---

## 2026-06-29 — Andrei (Sesiunea 5)

**Ce s-a făcut:**
- **Stripe Checkout** — `app/api/checkout/route.ts`: rută protejată (cere user logat), creează o Checkout Session pe abonament lunar (`STRIPE_PRICE_ID_MONTHLY`), leagă userul prin `client_reference_id` + `metadata.clerk_id`, întoarce `{ url }` pentru redirect
- **Webhook Stripe** — `app/api/webhooks/stripe/route.ts`: tratează `checkout.session.completed` (→ `active` + salvează `stripe_customer_id`), `customer.subscription.updated` (`active`/`cancelled` după status), `customer.subscription.deleted` (→ `cancelled`). `current_period_end` citit defensiv (per-item la API `dahlia`)
- Coloane noi în `users`: `stripe_customer_id`, `subscription_end_date` (migrare în `docs/database.md`)
- Testat **end-to-end** cu Stripe CLI (`stripe listen --forward-to` + `stripe trigger`) — user real trecut pe `active`
- `ERRORS.md` #013 — nepotrivire valori `subscription_status` vs CHECK constraint
- **Alegere plan la înregistrare** — `app/sign-up` citește `?plan=premium` și setează `forceRedirectUrl` (`premium → /upgrade`, altfel `/dashboard`); pagina `app/upgrade/page.tsx` pornește checkout-ul și redirectează la Stripe (reutilizabilă de butonul „Upgrade")

**Decizii luate:**
- Valori `subscription_status`: `free` / `active` / `cancelled` (semantică Stripe), aliniate între cod și constraint-ul DB
- Alegerea planului prin `?plan=` în URL (nu câmp custom în formularul Clerk) — mai simplu, nu atinge `<SignUp />`; păstrat Stripe manual (nu Clerk Billing) ca să nu aruncăm integrarea deja testată și să ținem sursa de adevăr în Supabase
- Webhook-ul caută userul după `stripe_customer_id`, cu fallback pe `clerk_id` din metadata (prima plată, când customer_id încă nu e salvat)

**Probleme deschise / Next steps:**
- Pe producție (Vercel): de configurat endpoint-ul webhook Stripe din dashboard + `STRIPE_WEBHOOK_SECRET` real (cel din CLI e doar local)
- Frontend (Bogdan): butonul „Upgrade" → poate face simplu link la `/upgrade` (zero blocaj backend)
- Frontend (Bogdan): **pagină de prețuri** cu „Premium" → `/sign-up?plan=premium` și „Gratuit" → `/sign-up`
- Frontend (Bogdan): **pagina `/dashboard`** lipsește — sign-up (free + success Stripe) aterizează acolo; momentan 404 până e construită
- De testat fluxul complet cu card `4242…` (populează și `subscription_end_date` din abonamentul real)

---

## 2026-06-26 — Andrei (Sesiunea 4)

**Ce s-a făcut:**
- Confirmat end-to-end că webhook-ul Clerk → Supabase funcționează (userii reali ajung în tabelul `users`)
- Rezolvat un lanț lung de erori la deploy (vezi `ERRORS.md` #001-#011): framework preset Vercel greșit (`Other`/`Node` în loc de `Next.js`), două proiecte Vercel duplicate, grant lipsă pentru `service_role`, `CLERK_WEBHOOK_SIGNING_SECRET` lipsă
- Adăugat `vercel.json` care forțează `framework: nextjs` (independent de setarea din dashboard)
- Restaurat `proxy.ts` la `clerkMiddleware` oficial (verificat local: redirect + api passthrough)
- Creat `ERRORS.md` — jurnal de erori; instrucțiune în `CLAUDE.md` să fie verificat/completat la fiecare eroare
- **Panou de monitorizare `/admin`** — agregă Clerk, Supabase, Stripe, Vercel + sync check + loguri (vezi `docs/admin.md`)
- **Tabel `error_logs`** + `lib/log-error.ts` — jurnal persistent de erori, integrat în webhook
- **Script `npm run debug`** (`scripts/debug.mjs`) — raport consolidat din toate platformele în terminal
- Creat `DESIGN-BRIEF.md` și `PROFESOR-CONTEXT.md` — documente de handoff pentru design/Bogdan

**Decizii luate:**
- Dashboard admin construit cu Tailwind simplu (nu shadcn) — e unealtă internă, separată de produsul vizibil elevilor; nu preîntâmpină decizia de UI a lui Bogdan
- Acces `/admin` controlat prin allowlist de email-uri (`ADMIN_EMAILS`)
- Webhook-urile Clerk eșuate sunt acoperite indirect (erori → `error_logs`, divergențe → sync check), Clerk neavând API public pentru livrări

**Probleme deschise / Next steps:**
- Frontend-ul produsului (landing, paneluri elev/profesor) — blocat până se aliniază cu Bogdan pe librăria UI (recomandare: shadcn/ui)
- Pentru `/admin` pe producție: de adăugat `ADMIN_EMAILS` + `VERCEL_API_TOKEN` în env Vercel
- De dat acces lui Bogdan: email în `ADMIN_EMAILS` + `.env.local` propriu (chei partajate securizat)

---

## 2026-06-26 — Andrei (Sesiunea 3)

**Ce s-a făcut:**
- Verificat că setup-ul Clerk din sesiunea anterioară e complet funcțional (sign-in/sign-up merg, proxy.ts corect)
- Descoperit că în Next.js 16 fișierul middleware se numește `proxy.ts` (nu `middleware.ts` ca în versiunile anterioare)
- Creat tabel `users` în Supabase cu RLS activat (câmpuri: id, clerk_id, email, full_name, role, subscription_status, subscription_end_date)
- Creat `lib/supabase-admin.ts` — client Supabase cu service_role key pentru operații server-side
- Creat `app/api/webhooks/clerk/route.ts` — webhook handler pentru sync users (user.created, user.updated, user.deleted)
- Actualizat `proxy.ts` să facă ruta `/api/webhooks/(.*)` publică
- Configurat endpoint webhook în Clerk dashboard cu localtunnel
- Adăugat `CLERK_WEBHOOK_SIGNING_SECRET` în `.env.local`
- Mutat proiectul pe SSD pentru performanță mai bună (Turbopack era lent pe HDD)

**Decizii luate:**
- Folosim `supabase-admin.ts` (service role) în webhook, nu clientul anon — pentru a ocoli RLS
- Webhook-ul gestionează și ștergerea userilor din DB la `user.deleted`

**Probleme deschise / Next steps:**
- De verificat că webhook-ul funcționează (test: înregistrare user nou → apare în tabelul `users`)
- Urmează: pagină profil elev, pagină upgrade abonament, Stripe Checkout

---

## 2026-06-26 — Andrei (Sesiunea 2)

**Ce s-a făcut:**
- Instalare și configurare Next.js 16 cu TypeScript, Tailwind CSS, ESLint, App Router
- Configurare Supabase: cont, proiect, chei în .env.local, client în lib/supabase.ts
- Configurare Clerk: cont, aplicație (email + Google login), middleware, pagini sign-in/sign-up
- Configurare Stripe: cont, chei sandbox în .env.local, client în lib/stripe.ts
- Deploy inițial pe Vercel: platforma-bac.vercel.app, conectat la GitHub (deploy automat la fiecare merge în main)
- PR #1 creat și merged în main

**Decizii luate:**
- Librărie UI: Tailwind CSS (inclus în create-next-app)
- Clerk: autentificare cu email și Google, fără telefon/username/GitHub
- Stripe: mod "I'll do it" (nu global), recurring payments + invoicing
- Vercel: deploy automat din branch main

**Probleme deschise / Next steps:**
- Săptămânile 1-2 complete ✅
- Urmează Săptămânile 3-4: autentificare cont elev, pagini profil, integrare Stripe Checkout
- De stabilit împărțirea sarcinilor cu Bogdan

---

## 2026-06-26 — Andrei

**Ce s-a făcut:**
- Creat și configurat CLAUDE.md cu contextul complet al proiectului
- Creat TASKS.md — lista de sarcini cu responsabili și branch-uri, actualizată continuu
- Creat DEVLOG.md (acest fișier) — jurnal zilnic de progres
- Creat CONTRIBUTING.md — reguli de colaborare și rezolvare conflicte
- Creat .env.example — toate variabilele de mediu necesare, fără valori reale

**Decizii luate:**
- Andrei începe configurarea inițială (Săpt. 1-2); rolurile pe termen lung se stabilesc cu Bogdan
- Sarcinile din Săpt. 3-12 sunt marcate ca nedecise până la împărțirea cu Bogdan
- CLAUDE.md este punctul central de instrucțiuni pentru ambele instanțe de Claude Code

**Probleme deschise / Next steps:**
- Niciun cod scris încă — urmează instalarea Next.js și configurarea serviciilor
- Profesorul partener nu este disponibil pentru conținut real — se lucrează cu placeholder
