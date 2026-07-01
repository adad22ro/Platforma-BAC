# Jurnal de dezvoltare — Platformă BAC

> Adaugă o intrare la **sfârșitul fiecărei sesiuni de lucru**.
> Format: `## YYYY-MM-DD — Andrei / Bogdan`
> Fii scurt și concret: ce s-a făcut, ce decizii s-au luat, ce probleme au rămas deschise.

---

## 2026-07-01 — Andrei (Sesiunea 8)

**Ce s-a făcut (unelte de developer, ca să ușureze munca viitoare):**
- **Validare env la boot** — `lib/env.ts` (schema Zod pt. toate variabilele server) + `instrumentation.ts` (`register()` rulează `validateEnv()` la pornire, doar runtime Node). Dacă lipsește/e invalidă una obligatorie, serverul crapă imediat cu mesaj clar și agregat. Atacă clasa de erori „variabilă lipsă descoperită târziu" (ERRORS #004, secrete lipsă). `zod` adăugat ca dep directă. Test: `tests/env.test.ts`
- **Hook Git pre-push** — `.githooks/pre-push` rulează `lint` + `typecheck` + `test` local înainte de push (nu mai vezi CI roșu după push). Activat automat prin scriptul `prepare` (`git config core.hooksPath .githooks`). `.gitattributes` forțează LF pe `.githooks/**` (shebang pe Windows). Skip: `git push --no-verify`
- **Typecheck în CI** — pas nou `npm run typecheck` (`tsc --noEmit`) în workflow; prinde erorile de tip la PR, nu la build-ul Vercel

**Decizii luate:**
- Validare la boot prin `instrumentation.ts` (nu în fiecare rută) — zero atingeri pe call-site-uri sau teste, un singur punct de adevăr
- Hook fără Husky — `core.hooksPath` + folder versionat `.githooks/`, zero dependențe noi

**Probleme deschise / Next steps:**
- Urmează (Tier 2, discutat): folder de migrări DB reproductibile + tipuri Supabase generate (scapă de cast-urile `as UserRow`)

---

## 2026-07-01 — Andrei (Sesiunea 7)

**Ce s-a făcut:**
- **Teste Vitest pe logica de bani** — `npm test` (+ `test:watch`); Vitest 3, config `vitest.config.mts` (env node, alias `@`)
- `tests/stripe-webhook.test.ts` (8 teste): semnătură invalidă → 400 + alertă critică, duplicat (`23505`) → 200 fără reprocesare, `checkout.session.completed` → `active` + `stripe_customer_id` (match pe `clerk_id`), `subscription.updated` activ→`active` / `past_due`→`cancelled`, `subscription.deleted` → `cancelled`, eroare în handler → eliberare claim + 500 + alertă, eroare update DB → alertă critică
- `tests/checkout.test.ts` (4 teste): nelogat → 401, lipsă `STRIPE_PRICE_ID_MONTHLY` → 500 + log, succes → `{ url }` cu sesiune legată de userul Clerk, Stripe aruncă → 500 + alertă critică
- Toate dependențele (Stripe/Supabase/Clerk/logError) mock-uite — testele rulează fără servicii reale sau secrete
- **CI GitHub Actions** (`.github/workflows/ci.yml`) — `lint` + `test` la push/PR pe `main` (Node 24)
- **Fix 26 erori lint pre-existente** în `/admin/_components/*` (expuse de primul CI): `react-hooks/error-boundaries` (JSX în try/catch) + `react-hooks/purity` (`Math.random` în key). Refactor fără schimbări funcționale — vezi `ERRORS.md` #014
- **Documentație:** `docs/testing.md` (nou), legat în `architecture.md`; secțiune „Teste și CI" în `CLAUDE.md`; rând nou în `TASKS.md`

**Decizii luate:**
- Testat prin rutele reale (`POST`) cu dependențe mock-uite, nu funcții extrase — acoperă fluxul real fără a rescrie codul de producție
- CI fără secrete reale (mock-uri) — rulează pe orice PR, inclusiv de la Bogdan
- CI rulează `lint` pe tot proiectul (nu doar cod nou) — a scos la iveală datorie veche, dar ține bara sus pentru toți

**Probleme deschise / Next steps:**
- Rămân amânate (până există useri/frontend): `/api/health`, Sentry, teste E2E
- Migrare `processed_events` + `DISCORD_ALERT_WEBHOOK_URL` — de confirmat că sunt aplicate în prod

---

## 2026-07-01 — Andrei (Sesiunea 6)

**Ce s-a făcut:**
- Validat **plata reală în producție** (card `4242…`): user → `active` cu `stripe_customer_id` și `subscription_end_date` (o lună) — fluxul complet confirmat cap-coadă
- **Idempotență webhook Stripe** — tabel `processed_events`; `event.id` revendicat înainte de procesare, duplicatele primesc `200` fără reprocesare, claim eliberat la eroare (retry Stripe funcțional)
- **Alerte instant pe Discord** — `logError` acceptă `severity`; erorile critice (verificare/scriere DB/handler webhook, checkout eșuat) trimit alertă dacă `DISCORD_ALERT_WEBHOOK_URL` e setat
- **Acces `/admin` pentru Bogdan** — `ADMIN_EMAILS` (Andrei + Bogdan), local + Vercel (prod & preview)
- **Partajare secrete via dotenv-vault** — `.env.vault` în Git, cheie rotită după expunere; ghid `docs/onboarding-secrets.md`
- Documentație: `docs/monitoring.md` (nou), actualizat `stripe/api/database`, `.env.example` (`DISCORD_ALERT_WEBHOOK_URL`), `CLAUDE.md`
- **Conținut (Săpt. 5-6):** schema `chapters`/`lessons` (RLS, cascade), API CRUD (`/api/chapters`, `/api/lessons` + `[id]`) cu autorizare pe rol și gating premium (`402`), `lib/current-user.ts`, `npm run seed:content` (date placeholder)
- **Rol profesor:** `users.role` sursă de adevăr; promovare din `/admin` (`POST /api/admin/set-role` + buton), fără cont separat/cod de invitație
- **Banc de test intern `/admin/content`** — exercită CRUD-ul cu sesiune reală (unealtă de dev, nu UI de produs)

**Decizii luate:**
- Monitorizare țintită acum doar pe zona plăți/webhook (bani, deja live); `/api/health`, Sentry, E2E — amânate până există useri/frontend (fără rework din amânare)
- `critical` rezervat pentru bani/acces stricat în tăcere; restul erorilor rămân `error` (zgomot redus)

**Probleme deschise / Next steps:**
- De rulat migrarea `processed_events` în Supabase (SQL în `docs/database.md`)
- De setat `DISCORD_ALERT_WEBHOOK_URL` (local + Vercel) ca alertele să fie active
- Teste Vitest pe logica webhook/checkout + CI (GitHub Actions) — următorul pas de robustețe

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
