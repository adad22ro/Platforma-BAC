# Jurnal de dezvoltare — Platformă BAC

> Adaugă o intrare la **sfârșitul fiecărei sesiuni de lucru**.
> Format: `## YYYY-MM-DD — Andrei / Bogdan`
> Fii scurt și concret: ce s-a făcut, ce decizii s-au luat, ce probleme au rămas deschise.

---

## 2026-08-10 — Bogdan (Sesiunea 6 frontend)

**Ce s-a făcut:**
- **Panel profesor — formular „Lecție nouă"** (`app/profesor/teacher-lessons.tsx`): select capitol (obligatoriu), titlu (obligatoriu), conținut (textarea monospace + buton **Previzualizare** care randează exact ca pagina de lecție — text simplu, `whitespace-pre-wrap`), link video opțional, checkbox publică-imediat → `POST /api/lessons`. `order_index` = la coada lecțiilor existente din capitol. Sub formular, lista lecțiilor capitolului selectat (badge Publicat/Draft, marcaj ▶ video), reîncărcată după creare.
- **Refactor:** capitolele se încarcă o singură dată, în `teacher-panel.tsx` (client), și se dau prin props la `TeacherChapters` + `TeacherLessons` — un capitol nou apare imediat în selectorul de capitol al lecției. Tipurile comune au ieșit în `app/profesor/types.ts`.
- Mesaje de eroare dedicate pe `400`/`403`; dacă nu există niciun capitol, formularul de lecție e înlocuit cu un îndemn să se creeze întâi un capitol.

**Verzi:** typecheck curat, 55/55 teste, lint doar cu warning-ul preexistent din `content-api.test.ts`, `npm run build` reușit.

**Verificat E2E în browser** (Chromium Playwright + CDP, cont `profesor+clerk_test@example.com`): selectorul de capitol populat (inclusiv draft-ul, marcat), lista lecțiilor capitolului se încarcă la selecție, previzualizarea păstrează rândurile goale și textul se regăsește la revenirea în editare, creare cu succes (lecție la `#2`, badge Publicat + marcaj video, formular resetat, listă reîncărcată), validări „Alege întâi capitolul." / „Titlul e obligatoriu.". Lecția apare în accordion-ul din `/dashboard` și se randează corect pe `/lectii/[id]` (buton video + cele două paragrafe). Lecția de test ștearsă după (`DELETE /api/lessons/[id]` → 204).

- **Fără CTA de upgrade pentru profesori:** butonul „Treci la Premium" de pe `/dashboard` și „Upgrade la Premium" de pe `/profil` se ascund pentru rolul `teacher` (are acces la conținut prin rol, nu prin abonament). Pe `/profil`, cardul de abonament arată „Profesor · activ" + „Ca profesor ai acces complet la conținut, fără abonament." Două teste noi (57/57). Verificat în browser cu contul de profesor.

**Rămas deschis:** `/upgrade` rămâne accesibil dacă un profesor intră direct pe URL — nu mai are cum să ajungă acolo dintr-un buton, dar ruta nu blochează rolul teacher. Urmează Săpt. 7-8 — teste grilă + progres.

---

## 2026-07-24 — Bogdan (Sesiunea 5 frontend)

**Ce s-a făcut:**
- **Panel profesor — formular „Capitol nou"** (`app/profesor/`):
  - `page.tsx` — rută nouă gated pe rol **teacher** din DB (`isTeacher`); elevii → redirect `/dashboard`.
  - `teacher-chapters.tsx` — formular client (titlu obligatoriu, descriere, checkbox gratuit, checkbox publică-imediat) → `POST /api/chapters`, cu stări succes/eroare + validare; plus listă live a capitolelor (badge Gratuit/Premium + Publicat/Draft).
  - `AppHeader` devine async: link „Profesor" afișat doar profesorilor (`getCurrentAppUser`/`isTeacher`).

**Verificat în browser** (Chromium personal): gating student (redirect + link ascuns + `POST → 403`); ca teacher — creare capitol cu succes + apariție în listă, validare submit gol. Pentru testul de teacher am promovat temporar contul de test la `teacher`, apoi am șters capitolul de test și am readus contul la `student` (fără urme în DB).

**Rămas deschis:** formular „Lecție nouă" cu editor text (`POST /api/lessons`) — următorul task din Săpt. 5-6.

**Verzi:** typecheck curat, 55/55 teste, lint doar cu warning-ul preexistent.

---

## 2026-07-24 — Bogdan (Sesiunea 4 frontend)

**Ce s-a făcut:**
- **Zona de conținut (capitole + lecții)** pe `/dashboard`:
  - `app/_components/chapters-browser.tsx` — accordion **client**: aduce capitolele din `GET /api/chapters` la mount, iar la expand aduce lecțiile din `GET /api/chapters/[id]/lessons` (cache per capitol). Badge Gratuit/Premium, lacăt 🔒 pe lecțiile blocate, fiecare lecție = link spre `/lectii/[id]`.
  - `app/lectii/[id]/` — pagină lecție (shell server + `LessonView` client): `200` → titlu + buton video + conținut (`whitespace-pre-wrap`); `402` → panou paywall „Conținut Premium" + buton upgrade; `404` → „nu a fost găsită".
  - **Decizie:** componentele consumă API-ul direct (care întoarce deja `locked` + `402`), deci gating-ul rămâne o singură sursă — acoperit de `content-api.test.ts`, fără duplicare și fără atingerea rutelor testate.
  - Placeholder-ul „Lecțiile tale" din `/dashboard` înlocuit cu `<ChaptersBrowser />`.
- **Buton de temă zi/noapte** pe toate paginile (lângă Profil în `AppHeader`, în grupul de acțiuni din `SiteHeader`):
  - `app/_components/theme-toggle.tsx` — `useSyncExternalStore` (fără setState-in-effect, fără mismatch de hidratare). Persistă alegerea în `localStorage`, sincronizează între tab-uri.
  - Dark mode mutat de pe `prefers-color-scheme` pe **strategie de clasă** (`.dark` pe `<html>`, `@custom-variant` în `globals.css`), ca butonul să poată suprascrie sistemul.
  - Script inline anti-flash în `layout.tsx` (aplică tema înainte de paint din `localStorage` sau preferința sistemului).

**Verificat în browser** (Chromium personal, cont de test free): accordion + badge-uri, lecție liberă cu conținut, paywall pe lecție premium (`402`), comutare temă + **persistență la reload** (dark & light, înainte și după hidratare) + la navigare între pagini. Date deja seedate în DB (capitol demo gratuit + capitol premium, câte 2 lecții).

**Rămas deschis:** componentele interne Clerk (`UserButton`/`UserProfile`/`SignIn`) au tematizarea lor — dacă vrem să urmeze exact tema noastră, de configurat `appearance` la Clerk. Prețul Premium de pe `/pricing` încă placeholder.

**Verzi:** typecheck curat, 55/55 teste, lint doar cu warning-ul preexistent (`content-api.test.ts:64`).

---

## 2026-07-15 — Bogdan (Sesiunea 3 frontend)

**Ce s-a făcut:**
- **Pagina de profil elev** (`app/profil/page.tsx`) — încheie Săpt. 3-4. Card cont (nume/email/rol) + card abonament (cu data de valabilitate pentru Premium, stare „anulat" + buton de reactivare pentru cancelled). Editarea contului (nume/email/parolă/securitate) e delegată lui `<UserProfile routing="hash" />` de la Clerk — nu reimplementăm un flux deja rezolvat
- Link „Profil" adăugat în `AppHeader`
- **6 teste noi** (`tests/profil.test.ts`) — total **57**
- Verificat vizual în browser: randare corectă, `<UserProfile />` se încarcă, zero erori
- **Dedup `/dashboard`:** scoase cardurile Abonament + Cont (identice cu cele de pe `/profil`); rămâne un CTA subțire „Treci la Premium" (doar pentru free) + bannerele Stripe + placeholder lecții

**Frontend Săpt. 1-4 = complet.** Urmează zona de conținut (capitole + lecții).

---

## 2026-07-15 — Bogdan (Sesiunea 2 frontend)

**Ce s-a făcut:**
- **Pagina `/dashboard`** (`app/dashboard/page.tsx`) — lipsea, deci fluxul de plată se termina în 404. Server component pe helperii existenți (`getCurrentAppUser`, `canAccessPremium`): card de abonament (Gratuit/Premium), card de cont (email + rol), placeholder pentru lecții
- **Butonul „Upgrade la Premium"** → `/upgrade` (apare doar pe cont gratuit). Verificat E2E: ajunge pe Stripe Checkout
- **Tratarea întoarcerii din Stripe** — `?checkout=success` și `?checkout=cancel`
- **`AppHeader`** (`app/_components/app-header.tsx`) — header pentru zona logată, cu `UserButton` (Clerk); distinct de `SiteHeader`-ul public
- **8 teste noi** (`tests/dashboard.test.ts`) — total **51**
- `app/layout.tsx` — `afterSignOutUrl="/"` mutat pe `ClerkProvider` (nu mai e prop pe `UserButton` în v7)
- **Bugfix: după autentificare rămâneai pe landing** (raportat de Bogdan). `<SignIn />` era fără props, iar `SIGN_IN_FALLBACK_REDIRECT_URL` e ignorat când Clerk are o pagină de proveniență. Fix: `forceRedirectUrl="/dashboard"` (`ERRORS.md` #018)
- `.env.example` — variabilele Clerk erau cele vechi (`AFTER_SIGN_IN_URL`), deprecate și ignorate în v7 → corectate la `*_FALLBACK_REDIRECT_URL`
- `ERRORS.md` #017 — de ce nu se poate autentifica un browser automatizat (Turnstile pe sign-up **și** sign-in, plus Google OAuth) și care e fluxul corect de verificare UI

**Notă proces:** branch `dashboard-elev`. lint + typecheck + test (51) verzi.

**Decizii luate:**
- **Cursa cu webhook-ul, tratată explicit:** după plată, Stripe redirectează imediat, dar abonamentul e activat de webhook câteva secunde mai târziu. Deci „success" + status încă `free` **nu e eroare** — pagina spune „se activează în câteva secunde", în loc să afișeze „Gratuit" cuiva care tocmai a plătit. La fel dacă rândul din `users` lipsește încă (webhook Clerk întârziat): mesaj de așteptare, nu eroare
- Testele folosesc helperii **reali** de gating (`canAccessPremium`), nu o reimplementare — doar sursa userului e mock-uită
- **Destinația după login se forțează în cod** (`forceRedirectUrl`), nu prin variabile de mediu de tip „fallback" — acelea cedează în fața paginii de proveniență, deci nu garantează nimic
- Verificare UI: autentificarea o face omul în fereastra Chromium (protecția anti-bot blochează automatizarea), agentul preia după login (vezi `ERRORS.md` #017)

**Probleme deschise / Next steps:**
- **Prețul Premium e încă placeholder** în `_components/pricing-plans.tsx` — de completat suma reală (sau de citit din Stripe la runtime)
- **Pagina de profil elev** — singura rămasă din Săpt. 3-4
- Urmează Săpt. 5-6: listă capitole (`GET /api/chapters`) + pagină lecție (`GET /api/lessons/[id]`, cu `402 premium_required`). Atenție: free vede lista completă de titluri (`locked: true`), doar conținutul e blocat
- `/dashboard` are un placeholder pentru lecții — de înlocuit când apare pagina de capitole
- De adăugat `DumnieGOD` în `.github/CODEOWNERS` (secțiunea de frontend e pregătită, dar comentată)

---

## 2026-07-13 — Bogdan (Sesiunea 1 frontend)

**Ce s-a făcut:**
- **Landing page** (`app/page.tsx`) — înlocuit boilerplate-ul `create-next-app`: hero + 3 features (lecții pe capitole, teste grilă, mentorat „Nu am înțeles")
- **Pagina `/pricing`** (`app/pricing/page.tsx`) — carduri Free/Premium + secțiune de întrebări frecvente, cu metadata proprie
- **Componente comune** (`app/_components/`): `SiteHeader` (server component, se adaptează la sesiune prin `auth()`), `SiteFooter`, `PricingPlans` (cardurile, generate dintr-un array — sursă unică de adevăr)
- `proxy.ts` — `/` și `/pricing` adăugate la rutele publice (vezi `ERRORS.md` #015)
- `app/layout.tsx` — metadata reală (title/description) în loc de „Create Next App"
- `app/globals.css` — fontul Geist se aplică efectiv pe `body` (era forțat Arial, care anula variabila)
- `ERRORS.md` #015 (404 pe landing din cauza middleware-ului) și #016 (GH007 la push)

**Notă proces:** branch `landing-si-pricing`, PR deschis. lint + typecheck verzi.

**Decizii luate:**
- **Tailwind curat, fără shadcn/ui** deocamdată — landing-ul și pricing-ul nu au nevoie de primitive complexe; decizia rămâne deschisă pentru zona de elev (formulare, dialoguri)
- **Prețurile doar pe `/pricing`**, nu și ca secțiune pe landing — o singură sursă, fără duplicare de conținut
- **Clerk**: `SignedIn`/`SignedOut` nu există în v7.5.12 → starea de autentificare se citește server-side cu `auth()` din `@clerk/nextjs/server` (mai curat pentru Server Components, fără flash la hidratare)
- Commit-uri cu adresa `noreply` de GitHub (config local pe repo), ca să nu se publice adresa personală

**Probleme deschise / Next steps:**
- **Prețul Premium e placeholder** în `_components/pricing-plans.tsx` — de completat suma reală (sau, mai robust, de citit prețul din Stripe la runtime ca să nu diveargă de ce se taxează efectiv)
- **`/dashboard` lipsește încă** — aici aterizează sign-up-ul free și succesul Stripe; momentan 404. Următoarea sarcină.
- Butonul „Upgrade" (→ `/upgrade`) și pagina de profil elev — de făcut, probabil în `/dashboard`
- Săpt. 5-6 deblocate pe frontend: API-urile de capitole/lecții există (`GET /api/chapters`, `GET /api/lessons/[id]`). Atenție la modelul de produs stabilit în Sesiunea 13: free vede **lista completă** de capitole/lecții (titluri), conținutul e blocat (`locked: true`); paywall-ul real e pe `GET /api/lessons/[id]` (`402`)
- De adăugat handle-ul meu de GitHub (`DumnieGOD`) în `.github/CODEOWNERS` — secțiunea de frontend e pregătită, dar comentată (vezi Sesiunea 10)

---

## 2026-07-01 — Andrei (Sesiunea 15)

**Ce s-a făcut (curs-manual intern):**
- Generat un **curs-manual** non-tehnic al proiectului (Artifact 🎓) din codul real, folosind unealta reutilizabilă `docs/_curs-prompt.md` + `docs/_curs-template.html` (mutate din rădăcină în `docs/`)
- **Găzduire privată în app:** planul Claude e Pro (fără share de artifact), deci cursul e servit la **`/admin/curs`**, gated pe `ADMIN_EMAILS` (Andrei + Bogdan) — vizibil doar lor, nu public. `app/admin/curs/curs.html` (HTML standalone) servit de `app/admin/curs/route.ts` (`requireAdmin`), inclus în bundle prin `outputFileTracingIncludes`. Link din panoul `/admin`
- Document viu: la schimbări notabile, actualizezi `curs.html` (redeploy) și/sau republici Artifact-ul la același URL

**Notă proces:** branch `docs-curs-manual`. lint + typecheck + test (43) + build verzi.

---

## 2026-07-01 — Andrei (Sesiunea 14)

**Ce s-a făcut (sincronizare documentație după tot ce s-a livrat):**
- **`docs/auth.md`** rescris — era încă „roluri planificate" / `elev`/`profesor` / „de completat Săpt 3-4". Acum: roluri reale (`student`/`teacher`, sursă `users.role`), sync via webhook Clerk, gating premium (`canAccessPremium` + `end_date`), protejare rute (`proxy.ts` + rute publice + allowlist admin)
- **`README.md`** — din boilerplate `create-next-app` în README real: stack, setup, scripturi, reguli de colaborare, index de documentație
- **`docs/api.md`** — adăugat `GET /api/health`; data actualizată
- **`TASKS.md`** — stare generală actualizată (backend Săpt 3-6 complet); rânduri noi: teste (43), `/api/health`, security review

**Notă proces:** lucrat pe branch `docs-sync-s13` (nu direct pe `main`)

---

## 2026-07-01 — Andrei (Sesiunea 13)

**Ce s-a făcut (#1 din setul teste/health/security — teste pe conținut + gating):**
- **21 teste noi** pe logica ce păzește conținutul plătit (era netestată): `tests/content-api.test.ts` (rute chapters/lessons — filtrare `published`, scriere doar `teacher` → 403, validări → 400, FK 23503, gating premium → 402/200) + `tests/current-user.test.ts` (`isTeacher`/`canAccessPremium`/`getCurrentAppUser`)
- Mock flexibil pentru query builder-ul Supabase (lanț chainable, rezultat per-tabel, verifică `.eq('published', true)`); `getCurrentAppUser` mock-uit, `isTeacher`/`canAccessPremium` reale
- Total teste: **37** (16 → 37). lint + typecheck + build verzi. Docs: `docs/testing.md`

**#3 — `/api/health`:** rută publică (`proxy.ts`) care verifică Supabase (critic → 503) + Stripe (informativ → 200 „degraded"). Răspuns `{ status, checks, timestamp }`, no-cache. Testată (`tests/health.test.ts`, 3 teste → total **40**). Docs: `monitoring.md`. De legat la un uptime monitor extern când apar useri.

**#4 — security review pe plăți/auth/conținut:** cod curat, fără vulnerabilități critice. Aplicat hardening + aliniat gating-ul la modelul de produs:
- **#1** `/api/health` public amplifica apeluri externe → cache scurt (15s) al rezultatului
- **#2** gating premium ignora `subscription_end_date` → `canAccessPremium` cere acum și `end_date` în viitor (apărare în adâncime, webhook de anulare pierdut); adăugat `subscription_end_date` în `AppUser` + select
- **#3** allowlist admin folosea `emailAddresses[0]` → acum `primaryEmailAddress` (`set-role` + `admin.ts`)
- **Model produs (clarificat de Andrei):** userul free vede **lista completă** de capitole + lecții (titluri); conținutul e blocat. `GET /api/chapters/[id]/lessons` nu mai dă `402` pe listă — întoarce titlurile cu `content`/`video_url` = null + `locked: true`; paywall-ul real (mesaj + buton) e pe `GET /api/lessons/[id]` (`402`). Docs: `api.md`
- Note necorectate (prioritate mică): fără rate limiting pe checkout/scrieri; `error_logs.context` poate stoca PII (admin-only)
- Teste actualizate: **43** total. lint + typecheck + build verzi

---

## 2026-07-01 — Andrei (Sesiunea 12)

**Ce s-a făcut (rezolvat cele 7 PR-uri Dependabot):**
- Dependabot (activat în S10) a deschis 7 PR-uri la prima rulare. Rezolvate local, dintr-o dată (fără merge individual pe fiecare — landează în `main` odată cu branch-ul, Dependabot își închide singur PR-urile)
- **Aplicate (6):** grup minor/patch (`@clerk/nextjs` 7.5.11, `@supabase/supabase-js` 2.110.0, `react`/`react-dom` 19.2.7, `tailwindcss` 4.3.2); `@types/node` 26; `vitest` 4.1.9; `typescript` 6.0.3; GitHub Actions `checkout@v7` + `setup-node@v6`
- **Blocat (1): `eslint` 9→10.** Incompatibil cu `eslint-plugin-react` adus de `eslint-config-next@16.2.9` (folosește `context.getFilename()`, eliminat în ESLint 10 → crash la lint). Ținut pe `eslint@9.39.4`; adăugat `ignore` pe major-ul de eslint în `dependabot.yml` (de reevaluat când `eslint-config-next` suportă ESLint 10)
- Verificat integral: **lint · typecheck · test (16/16) · build** — toate verzi cu major-urile aplicate

**Decizii luate:**
- Major-urile Dependabot NU se merge-uiesc orbește — testate local împreună; eslint 10 e exemplul de „peer dep zice OK, dar în practică crapă"
- Rezolvare prin branch local (nu 7 merge-uri separate) — un singur set de verificări, istoric curat

**Probleme deschise / Next steps:**
- Când `eslint-config-next` suportă ESLint 10, scoate `ignore`-ul din `dependabot.yml` și bump

---

## 2026-07-01 — Andrei (Sesiunea 11)

**Ce s-a făcut (Supabase CLI):**
- **CLI configurat** — `supabase init` (config.toml comis), `login` + `link` la proiectul de producție (`ymupksngisqzlpqklntq`)
- **`npm run db:types` funcțional** — a scos la iveală **drift** între baseline-ul scris de mână și prod: `users.updated_at` lipsea, `clerk_id` e NOT NULL (era nullable), `id` fără default (app-ul îl setează explicit). `types/database.ts` = acum generat din schema reală; baseline aliniat
- **Producția marcată „migrare aplicată"** — `supabase migration repair --status applied 20260701120000`; `migration list` arată Local = Remote (în sync). `db push` viitor aplică doar migrări noi
- Notă: `supabase db dump` (baseline perfect) necesită Docker Desktop — indisponibil; baseline-ul rămâne best-effort aliniat cu tipurile generate

**Decizii luate:**
- `migration repair` (nu `db push`) pe baseline — schema există deja în prod; înregistrăm versiunea fără să rulăm SQL peste ea
- Comenzile care scriu în DB prod le rulează omul (Andrei), nu agentul — guardrail

**Flux de schemă de acum:** fișier nou în `supabase/migrations/` → `npx supabase db push` → `npm run db:types` → commit.

---

## 2026-07-01 — Andrei (Sesiunea 10)

**Ce s-a făcut (Tier 3 — igienă de echipă):**
- **PR template** (`.github/pull_request_template.md`) — checklist cu convențiile proiectului (branch nu pe `main`, lint/typecheck/test, DEVLOG/TASKS/ERRORS, env în `lib/env.ts`, migrări DB)
- **Dependabot** (`.github/dependabot.yml`) — PR-uri săptămânale de update npm (minor/patch grupate) + github-actions; CI le validează
- **CODEOWNERS** (`.github/CODEOWNERS`) — `@adad22ro` owner global + explicit pe backend/infra; secțiunea de frontend (Bogdan) pregătită, comentată — de decomentat cu handle-ul lui real când e disponibil

**Probleme deschise / Next steps:**
- Adaugă handle-ul GitHub al lui Bogdan în CODEOWNERS (repo → Settings → Collaborators)
- Planul de tooling e complet (Tier 1-3). Bottleneck-ul real rămâne frontend-ul (Bogdan)

---

## 2026-07-01 — Andrei (Sesiunea 9)

**Ce s-a făcut (Tier 2 unelte — schema DB reproductibilă + tipuri):**
- **Migrări versionate** — folder `supabase/migrations/` cu `20260701120000_baseline.sql`: schema completă a producției ca „squash" idempotent (`if not exists` / `drop ... if exists`), sigur de rulat peste baza existentă. Schema nu mai trăiește ca SQL în proză prin `docs/database.md` (acum descriptiv) — sursa de adevăr e folderul de migrări. Ghid: `supabase/README.md`
- **Tipuri Supabase** — `types/database.ts` (format compatibil `supabase gen types`) cablat în ambii clienți (`createClient<Database>`). Query-urile sunt acum tipate; eliminat cast-urile `as UserRow` / `as LogRow` din cardurile `/admin` (tipurile derivate din schema generată, fără drift)
- **Ajustări cerute de tipare** (bug-uri latente prinse de tipuri): `update()` în `chapters/[id]` și `lessons/[id]` tipat cu `...['Update']`; `context` în `log-error` cast la `Json`
- **Script `npm run db:types`** (regenerare via `npx supabase ... --linked`); `.gitignore` pentru fișierele locale ale CLI-ului; docs actualizate (`database.md`, `architecture.md`)

**Decizii luate:**
- Adoptare migrări pe bază existentă = un baseline idempotent (squash), nu reconstituirea istoricului real — mai onest și sigur. Migrările viitoare = fișiere noi, cu timestamp mai mare
- Tipuri scrise de mână acum (corecte față de schemă) + script de regenerare — beneficiul e imediat, fără să blocheze pe setup-ul CLI (login + link, doar la nevoie)

**Probleme deschise / Next steps:**
- Setup unic Supabase CLI (`init` + `link`) rămâne opțional, doar dacă vrei `db push` / `db:types` automat
- Tier 3 (rămas din discuție): PR template + CODEOWNERS, Dependabot

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
