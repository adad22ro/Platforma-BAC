# Jurnal de erori — Platformă BAC

> Verifică acest fișier înainte de a investiga o eroare nouă.
> Adaugă fiecare eroare nouă cu data, descrierea și soluția aplicată.

---

## #019 — `Vitest failed to find the runner` la pre-push (cache corupt)
**Data:** 2026-07-24
**Context:** `git push` blocat de hook-ul pre-push: toate cele 8 suite pică la import cu `Vitest failed to find the runner` și `Tests: no tests`, deși `npm test` trecuse verde (55/55) cu câteva secunde înainte. Rulările ulterioare de `npm test` picau la fel, constant.
**Cauză:** Cache-ul Vite/Vitest din `node_modules/.vite` s-a corupt (similar cu #003 — cache Turbopack corupt). Codul și config-ul erau intacte; nimic din sursă nu se schimbase între rularea verde și cele roșii.
**Diagnostic cheie:** Toate suitele pică simultan la **import** (0 teste rulate) cu mesaj despre „runner", nu erori de assertion → nu e o regresie de cod, ci stare/cache corupt. Un run verde urmat brusc de run-uri roșii pe aceleași fișiere confirmă.
**Soluție:** `rm -rf node_modules/.vite node_modules/.vitest` apoi `npm test` → verde din nou; push-ul a trecut.
**Recidivă 2026-08-06** (branch `teste-progres`): exact același tipar — 75/75 verde, apoi toate cele 9 suite roșii la pre-push cu `Tests: no tests`. Aceeași soluție, aceeași durată. Nu e un incident izolat: dacă se mai repetă, merită un `pretest` care curăță cache-ul.

---

## #018 — După autentificare rămâi pe landing, nu ajungi pe `/dashboard`
**Data:** 2026-07-15
**Context:** Click pe „Autentificare" din header-ul landing-ului → login reușit → utilizatorul rămâne pe `/` în loc să ajungă pe `/dashboard`. Sign-up-ul, în schimb, redirecta corect.
**Cauză:** `<SignIn />` era folosit fără props, bazându-ne pe `NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/dashboard`. Dar **„fallback" înseamnă „doar dacă nu există altă destinație"**: când ajungi pe `/sign-in` dintr-o pagină anume, Clerk reține pagina de proveniență (`/`) ca `redirect_url`, aceasta are prioritate, iar fallback-ul e ignorat. Sign-up-ul nu avea bug-ul fiindcă folosea deja `forceRedirectUrl`.
**Diagnostic cheie:** `forceRedirectUrl` **suprascrie** proveniența; `fallbackRedirectUrl` / `*_FALLBACK_REDIRECT_URL` **cedează** în fața ei. Dacă vrei o destinație garantată, nu te baza pe fallback.
**Soluție:** `<SignIn forceRedirectUrl="/dashboard" />` în `app/sign-in/[[...sign-in]]/page.tsx`.
**Notă adiacentă:** `.env.example` încă lista variabilele vechi (`NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL` / `AFTER_SIGN_UP_URL`), deprecate și **ignorate** în Clerk v7 — cine își construia `.env.local` după el pornea cu configurație moartă. Corectate la numele noi (`*_FALLBACK_REDIRECT_URL`).

---

## #017 — Nu se poate crea cont automat (browser automatizat) — Turnstile + Google OAuth
**Data:** 2026-07-15
**Context:** Verificarea în browser a paginii `/dashboard` (Playwright/Chromium, prin CDP) necesita un cont de test. Atât înregistrarea automată, cât și login-ul cu Google au eșuat.
**Cauză:** Două protecții anti-bot, independente:
1. **Clerk → Cloudflare Turnstile** pe formularul de **sign-up**. Respinge browserele automatizate („Verification failed"), inclusiv când un om apasă caseta — portul de debug + flag-urile Playwright marchează browserul. Se aplică și la afișarea formularului, și la submit.
2. **Google OAuth** („Couldn't sign you in / This browser or app may not be secure") — Google blochează OAuth în orice browser controlat prin automatizare.

**Diagnostic cheie:** Protecția anti-bot e **și pe sign-up, și pe sign-in** — dar se manifestă diferit. La sign-up e vizibilă („Verification failed"). La sign-in e tăcută: câmpul de parolă rămâne permanent `disabled`, fără niciun mesaj de eroare. Un **om** trece prin ambele fără să observe; un browser automatizat, prin niciunul.

**Soluție (fluxul de lucru pentru verificări UI):**
1. Contul de test se creează **manual**, într-un browser normal (Chrome). Pe instanțele Clerk de development (`pk_test`), emailurile care conțin `+clerk_test` se verifică cu codul fix `424242`, fără email real.
2. **Autentificarea o face tot un om**, direct în fereastra Chromium (email + parolă, nu Google). Cu profil persistent (`launchPersistentContext`), sesiunea se păstrează între rulări — deci se face o singură dată.
3. **Agentul preia după login** și automatizează restul: navigare, screenshot-uri, inspecția DOM-ului, verificarea fluxurilor.

⚠️ **Atenție:** `context.clearCookies()` într-un script șterge sesiunea din profilul persistent și obligă la re-login manual. Nu o folosi fără motiv.

**NU** încerca să ocolești protecția anti-bot — își face treaba. Pentru ce nu se poate verifica în browser, scrie teste (vezi `tests/dashboard.test.ts`).

---

## #016 — `GH007: Your push would publish a private email address`
**Data:** 2026-07-13  
**Context:** `git push` respins de GitHub, deși contul avea drept de scriere pe repo.  
**Cauză:** Commit-ul era făcut cu adresa de email personală, iar contul GitHub are activată opțiunea „Keep my email address private" — GitHub refuză push-ul care ar publica adresa în istoricul public.  
**Soluție:** Configurare adresă `noreply` de GitHub **doar pentru acest repo** (nu global):  
`git config user.email "<ID>+<user>@users.noreply.github.com"` (ID-ul se ia din `https://api.github.com/users/<user>`), apoi `git commit --amend --reset-author --no-edit` și push. Alternativa (nerecomandată): dezactivarea protecției din https://github.com/settings/emails.

---

## #015 — Landing page (`/`) dă 404 pentru vizitatorii nelogați
**Data:** 2026-07-13  
**Context:** După crearea landing page-ului, `GET /` întorcea 404 (log: `GET / 404 ... proxy.ts: 215ms`), deși `app/page.tsx` exista și compila fără erori.  
**Cauză:** `proxy.ts` (`clerkMiddleware`) protejează **toate** rutele, cu o listă mică de excepții publice (`/sign-in`, `/sign-up`, `/api/webhooks`, `/api/health`). Rădăcina `/` nu era în listă → `auth.protect()` bloca cererea înainte să ajungă la pagină.  
**Diagnostic cheie:** 404 pe o rută care există clar în `app/` + `proxy.ts` vizibil în timpii din log = middleware, nu routing.  
**Soluție:** Adăugarea rutelor publice de marketing în `isPublicRoute` din `proxy.ts` (`"/"`, `"/pricing"`). **De reținut:** orice pagină nouă vizibilă vizitatorilor nelogați trebuie adăugată acolo, altfel e blocată implicit.

---

## #014 — CI pică pe `npm run lint` (26 erori `react-hooks` în `/admin`)
**Data:** 2026-07-01  
**Context:** Primul workflow CI (GitHub Actions, `lint` + `test`) a eșuat după 25s. Testele treceau; pasul de lint raporta 26 erori — toate în componentele panoului `/admin/_components/*`, cod pre-existent. Local nimeni nu observase, fiindcă nu exista CI, iar `next build` nu blochează pe aceste reguli.  
**Cauză:** Reguli noi din `eslint-config-next` 16: `react-hooks/error-boundaries` (25) — JSX construit în interiorul unui `try/catch` (erorile de randare nu sunt prinse de `try/catch`, doar de un error boundary); `react-hooks/purity` (1) — `Math.random()` folosit ca `key`.  
**Diagnostic cheie:** Eroare de CI care nu apare local = reprodu exact pașii workflow-ului (`npm run lint`) în terminal; `npx eslint . -f json` grupat pe `ruleId` arată repede tiparul.  
**Soluție:** Refactor uniform al Server Components: doar fetch-ul rămâne în `try` (rezultatul captat în variabile, eroarea întoarsă din `catch`), iar JSX-ul se randează **după** bloc. `Math.random()` → indexul din `.map()` ca fallback pentru `key`. Fără schimbări funcționale.

---

## #013 — `23514` violates check constraint `users_subscription_status_check`
**Data:** 2026-06-29  
**Context:** Webhook-ul Stripe (`checkout.session.completed`) întorcea `200` dar nu actualiza userul pe abonament. În `error_logs` apărea `code 23514` — check constraint.  
**Cauză:** Nepotrivire între valorile `subscription_status` trimise de cod și cele permise de CHECK constraint-ul din DB. Constraint-ul real permite `'free' / 'active' / 'cancelled'`, dar codul trimitea `'premium'`.  
**Diagnostic cheie:** Webhook care dă `200` fără efect = handler-ul iese devreme SAU update-ul e respins silențios (eroarea e logată dar nu propagată). Un breadcrumb temporar în `error_logs` care loghează `fields` exacte a confirmat valoarea trimisă. Atenție și la cache-ul `.next`: după editarea unui route handler, dev server-ul poate servi versiunea veche — `Remove-Item -Recurse -Force .next` + restart.  
**Soluție:** Aliniat codul la valorile constraint-ului (`active`/`cancelled`, semantică Stripe) și fixat constraint-ul definitiv:
```sql
alter table public.users drop constraint if exists users_subscription_status_check;
alter table public.users add constraint users_subscription_status_check
  check (subscription_status in ('free', 'active', 'cancelled'));
```

---

## #012 — `Invalid API Key provided` la Stripe (pe Vercel)
**Data:** 2026-06-26  
**Context:** Cardul Stripe din `/admin` dădea eroare pe producție (local mergea). Valoarea din eroare începea cu `eyJhbGci...` (un JWT).  
**Cauză:** Pe Vercel, variabila `STRIPE_SECRET_KEY` conținea din greșeală o cheie **Supabase** (JWT), nu cheia Stripe. Cheile Stripe încep cu `sk_test_` / `sk_live_`; cele Supabase sunt JWT-uri (`eyJ...`).  
**Diagnostic cheie:** prefixul valorii — `eyJ` = Supabase/JWT, `sk_` = Stripe. Panoul `/admin` a prins eroarea înainte să afecteze fluxul real de plată.  
**Soluție:** Vercel → Environment Variables → `STRIPE_SECRET_KEY` → înlocuire cu Secret key-ul corect din Stripe Dashboard (Developers → API keys) → Redeploy

---

## #001 — `@clerk/backend: Missing publishableKey`
**Data:** 2026-06-26  
**Context:** La pornirea serverului de dev (`npm run dev`)  
**Cauză:** Lipsea fișierul `.env.local` cu cheile Clerk  
**Soluție:** Creare `.env.local` cu valorile reale din dashboard.clerk.com → API Keys

---

## #002 — `Both middleware.ts and proxy.ts detected`
**Data:** 2026-06-26  
**Context:** Next.js 16 — eroare la pornirea serverului  
**Cauză:** În Next.js 16, `middleware.ts` a fost redenumit în `proxy.ts`. Ambele existau simultan.  
**Soluție:** Ștergere `middleware.ts`, păstrare doar `proxy.ts`

---

## #003 — Cache Turbopack corupt (panic / SST file not found)
**Data:** 2026-06-26  
**Context:** Eroare fatală Turbopack la `npm run dev`  
**Cauză:** Cache-ul `.next` corupt după mutarea proiectului sau schimbări majore  
**Soluție:** `Remove-Item -Recurse -Force .next` apoi `npm run dev`

---

## #004 — `supabaseUrl is required` la build pe Vercel
**Data:** 2026-06-26  
**Context:** Build eșuat pe Vercel — `Failed to collect page data for /api/webhooks/clerk`  
**Cauză:** Variabila `NEXT_PUBLIC_SUPABASE_URL` nu era setată în Environment Variables pe Vercel  
**Soluție:** Adăugare variabilă în Vercel → Settings → Environment Variables

---

## #005 — Webhook Clerk cu 404 pe Vercel
**Data:** 2026-06-26  
**Context:** Clerk trimitea webhook la `https://true-hornets-call.loca.lt` (tunel local vechi)  
**Cauză:** URL-ul webhook-ului nu fusese actualizat după deploy pe Vercel  
**Soluție:** Clerk Dashboard → Webhooks → Edit → schimbare URL la `https://platforma-bac.vercel.app/api/webhooks/clerk`

---

## #006 — `Edge Function "middleware" referencing unsupported modules` (Clerk)
**Data:** 2026-06-26  
**Context:** Build eșuat pe Vercel după downgrade la Next.js 15  
**Cauză:** În Next.js 15, middleware rulează pe Edge runtime implicit; Clerk 7 necesită Node.js runtime și nu e compatibil cu Edge  
**Soluție:** Upgrade înapoi la Next.js 16 (care rulează proxy/middleware pe Node.js implicit) + folosire `proxy.ts` în loc de `middleware.ts`

---

## #007 — Clerk nu redirecționează utilizatorul neautentificat
**Data:** 2026-06-26  
**Context:** Pagina `/` afișa conținut deși utilizatorul nu era autentificat  
**Cauză:** Utilizatorul era deja autentificat în browser (sesiune activă Clerk) — nu era o eroare reală  
**Soluție:** Testare în fereastră Incognito pentru a simula un utilizator neautentificat

---

## #011 — `null value in column "email"` la insert
**Data:** 2026-06-26  
**Context:** Webhook dădea 500 "Database error" cu `23502 not-null constraint` pe `email`  
**Cauză:** Se testa cu payload-ul **sample** de la Clerk (user "John Doe", fără email real). Coloana `email` e `NOT NULL` (corect). Sample-ul nu are email → violare constrângere.  
**Soluție:** Testare cu eveniment real (înregistrare cont nou cu email real), nu cu sample-ul din tab-ul Testing

---

## #010 — `permission denied for table users` (cod 42501) pentru service_role
**Data:** 2026-06-26  
**Context:** Webhook dădea 500 "Database error"; log: `42501 permission denied for table users`  
**Cauză:** Rolul `service_role` nu avea privilegii pe tabelul `users` (grant-urile nu s-au aplicat la crearea tabelului). Cheia era corectă — Postgres pune rolul curent în hint, iar hint-ul arăta `service_role`, confirmând autentificarea corectă.  
**Soluție:** Supabase → SQL Editor → `GRANT INSERT, SELECT, UPDATE, DELETE ON public.users TO service_role;`

---

## #009 — Două proiecte Vercel duplicate pe același repo
**Data:** 2026-06-26  
**Context:** Modificările de setări (ex: Framework Preset) păreau că nu se aplică; build-uri duble la fiecare push  
**Cauză:** Existau două proiecte Vercel conectate la același repo: `platforma-bac` (deține domeniul `platforma-bac.vercel.app`) și `platforma-bac-nq6x` (duplicat). Se modifica setarea într-unul, dar domeniul era servit de celălalt.  
**Soluție:** Identificare proiect care deține domeniul de producție (Settings → Domains), configurare doar a aceluia, ștergere proiect duplicat

---

## #008 — API routes returnează 404 (Vercel) deși funcționează local
**Data:** 2026-06-26  
**Context:** `/api/webhooks/clerk` dădea 404 (pagina stilizată Vercel `NOT_FOUND`) pe producție, deși local răspundea corect (POST 400, GET 405). Build-ul dura doar ~27s fără loguri.  
**Cauză:** Pe Vercel, **Framework Preset** era setat la **"Other"** (probabil pierdut la mutarea proiectului din folderul vechi). Vercel rula `next build` dar publica doar output-ul static din `public/`, fără să creeze funcțiile serverless. Toate rutele dinamice (`ƒ` — API + pagini SSR) dădeau 404, doar paginile statice (`○`) funcționau.  
**Diagnostic cheie:** 404-ul *stilizat de Vercel* (nu pagina 404 a Next.js) = cererea nu ajunge deloc la aplicația Next.js.  
**Soluție:** Vercel → Settings → Build and Deployment → Framework Settings → **Framework Preset = Next.js** → Save → Redeploy fără cache

---
