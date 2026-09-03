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
- **Backend Săpt. 3-6:** complet și în producție (auth, Stripe, conținut + rol profesor, monitorizare) — plus teste + CI + unelte DX + validare env + migrări/tipuri Supabase
- **Frontend Săpt. 1-4:** complet (landing, `/pricing`, `/dashboard`, `/profil`, buton upgrade)
- **Frontend Săpt. 5-6 (vedere elev):** complet — listă capitole (accordion pe `/dashboard`) + pagină lecție (`/lectii/[id]`) cu paywall. Plus buton temă zi/noapte pe toate paginile.
- **Panel profesor (Săpt. 5-6):** complet — formulare „Capitol nou" și „Lecție nouă" pe `/profesor`
- **Backend Săpt. 7-8:** complet (schema + seed + API întrebări + corectare + progres) — în `main` prin PR #38
- **Frontend Săpt. 7-8:** complet — pagină test grilă, scor, progres pe dashboard, formular „Întrebare test"; conectat la API-ul real și verificat E2E
- **Backend Săpt. 9-10:** tichete ca **fir de mesaje**, deschise doar din fereastra lecției, cu context complet pentru profesor (lecție + poziție + fragment selectat + progres la test) — în `main` prin PR #39/#40; rămâne notificarea pe email (blocată de alegerea serviciului)
- **Frontend Săpt. 9-10:** UI-ul există (buton „Nu am înțeles", tichete la profesor, `/intrebari`), dar e scris pe **contractul vechi** și e **dezactivat în producție** prin `TICHETE_UI_ACTIVE` — de reconectat la firul de mesaje, vezi tabelul Săpt. 9-10
- **Faza 2 (direcție de produs):** planificată — vezi secțiunea de la finalul fișierului. Decis în ședința din 12 august: jurnal de evenimente acum, repetiție spațiată cu **FSRS**, structura materiei în patru secțiuni, corectare stratificată (auto pe ce e fix, pre-notare pe text liber, mentor integral pe testele mari), public-țintă a XI-a + a XII-a
- **Bottleneck:** reconectarea frontendului de tichete la contractul de mesaje (Bogdan)
- **Model de abonament:** **trial 14 zile**, apoi plată. Anti-abuz fără card: email normalizat + domenii temporare + verificare SMS. Detalii în „Model de abonament și alocare"
- **Ultima actualizare:** 2026-09-03 (trial decis, alocare decisă, `/api/checkout` respinge rolurile)
- **Roluri:** Andrei = backend · Bogdan = frontend

---

## Pentru Bogdan — de unde începe

> Indicator, nu listă paralelă. Detaliile stau în secțiunile de mai jos; aici e doar
> ordinea în care au sens și ce s-a schimbat în backend cât timp n-ai fost pe branch.

1. **Reconectarea tichetelor** (Săpt. 9-10). Contractul s-a schimbat sub tine: tichetul
   e acum **fir de mesaje**, nu pereche întrebare/răspuns. `POST /api/tickets/[id]/answer`
   nu mai există — e `POST /api/tickets/[id]/messages`. `lesson_id` e obligatoriu la
   creare. Tot UI-ul e **dezactivat în producție** prin `TICHETE_UI_ACTIVE`; ultimul pas
   e să pui flag-ul pe `true`.
2. **Afișarea explicației greșelii** (grupa B). `submit` întoarce acum `chosen_explanation`
   — de ce e greșit exact ce a ales elevul, nu doar de ce e corect răspunsul bun.
3. **Selectorul de etichete** în formularul „Întrebare test" (grupa A). Fără el, orice
   întrebare nouă intră neetichetată, deci invizibilă pentru statistica pe concept și
   pentru repetiția spațiată.
4. **„Greșelile mele"** (grupa B) — cea mai utilă funcție pentru un elev de examen, și
   una dintre cele mai ieftine acum că jurnalul de răspunsuri există.

**Două schimbări transversale**, care nu sunt sarcini de sine stătătoare:

- **Erorile din API sunt acum JSON**, nu text: `{ error: "forbidden", message?: "…" }`.
  Codurile de status n-au fost atinse, deci nimic din UI nu s-a stricat — dar pentru
  mesaje noi te poți lega de `error`, care e stabil, în loc de status. Vezi `docs/api.md`.
- **`docs/surse-oficiale.md`** — programa în vigoare pentru BAC 2026 e cea din 2013, nu
  cea din 2021 care apare prima în căutări. Contează dacă lucrezi la ceva legat de
  structura materiei.

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
| ✅ | Alegere și configurare librărie UI (ex: Tailwind CSS + shadcn/ui) | Bogdan | `setup-ui` | **Decis: Tailwind curat, fără shadcn.** Primitive de stil în `app/_components/ui.ts` (`btn`, `inputCls`, `cardCls`, `listCls`, `badgeCls`). Motivele + lista de componente: `docs/components.md`. |
| ✅ | Layout de bază al aplicației (header, sidebar, footer) | Bogdan | `landing-si-pricing` | `app/_components/site-header.tsx` + `site-footer.tsx` (header adaptat la sesiune). Sidebar: când apare zona de elev. |
| ✅ | Pagină de start / landing page placeholder | Bogdan | `landing-si-pricing` | `app/page.tsx` — hero + features. `/` făcută publică în `proxy.ts`. |

---

## Săptămânile 3-4 — Autentificare și cont elev

| Status | Sarcină | Cine | Branch | Note |
|---|---|---|---|---|
| ✅ | Pagină de înregistrare elev (via Clerk) | Andrei | `setup-clerk` | Funcțională — `app/sign-up/[[...sign-up]]/page.tsx` |
| ✅ | Pagină de login (via Clerk) | Andrei | `setup-clerk` | Funcțională — `app/sign-in/[[...sign-in]]/page.tsx` |
| ✅ | Schema bază de date: tabel `users` (extins față de Clerk) | Andrei | `auth-cont-elev` | Creat în Supabase cu RLS activat |
| ✅ | Protejare rute (redirect dacă nu e autentificat) | Andrei | `setup-clerk` | `proxy.ts` cu `clerkMiddleware` |
| ✅ | Webhook Clerk — sync user în DB la înregistrare | Andrei | `auth-cont-elev` | Confirmat end-to-end (user real → tabel `users`); erori logate în `error_logs` |
| ✅ | Pagină de profil elev | Bogdan | `dashboard-elev` | `app/profil/page.tsx` — cont (nume/email/rol) + abonament (cu dată valabilitate) + `<UserProfile />` Clerk pentru setări. 6 teste. |
| ✅ | Pagină de upgrade abonament (UI) | Bogdan | `dashboard-elev` | Buton „Upgrade la Premium" în cardul de abonament din `/dashboard` → `/upgrade`. Verificat E2E: duce pe Stripe Checkout. |
| ✅ | Pagină de prețuri (carduri Free/Premium) | Bogdan | `landing-si-pricing` | `app/pricing/page.tsx` + `_components/pricing-plans.tsx` (+ FAQ). Rută publică. Preț Premium încă placeholder — de completat suma. |
| ✅ | Pagină `/dashboard` | Bogdan | `dashboard-elev` | `app/dashboard/page.tsx` — abonament + cont + tratare `?checkout=success\|cancel`. 8 teste în `tests/dashboard.test.ts`. |
| ✅ | Integrare Stripe Checkout pentru abonament lunar | Andrei | `auth-cont-elev` | `app/api/checkout/route.ts` — creează Checkout Session, întoarce `url`. |
| ✅ | Webhook Stripe — activare/dezactivare abonament în DB | Andrei | `auth-cont-elev` | `app/api/webhooks/stripe/route.ts` — testat E2E cu Stripe CLI (`subscription_status` → `active`/`cancelled`). |
| ✅ | Pagină `/upgrade` (pornește checkout + redirect Stripe) | Andrei | `auth-cont-elev` | `app/upgrade/page.tsx` — reutilizată de butonul „Upgrade" și de fluxul premium-la-înregistrare. |
| ✅ | **`POST /api/checkout` nu verifică rolul** — un profesor ajuns direct pe `/upgrade` e trimis pe Stripe și poate plăti un abonament de care nu are nevoie | Andrei | `checkout-rol` | Blocat în API (403 pentru `teacher`/`mentor`), nu în UI: ascunderea butoanelor nu închide ruta, fiindcă `/upgrade` pornește checkout-ul din `useEffect`. Un cont fără rând în `users` nu e blocat, ca un elev nou să poată plăti. 4 teste noi |
| ✅ | Alegere plan la înregistrare (`?plan=premium`) | Andrei | `auth-cont-elev` | `app/sign-up` citește `?plan=` → `forceRedirectUrl` (`/upgrade` vs `/dashboard`). |

---

## Săptămânile 5-6 — Conținut educațional + Panel profesor

| Status | Sarcină | Cine | Branch | Note |
|---|---|---|---|---|
| ✅ | Schema DB: tabele `chapters`, `lessons` | Andrei | `panel-profesor-capitole` | RLS activat; SQL în `docs/database.md` |
| ✅ | Date placeholder: 3 capitole, 2-3 lecții per capitol | Andrei | `panel-profesor-capitole` | `npm run seed:content` (generic, NU structura reală BAC) |
| ✅ | Pagină listă capitole (vedere elev) | Bogdan | `dashboard-elev` | Accordion pe `/dashboard` (`_components/chapters-browser.tsx`) — `GET /api/chapters` + lecții per capitol la expand. Verificat în browser. |
| ✅ | Pagină lecție (text + embed video) | Bogdan | `dashboard-elev` | `app/lectii/[id]/` — conținut + buton video; tratează `402` (paywall) și `404`. Verificat în browser. |
| ✅ | Autentificare profesor (rol distinct în Clerk/Supabase) | Andrei | `panel-profesor-capitole` | `users.role`; promovare din `/admin` (buton) via `POST /api/admin/set-role` |
| ✅ | Panel profesor — formular "Capitol nou" | Bogdan | `dashboard-elev` | `app/profesor/` (gated pe rol teacher) — formular titlu/descriere/gratuit/publică → `POST /api/chapters` + listă capitole. Link „Profesor" în `AppHeader` doar pt. teacher. Verificat E2E în browser. |
| ✅ | Panel profesor — formular "Lecție nouă" cu editor text | Bogdan | `dashboard-elev` | `app/profesor/teacher-lessons.tsx` — select capitol / titlu / conținut (textarea + previzualizare) / link video / publică → `POST /api/lessons` + lista lecțiilor capitolului. Capitolele sunt încărcate o singură dată în `teacher-panel.tsx`. |
| ✅ | API routes pentru CRUD capitole și lecții | Andrei | `panel-profesor-capitole` | `/api/chapters`, `/api/lessons` (+ `[id]`); detalii în `docs/api.md` |

---

## Săptămânile 7-8 — Teste și progres

| Status | Sarcină | Cine | Branch | Note |
|---|---|---|---|---|
| ✅ | Schema DB: tabele `questions`, `answers`, `student_progress` | Andrei | `teste-progres` | Migrare `20260806120000_teste_progres.sql` + tipuri; RLS activat, grant `service_role`. Detalii în `docs/database.md` |
| ✅ | Date placeholder: 5-10 întrebări grilă per capitol | Andrei | `teste-progres` | `npm run seed:questions` — 6 întrebări × 4 variante per capitol (generic, NU întrebări reale BAC) |
| ✅ | Pagină test per capitol (UI grilă) | Bogdan | `teste-progres` | `/teste/[chapterId]` — grilă, paywall 402, feedback per întrebare |
| ✅ | Logică corectare automată + afișare scor | Andrei + Bogdan | `teste-progres` | API: `POST /api/chapters/[id]/submit` (Andrei) · afișare scor + feedback per întrebare (Bogdan). Verificat cap-coadă cu date reale. |
| ✅ | Statistici simple de progres per capitol (UI) | Bogdan | `teste-progres` | Secțiunea „Progresul tău" pe `/dashboard` (pe `GET /api/progress`) |
| ✅ | Panel profesor — formular „Întrebare test" | Bogdan | `teste-progres` | Variante dinamice (2-6), marcarea răspunsului corect, explicație, draft |
| ✅ | API routes pentru CRUD întrebări | Andrei | `teste-progres` | `/api/questions` (+ `[id]`, `[id]/answers`), `/api/chapters/[id]/questions`, `/api/progress`. Detalii în `docs/api.md` |

---

## Săptămânile 9-10 — Sistem de mentorat (tichete)

> ⚠️ **Tot UI-ul de tichete e dezactivat în producție** prin `TICHETE_UI_ACTIVE`
> (`app/_components/feature-flags.ts`), fiindcă e scris pe contractul vechi și ar
> arăta elevului date greșite fără să crape. Codul e la locul lui; reactivarea e o
> singură linie, după reconectarea la `POST /api/tickets/[id]/messages`.

| Status | Sarcină | Cine | Branch | Note |
|---|---|---|---|---|
| ✅ | Schema DB: tabel `tickets` | Andrei | `sistem-tichete-mentorat` | Două migrări (aplicate): tichete + `ticket_messages` (fir de discuție) și context de lecție. `docs/database.md` |
| 🟡 | Buton "Nu am înțeles" în pagina de lecție/test (cu context automat) | Bogdan | `teste-progres` | UI gata (`app/_components/help-button.tsx`), dar scris pe contractul vechi. **De reconectat:** `lesson_id` e obligatoriu, deci butonul de pe `/teste/[chapterId]` (care n-are lecție) trebuie regândit; opțional `selection` + `scroll_percent` |
| 🟡 | Mesaj așteptare afișat elevului (ex: "Răspuns în 24h") | Bogdan | `teste-progres` | Mesajul de confirmare („răspuns în cel mult 24h" + email) e deja în starea de succes a butonului. Notificarea pe email e însă blocată — de nuanțat textul. |
| ✅ | API route — creare tichet | Andrei | `sistem-tichete-mentorat` | `POST /api/tickets` — **cere `lesson_id`**; capturează pe server lecția, capitolul, titlul și progresul la test; de la client doar selecția + poziția. `docs/api.md` |
| 🟡 | Interfață profesor — listă tichete organizate pe capitol | Bogdan | `teste-progres` | Secțiunea „Tichete" din `/profesor` — grupare, filtru, detaliu desfășurabil: gata. **De reconectat** la firul de mesaje și la contextul nou (poziție, fragment selectat, progres la test) |
| 🟡 | Funcționalitate răspuns profesor la tichet | Andrei + Bogdan | `teste-progres` | **API gata** (Andrei): `POST /api/tickets/[id]/messages` — fir de discuție, status după ultimul vorbitor. UI-ul lui Bogdan trimite încă la `/answer` și presupune un singur răspuns — **de rescris pe fir** |
| 🟡 | Notificare email elev la primirea răspunsului | Andrei | `notificare-email-resend` | **Cod gata** (Resend, `lib/email.ts` + apel în `POST /api/tickets/[id]/messages`). Tace dacă `RESEND_API_KEY` lipsește, deci merge deja în CI și preview fără să trimită nimic. **Rămâne un pas care nu ține de cod: un domeniu propriu, verificat în Resend** — vezi rândurile de mai jos |
| 🟡 | Pagină elev — vizualizare răspuns primit | Bogdan | `teste-progres` | `/intrebari` — listă + link în antet: gata. **De reconectat** la fir (mai multe mesaje per tichet, nu un singur `answer`) |
| ⬜ | **Pune `TICHETE_UI_ACTIVE` pe `true`** — ultimul pas al reconectării | Bogdan | — | Fără el, munca de mai sus rămâne invizibilă în producție. `app/_components/feature-flags.ts`. De verificat toate cele șase suprafețe: antet, `/profesor`, pagina de lecție, două în pagina de test, plus ruta `/intrebari` (care dă acum 404) |

---

## Săptămânile 11-12 — Testare și stabilizare

| Status | Sarcină | Cine | Branch | Note |
|---|---|---|---|---|
| ✅ | Teste automate (Vitest) + CI (GitHub Actions) | Andrei | `tests-payments-ci`, `tests-content-authz` | 43 teste: plăți, env, conținut + gating premium, health; CI `lint`+`typecheck`+`test` pe push/PR + hook pre-push. Detalii în `docs/testing.md` |
| ✅ | Endpoint `/api/health` pentru monitorizare uptime | Andrei | `tests-content-authz` | Verifică Supabase (503 dacă e jos) + Stripe. `docs/monitoring.md` |
| ✅ | Security review pe plăți/auth/conținut + hardening | Andrei | `tests-content-authz` | Cod curat; aplicat: cache health, gating pe `end_date`, `primaryEmailAddress` admin |
| ⬜ | Testare internă cu 10-20 elevi reali | Andrei + Bogdan | — | |
| ⬜ | Colectare și prioritizare feedback | Andrei + Bogdan | — | |
| ⬜ | Remediere bug-uri critice | Andrei + Bogdan | `bugfix-*` | Branch separat per bug |
| ⬜ | Documentație finală (arhitectură, deploy, ghid profesor) | Andrei + Bogdan | `docs` | |

---

## Faza 2 — direcție de produs (din cercetare, decizii din 12 august 2026)

> Sursa: `docs/duolingo-research.md`, `docs/bac-barem-analiza.md`, `docs/viziune-produs.md`,
> `docs/rezumat-sedinta.md`. Sarcinile de mai jos sunt **doar** cele pentru care există
> decizie. Ce depinde de un punct încă nedecis stă în „Blocat / În așteptare", nu aici.
>
> **Regula de filtrare, asumată:** fiecare element trebuie să răspundă la „îl apropie pe
> elev de o notă mai mare la BAC?". Dacă răspunsul e „nu, dar crește implicarea", nu intră.
> **Nu facem:** vieți/hearts, ligi publice, XP ca metrică centrală, teste A/B, microservicii.

### A. Jurnal de evenimente — **decis: acum** (blochează grupele B și E)

| Status | Sarcină | Cine | Branch | Note |
|---|---|---|---|---|
| ✅ | Migrare `answer_events` — append-only: elev, întrebare, variantă aleasă, corect, timestamp | Andrei | `answer-events` | `20260812150000_answer_events.sql`, **aplicată în producție prin Supabase CLI**. Grant doar `select, insert` — append-only garantat de privilegii. `question_id` e SET NULL, nu CASCADE. Coloane în `docs/database.md` |
| ✅ | Scrierea evenimentelor din `POST /api/chapters/[id]/submit` | Andrei | `answer-events` | O linie per răspuns, cu `attempt_id` comun pe trimitere. Scrise **înainte** de progres; eroarea se loghează, dar nu ascunde scorul elevului. Fără evenimente pentru profesor. 5 teste noi |
| ✅ | Explicație **per variantă** — coloană pe `answers` | Andrei | `explicatie-per-varianta` | `20260812160000`, aplicată în producție. Scrisă din `POST /api/questions` și `PUT .../answers`; întoarsă din `submit` ca `chosen_explanation`, **doar pentru varianta aleasă** — textul dezvăluie răspunsul la fel ca `is_correct`. Rămâne de afișat în UI (Bogdan) |
| ✅ | Etichete pe întrebări (`tags`) pentru stăpânire per concept | Andrei | `etichete` | `20260812170000`, aplicată. **Vocabular închis** (tabel + join, nu `text[]`): 51 de etichete derivate textual din programa oficială. `GET /api/tags`; `POST /api/questions` acceptă `tags: [slug]` și dă **400** la slug necunoscut. Grupa A **închisă** |

### B. Ce iese din jurnal (ieftin, valoare mare)

| Status | Sarcină | Cine | Branch | Note |
|---|---|---|---|---|
| ⬜ | **„Greșelile mele"** — pagină elev cu întrebările ratate, grupate pe capitol | Bogdan | `greselile-mele` | **API gata:** `GET /api/greseli` → `{ mistakes: [{ question_id, question_text, explanation, chapter_id, chapter_title, chosen_answer_id, answered_at }] }`. Cea mai utilă funcție pentru un elev de examen |
| ✅ | API pentru „greșelile mele" | Andrei | `greseli-si-dificultate` | `GET /api/greseli` (+ `?chapter_id=`). Semantica — **ultimul** răspuns per întrebare, doar cele greșite — e in vederea `latest_answer_per_question`, nu in ruta |
| 🟡 | **Dificultate reală per întrebare** (% elevi care greșesc) în `/profesor` | Andrei + Bogdan | `greseli-si-dificultate` | **API gata** (Andrei): `GET /api/questions/dificultate`, calculat pe **prima** întâlnire a fiecărui elev — reluările ar umfla rata de succes. Rămâne afișarea în `/profesor` (Bogdan) |
| ⬜ | Afișarea explicațiilor imediat după corectare | Bogdan | `greselile-mele` | `submit` întoarce acum **două** câmpuri per rezultat: `explanation` (de ce e corect răspunsul bun, de pe întrebare) și `chosen_explanation` (de ce e greșit exact ce a ales elevul). Al doilea e cel valoros la o greșeală. Ambele pot fi `null` |
| ⬜ | **Selector de etichete** în formularul „Întrebare test" | Bogdan | `etichete-ui` | `GET /api/tags` dă vocabularul (`?axis=concept\|limba\|curent\|competenta`, `?profile=uman`). Se trimit ca `tags: ["slug", …]` la `POST /api/questions`. **Vocabular închis:** un slug inexistent dă 400 — nu e câmp liber de text. Fără el, întrebările intră neetichetate și rămân invizibile pentru statistica pe concept și pentru FSRS |

### C. Baremul ca date

| Status | Sarcină | Cine | Branch | Note |
|---|---|---|---|---|
| ✅ | Codificarea baremului ca tabel de criterii cu praguri | Andrei | `barem-date` | Sursa de adevăr: [`data/barem.json`](data/barem.json) — 6 rubrici, 33 de criterii, cu praguri. În DB prin `npm run barem:import`, **versionat** (notele rămân explicabile după o corectură). Validare: `npm run barem:check`. Vizualizare doar-citire: `/admin/barem`. **17 puncte pe stratul `auto`** pe rubricile modelate |
| ✅ | Corectare **strat 1, determinist** — număr de cuvinte, conectori, părți componente, prezența citatului | Andrei | `barem-date` | [`lib/corectare-strat1.ts`](lib/corectare-strat1.ts) — `corecteazaStrat1(rubrica, { text, textSuport })`. 6 verificatoare + 24 de teste. **Un criteriu nenotat NU primește 0**: întoarce `stare: 'indisponibil'` și `puncte: null`, iar `dinCatePosibile` exclude acele puncte, ca elevul să nu creadă că le-a pierdut. Cele 4 puncte de ortografie/punctuație rămân indisponibile până la LanguageTool (grupa F) |
| ⬜ | Autoevaluare pe barem — elevul se notează pe grila oficială | Bogdan | `barem-date` | Cel mai ieftin mod de a preda baremul. **Criteriile există acum ca date** — nu le rescrie în UI. Formatul e în [`lib/barem.ts`](lib/barem.ts) (tipurile `Rubrica`/`Criteriu`/`Prag`), datele în `data/barem.json`, iar `/admin/barem` arată exact ce e în sistem. Fiecare criteriu are `puncte_max` și `praguri` cu textul oficial |
| ⬜ | Lecție „cum se punctează" — cele ~32 de puncte care se iau pe formă | ❓ | — | Conținut, nu cod. Se învață în cinci minute și foarte puțini elevi o știu |

### D. AI faza 1 — în lot, offline, fără cereri de la elevi

| Status | Sarcină | Cine | Branch | Note |
|---|---|---|---|---|
| ⬜ | Script de generare întrebări + explicații per variantă (generează → al doilea model evaluează → alege) | Andrei | `ai-generare-continut` | Costul e o singură dată, nu per elev. Necesită A (explicație per variantă) |
| ⬜ | Pagină de revizie în `/profesor` — aprobă / editează / respinge | Bogdan | `ai-generare-continut` | **Profesorul devine revizor, nu autor** — asta deblochează gâtuirea de conținut |
| ⬜ | Etichetare automată a conținutului existent | Andrei | `ai-generare-continut` | Depinde de etichetele din A |

### E. Motivație — adaptat, nu copiat

| Status | Sarcină | Cine | Branch | Note |
|---|---|---|---|---|
| ⬜ | **Streak cu îngheț** — cele două, obligatoriu împreună | Andrei + Bogdan | `motivatie` | Zile în care ai învățat ceva, nu zile pe aplicație. Fără îngheț devine pedeapsă: cine ratează duminica abandonează complet |
| ⬜ | **Nota estimată** în loc de XP | Andrei + Bogdan | `motivatie` | Singura metrică pe care un elev de a XII-a o simte reală. Cere A |
| ⬜ | Numărătoare inversă **cu plan** | Bogdan | `motivatie` | „47 de zile, n-ai atins Integralele" bate „mai sunt 47 de zile" |
| ⬜ | Ecranul de revenire după absență | Bogdan | `motivatie` | „Hai să recuperăm", nu „ai pierdut 14 zile". Optimizăm pentru cel care a lipsit, nu doar pentru cel activ |

### F. Gramatică și tehnic

| Status | Sarcină | Cine | Branch | Note |
|---|---|---|---|---|
| 🟡 | **LanguageTool** self-hostat pentru ortografie/punctuație | Andrei | `barem-date` | **Clientul e scris** ([`lib/languagetool.ts`](lib/languagetool.ts)) și legat de barem prin `parametri.categorie` (`ortografie` / `punctuatie` / `gramatica` / `toate`) și `praguri[].max_greseli`. **Rămâne doar găzduirea:** pornești instanța și pui `LANGUAGETOOL_URL` în env — zero cod. Local: `docker run -d -p 8010:8010 erikvl87/languagetool`. Fără variabilă, criteriile de limbă ies `indisponibil`, nu 0 |
| ⬜ | Cache pe `/api/chapters` (`use cache`, Next 16) | Andrei | `cache-continut` | ~200ms per cerere pentru date care se schimbă săptămânal |
| ⬜ | Nivel intermediar în ierarhie (`chapters → units → lessons`) | Andrei | — | Doar dacă un capitol ajunge la ~30 de lecții. Momentan nu e nevoie |

### G. Structura materiei — **structura decisă, ordinea nu**

Patru secțiuni, fiecare cu **materie + exerciții**: **Gramatică**, **Subiectul I**,
**Subiectul II**, **Subiectul III**. Cu care începem se discută încă cu profesorul
(vezi „Blocat / În așteptare").

| Status | Sarcină | Cine | Branch | Note |
|---|---|---|---|---|
| ⬜ | Modelarea celor patru secțiuni în schema de conținut | Andrei | `structura-materie` | Azi avem `chapters → lessons`, plat. Secțiunea devine nivelul de deasupra capitolului — vezi și rândul „nivel intermediar" din F, care se rezolvă odată cu asta |
| ⬜ | Separarea „materie" vs. „exerciții" în fiecare secțiune | Andrei | `structura-materie` | De decis dacă e un tip pe lecție sau două liste distincte per capitol |
| ⬜ | Migrarea conținutului existent pe structura nouă | Andrei | `structura-materie` | Cele 3 capitole de seed sunt generice; migrarea e ieftină acum, cât nu există conținut real |
| ⬜ | Navigare pe secțiuni în `/dashboard` | Bogdan | `structura-materie` | Patru secțiuni în loc de o listă plată de capitole |

### H. Repetiție spațiată și teste recurente — **decis: FSRS**

| Status | Sarcină | Cine | Branch | Note |
|---|---|---|---|---|
| ✅ | Integrare **FSRS** — planificator de repetiție per elev × concept | Andrei | `fsrs` | `ts-fsrs` (FSRS-6) + tabel `concept_states` (cheie: elev × **etichetă**, nu × întrebare). Actualizat din `submit`; `GET /api/recapitulare` dă conceptele scadente. **Nu cere antrenament**: parametrii impliciți sunt deja antrenați și sunt mai buni decât unii derivați din puține date |
| ⬜ | **Ponderare după data examenului** — orizont fix, nu infinit | ❓ | — | FSRS optimizează retenția pe termen **nedefinit**; noi avem o dată fixă. Spre final vrem să creștem frecvența pe ce e fragil, chiar dacă modelul ar zice că e prea devreme. De decis cum ponderăm și de unde vine data examenului |
| ⬜ | **Teste de recapitulare** generate din planificator | Andrei + Bogdan | `repetitie-fsrs` | Testul vine când modelul spune că elevul e pe cale să uite, nu la interval fix |
| ⬜ | **Teste de gramatică** pe același planificator | Andrei | `repetitie-fsrs` | Decis: aceeași cadență ca restul, **un singur mecanism**, nu un al doilea sistem pe calendar |
| ⬜ | **Test de nivel la început** — grilă inițială care stabilește de unde pornește elevul | Andrei + Bogdan | `test-nivel` | Primul contact cu platforma. Alimentează starea inițială din FSRS, ca elevul să nu reia ce știe deja |
| ⬜ | **Test general la fiecare 3 capitole terminate** | Andrei + Bogdan | `teste-mari` | Declanșat de progres, nu de calendar. Corectare: vezi I |
| ⬜ | **Simulare cronometrată de 3 ore** | Andrei + Bogdan | `teste-mari` | Mulți elevi nu pică din necunoaștere, ci din gestionarea timpului |

### I. Corectarea — **regula decisă**

> **Ce e fix și se poate automatiza fără ambiguitate, se autocorectează integral.**
> **Textul liber nu primește niciodată notă automată** — AI-ul doar pre-notează, pentru mentor.
> **Testele mari (la 3 capitole) și simulările se corectează integral de mentor** — sunt cele
> care contează, iar acolo nu vrem greșeli de corectură.

| Status | Sarcină | Cine | Branch | Note |
|---|---|---|---|---|
| ⬜ | Autocorectare completă pe cerințele cu răspuns fix / structură fixă | Andrei | `corectare-straturi` | Grile, potriviri, cerințe cu răspuns unic. Extinde ce există deja la `POST /api/chapters/[id]/submit` |
| ⬜ | **Pre-notare deterministă** pe text liber (număr de cuvinte, părți componente, conectori, prezența citatului) | Andrei | `corectare-straturi` | Vezi și C. **Limitat la criteriile cu prag verificabil fără interpretare** — restul rămân sugestii, nu verdicte |
| ⬜ | **Pre-notare AI pe barem**, criteriu cu criteriu — **doar pentru mentor**, niciodată notă finală | Andrei | `corectare-straturi` | Baremul dă chiar vocabularul de notare („adecvată și nuanțată" = 2p). Nu-i cerem să „noteze eseul", ci să aplice un criteriu cu praguri |
| ⬜ | Interfața mentorului pentru corectarea testelor mari | Bogdan | `corectare-straturi` | Lucrarea + pre-notările + autoevaluarea elevului, pe aceeași grilă oficială |
| ⬜ | Autoevaluarea elevului ca **strat 0** pe text liber | Bogdan | `barem-date` | Elevul se notează pe grila oficială înainte să ajungă la mentor. Cost zero, scalează, și predă exact competența care aduce punctele pe formă. Diferența dintre autoevaluare și nota reală e cea mai bună lecție |
| ⬜ | **Capacitatea de corectare** — câte lucrări pe săptămână duce un mentor | ❓ | — | Testul la 3 capitole + simulările, corectate integral de om, sunt articolul cu cel mai mare volum din sistem. La 20 de elevi merge; plafonul trebuie **calculat**, nu descoperit |

### J. Secțiune remedială — greșelile frecvente

> **Principiul:** dacă elevul a trecut prin lecția X și tot greșește, retrimiterea la
> lecția X nu ajută. Are nevoie de **altă** explicație, nu de aceeași a doua oară.
>
> **Cum generăm — decis: în lot, per neînțelegere, nu live per elev.** Neînțelegerile
> sunt un set mărginit (o confuzie e aceeași la 200 de elevi), deci se generează o dată,
> se revizuiesc o dată și se **servesc** personalizat. Pentru elev e instant, fiindcă
> lecția există deja în DB; generarea live l-ar pune să aștepte zeci de secunde exact
> când e frustrat. E și modelul Duolingo: conținut generat offline, personalizare la
> servire.

| Status | Sarcină | Cine | Branch | Note |
|---|---|---|---|---|
| ⬜ | Identificarea tiparelor de greșeală per elev | Andrei | `remediere` | Din `answer_events` (A) + etichete. Nu „ce a greșit o dată", ci ce se repetă |
| ⬜ | **Catalogul de neînțelegeri** — set mărginit, derivat din variantele greșite și etichete | Andrei | `remediere` | Unitatea de remediere. Fără el, generarea n-are pe ce să se lege |
| ⬜ | **Generator de lecții remediale, în lot** — una per neînțelegere, cu altă abordare decât lecția originală | Andrei | `remediere` | Extinde D. Intrarea: neînțelegerea + lecția pe care elevul a parcurs-o deja (ca să nu repete aceeași explicație) |
| ⬜ | **Revizie triată** — al doilea model dă scor de încredere; profesorul vede doar ce e sub prag + un eșantion aleator | Andrei + Bogdan | `remediere` | Ca profesorul să revizuiască zeci, nu sute. Efortul e front-loaded: primul lot cere atenție, apoi devine marginal |
| ⬜ | Servirea lecției potrivite tiparului elevului | Andrei | `remediere` | Personalizarea se face aici, la servire — conținutul rămâne static |
| ⬜ | Teste țintite pe greșelile proprii | Andrei + Bogdan | `remediere` | Extinde „Greșelile mele" (B) de la listă la exercițiu |
| ⬜ | Secțiune dedicată în UI | Bogdan | `remediere` | Separată de parcursul normal |
| ⬜ | Control de calitate pe generator — eșantion verificat periodic | ❓ | — | Româna are interpretare, iar un model care sună convingător și e greșit e mai periculos decât unul absent. Eșantionul e singurul mod de a afla că pragul de încredere e prost calibrat |

### Public-țintă — **decis**

Principal: **elevii de clasa a XI-a și a XII-a.** Secundar: **promoțiile anterioare**
(31,7% promovabilitate față de 79,7% la promoția curentă — cea mai mare nevoie și cea mai
mare disponibilitate de a plăti). Includerea clasei a XI-a e o **extindere față de tot ce
s-a documentat până acum**: documentele de programă și barem presupun exclusiv clasa a
XII-a. De reevaluat fragmentarea materiei în consecință.

---

## Blocat / În așteptare

| Sarcină | Motiv blocare | Cine deblochează |
|---|---|---|
| Structura reală de capitole BAC | Profesorul partener nu este disponibil încă | Profesorul partener |
| Conținut real lecții | Idem | Profesorul partener |
| **Ordinea secțiunilor** — cu care dintre cele patru începem | Structura e decisă (vezi G); ordinea se discută cu profesorul | Andrei + profesorul partener |
| **Banca de texte la prima vedere** (Subiectul I) | Textele sunt fragmente din volume publicate; republicarea în aplicație **trebuie verificată juridic** | Andrei |
| **TypeScript 7** (bump `6.0.3` → `7.0.2`) | `npm run lint` crapă cu `typescript-eslint does not support TS 7.0`; `tsc --noEmit` și cele 161 de teste trec. Lanțul: `eslint-config-next` → `typescript-eslint: "^8.46.0"`, avem 8.62.0. **Nu așteptăm o versiune nouă de Next** — caret-ul face ca orice `8.x` cu suport TS 7 să intre singur la `npm install`. **Cum aflăm că s-a deblocat:** dependabot redeschide PR-ul de bump `typescript`, iar check-ul `test` din CI (care rulează `lint`) trece verde — nimic de verificat manual, PR verde = se poate merge-a. Verificat 2026-08-25 | typescript-eslint (upstream) |
| Structura reală de capitole în interiorul secțiunilor | Cele patru secțiuni sunt decise; ce conține fiecare, nu | Profesorul partener |

---

## Întreținere recurentă

> Lucruri care **reapar**, nu care se termină. Fiecare rând de aici există fiindcă
> problema a picat deja de cel puțin două ori și a costat timp de diagnostic.

| Când se declanșează | Ce e de făcut | De ce e aici |
|---|---|---|
| **Orice bump de `stripe`** (PR dependabot care atinge pachetul) | Actualizează `apiVersion` în `lib/stripe.ts` la valoarea nouă din `node_modules/stripe/esm/apiVersion.d.ts`, **în același PR cu bump-ul**. Înainte de a schimba stringul, citește `node_modules/stripe/CHANGELOG.md` pentru versiunea nouă și verifică explicit dacă schimbările ating Checkout Sessions sau webhook-ul | SDK-ul fixează versiunea de API în tipuri, deci `typecheck` pică — și cu el CI-ul **și** build-ul Vercel. S-a întâmplat la PR #56 (`ERRORS.md` #022) și la PR #61 (#023). Simptomul e mereu același: `TS2322` pe un string literal, într-un PR care atinge doar `package.json` |

**De ce nu automatizăm bump-ul:** s-ar putea scrie `apiVersion: Stripe.LatestApiVersion`,
derivat din tip, și eroarea ar dispărea pentru totdeauna. **Deliberat nu facem asta.**
Constrângerea de tip e pusă de Stripe *intenționat*, ca să nu treci pe o versiune nouă de
API fără să știi. Într-un modul de plăți, o actualizare tăcută e mai scumpă decât cinci
minute de citit changelog. Ce automatizăm e *reamintirea*, nu *decizia*.

---

## Email tranzacțional (Resend) — cod gata, domeniu lipsă

Codul e scris și testat. Ce lipsește nu se rezolvă cu un commit.

> ⚠️ **Stare: SUSPENDAT (decis 2026-09-03).** Domeniul nu se cumpără acum. Codul e
> complet, testat și **inert** — fără `RESEND_API_KEY` nu trimite nimic și nu loghează
> nimic. Nu e o scăpare, e o decizie; dacă depanezi de ce un elev n-a primit email,
> răspunsul e aici, nu în cod.

### Blocajul real: nu avem domeniu propriu

`vercel domains ls` → **0 domenii**. Aplicația rulează pe `platforma-bac.vercel.app`, iar
pe un subdomeniu `.vercel.app` **nu putem verifica un expeditor în Resend** — n-avem
control pe DNS-ul lui.

Ce se întâmplă fără domeniu verificat: Resend acceptă trimiterea **doar către adresa
proprietarului contului**. Adică ar merge perfect în testele lui Andrei și ar tăcea pentru
fiecare elev real. E cel mai prost tip de eșec — invizibil exact în producție.

În plus, chiar dacă s-ar putea, un email de la un subdomeniu `.vercel.app` fără SPF/DKIM
proprii ajunge în spam la majoritatea furnizorilor. Domeniul propriu nu e o formalitate; e
condiția ca emailurile să fie citite.

| Status | Sarcină | Cine | Branch | Note |
|---|---|---|---|---|
| ⬜ | **Cumpărat domeniu propriu** | Andrei | — | Precondiție pentru tot ce urmează. E nevoie oricum înainte de lansare — nu vindem un produs pe `*.vercel.app`. Un `.ro` costă ~10-15 EUR/an |
| ⬜ | Domeniul adăugat în Vercel + în Resend, DNS verificat | Andrei | — | Aceleași DNS, două locuri: Vercel pentru site, Resend pentru SPF + DKIM. Resend arată exact ce înregistrări trebuie adăugate |
| ⬜ | `RESEND_API_KEY` + `EMAIL_FROM` în Vercel (Production) | Andrei | — | **Nu și în Preview.** Un deploy de preview care trimite emailuri reale elevilor e o greșeală ușor de făcut și greu de reparat |
| ⬜ | Verificare cap-coadă cu un tichet real | Andrei | — | După ce cheia e pusă: un răspuns de profesor → emailul chiar ajunge, linkul duce în firul corect |
| ⬜ | **Textele din UI care promit email, puse la loc** | Bogdan | `notificare-email-resend` | Trei locuri spuneau elevului „Primești un email" — o promisiune pe care sistemul nu o putea ține. Schimbate pe 2026-09-03 în „vezi răspunsul în «Întrebările mele»": `help-button.tsx`, `intrebari/my-tickets.tsx`, `profesor/teacher-tickets.tsx`. **Când emailul devine activ, textele se schimbă înapoi** — altfel funcția merge și nimeni nu o anunță elevului |

### Ce e deja făcut și nu mai trebuie atins

- `lib/email.ts` — client peste API-ul Resend, prin `fetch` (fără pachet în plus).
  **Nu aruncă niciodată**: întoarce `{ trimis: false, motiv }`. Fără cheie nu loghează
  nimic — absența e o stare așteptată, nu o eroare.
- Apelul din `POST /api/tickets/[id]/messages`, **după** scrierea în DB și doar când
  răspunde un corector, învelit în `try` propriu. Un email nelivrat nu are voie să facă
  un profesor să creadă că răspunsul lui s-a pierdut.
- Emailul conține **doar primele 200 de caractere** din răspuns, nu tot. Răspunsul unui
  profesor conține adesea corectura personală a elevului, iar emailul ajunge pe telefoane
  și în inboxuri de familie. Restul se citește în aplicație.
- Variantă `text` alături de HTML la fiecare trimitere — un email doar-HTML e semnal de spam.
- 10 teste: fără cheie nu se apelează nimic, domeniu neverificat → log cu detaliul de la
  Resend, rețeaua căzută nu aruncă, elevul care revine în fir nu-și trimite email sieși,
  iar un eșec de email lasă răspunsul salvat și ruta pe 201.

---

## Model de abonament și alocare (decis 2026-09-03)

### Abonament — **decis: trial 14 zile, apoi plată**

Nu free-tier permanent. Paisprezece zile de acces complet, apoi abonament.

**Problema reală nu e trial-ul, e reînregistrarea.** Un elev care își face cont nou la
fiecare două săptămâni stă gratis la nesfârșit. Contramăsurile de mai jos sunt ordonate
după raportul dintre cât prind și cât deranjează un elev cinstit — se aplică de sus în
jos, și **fiecare rând de mai jos costă mai mult decât cel de deasupra**.

| Status | Sarcină | Cine | Branch | Note |
|---|---|---|---|---|
| ⬜ | **Trial în Stripe, nu în coloane proprii** | Andrei | `trial-14-zile` | `subscription_data.trial_period_days: 14` pe sesiunea de Checkout. Stripe ține ceasul, trimite `customer.subscription.trial_will_end` și trece singur la plată. **Nu ne scriem propriul ceas de trial** — ar însemna încă o sursă de adevăr lângă `subscription_status`, care se poate desincroniza de Stripe |
| ⬜ | **Normalizarea emailului la înregistrare** | Andrei | `trial-14-zile` | Cea mai ieftină măsură și prinde majoritatea cazurilor leneșe: `e.l.e.v+bac2@gmail.com` și `elev@gmail.com` sunt **același** cont la Gmail. De stocat o coloană `email_normalizat` (puncte scoase, `+tag` tăiat, domeniu în litere mici, `googlemail.com`→`gmail.com`), **unică**. Atenție: normalizarea punctelor e corectă doar la Gmail, nu la orice domeniu |
| ⬜ | **Blocarea domeniilor de unică folosință** | Andrei | `trial-14-zile` | Listă de domenii temporare (mailinator, temp-mail, 10minutemail…), reîmprospătată periodic. Prinde al doilea val de abuz. Listă, nu euristică — o euristică respinge și adrese legitime de școală |
| ⬜ | **Un singur trial per elev, nu per cont** | Andrei | `trial-14-zile` | Trial-ul se leagă de `email_normalizat`, nu de rândul din `users`. Un cont nou pe același email normalizat pornește **fără** trial. Fără asta, primele două măsuri doar încetinesc abuzul |
| ❌ | ~~Card obligatoriu la începutul trial-ului~~ | — | — | **Respins (2026-09-03).** Ar fi oprit aproape complet reînregistrarea, dar pierdem elevii care nu au card sau nu vor să-l dea înainte de a fi convinși. La un public de 17-18 ani, asta e o felie prea mare din pâlnie ca să merite |
| ⬜ | **Verificare prin SMS la înregistrare** | Andrei | `antiabuz-telefon` | Înlocuitorul cardului. Numărul de telefon e **mult mai greu de schimbat decât un email și mult mai ușor de dat decât un card**. Clerk o are nativ (`phone_number` ca identificator + cod SMS), deci nu adăugăm infrastructură. Trial legat de număr, ca și de emailul normalizat. Cost ~0,03-0,05 EUR/SMS, plătit o dată per elev real |

**Regula de proporție, asumată:** un elev cinstit nu trebuie să simtă niciuna dintre
măsurile de mai sus. Dacă o măsură anti-abuz creează fricțiune vizibilă la înregistrare,
costă mai mult decât abuzul pe care îl previne — la volumele noastre, câțiva elevi care
prelungesc trial-ul sunt mai ieftini decât o scădere de conversie.

### De ce nu urmărim IP-ul sau amprenta de browser

Întrebate explicit (2026-09-03) ca înlocuitor al cardului. **Nu le folosim**, din motive
care sunt în primul rând practice, nu juridice.

**IP-ul nu identifică un elev, identifică o rețea.** Frații din aceeași casă, colegii de
la aceeași școală și copiii dintr-un internat au **același IP public**. La un produs
vândut prin școli, blocarea pe IP ar respinge exact grupurile pe care le vrem: al doilea
elev dintr-o clasă care încearcă platforma ar fi tratat drept fraudă. În același timp,
**IP-ul e printre cele mai ușor de schimbat lucruri** — date mobile în loc de Wi-Fi și e
alt IP, fără nicio unealtă. Mulți operatori mobili pun oricum sute de abonați în spatele
aceluiași IP (CGNAT), iar la alții IP-ul se schimbă singur la fiecare reconectare. Deci
prinde greșit oamenii cinstiți și nu prinde deloc pe cineva care încearcă intenționat.

**Amprenta de browser e mai stabilă, dar plătim scump pentru ea.** Tehnic funcționează mai
bine decât IP-ul. Juridic însă, citirea de caracteristici ale dispozitivului pentru
identificare intră sub ePrivacy și cere **consimțământ explicit** — adică exact bannerul pe
care ar trebui să-l punem în fața unui elev la înregistrare, ca să-i spunem că îi luăm
amprenta dispozitivului. La un public din care o parte sunt minori, e o discuție pe care
nu vrem să o purtăm pentru câteva trial-uri prelungite. În plus se sparge singură: alt
browser, mod incognito, alt telefon — și amprenta e alta.

**Ce facem în loc: verificarea prin SMS.** Numărul de telefon nimerește exact golul dintre
email și card — **mult mai greu de schimbat decât un email, mult mai ușor de dat decât un
card**. Aproape orice elev de liceu are telefon; foarte puțini au card. Nu cere consimțământ
special dincolo de politica obișnuită, fiindcă e un identificator pe care utilizatorul îl
dă conștient, nu unul luat din spatele paginii. Și e deja în Clerk.

**Principiul, pentru data viitoare:** preferăm un identificator pe care elevul **ni-l dă**
unuia pe care **i-l luăm**. Primul e mai onest, mai stabil și mai ușor de explicat.

### Alocarea lucrărilor — **decis: lipicioasă, cu revenire în pool**

Cele două variante evidente eșuează fiecare în alt fel, și amândouă eșuările sunt reale:

- **Pool liber, fiecare ia ce vrea:** nimeni nu rămâne fără răspuns, dar elevul primește
  răspunsuri de la mentori diferiți. La corectarea de eseuri asta doare — mentorul care
  ți-a corectat data trecută știe ce ai greșit atunci.
- **Alocare fixă pe mentor:** continuitate perfectă, dar dacă mentorul nu are timp,
  **elevii lui așteaptă la nesfârșit** și nimeni altcineva nu vede problema.

**Propunerea combină ce e bun din amândouă:**

1. Tichetul nou se **rezervă** pentru mentorul care a răspuns ultima dată acelui elev.
2. Rezervarea are **termen** (propunere: 8 ore lucrătoare). Mentorul are dreptul de
   primul refuz, nu proprietate pe elev.
3. La expirare, tichetul **cade singur în pool-ul comun**, vizibil pentru toți.
4. Orice corector liber îl poate lua din pool.
5. Un tichet nerevendicat după un al doilea prag urcă în capul listei și devine vizibil ca
   întârziat.

Continuitatea devine **implicită** — în cazul obișnuit răspunde același om — dar nu e
garantată cu prețul unui elev lăsat fără răspuns. Indisponibilitatea unui mentor nu mai e
o problemă tăcută: sistemul o rezolvă singur, prin trecerea timpului.

**De ce „tragere", nu „împingere":** nu putem forța disponibilitatea unor oameni care
corectează în timpul lor. Un round-robin care *atribuie* presupune că cel atribuit e
liber. Pool-ul din care se *ia* nu presupune nimic.

**Confirmat de Andrei pe 2026-09-03.** Sarcinile care decurg:

| Status | Sarcină | Cine | Branch | Note |
|---|---|---|---|---|
| ⬜ | Migrare: `mentor_rezervat_id`, `rezervat_pana`, `preluat_la` pe `tickets` | Andrei | `alocare-tichete` | Fără tabel de alocări. Expirarea e o comparație de timp la citire, nu un job de fundal |
| ⬜ | La creare, rezervă tichetul pentru ultimul mentor al elevului | Andrei | `alocare-tichete` | „Ultimul mentor" = autorul ultimului mesaj non-elev din firele acelui elev. Dacă nu există, tichetul intră direct în pool |
| ⬜ | `GET /api/tickets` întoarce **două** liste: rezervate mie + pool | Andrei | `alocare-tichete` | Un tichet cu `rezervat_pana` trecut apare în pool pentru toți, fără să fie nevoie să-l atingă cineva |
| ⬜ | `POST /api/tickets/[id]/preia` — preluare din pool | Andrei | `alocare-tichete` | Trebuie să fie **atomic**: doi mentori care apasă simultan, unul singur câștigă. Condiție pe `preluat_la IS NULL` în `UPDATE`, nu verificare-apoi-scriere |
| ⬜ | Marcarea tichetelor întârziate (al doilea prag) | Andrei | `alocare-tichete` | Sus în listă + vizibil ca întârziat. Fără el, un tichet pe care nu-l vrea nimeni stă în pool la nesfârșit — exact eșecul tăcut pe care modelul îl evită |
| ⬜ | UI mentor: „Ale mele" vs. „Disponibile" + buton Preia | Bogdan | — | Depinde de rutele de mai sus. **Blocat de reconectarea UI-ului de tichete** (Săpt. 9-10) |

**Praguri propuse, de calibrat pe date reale:** 8 ore lucrătoare pentru rezervare, 24 de ore
până la marcarea ca întârziat. Sunt puncte de pornire, nu cifre sfinte.

**Cost de implementare:** trei coloane pe `tickets` (`mentor_rezervat_id`,
`rezervat_pana`, `preluat_la`) și o interogare. Fără tabel de alocări, fără job de fundal —
expirarea e o comparație de timp la citire.

---

## Reguli Git (rezumat)

- **Niciodată pe `main` direct.** Branch nou pentru fiecare grup de sarcini.
- **Înainte de a începe o sarcină** → schimbă statusul în `🔄 În lucru` și adaugă-ți numele în Note.
- **La finalizare** → marchează `✅` și menționează branch-ul/PR-ul.
- **Dacă ești blocat** → marchează `❌` și explică în Note.
