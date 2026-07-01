# Lista de sarcini — Platformă BAC

> **Instrucțiune obligatorie pentru Claude Code:**
> Citește acest fișier la începutul fiecărei sesiuni de lucru, înainte de orice altceva.
> Actualizează-l imediat ce o sarcină este începută, finalizată sau blocată.
> Nu începe nicio sarcină marcată ca `🔄 În lucru` fără să confirmi mai întâi cu cel care lucrează la ea.

---

## Echipă

| Nume | Rol |
|---|---|
| **Andrei** | **Backend** — bază de date, API routes, webhook-uri, integrări (Clerk/Supabase/Stripe), infrastructură, panou de monitorizare |
| **Bogdan** | **Frontend** — UI/design, layout, pagini elev/profesor, formulare, librărie de componente |

---

## Stare generală

- **Faza curentă:** Faza 1 — MVP
- **Săptămâna curentă:** 3-4 (Autentificare cont elev — în curs) → urmează 5-6 (conținut + panel profesor)
- **Ultima actualizare:** 2026-07-01
- **Roluri:** Andrei = backend · Bogdan = frontend

---

## Legenda

| Simbol | Semnificație |
|---|---|
| ⬜ | De făcut |
| 🔄 | În lucru — NU atinge fără să confirmi cu cel care lucrează |
| ✅ | Finalizat |
| ❌ | Blocat — vezi nota |
| ❓ | Responsabil nedecis |

---

## Săptămânile 1-2 — Configurare proiect

### Infrastructură de bază

| Status | Sarcină | Cine | Branch | Note |
|---|---|---|---|---|
| ✅ | Creare proiect Next.js (`npx create-next-app`) | Andrei | `setup-nextjs` | Next.js 16, React 19, TypeScript, Tailwind, ESLint |
| ✅ | Configurare `.gitignore` (`.env`, `node_modules` etc.) | Andrei | `setup-nextjs` | Generat automat de create-next-app, verificat |
| ✅ | Fișier `.env.example` cu toate variabilele necesare (fără valori reale) | Andrei | `setup-nextjs` | |
| ✅ | Configurare Supabase — proiect nou, variabile de mediu | Andrei | `setup-supabase` | Cont creat, proiect creat, legat la GitHub, chei în .env.local, client în lib/supabase.ts |
| ✅ | Configurare Clerk — proiect nou, variabile de mediu | Andrei | `setup-clerk` | Email + Google login, chei în .env.local |
| ✅ | Integrare Clerk în Next.js (middleware, provider) | Andrei | `setup-clerk` | proxy.ts (Next.js 16), ClerkProvider, pagini sign-in/sign-up |
| ✅ | Configurare Stripe în mod test — chei API | Andrei | `setup-stripe` | Cont creat, chei sandbox în .env.local, client în lib/stripe.ts |
| ✅ | Deploy inițial pe Vercel (proiect conectat la GitHub) | Andrei | `setup-vercel` | platforma-bac.vercel.app — deploy automat la merge în main |

### Design de bază

| Status | Sarcină | Cine | Branch | Note |
|---|---|---|---|---|
| ⬜ | Alegere și configurare librărie UI (ex: Tailwind CSS + shadcn/ui) | Bogdan | `setup-ui` | Recomandare: shadcn/ui (vezi DEVLOG) |
| ⬜ | Layout de bază al aplicației (header, sidebar, footer) | Bogdan | `setup-ui` | |
| ⬜ | Pagină de start / landing page placeholder | Bogdan | `setup-ui` | |

---

## Săptămânile 3-4 — Autentificare și cont elev

| Status | Sarcină | Cine | Branch | Note |
|---|---|---|---|---|
| ✅ | Pagină de înregistrare elev (via Clerk) | Andrei | `setup-clerk` | Funcțională — `app/sign-up/[[...sign-up]]/page.tsx` |
| ✅ | Pagină de login (via Clerk) | Andrei | `setup-clerk` | Funcțională — `app/sign-in/[[...sign-in]]/page.tsx` |
| ✅ | Schema bază de date: tabel `users` (extins față de Clerk) | Andrei | `auth-cont-elev` | Creat în Supabase cu RLS activat |
| ✅ | Protejare rute (redirect dacă nu e autentificat) | Andrei | `setup-clerk` | `proxy.ts` cu `clerkMiddleware` |
| ✅ | Webhook Clerk — sync user în DB la înregistrare | Andrei | `auth-cont-elev` | Confirmat end-to-end (user real → tabel `users`); erori logate în `error_logs` |
| ⬜ | Pagină de profil elev | Bogdan | `auth-cont-elev` | |
| ⬜ | Pagină de upgrade abonament (UI) | Bogdan | `auth-cont-elev` | Buton „Upgrade" → link la `/upgrade` (logica de checkout există). |
| ⬜ | Pagină de prețuri (carduri Free/Premium) | Bogdan | `auth-cont-elev` | „Premium" → `/sign-up?plan=premium` · „Gratuit" → `/sign-up`. |
| ⬜ | Pagină `/dashboard` | Bogdan | `auth-cont-elev` | Aici aterizează sign-up-ul (free) și succesul Stripe; momentan 404. |
| ✅ | Integrare Stripe Checkout pentru abonament lunar | Andrei | `auth-cont-elev` | `app/api/checkout/route.ts` — creează Checkout Session, întoarce `url`. |
| ✅ | Webhook Stripe — activare/dezactivare abonament în DB | Andrei | `auth-cont-elev` | `app/api/webhooks/stripe/route.ts` — testat E2E cu Stripe CLI (`subscription_status` → `active`/`cancelled`). |
| ✅ | Pagină `/upgrade` (pornește checkout + redirect Stripe) | Andrei | `auth-cont-elev` | `app/upgrade/page.tsx` — reutilizată de butonul „Upgrade" și de fluxul premium-la-înregistrare. |
| ✅ | Alegere plan la înregistrare (`?plan=premium`) | Andrei | `auth-cont-elev` | `app/sign-up` citește `?plan=` → `forceRedirectUrl` (`/upgrade` vs `/dashboard`). |

---

## Săptămânile 5-6 — Conținut educațional + Panel profesor

| Status | Sarcină | Cine | Branch | Note |
|---|---|---|---|---|
| ✅ | Schema DB: tabele `chapters`, `lessons` | Andrei | `panel-profesor-capitole` | RLS activat; SQL în `docs/database.md` |
| ✅ | Date placeholder: 3 capitole, 2-3 lecții per capitol | Andrei | `panel-profesor-capitole` | `npm run seed:content` (generic, NU structura reală BAC) |
| ⬜ | Pagină listă capitole (vedere elev) | Bogdan | `panel-profesor-capitole` | Consumă `GET /api/chapters` |
| ⬜ | Pagină lecție (text + embed video) | Bogdan | `panel-profesor-capitole` | `GET /api/lessons/[id]`; tratează `402 premium_required` |
| ✅ | Autentificare profesor (rol distinct în Clerk/Supabase) | Andrei | `panel-profesor-capitole` | `users.role`; promovare din `/admin` (buton) via `POST /api/admin/set-role` |
| ⬜ | Panel profesor — formular "Capitol nou" | Bogdan | `panel-profesor-capitole` | `POST /api/chapters` |
| ⬜ | Panel profesor — formular "Lecție nouă" cu editor text | Bogdan | `panel-profesor-capitole` | `POST /api/lessons` |
| ✅ | API routes pentru CRUD capitole și lecții | Andrei | `panel-profesor-capitole` | `/api/chapters`, `/api/lessons` (+ `[id]`); detalii în `docs/api.md` |

---

## Săptămânile 7-8 — Teste și progres

| Status | Sarcină | Cine | Branch | Note |
|---|---|---|---|---|
| ⬜ | Schema DB: tabele `questions`, `answers`, `student_progress` | Andrei | `teste-progres` | |
| ⬜ | Date placeholder: 5-10 întrebări grilă per capitol | Andrei | `teste-progres` | |
| ⬜ | Pagină test per capitol (UI grilă) | Bogdan | `teste-progres` | |
| ⬜ | Logică corectare automată + afișare scor | Andrei + Bogdan | `teste-progres` | Logică/API: Andrei · afișare: Bogdan |
| ⬜ | Statistici simple de progres per capitol (UI) | Bogdan | `teste-progres` | |
| ⬜ | Panel profesor — formular "Întrebare test" | Bogdan | `teste-progres` | |
| ⬜ | API routes pentru CRUD întrebări | Andrei | `teste-progres` | |

---

## Săptămânile 9-10 — Sistem de mentorat (tichete)

| Status | Sarcină | Cine | Branch | Note |
|---|---|---|---|---|
| ⬜ | Schema DB: tabel `tickets` | Andrei | `sistem-tichete-mentorat` | |
| ⬜ | Buton "Nu am înțeles" în pagina de lecție/test (cu context automat) | Bogdan | `sistem-tichete-mentorat` | |
| ⬜ | Mesaj așteptare afișat elevului (ex: "Răspuns în 24h") | Bogdan | `sistem-tichete-mentorat` | |
| ⬜ | API route — creare tichet | Andrei | `sistem-tichete-mentorat` | |
| ⬜ | Interfață profesor — listă tichete organizate pe capitol | Bogdan | `sistem-tichete-mentorat` | |
| ⬜ | Funcționalitate răspuns profesor la tichet | Andrei + Bogdan | `sistem-tichete-mentorat` | API: Andrei · UI: Bogdan |
| ⬜ | Notificare email elev la primirea răspunsului | Andrei | `sistem-tichete-mentorat` | |
| ⬜ | Pagină elev — vizualizare răspuns primit | Bogdan | `sistem-tichete-mentorat` | |

---

## Săptămânile 11-12 — Testare și stabilizare

| Status | Sarcină | Cine | Branch | Note |
|---|---|---|---|---|
| ✅ | Teste automate pe logica de plăți (Vitest) + CI (GitHub Actions) | Andrei | `tests-payments-ci` | 12 teste pe checkout + webhook (mock-uite); CI `lint`+`test` pe push/PR. Detalii în `docs/testing.md` |
| ⬜ | Testare internă cu 10-20 elevi reali | Andrei + Bogdan | — | |
| ⬜ | Colectare și prioritizare feedback | Andrei + Bogdan | — | |
| ⬜ | Remediere bug-uri critice | Andrei + Bogdan | `bugfix-*` | Branch separat per bug |
| ⬜ | Documentație finală (arhitectură, deploy, ghid profesor) | Andrei + Bogdan | `docs` | |

---

## Blocat / În așteptare

| Sarcină | Motiv blocare | Cine deblochează |
|---|---|---|
| Structura reală de capitole BAC | Profesorul partener nu este disponibil încă | Profesorul partener |
| Conținut real lecții | Idem | Profesorul partener |

---

## Reguli Git (rezumat)

- **Niciodată pe `main` direct.** Branch nou pentru fiecare grup de sarcini.
- **Înainte de a începe o sarcină** → schimbă statusul în `🔄 În lucru` și adaugă-ți numele în Note.
- **La finalizare** → marchează `✅` și menționează branch-ul/PR-ul.
- **Dacă ești blocat** → marchează `❌` și explică în Note.
