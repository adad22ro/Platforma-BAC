# Lista de sarcini — Platformă BAC

> **Instrucțiune obligatorie pentru Claude Code:**
> Citește acest fișier la începutul fiecărei sesiuni de lucru, înainte de orice altceva.
> Actualizează-l imediat ce o sarcină este începută, finalizată sau blocată.
> Nu începe nicio sarcină marcată ca `🔄 În lucru` fără să confirmi mai întâi cu cel care lucrează la ea.

---

## Echipă

| Nume | Rol curent |
|---|---|
| **Andrei** | Configurare inițială proiect (Săpt. 1-2); rolul pe termen lung se stabilește ulterior |
| **Bogdan** | Se alătură după configurarea inițială; rol de stabilit împreună |

---

## Stare generală

- **Faza curentă:** Faza 1 — MVP
- **Săptămâna curentă:** 1-2 (Configurare proiect)
- **Ultima actualizare:** 2026-06-26
- **Ramură activă pe `main`:** commit inițial

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
| ⬜ | Alegere și configurare librărie UI (ex: Tailwind CSS + shadcn/ui) | Andrei | `setup-ui` | De discutat cu Bogdan înainte |
| ⬜ | Layout de bază al aplicației (header, sidebar, footer) | Andrei | `setup-ui` | |
| ⬜ | Pagină de start / landing page placeholder | Andrei | `setup-ui` | |

---

## Săptămânile 3-4 — Autentificare și cont elev

| Status | Sarcină | Cine | Branch | Note |
|---|---|---|---|---|
| ✅ | Pagină de înregistrare elev (via Clerk) | Andrei | `setup-clerk` | Funcțională — `app/sign-up/[[...sign-up]]/page.tsx` |
| ✅ | Pagină de login (via Clerk) | Andrei | `setup-clerk` | Funcțională — `app/sign-in/[[...sign-in]]/page.tsx` |
| ✅ | Schema bază de date: tabel `users` (extins față de Clerk) | Andrei | `auth-cont-elev` | Creat în Supabase cu RLS activat |
| ✅ | Protejare rute (redirect dacă nu e autentificat) | Andrei | `setup-clerk` | `proxy.ts` cu `clerkMiddleware` |
| 🔄 | Webhook Clerk — sync user în DB la înregistrare | Andrei | `auth-cont-elev` | `app/api/webhooks/clerk/route.ts` creat, endpoint configurat în Clerk, CLERK_WEBHOOK_SIGNING_SECRET în .env.local — de testat |
| ⬜ | Pagină de profil elev | ❓ | `auth-cont-elev` | |
| ⬜ | Pagină de upgrade abonament (UI) | ❓ | `auth-cont-elev` | |
| ⬜ | Integrare Stripe Checkout pentru abonament lunar | ❓ | `auth-cont-elev` | |
| ⬜ | Webhook Stripe — activare/dezactivare abonament în DB | ❓ | `auth-cont-elev` | |

---

## Săptămânile 5-6 — Conținut educațional + Panel profesor

| Status | Sarcină | Cine | Branch | Note |
|---|---|---|---|---|
| ⬜ | Schema DB: tabele `chapters`, `lessons` | ❓ | `panel-profesor-capitole` | |
| ⬜ | Date placeholder: 3 capitole, 2-3 lecții per capitol | ❓ | `panel-profesor-capitole` | NU inventăm structura reală BAC |
| ⬜ | Pagină listă capitole (vedere elev) | ❓ | `panel-profesor-capitole` | |
| ⬜ | Pagină lecție (text + embed video) | ❓ | `panel-profesor-capitole` | |
| ⬜ | Autentificare profesor (rol distinct în Clerk/Supabase) | ❓ | `panel-profesor-capitole` | |
| ⬜ | Panel profesor — formular "Capitol nou" | ❓ | `panel-profesor-capitole` | |
| ⬜ | Panel profesor — formular "Lecție nouă" cu editor text | ❓ | `panel-profesor-capitole` | |
| ⬜ | API routes pentru CRUD capitole și lecții | ❓ | `panel-profesor-capitole` | |

---

## Săptămânile 7-8 — Teste și progres

| Status | Sarcină | Cine | Branch | Note |
|---|---|---|---|---|
| ⬜ | Schema DB: tabele `questions`, `answers`, `student_progress` | ❓ | `teste-progres` | |
| ⬜ | Date placeholder: 5-10 întrebări grilă per capitol | ❓ | `teste-progres` | |
| ⬜ | Pagină test per capitol (UI grilă) | ❓ | `teste-progres` | |
| ⬜ | Logică corectare automată + afișare scor | ❓ | `teste-progres` | |
| ⬜ | Statistici simple de progres per capitol (UI) | ❓ | `teste-progres` | |
| ⬜ | Panel profesor — formular "Întrebare test" | ❓ | `teste-progres` | |
| ⬜ | API routes pentru CRUD întrebări | ❓ | `teste-progres` | |

---

## Săptămânile 9-10 — Sistem de mentorat (tichete)

| Status | Sarcină | Cine | Branch | Note |
|---|---|---|---|---|
| ⬜ | Schema DB: tabel `tickets` | ❓ | `sistem-tichete-mentorat` | |
| ⬜ | Buton "Nu am înțeles" în pagina de lecție/test (cu context automat) | ❓ | `sistem-tichete-mentorat` | |
| ⬜ | Mesaj așteptare afișat elevului (ex: "Răspuns în 24h") | ❓ | `sistem-tichete-mentorat` | |
| ⬜ | API route — creare tichet | ❓ | `sistem-tichete-mentorat` | |
| ⬜ | Interfață profesor — listă tichete organizate pe capitol | ❓ | `sistem-tichete-mentorat` | |
| ⬜ | Funcționalitate răspuns profesor la tichet | ❓ | `sistem-tichete-mentorat` | |
| ⬜ | Notificare email elev la primirea răspunsului | ❓ | `sistem-tichete-mentorat` | |
| ⬜ | Pagină elev — vizualizare răspuns primit | ❓ | `sistem-tichete-mentorat` | |

---

## Săptămânile 11-12 — Testare și stabilizare

| Status | Sarcină | Cine | Branch | Note |
|---|---|---|---|---|
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
| Împărțirea sarcinilor din Săpt. 3-12 | Rolurile Andrei/Bogdan nu sunt stabilite încă | Andrei + Bogdan |

---

## Reguli Git (rezumat)

- **Niciodată pe `main` direct.** Branch nou pentru fiecare grup de sarcini.
- **Înainte de a începe o sarcină** → schimbă statusul în `🔄 În lucru` și adaugă-ți numele în Note.
- **La finalizare** → marchează `✅` și menționează branch-ul/PR-ul.
- **Dacă ești blocat** → marchează `❌` și explică în Note.
