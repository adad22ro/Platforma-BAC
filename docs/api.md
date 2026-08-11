# Rute API

> Actualizat la: 2026-07-01

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

### Teste grilă și progres

| Rută | Metodă | Scop | Acces |
|---|---|---|---|
| `/api/chapters/[id]/questions` | GET | testul capitolului (întrebări + variante) | elev: publicate + acces la capitol |
| `/api/chapters/[id]/submit` | POST | trimite răspunsurile → corectare + scor | orice user logat cu acces la capitol |
| `/api/questions` | POST | creează întrebare **cu** variantele ei | teacher |
| `/api/questions/[id]` | GET | întrebarea cu variantele, inclusiv `is_correct` | teacher |
| `/api/questions/[id]` | PATCH | actualizează enunțul/metadatele | teacher |
| `/api/questions/[id]` | DELETE | șterge (cascade variante) | teacher |
| `/api/progress` | GET | progresul **propriu** al elevului, pe capitole | orice user logat |

**Regula de aur:** `is_correct` pleacă spre client **doar** prin `GET /api/questions/[id]`
(rută de profesor). `GET /api/chapters/[id]/questions` nici măcar nu selectează coloana.
Corectarea se face exclusiv server-side în `submit` — un scor trimis de client e ignorat.

**`POST /api/chapters/[id]/questions` nu există intenționat:** întrebarea și variantele
se creează împreună (`POST /api/questions`), pentru că o întrebare fără variante ar strica
testul. Validare: minim 2 variante, **exact una** corectă. Dacă inserarea variantelor
eșuează, întrebarea deja creată e ștearsă (fără întrebări orfane).

**Gating:** identic cu lecțiile, prin `lib/chapter-access.ts` (`404` capitol inexistent
sau draft · `402` `{ error: "premium_required" }` la capitol premium fără abonament).

**Formatul cererii de submit:**
```json
{ "answers": [{ "question_id": "...", "answer_id": "..." }] }
```
Răspuns: `{ score, total, saved, results: [{ question_id, chosen_answer_id,
correct_answer_id, correct, explanation }] }`.
- O întrebare fără răspuns corect în DB (date incomplete) se punctează **greșit**, nu corect.
- `saved: false` = scorul e valid, dar progresul nu s-a înregistrat (profesor, sau eroare
  de scriere — nu ascundem rezultatul elevului pentru o eroare de salvare).
- Progresul e o linie per `(elev, capitol)`: reîncercarea face upsert și incrementează `attempts`.

Date placeholder: `npm run seed:questions` (6 întrebări × 4 variante per capitol, idempotent).

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

### GET /api/health
Scop: sondă de sănătate pentru monitorizare uptime. Rută publică (fără login).

Response:
- 200: `{ status: "ok" | "degraded", checks: { database, stripe }, timestamp }`
- 503: `{ status: "down", ... }` — Supabase inaccesibil (critic)

`database` e critic (jos → 503); `stripe` e informativ (jos, dar DB ok → 200 „degraded").
Rezultatul e cache-uit ~15s. Detalii în `docs/monitoring.md`.

---

## Tichete de mentorat — contract convenit (Săpt. 9-10)

⚠️ **Neimplementat încă** (backend: Andrei). Butonul „Nu am înțeles"
(`app/_components/help-button.tsx`, folosit în `/lectii/[id]` și `/teste/[chapterId]`)
e deja scris pe această formă.

### POST /api/tickets
Scop: elevul trimite o întrebare către profesor, cu contextul completat automat
din pagină (nu-l scrie el).

Request:
```jsonc
{
  "message": "string, 1-1000 caractere",
  "context": {
    "source": "lesson" | "quiz",   // din ce ecran a venit
    "chapter_id": "uuid?",
    "chapter_title": "string?",
    "lesson_id": "uuid?",
    "lesson_title": "string?",
    "question_id": "uuid?",        // doar la source=quiz, dacă e legat de o întrebare
    "question_text": "string?"
  }
}
```

Response:
- 201: `{ ticket: { id, created_at } }`
- 400: mesaj gol / prea lung / context invalid
- 401: neautentificat
- 429: prea multe tichete deschise (limită anti-spam — UI-ul afișează deja mesajul)

Note pentru implementare:
- Titlurile din `context` sunt trimise de client **doar pentru afișare**; sursa de adevăr
  rămân `chapter_id` / `lesson_id` / `question_id`, care se re-rezolvă pe server.
- UI-ul promite elevului **răspuns în cel mult 24h** și **notificare pe email** — de
  respectat în rândurile corespunzătoare din TASKS.md.

### GET /api/tickets
Scop: lista de tichete. **Profesor** → toate tichetele; **elev** → doar ale lui.
Folosită de secțiunea „Tichete" din `/profesor` (`app/profesor/teacher-tickets.tsx`).

Response:
- 200: `{ tickets: [{ id, message, status: "open" | "answered", created_at,
  student_name: string | null, student_email, chapter_id, chapter_title,
  lesson_id, lesson_title, question_id, question_text,
  answer: string | null, answered_at: string | null }] }`
  (câmpurile de context pot fi `null` — lecția/întrebarea pot fi șterse ulterior;
  UI-ul grupează tichetele fără capitol într-o grupă „Fără capitol")
- 401: neautentificat

Gruparea pe capitol și ordonarea (capitolele în ordinea din curs, tichetele noi
întâi) se fac în client — API-ul poate întoarce lista plată.

### POST /api/tickets/[id]/answer
Scop: profesorul răspunde la un tichet. Doar `teacher`.

Request: `{ answer: string }` (1-2000 caractere)

Response:
- 200: `{ ticket: { id, answer, answered_at, status: "answered" } }`
- 400: răspuns gol / prea lung · 403: neprofesor · 404: tichet inexistent
- 409: tichetul are deja răspuns (UI-ul cere reîmprospătarea paginii)

Efect secundar așteptat: trimite emailul de notificare către elev (sarcină separată
în TASKS.md). UI-ul îi promite deja elevului notificare pe email.
