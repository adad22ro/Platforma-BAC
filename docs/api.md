# Rute API

> Actualizat la: 2026-08-12

## Formatul erorilor

Toate rutele întorc erorile în aceeași formă JSON, prin `apiError()` din
[`lib/api-error.ts`](../lib/api-error.ts):

```jsonc
{ "error": "forbidden", "message": "Forbidden" }   // `message` e opțional
```

| Status | `error` |
|---|---|
| 400 | `bad_request` |
| 401 | `unauthorized` |
| 402 | `premium_required` |
| 403 | `forbidden` |
| 404 | `not_found` |
| 409 | `conflict` |
| 429 | `rate_limited` |
| 500 | `server_error` |

Trei reguli:

1. **Clientul se uită la `error`, nu la `message`.** `message` e pentru dezvoltator și
   pentru log-uri; nu se traduce și nu se afișează utilizatorului.
2. **`error` e string la nivelul de sus**, nu obiect imbricat — ca să fie superset peste
   singurul corp de eroare care exista deja, `{ error: "premium_required" }` de la 402.
   Nimic din ce funcționa nu s-a stricat.
3. **Webhook-urile fac excepție** (`/api/webhooks/*`): răspund unor servicii externe
   (Stripe, Clerk), care așteaptă text simplu și un 2xx. Nu se ating.

**De ce există:** rutele întorceau text simplu (`new Response('Forbidden', …)`).
Frontendul web se descurcă fiindcă se uită doar la codul HTTP, dar un al doilea client —
o aplicație mobilă — are nevoie de un cod stabil pe care să-l mapeze la un mesaj tradus.
Cât există un singur client, normalizarea e ieftină; cu doi devine schimbare cu ruptură
în ambele.

Răspunsurile `204 No Content` (DELETE) rămân fără corp, cum se cuvine.

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
| `/api/questions/[id]/answers` | PUT | **înlocuiește tot setul** de variante | teacher |
| `/api/progress` | GET | progresul **propriu** al elevului, pe capitole | orice user logat |
| `/api/tags` | GET | vocabularul de etichete (`?axis=`, `?profile=uman`) | orice user logat |
| `/api/greseli` | GET | întrebările la care elevul stă prost **acum** (`?chapter_id=`) | orice user logat, **doar ale lui** |
| `/api/questions/dificultate` | GET | % elevi care greșesc, per întrebare (`?chapter_id=`) | teacher |
| `/api/recapitulare` | GET | conceptele scadente pentru recapitulare (`?limit=`) | orice user logat, **doar ale lui** |

**Două semantici care par evidente și nu sunt** — definite în vederi SQL, nu în rute,
ca să nu fie reinterpretate diferit:

- **`/api/greseli` = starea curentă, nu istoricul.** Se ia **ultimul** răspuns per
  întrebare (`latest_answer_per_question`) și se păstrează doar cele greșite. Dacă
  elevul a greșit, a înțeles și a nimerit data următoare, întrebarea **iese** din listă
  — altfel lista crește la nesfârșit și descurajează exact elevul care progresează.
- **`/api/questions/dificultate` se calculează pe PRIMA întâlnire** a fiecărui elev cu
  întrebarea (`question_difficulty`), nu pe toate răspunsurile: reluările de test umflă
  rata de succes și fac întrebarea să pară mai ușoară decât e. `students` numără elevi
  distincți — un elev, un vot.
  `wrong_pct` e **`null`**, nu `0`, pentru o întrebare pe care n-a încercat-o nimeni:
  „n-a încercat-o nimeni" și „n-a greșit-o nimeni" sunt lucruri opuse.

**Etichetele au vocabular închis.** Nu există `POST /api/tags`: o etichetă nouă se adaugă
printr-o **migrare**, revizuită la PR. `POST /api/questions` acceptă `tags: ["slug", …]`,
le rezolvă la id-uri **înainte** de a scrie ceva și întoarce **400** la un slug necunoscut,
în loc să creeze eticheta din mers.

Bariera e intenționată: cu vocabular liber, „perspectiva narativa" și „perspectivă
narativă" ar deveni două concepte diferite, tăcut. Stăpânirea elevului s-ar împărți în
două, FSRS ar programa două lucruri în loc de unul, și nimeni n-ar observa — n-ar fi o
eroare, doar un număr ușor greșit.

**Regula de aur:** `is_correct` pleacă spre client **doar** prin `GET /api/questions/[id]`
(rută de profesor). `GET /api/chapters/[id]/questions` nici măcar nu selectează coloana.
Corectarea se face exclusiv server-side în `submit` — un scor trimis de client e ignorat.

**Aceeași regulă pentru `answers.explanation`** (explicația per variantă): un text de forma
„varianta asta e greșită pentru că…" dezvăluie răspunsul corect la fel de sigur ca
`is_correct`. Nu se selectează în `GET /api/chapters/[id]/questions`; se întoarce din
`submit`, după ce elevul a răspuns, și **doar pentru varianta pe care a ales-o el**.

**Editarea variantelor e înlocuire completă, nu PATCH pe variante individuale:**
invariantul „exact un răspuns corect" nu poate fi menținut dacă variantele se editează
una câte una — între două cereri întrebarea ar avea zero sau două răspunsuri corecte.
`PUT` validează setul nou **întreg** înainte să atingă DB-ul. Cum `supabase-js` nu oferă
tranzacții, setul vechi e păstrat în memorie și repus dacă inserarea celui nou eșuează;
dacă nici restaurarea nu reușește, se loghează `critical` (alertă Discord) — întrebarea
a rămas fără variante și trebuie reparată manual.

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
correct_answer_id, correct, explanation, chosen_explanation }] }`.
- `explanation` = de ce răspunsul corect e corect (de pe întrebare).
  `chosen_explanation` = de ce e greșit exact ce a ales elevul (de pe varianta lui).
  `null` dacă n-a răspuns sau dacă varianta n-are explicație scrisă.
- O întrebare fără răspuns corect în DB (date incomplete) se punctează **greșit**, nu corect.
- Fiecare răspuns se scrie și în `answer_events` (jurnal append-only, sursa de adevăr),
  **înainte** de `student_progress`. O eroare acolo se loghează dar nu ascunde scorul.
  Profesorul nu generează evenimente.
- `saved: false` = scorul e valid, dar progresul nu s-a înregistrat (profesor, sau eroare
  de scriere — nu ascundem rezultatul elevului pentru o eroare de salvare).
- Progresul e o linie per `(elev, capitol)`: reîncercarea face upsert și incrementează `attempts`.

Date placeholder: `npm run seed:questions` (6 întrebări × 4 variante per capitol, idempotent).

### Mentorat — tichete

| Rută | Metodă | Scop | Acces |
|---|---|---|---|
| `/api/tickets` | GET | listă tichete, ordonate după ultima activitate | elev: **doar ale lui** · profesor: toate (`?status=`, `?chapter_id=`, `?lesson_id=`) |
| `/api/tickets` | POST | elevul deschide un tichet **din fereastra lecției** | orice user logat |
| `/api/tickets/[id]` | GET | tichetul **cu firul de mesaje** | autorul sau profesor |
| `/api/tickets/[id]` | PATCH | închide / redeschide (`{ status }`) | autorul sau profesor |
| `/api/tickets/[id]/messages` | POST | adaugă un mesaj în fir | autorul sau profesor |
| `/api/tickets/[id]/preia` | POST | corectorul ia tichetul din pool | profesor sau mentor (`403` pentru elev) |

**Corp cerere (creare):** `{ lesson_id, message, selection?, scroll_percent? }` —
`lesson_id` și `message` obligatorii (max 2000 caractere), `selection` max 1000,
`scroll_percent` 0-100. **Corp mesaj:** `{ body }`, max 5000.

**Discuția e un fir, nu o pereche întrebare/răspuns** (`ticket_messages`): elevul poate
reveni cu „tot nu am înțeles", profesorul poate cere lămuriri. Statusul urmează ultimul
vorbitor — mesaj de profesor → `answered`, revenire a elevului → `open`, deci tichetul
reintră în coadă. `author_role` e înghețat la momentul scrierii: dacă un elev devine
profesor, mesajele lui vechi nu devin retroactiv răspunsuri oficiale.

**Contextul pe care îl vede profesorul** se captează la creare, aproape tot **pe server**:

| Câmp | De unde vine |
|---|---|
| `lesson_id`, `chapter_id`, `lesson_title` | din DB, după `lesson_id` — nu din ce declară clientul |
| `progress_score` / `_total` / `_attempts` | din `student_progress`, **înghețat** la momentul întrebării |
| `selection`, `scroll_percent` | de la client — singurele lucruri pe care serverul n-are de unde să le știe |

> `lesson_title` e snapshot pentru că `lesson_id` e `ON DELETE SET NULL`: după ștergerea
> lecției, tichetul ar rămâne altfel fără niciun indiciu despre subiect. La fel, progresul
> e înghețat pentru că profesorul trebuie să vadă cum stătea elevul **când a întrebat**,
> nu cum stă când citește.

**Trei reguli de autorizare care contează:**
- Elevul e legat de `user.id` din sesiune; un `user_id` trimis în query string e ignorat.
- Contextul se derivă din DB: dacă vine `lesson_id`, capitolul se ia din lecție, nu din
  ce declară clientul.
- Nu poți deschide tichet despre conținut la care n-ai acces (`404` draft / `402` premium)
  — altfel tichetul devine o cale laterală de a afla ce e acolo.
- Un tichet străin dă **`404`, nu `403`** — nu confirmăm că există.

**Stări:** `open` ⇄ `answered` (automat, după cine a scris ultimul mesaj), plus `closed`
prin `PATCH`. Prin PATCH se pot seta **doar** `closed` și `open` — `answered` nu e o stare
pe care o alege cineva manual, ea rezultă din faptul că profesorul a scris în fir. Altfel
un tichet ar putea apărea „răspuns" fără niciun răspuns.



### Paginare

Rutele de listă care cresc cu folosirea aplicației acceptă `?limit=` (implicit **50**,
maxim **100**) și `?offset=`, și întorc un obiect `meta` alături de listă:

```json
{ "mistakes": [...], "meta": { "limit": 50, "offset": 0, "has_more": true } }
```

`has_more` vine dintr-un rând cerut în plus, nu dintr-un `COUNT` separat — altfel
fiecare pagină ar fi costat încă o interogare peste tot tabelul, pentru un număr pe care
interfața nu-l afișează. Valorile invalide (`?limit=abc`, negative, zero) cad pe implicite
în loc să dea `400`: e o greșeală de client, nu un motiv să refuzi datele.

`limit` + `offset`, nu cursor. Cursorul e mai corect sub inserări concurente, dar cere o
cheie de ordonare stabilă expusă în răspuns — un contract mai greu de consumat, pentru un
câștig care apare la milioane de rânduri, nu la mii.

**Rute paginate:** `/api/tickets` (fiecare din cele trei liste separat, cu `meta`,
`alemele_meta`, `pool_meta`), `/api/greseli`.

> **Contract aditiv.** `meta` se adaugă lângă listă; cine ignoră câmpul primește exact ce
> primea înainte, dar cel mult 50 de rânduri. Asta contează dincolo de web: o aplicație
> mobilă publicată nu poate fi forțată să se actualizeze, deci `/api/*` devine un contract
> pe care nu-l mai poți schimba unilateral — vezi rândul de versionare din `TASKS.md`.

**`/api/questions/dificultate` NU e paginat**, deliberat. Ordonarea „cele mai greșite
întâi" vine dintr-o a doua interogare (`question_difficulty`), iar întrebările neîncercate
de nimeni lipsesc din ea și trebuie totuși afișate. Paginarea peste tabelul de întrebări
și sortarea *paginii* ar fi produs o ordine falsă — primele 50 după `id`, sortate între
ele — adică exact genul de listă care arată corect și minte. Corect se rezolvă cu o vedere
care face `left join` în SQL; e rând separat în TASKS.

#
## Lucrări și corectare

| Rută | Verb | Ce face | Cine |
|---|---|---|---|
| `/api/lucrari` | GET | lista lucrărilor (paginată, **fără text**) | elev: ale lui · corector: toate |
| `/api/lucrari` | POST | trimite o lucrare și primește corectarea automată | orice user logat |
| `/api/lucrari/[id]` | GET | lucrarea cu textul și toate notele | autorul sau un corector |

**Corp cerere (creare):** `{ rubrica_slug, text, text_suport?, chapter_id? }`. `text` max
20.000 de caractere, la fel `text_suport`.

### Versiunea de barem se îngheață pe lucrare

Baremul e versionat. La creare se reține `barem_version_id` — versiunea **activă** în acel
moment — plus `barem_rubrica_id` și `rubrica_slug`. Fără asta, o lucrare notată azi s-ar
raporta tăcut la criterii schimbate sub ea la următorul import de barem, iar notele vechi
ar deveni de neînțeles fără să se plângă nimeni.

`rubrica_slug` e copiat separat pentru că e stabil între versiuni: statistici pe el
traversează versiunile fără join prin trei tabele.

### O notă per criteriu ȘI per autor

`note_criterii` are index unic pe `(lucrare_id, criteriu_slug, sursa)`, unde `sursa` e
`auto` · `ai` · `mentor` · `elev` (autoevaluare).

Același criteriu poate avea deci mai multe note, care coexistă: elevul își dă 2, verificarea
automată zice 1, mentorul dă 2. **Diferența dintre ele e lucrul care îl învață pe elev să se
autoevalueze** — de aceea nu se suprascriu.

Indexul face și reluarea corectării automate idempotentă: se rescrie rândul lui `auto`, fără
să atingă nota mentorului.

### Ce intră în total și ce nu

`GET /api/lucrari/[id]` întoarce `total: { puncte, din, in_asteptare }`.

Totalul se calculează **doar** din `auto` și `mentor`. Autoevaluarea elevului e un exercițiu,
nu o notă — dacă ar intra în total, elevul și-ar putea da singur punctajul. Pre-notarea AI e
acolo ca să scurteze munca mentorului, nu ca să i-o ia.

`in_asteptare` numără punctele criteriilor încă nenotate (unealta n-a răspuns, sau e treaba
mentorului), afișate **separat**, ca elevul să nu creadă că le-a pierdut.

### `puncte = null` nu înseamnă zero

O notă are `stare`: `acordat` (are punctaj), `indisponibil` (criteriu automatizabil, dar
unealta n-a răspuns), `nenotat` (așteaptă AI sau mentor). Doar `acordat` are `puncte`; o
constrângere în bază garantează că cele două nu se pot despărți.

> **Regula care guvernează toată corectarea automată:** mai bine „nu pot verifica" decât 0.
> Un 0 nemeritat, dat tăcut fiindcă o unealtă lipsea, e mai rău decât un criteriu lăsat
> nenotat — elevul crede că a greșit ceva ce de fapt nu s-a măsurat. De aceea, când
> LanguageTool nu răspunde, criteriile de limbă rămân `indisponibil`.

### Corectarea nu poate pierde textul elevului

Salvarea lucrării și corectarea sunt **pași separați**. Dacă notarea eșuează, lucrarea rămâne
și ruta întoarce `201` cu `corectare: null` și un `avertisment`. Textul scris de un elev e
munca lui; o unealtă care nu răspunde n-are voie s-o arunce.

---

## Alocarea tichetelor — lipicioasă, cu revenire în pool

Tichetul nou se **rezervă** pentru ultimul om care i-a răspuns elevului (autorul ultimului
mesaj non-elev din firele lui). Rezervarea are termen: **8 ore**. La expirare tichetul cade
singur în pool-ul comun și îl poate lua orice corector. După **24 de ore** nepreluat e
marcat `intarziat` și urcă în capul cozii.

Trei coloane pe `tickets` (`mentor_rezervat_id`, `rezervat_pana`, `preluat_la`), fără tabel
de alocări și **fără job de fundal**: expirarea e o comparație de timp la citire. Un job
care „eliberează" rezervări ar fi a doua sursă de adevăr peste ceas — dacă nu rulează,
tichetele rămân blocate tăcut.

**`GET /api/tickets` pentru corectori** întoarce, pe lângă `tickets` (neschimbat), două
liste derivate:

| Cheie | Conținut |
|---|---|
| `alemele` | rezervate pentru mine și încă valabile, sau preluate de mine |
| `pool` | nerevendicate și nedeschise — cel mai vechi primul (FIFO) |

Cele trei liste se cer **separat din DB**, fiecare cu paginarea ei. Filtrarea în memorie
ar fi fost corectă doar cât timp răspunsul conținea toate tichetele: pe o pagină de 50, un
`pool` derivat din ea ar fi însemnat „ce s-a nimerit în primele 50 după ultima activitate".

Ordonarea `pool`-ului după `created_at` crescător acoperă și cerința „întârziatele în cap":
`intarziat` înseamnă exact „mai vechi de 24 de ore", deci e o funcție monotonă de
`created_at`. O a doua cheie de sortare ar fi produs aceeași ordine cu mai multă muncă.

Fiecare tichet primește și `intarziat: boolean`. Pentru elev răspunsul e neschimbat: doar
`tickets`. `tickets` a rămas intenționat cum era — câmpurile noi se adaugă lângă el, nu în
locul lui.

**`POST /api/tickets/[id]/preia`** e o singură scriere condiționată:

```sql
update tickets set mentor_rezervat_id = :eu, preluat_la = now(), rezervat_pana = null
where id = :id and preluat_la is null
```

Doi mentori care apasă în aceeași secundă: al doilea `UPDATE` atinge zero rânduri și
primește **`409`**. Nu există fereastră între verificare și scriere, fiindcă nu există
verificare separată. Citirea de dinainte servește doar mesajului de eroare.

Codurile: `403` elev · `404` inexistent · `409` închis, luat de altcineva, sau cursă
pierdută · `200` preluat. **Propria rezervare se poate prelua** — asta *este* exercitarea
dreptului de prim refuz, și o transformă din termen care curge în revendicare fermă.

> **Praguri de calibrat pe date reale.** Decizia spunea „8 ore lucrătoare"; implementarea
> folosește 8 ore de ceas. Orele lucrătoare ar fi cerut un calendar (weekenduri, sărbători,
> fusul fiecărui mentor) pentru un câștig inexistent: expirarea nu ia nimic nimănui, doar
> face tichetul vizibil și pentru alții. Un tichet care cade în pool sâmbătă dimineața e
> exact ce vrem — elevul nu așteaptă până luni.

> **Neimplementat încă:** notificarea pe email a elevului la primirea răspunsului —
> nu există serviciu de email configurat. Când va exista, se trimite din
> `POST /api/tickets/[id]/messages` (doar la mesaj de profesor), **după** scrierea în DB
> și fără să blocheze răspunsul: un email nelivrat nu trebuie să piardă munca profesorului.
> Locul exact e marcat cu comentariu în rută.

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

## Tichete de mentorat — contract vechi (înlocuit)

⚠️ Secțiunea speculativă scrisă în avans de Bogdan (`POST /api/tickets`, `GET /api/tickets`,
`POST /api/tickets/[id]/answer`, cu tichetul ca pereche întrebare/răspuns) a fost **ștearsă**:
backendul e implementat, iar contractul real e documentat mai sus, în tabelul de rute și în
secțiunea de tichete. Diferența esențială: tichetul e un **fir de mesaje**
(`POST /api/tickets/[id]/messages`), nu un câmp `answer`, iar `lesson_id` e **obligatoriu** la
creare.

Frontendul din `help-button.tsx`, `teacher-tickets.tsx` și `intrebari/my-tickets.tsx` e încă
scris pe forma veche — vezi rândurile 🟡 din Săpt. 9-10 în `TASKS.md`.
