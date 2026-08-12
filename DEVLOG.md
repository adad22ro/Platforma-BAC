# Jurnal de dezvoltare — Platformă BAC

> Adaugă o intrare la **sfârșitul fiecărei sesiuni de lucru**.
> Format: `## YYYY-MM-DD — Andrei / Bogdan`
> Fii scurt și concret: ce s-a făcut, ce decizii s-au luat, ce probleme au rămas deschise.

---

## 2026-08-12 — Andrei (Faza 2, grupa A — jurnalul de răspunsuri)

Prima bucată din Faza 2. PR #41 și #42 au intrat în `main` (plus #43, curățenie), deci baza e curată.

**Migrare `20260812150000_answer_events.sql`** — o linie per răspuns, append-only. `student_progress` rămâne, dar ca vedere agregată; sursa de adevăr devine jurnalul.

Deciziile care nu se văd din schemă:
- **Grant doar `select, insert`**, fără `update`/`delete`. „Append-only" garantat de privilegii, nu de convenție — un `update` greșit dintr-o rută viitoare eșuează în loc să rescrie tăcut istoricul.
- **`question_id` e ON DELETE SET NULL, nu CASCADE.** Dacă profesorul șterge o întrebare, faptul că elevul a dat testul nu trebuie să dispară. Același raționament ca la contextul tichetelor.
- **`chapter_id` e stocat explicit**, nu dedus prin întrebare — altfel, la ștergerea întrebării, evenimentul rămâne fără nicio ancoră.
- **`is_correct` e înghețat** la corectare, nu recalculat la citire. Dacă profesorul schimbă ulterior varianta corectă, istoricul trebuie să arate ce i s-a spus elevului atunci.
- **`attempt_id`** grupează răspunsurile unei trimiteri, ca o încercare să poată fi reconstituită întreagă.

**Scrierea, în `POST /api/chapters/[id]/submit`** — înainte de `student_progress`: dacă pică ceva la mijloc, preferăm evenimentele fără agregat (agregatul se reconstruiește din ele) decât invers. O eroare la scriere se loghează, dar **nu** schimbă răspunsul: scorul e corect calculat și elevul are dreptul să-l vadă. **Profesorul nu generează evenimente** — altfel statisticile de dificultate ar conține răspunsurile celui care a scris întrebările.

**Migrarea e aplicată în producție**, prin **Supabase CLI** (`db push`), nu prin SQL Editor. E prima dată când folosim CLI-ul pentru asta, deci am actualizat `supabase/README.md`: fluxul devine `migration list` → `db push --dry-run` → `db push`. Diferența față de SQL Editor nu e comoditatea, ci **evidența**: `db push` înregistrează migrarea la Supabase, deci `migration list` arată adevărul. SQL rulat manual în editor aplică schimbarea dar lasă evidența să spună că migrarea n-a rulat niciodată.

`types/database.ts` fusese completat manual (migrarea nu era încă aplicată). După aplicare l-am **regenerat cu `npm run db:types` din producție: zero diferențe** — deci schema reală corespunde exact intenției, inclusiv nullability și numele cheilor străine. E o verificare gratuită pe care o vom repeta.

**Verzi:** typecheck curat, lint curat, **121/121 teste** (+5).

**Rămas din grupa A:** explicație per variantă și etichetele pe întrebări.

---

## 2026-08-12 — Andrei (UI-ul de tichete, dezactivat temporar înainte de merge)

`teste-progres` (PR #41) are ~2.600 de linii bune, dar zona de tichete e scrisă pe contractul vechi. **Nu crapă** — și de aceea e periculoasă: `GET /api/tickets` răspunde, doar că UI-ul citește `answer` / `answered_at`, câmpuri care nu mai există, deci **toate tichetele ar apărea „În așteptare", inclusiv cele la care profesorul a răspuns.** Butonul de răspuns din `/profesor` dă 404, iar „Nu am înțeles" dă 400 (lipsă `lesson_id`).

**Soluție: un singur flag**, `TICHETE_UI_ACTIVE` din `app/_components/feature-flags.ts`, pe `false`. Acoperă cele cinci puncte de montare (antet, panel profesor, lecție, două în pagina de test) plus ruta `/intrebari`, care dă acum 404 — era accesibilă pe URL direct chiar fără link.

**De ce flag și nu `git revert`:** codul lui Bogdan rămâne la vedere, reconectarea e o singură linie de întors, iar PR-ul poate intra acum cu partea verificată E2E — teste grilă, scor, progres, formularele din panelul profesor. Alternativa, să ținem tot PR-ul până se reconectează tichetele, e exact tiparul care a produs situația de azi: muncă bună care stă pe branch și se învechește.

Tipul flag-ului e `boolean` explicit, nu literalul `false`, ca TypeScript să nu marcheze ramurile drept imposibile și să nu pară cod mort.

**Verzi:** typecheck curat, lint curat, 116/116 teste.

---

## 2026-08-12 — Andrei (Deciziile din ședință → sarcini, partea 2)

Lista din ședință comparată cu ce era deja în TASKS: **1 din 9 acoperit, 2 parțial, 6 lipseau complet.** Diferența vine din faptul că prima trecere a fost scrisă din documentele de cercetare, iar ședința a mers mai departe — mai ales pe structura materiei și pe testele recurente.

**Grupe noi în „Faza 2":** G (structura materiei), H (repetiție + teste recurente), I (corectarea), J (secțiunea remedială).

**Decizii:**
- **FSRS, nu HLR.** HLR e din 2016 și nemenținut; FSRS e întreținut activ și folosit de Anki. Ambele cer jurnalul de evenimente.
- **Structura materiei:** patru secțiuni — Gramatică, Subiectul I, II, III — fiecare cu materie + exerciții. **Ordinea** (cu care începem) rămâne la blocate, se discută cu profesorul.
- **Testele de gramatică intră în același planificator** ca restul. Un singur mecanism de repetiție, nu unul pe calendar în paralel.
- **Regula de corectare:** ce e fix și neambiguu se autocorectează integral; textul liber nu primește niciodată notă automată, doar pre-notare pentru mentor; testele mari (la 3 capitole) și simulările se corectează integral de om.

**Lecțiile remediale — generare în lot, nu live.** Clarificat după discuție: elevul care a trecut prin lecția X și tot greșește are nevoie de **altă** explicație. Generarea se face însă **per neînțelegere, offline**, nu per elev la cerere. Motivele, în ordinea importanței: (1) conținut nerevizuit ar ajunge direct la un elev care se pregătește de examen, ceea ce anulează regula „profesorul e revizor"; (2) e mai **rapid** pentru elev — lecția există deja în DB, față de zeci de secunde de așteptare exact când e frustrat; (3) costul e o singură dată, nu per elev. Neînțelegerile sunt un set mărginit — aceeași confuzie apare la 200 de elevi. E și modelul Duolingo: DuoFactory generează offline, Session Generator personalizează la servire; nimic nu se generează live per user.

Ca profesorul să nu fie încărcat: **revizie triată** — al doilea model dă un scor de încredere, omul vede doar ce e sub prag plus un eșantion aleator. Eșantionul rămâne obligatoriu: româna are interpretare, iar un model care sună convingător și e greșit e mai periculos decât unul absent.

**Obiecții pe care le-am ridicat, notate ca sarcini, nu ca păreri:**
- **Volumul.** Testele mari corectate integral de om sunt articolul cu cel mai mare volum din sistem. La 20 de elevi merge, la 200 nu — plafonul trebuie calculat înainte. Rând dedicat în grupa I.
- **„Fix și automatizabil" are nevoie de definiție îngustă.** Și numărătoarea de cuvinte greșește (cratime, cifre, titluri citate). Automatizarea completă se limitează la criteriile cu prag verificabil fără interpretare; restul rămân sugestii.
- **Autoevaluarea pe barem ca strat 0** pe text liber, înainte de mentor. Cost zero, scalează, și predă exact competența care aduce cele ~32 de puncte pe formă.

---

## 2026-08-12 — Andrei (Deciziile de produs → sarcini în TASKS)

Cercetarea din sesiunea precedentă s-a spart în sarcini. **Secțiune nouă „Faza 2"** în `TASKS.md`, cu 18 sarcini în șase grupe (jurnal de evenimente, ce iese din el, baremul ca date, AI în lot, motivație, gramatică/tehnic).

**Decizii luate:**
- **Trecem pe `answer_events` acum.** Migrarea e mică azi, cu 5 utilizatori; peste un an, cu date reale, e operație pe cord deschis. Blochează grupele B și E — fără istoric la nivel de răspuns nu există „greșelile mele", statistici per întrebare, notă estimată.
- **Public-țintă: a XI-a și a XII-a principal, promoțiile anterioare secundar.** Clasa a XI-a e o **extindere față de tot ce s-a documentat** — `bac-romana-programa` și `bac-barem-analiza` presupun exclusiv clasa a XII-a. Fragmentarea materiei trebuie reevaluată.

**Rămase nedecise, mutate explicit în „Blocat / În așteptare"** ca să nu pară uitate: cu ce conținut începem (se consultă profesorul), modelul free/premium (blochează gating-ul funcțiilor noi), serviciul de email, drepturile de autor pe textele de la Subiectul I, evaluarea textului liber.

N-am scris sarcini pentru punctele nedecise. Un rând „⬜ de făcut" pe o decizie neluată e mai rău decât absența lui: arată ca muncă planificată, când de fapt e o întrebare fără răspuns.

---

## 2026-08-11 — Andrei (Sesiune de cercetare și direcție de produs)

**Fără cod de aplicație.** Sesiune de documentare, plus o regulă de proces.

**Cinci documente noi în `docs/`** (fiecare cu markdown + PDF, PDF-urile generate din markdown cu `marked` + Chrome headless):
- `duolingo-research` — modelul de arhitectură. Concluzia principală: **ei rețin evenimente, noi reținem stări**; aproape tot ce e valoros la ei derivă din păstrarea fiecărei interacțiuni. Plus: ei fabrică motivația, noi o primim gratis de la examen — deci nu copiem mecanicile de retenție (hearts, ligi, XP).
- `bac-romana-programa` — programa oficială și o propunere de fragmentare a materiei pe trei axe (conținut literar ca ierarhie; concepte de teorie literară și competențe de examen ca etichete).
- `bac-barem-analiza` — **analiză pe 21 de documente oficiale** (subiecte + bareme, ambele profiluri, 2021-2026), descărcate și comparate automat. Descoperirea centrală: **baremul e o constantă**, iar ~32 din 90 de puncte se dau pe formă, nu pe literatură. Subiectul II are 3 tipuri de cerință în 6 ani; rubrica de redactare a eseului e identică caracter cu caracter în 9 din 11 bareme.
- `viziune-produs` — cei patru piloni discutați: parcurs diferențiat, motivație/abandon, AI progresiv, gramatică.
- `rezumat-sedinta` — sinteză de prezentat colegilor, cu 7 puncte de decizie.

**Regulă nouă în `CLAUDE.md`** (comisă direct pe `main`, ca să ajungă repede la toată lumea): la fiecare conversație nouă și la orice întrebare despre starea proiectului, **se verifică toate branch-urile**, nu doar `main` — cu `ahead`/`behind`, autor și dată. Motivul: în această sesiune s-a raportat greșit că frontendul n-a avansat de două săptămâni, când de fapt existau ~2.600 de linii pe branch nemergeat.

**Constatare importantă, de rezolvat:** UI-ul de tichete al lui Bogdan e scris pe contractul vechi (`POST /api/tickets/[id]/answer`, câmpuri `answer`/`answered_at`, `lesson_id` opțional), înlocuit între timp de firul de mesaje. Branch-ul lui pornește de la `a62b283` și e în urmă cu PR #38, #39, #40. **De discutat contractul înainte ca cineva să repare cod.**

**Nimic notat în TASKS.md** — direcția se sparge în sarcini după ședința cu colegii.

**Verzi:** typecheck curat, 114/114 teste, lint curat. (Eroarea #019 a reapărut a treia oară; vezi recomandarea de `pretest` din `ERRORS.md`.)

---

## 2026-08-11 — Bogdan (Sesiunea 7 frontend, partea 7 — integrarea cu API-ul real)

**Contextul:** la push am descoperit că `origin/teste-progres` era cu 7 commit-uri înainte — Andrei împinsese pe 6 august backendul complet de Săpt. 7-8. Cele trei commit-uri ale mele din sesiunea 6 nu ajunseseră niciodată pe remote, deci istoriile divergeau. Rebase pe `origin/teste-progres`, cu conflictele din `TASKS.md` și `DEVLOG.md` rezolvate păstrând ambele relatări (jurnalul rămâne cronologic invers).

**Contractele mele presupuse nu se potriveau cu API-ul real.** Adaptat frontendul:
- `POST /api/chapters/[id]/attempts` → **`/submit`**.
- Variantele sunt rânduri în tabelul `answers`, cu id propriu: peste tot unde lucram cu indici de poziție (`0,1,2`) am trecut pe **`answer_id`** — starea bifelor, corpul cererii (`{ question_id, answer_id }`), marcarea variantei corecte (`correct_answer_id`) și a alegerii greșite (`chosen_answer_id`).
- `GET /api/chapters/[id]/questions` întoarce `answers`, nu `options`, și **nu include capitolul** — titlul (pentru antet și pentru contextul tichetului) îl luăm din `/api/chapters`.
- `POST /api/questions` creează întrebarea **împreună cu** variantele: trimit `answers: [{ text, is_correct, order_index }]`, nu `options` + `correct_option`.
- Lista de întrebări a profesorului nu mai afișează varianta corectă — ruta nu selectează `is_correct` nici pentru profesor (doar `GET /api/questions/[id]` o dă). Rămâne numărul de variante.
- `GET /api/progress` întoarce o linie per (elev, capitol) cu `score`/`total`/`attempts`, fără titluri și fără „best": `ProgressSummary` împerechează cu `/api/chapters` pe `chapter_id` și spune explicit că afișează **ultimul** rezultat, nu cel mai bun.
- Tratat `saved: false` din `submit` (profesor sau eroare de scriere): scorul se arată, cu nota că nu s-a înregistrat în progres.
- `docs/api.md`: secțiunea mea speculativă pentru teste a fost **ștearsă** — rutele reale sunt deja documentate de Andrei mai sus. Secțiunea de tichete rămâne (acolo chiar nu există backend).

**Verificat cu date reale** (Chromium + CDP, seed-ul lui Andrei, cont de profesor): testul capitolului introductiv încărcat cu 6 întrebări × 4 variante, bifat, trimis → **3/6 (50%)**, marcaje ✓ pe variantele corecte, explicațiile afișate, butoane „Nu am înțeles" pe cele 3 întrebări greșite, plus nota „Rezultatul nu a fost înregistrat în progresul tău" (corect: profesorului nu i se ține progres). Secțiunea de progres pe `/dashboard` listează cele 3 capitole ca „netestat". În panelul profesor, lista întrebărilor capitolului se încarcă; creare de întrebare nouă (draft) → 201 cu 4 variante, apoi ștearsă (`DELETE /api/questions/[id]` → 204).

**Verzi:** typecheck curat, **77/77 teste**, lint doar cu warning-ul preexistent.

---

## 2026-08-11 — Bogdan (Sesiunea 7 frontend, partea 6)

**Ce s-a făcut:** ultima sarcină de frontend din Săpt. 9-10 — pagina elevului cu răspunsurile primite. **Frontendul Săpt. 9-10 e complet.**

- **Rută nouă `/intrebari`** (`app/intrebari/page.tsx` + `my-tickets.tsx`): întrebările trimise de elev, fiecare cu contextul (capitol / lecție / întrebarea din test) și răspunsul profesorului în card verde, cu data. Cele fără răspuns arată „În așteptare" + termenul de 24h.
- **Ordonare pe folosul elevului:** tichetele cu răspuns primele — ele sunt motivul pentru care a intrat pe pagină — apoi cele noi înaintea celor vechi.
- Fiecare tichet are link **înapoi la locul întrebării**: lecția dacă o știm, altfel testul capitolului.
- Stare goală dedicată („N-ai trimis încă nicio întrebare") cu explicația butonului „Nu am înțeles" și link la capitole.
- **Legături:** intrare „Întrebările mele" în antetul zonei logate (`app-header.tsx`) și link „Vezi întrebările mele" în confirmarea de trimitere din `HelpButton`.

**Verificat în browser** (Chromium + CDP, stub de `fetch`): lista cu 4 tichete — răspunsul afișat corect cu data, badge „În așteptare" pe cele deschise, contextul întrebării de test, linkurile către lecție/test — și starea goală, cu un stub care întoarce `[]`.

**Verzi:** typecheck curat, lint fără warning-uri noi (două erori `react/no-unescaped-entities` de la ghilimelele românești, rezolvate cu `„…”`).

**Rămas deschis:** tot backendul de tichete (Andrei). Din Săpt. 7-8 și 9-10, sarcinile de frontend sunt toate încheiate; ce rămâne e API + DB.

---

## 2026-08-11 — Bogdan (Sesiunea 7 frontend, partea 5)

**Ce s-a făcut:** partea de UI din „Funcționalitate răspuns profesor la tichet" (rândul comun cu Andrei).

- În fiecare tichet fără răspuns, butonul „Răspunde" (până acum dezactivat) deschide un formular: textarea (max 2000 caractere, contor), „Trimite răspunsul" / „Renunță", validare pe răspuns gol. Trimite la `POST /api/tickets/[id]/answer`.
- **După trimitere, tichetul se actualizează în starea locală, fără refetch**: trece pe „Răspuns", primește data și textul, iar filtrul „doar fără răspuns" îl scoate imediat din listă și decrementează contorul — exact ce vrei după ce ai terminat de răspuns la un tichet.
- Mesaje de eroare dedicate pe `403` (fără drept de profesor) și `409` (tichetul are deja răspuns → cere reîmprospătarea, pentru cazul în care doi profesori lucrează în paralel).

**Verificat în browser** (Chromium + CDP, cu stub de `fetch` pentru `/api/tickets` și `/answer`): formularul se deschide, validarea pe gol funcționează, iar după trimitere tichetul trece pe „Răspuns", contorul scade de la 3 la 2, tichetul dispare din lista filtrată și răspunsul apare în cardul verde cu data.

**Verzi:** typecheck curat, lint fără warning-uri noi.

**Rămas deschis:** ruta `POST /api/tickets/[id]/answer` (Andrei) — contract documentat în `docs/api.md`, inclusiv `409`. Emailul de notificare către elev e sarcină separată, tot a lui.

---

## 2026-08-11 — Bogdan (Sesiunea 7 frontend, partea 4)

**Ce s-a făcut:** interfața profesorului pentru tichete (`app/profesor/teacher-tickets.tsx`), a doua sarcină de frontend din Săpt. 9-10.

- Secțiune nouă „Tichete" în `/profesor`: lista de tichete **grupată pe capitol**, cu numărul de tichete per grupă, filtru „Doar cele fără răspuns" (activ implicit) și rând desfășurabil cu mesajul complet + contextul automat (lecția / întrebarea de test).
- **Ordinea grupelor urmează ordinea capitolelor din curs** (`order_index`), nu alfabetic — așa se vede unde se adună blocajele pe parcursul materiei. În fiecare grupă, tichetele noi primele.
- **Tichetele fără capitol nu se pierd**: context pierdut sau lecție ștearsă → grupa „Fără capitol", la coadă. La fel, un capitol care nu mai e în listă (draft/șters) își păstrează grupa, cu titlul din tichet.
- Butonul „Răspunde" e prezent dar **dezactivat** — răspunsul la tichet e sarcină separată (Andrei + Bogdan).

**Verificat în browser** (Chromium + CDP): starea de eroare reală (ruta `/api/tickets` nu există → „Nu am putut încărca tichetele"), apoi UI-ul complet cu un **stub de `fetch` injectat în browser** (`Page.addScriptToEvaluateOnNewDocument`, fără să ating codul aplicației) și 4 tichete false: gruparea pe capitol în ordinea corectă, grupa „Fără capitol" la final, contoarele, badge-urile Fără răspuns/Răspuns, filtrul care arată/ascunde tichetele cu răspuns, desfășurarea cu context și afișarea răspunsului existent.

**Verzi:** typecheck curat, lint fără warning-uri noi (am scos array-ul `[]` inline din corpul componentei într-o constantă de modul, altfel `useMemo` recalcula la fiecare randare).

**Rămas deschis:** backendul de tichete (tabel + `POST`/`GET /api/tickets`, Andrei). Contractul `GET` e documentat în `docs/api.md`.

---

## 2026-08-11 — Bogdan (Sesiunea 7 frontend, partea 3)

**Ce s-a făcut:** primul task de frontend din Săpt. 9-10 — butonul „Nu am înțeles" cu context automat.

- **`app/_components/help-button.tsx`** — buton care deschide un formular scurt (textarea, max 1000 caractere, contor), trimite la `POST /api/tickets` și afișează confirmarea („răspuns în cel mult 24h", notificare pe email) cu opțiunea „Mai am o întrebare". Mesaje de eroare dedicate pe `401` și `429`.
- **Context automat**, completat din pagină, ca elevul să nu descrie unde s-a blocat: `source` (`lesson`/`quiz`), `chapter_id`/`chapter_title`, `lesson_id`/`lesson_title`, `question_id`/`question_text`. Contextul e **arătat elevului** înainte de trimitere („Se trimite împreună cu: …") — fără surprize despre ce pleacă.
- **Montat în două locuri:** pe `/lectii/[id]`, sub conținutul lecției; pe `/teste/[chapterId]`, câte unul sub fiecare întrebare **greșită** după corectare (acolo e blocajul real, iar tichetul pleacă cu întrebarea exactă) plus unul general pe capitol, disponibil și înainte de corectare.

**Decizii luate:**
- Titlurile din `context` sunt trimise doar pentru afișare; sursa de adevăr rămân ID-urile, care se re-rezolvă pe server (notat în `docs/api.md`).
- Contractul `POST /api/tickets` documentat în `docs/api.md`, ca la Săpt. 7-8 — inclusiv `429` pentru limita anti-spam, pe care UI-ul o tratează deja.

**Verificat în browser** (Chromium + CDP, pe `/lectii/bf4c133c…`): butonul apare, formularul se deschide, contextul afișat e corect („Se trimite împreună cu: Lectia 1 — Bine ai venit"), validarea pe mesaj gol funcționează („Scrie pe scurt ce nu ai înțeles."), iar la trimitere reală apare eroarea așteptată — ruta `/api/tickets` încă nu există — cu textul păstrat în formular.

**Rămas deschis:** backendul (tabel `tickets` + ruta de creare, Andrei). Rândul „Mesaj așteptare" din TASKS e marcat 🟡: textul de confirmare există deja în starea de succes; de decis dacă mai vrem și un indicator persistent al tichetelor deschise.

---

## 2026-08-11 — Bogdan (Sesiunea 7 frontend, partea 2)

**Ce s-a făcut:** închis taskul rămas din Săpt. 1-2 — „Alegere și configurare librărie UI".

**Decizie: rămânem pe Tailwind curat, fără shadcn/ui.** UI-ul e deja scris integral și coerent; shadcn ar însemna rescriere plus dependențe noi (Radix, CVA, tailwind-merge) pentru un MVP de ~10 pagini, pe un stack (Next 16 + Tailwind 4) unde convențiile diferă de documentația generatoarelor. Componentele unde shadcn chiar ajută (dialog, combobox, date picker) nu apar în MVP. De reevaluat dacă apare nevoia de modal accesibil sau un al doilea om pe frontend.

**În loc de librărie — primitive de stil** (`app/_components/ui.ts`): `btn(variant, size, extra)`, `inputCls`, `cardCls`, `listCls`, `badgeCls`. Motivul concret: același șir de clase pentru butonul primar era copiat de 13 ori în 10 fișiere, cu variații accidentale (`h-10` vs `h-11`, `hover:bg-zinc-50` vs `hover:bg-white`). Sunt șiruri de clase, nu componente React, ca să rămână compozabile cu clasele de poziționare. Refactorizate toate paginile și componentele; `inputCls` a plecat din `app/profesor/types.ts` în `ui.ts` (reexportat de acolo, ca să nu rup importurile).

**`docs/components.md` rescris** — era încă la „nicio componentă creată încă". Acum conține decizia și motivele, tabelul primitivelor, tabelul celor 13 componente și convențiile de cod (uniuni discriminate pentru stările de fetch, flag `active` la cleanup, texte în română).

**Verzi:** typecheck curat, 57/57 teste, `npm run build` reușit, lint doar cu warning-ul preexistent din `content-api.test.ts`.

**Rămas deschis:** refactorul e pur vizual-neutru dar **neverificat în browser** — merită o trecere rapidă prin pagini când pornește dev serverul. Restul Săpt. 7-8 e backend (Andrei).

---

## 2026-08-11 — Bogdan (Sesiunea 7 frontend)

**Ce s-a făcut:** partea de frontend din Săpt. 7-8 (teste grilă + progres), pe branch nou `teste-progres`.
- **Pagină test per capitol** (`app/teste/[chapterId]/`): `page.tsx` + `quiz-view.tsx`. Întrebări cu radio (un răspuns per întrebare), contor „x/y răspunse", submit activ doar când toate au răspuns. După corectare: card de scor (`n/total` + procent, ton verde/ambru/roșu) și, per întrebare, marcarea variantei corecte (✓), a alegerii greșite (✕) și explicația. Buton „Reia testul". Aceleași stări ca la lecții: `402` → paywall Premium cu buton upgrade, `404` → „Testul nu a fost găsit", rest → eroare.
- **Progres pe `/dashboard`** (`app/_components/progress-summary.tsx`): secțiunea „Progresul tău" — bară de progres + `best_score`/total + procent per capitol, „x/y capitole testate · medie z%", link „Dă testul"/„Reia testul". Capitolele fără întrebări sunt ascunse; dacă fetch-ul eșuează, secțiunea degradează discret (nu blochează pagina).
- **Panel profesor — formular „Întrebare test"** (`app/profesor/teacher-questions.tsx`): select capitol, textul întrebării, variante dinamice (2-6, adăugare/ștergere, radio pentru varianta corectă cu reindexare corectă la ștergere), explicație opțională, checkbox publică-imediat → `POST /api/questions`. Sub formular, lista întrebărilor capitolului (inclusiv draft, via `?all=1`), cu varianta corectă vizibilă.
- Link „Dă testul capitolului" în accordion-ul de capitole din `/dashboard`.

**Decizii luate:**
- **Contractul API l-am scris eu, în avans**, și l-am documentat în `docs/api.md` (secțiune marcată „nu sunt încă implementate"): `GET /api/chapters/[id]/questions` (+ `?all=1` pentru profesor), `POST /api/chapters/[id]/attempts`, `GET /api/progress`, `POST /api/questions`. UI-ul se conectează fără modificări când Andrei le implementează.
- **Corectarea se face pe server**, nu în client: răspunsul corect nu ajunge la elev înainte de trimitere (forma de întrebare pentru elev nu conține `correct_option`).

**Verzi:** typecheck curat, lint doar cu warning-ul preexistent din `content-api.test.ts`.

**Rămas deschis:** backendul Săpt. 7-8 (Andrei) — tabelele `questions`/`answers`/`student_progress`, datele placeholder și cele 4 rute. Până atunci paginile de test și secțiunea de progres nu au date, deci **nu sunt verificate E2E în browser**.

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

## 2026-08-07 — Andrei (Sesiunea backend — restanțe)

Trei lucruri mici rămase în urmă, pe `backend-restante`. Săpt. 9-10 intrase deja în `main` (PR #39, producție verificată: landing 200, `/api/health` ok).

- **`PUT /api/questions/[id]/answers`** — înlocuiește tot setul de variante. **Nu** PATCH pe variante individuale: invariantul „exact un răspuns corect" nu se poate menține dacă se editează una câte una (între două cereri întrebarea ar avea zero sau două corecte). Setul nou e validat întreg înainte să se atingă DB-ul.
  - `supabase-js` nu dă tranzacții, deci setul vechi e ținut în memorie și repus dacă inserarea celui nou eșuează. Dacă nici restaurarea nu reușește, se loghează `critical` (alertă Discord): întrebarea a rămas fără variante și strică testul pentru toți elevii.
- **`PATCH /api/tickets/[id]`** — închide/redeschide. Se pot seta doar `closed` și `open`; `answered` rămâne derivat din fir, altfel un tichet ar putea apărea „răspuns" fără răspuns.
- **Warning-ul de lint** din `content-api.test.ts:64` (directivă `eslint-disable` inutilă, rămasă de două săptămâni) — scos. **Lint complet curat acum, zero warning-uri.**

**Verzi:** typecheck curat, **114/114 teste** (+12), lint curat.

---

## 2026-08-07 — Andrei (Sesiunea backend — Săpt. 9-10, tichete)

**Ce s-a făcut:** Săpt. 7-8 a intrat în `main` (PR #38, CI verde). Apoi backendul de mentorat, pe `sistem-tichete-mentorat`.

- **Migrări** `20260807100000_tichete_mentorat.sql` (tabel `tickets`) + `20260807120000_tichete_mesaje_context.sql` (fir de mesaje + context), ambele aplicate în producție. A doua a apărut după feedback, în aceeași sesiune — de aceea migrare nouă, nu editarea celei dintâi (regula din `supabase/README.md`).
  - Contextul (`chapter_id`, `lesson_id`) e **ON DELETE SET NULL**, nu CASCADE: dacă profesorul șterge lecția, întrebarea elevului nu trebuie să dispară.
- **API:** `GET/POST /api/tickets`, `GET /api/tickets/[id]` (cu fir), `POST /api/tickets/[id]/messages`.
  - Elevul e legat de `user.id` din sesiune — un `user_id` din query string e ignorat (test dedicat).
  - Contextul se derivă din DB: capitolul se ia din lecție, nu din ce declară clientul (test dedicat).
  - Nu se poate deschide tichet despre conținut inaccesibil (404 draft / 402 premium) — altfel tichetul e o cale laterală de a afla ce e acolo. Refolosește `lib/chapter-access.ts`.
  - Tichetul altcuiva dă **404, nu 403** — nu confirmăm că există; nici mesajele lui nu se citesc.

**Revizuire în aceeași sesiune, după feedback (Gabi):**
- **Tichetul devine fir de mesaje** (`ticket_messages`), nu pereche întrebare/răspuns. Coloanele `answer`/`answered_by`/`answered_at` au dispărut, iar migrarea mută conținutul existent în fir în loc să-l piardă. Statusul urmează ultimul vorbitor: profesor → `answered`, revenire elev → `open`. `author_role` e înghețat la scriere, ca un elev promovat profesor să nu-și transforme retroactiv mesajele vechi în răspunsuri oficiale.
- **Tichetele se deschid doar din fereastra lecției** — `lesson_id` obligatoriu în API. Coloana rămâne nullable în DB ca ștergerea lecției să facă SET NULL fără să piardă tichetul; de aceea `lesson_title` e salvat ca snapshot.
- **Context complet pentru profesor:** progresul la testul capitolului (înghețat la momentul întrebării, nu citit la afișare), poziția în lecție (`scroll_percent`) și fragmentul selectat. Doar ultimele două vin de la client — restul se citește pe server.
- Notă pentru Bogdan: butonul „Nu am înțeles" trebuie să trimită `lesson_id` și, dacă poate, `selection` + `scroll_percent`.

**Rămas deschis / blocat:** notificarea pe email a elevului. Nu e ales un serviciu (Resend / Postmark / SendGrid) și nu există variabile de mediu pentru el. Locul de apel e pregătit și documentat în ruta de răspuns: trimiterea se face **după** scrierea în DB și fără să blocheze răspunsul — un email nelivrat nu trebuie să piardă răspunsul profesorului.

**Verzi:** typecheck curat, **102/102 teste** (+27 în `tests/tickets-api.test.ts`), lint doar cu warning-ul preexistent.

**Eroare nouă notată:** #020 — `GenericStringError` la `tsc` fiindcă selectul Supabase era scris cu concatenare (`'a, b' + 'c'`). Tipul rândului se deduce din textul literal al selectului; concatenarea îl face `string` și strică inferența.

---

## 2026-08-06 — Andrei (Sesiunea backend — Săpt. 7-8, partea 1)

**Ce s-a făcut:** schema DB pentru teste grilă + progres, pe branch `teste-progres`.
- `supabase/migrations/20260806120000_teste_progres.sql` — `questions`, `answers`, `student_progress`. RLS activat, fără politici `anon`, grant `service_role` — același model ca `chapters`/`lessons`.
- **Decizie:** variantele de răspuns stau în tabel separat (`answers`), NU ca `jsonb` în `questions`. Motivul principal e de securitate: `is_correct` trebuie filtrat explicit la fiecare citire, ca să nu ajungă niciodată la client; cu jsonb ar fi fost o scăpare ușor de făcut. Bonus: index unic parțial care garantează **cel mult** un răspuns corect per întrebare („cel puțin unul" se validează în API).
- `student_progress` are unique pe `(user_id, chapter_id)` + `attempts` — o reîncercare face upsert peste linia existentă, nu istoric. CHECK pe `score <= total`.
- `types/database.ts` actualizat **manual** (migrarea nu e încă aplicată în producție, deci `npm run db:types` ar fi întors schema veche).
- `scripts/seed-questions.mjs` + `npm run seed:questions` — 6 întrebări × 4 variante per capitol, idempotent, în stilul `seed:content`.
- `docs/database.md` + `TASKS.md` actualizate.

**Migrare aplicată în producție** (`supabase db push`) + `npm run db:types` — tipurile generate coincid cu cele scrise manual. Seed rulat: 18 întrebări × 4 variante (3 capitole).

**API-ul de teste grilă** (partea 2, aceeași sesiune):
- `POST /api/questions` — creează întrebarea **împreună cu** variantele (o întrebare fără variante ar strica testul). Validare: minim 2 variante, exact una corectă. Dacă inserarea variantelor eșuează, întrebarea creată e ștearsă — fără întrebări orfane.
- `GET/PATCH/DELETE /api/questions/[id]` — profesor; GET-ul e singurul loc care întoarce `is_correct`.
- `GET /api/chapters/[id]/questions` — testul pentru elev; **nu selectează deloc** coloana `is_correct` (test dedicat care verifică asta, plus că nu apare în payload).
- `POST /api/chapters/[id]/submit` — corectare server-side; un `score` trimis de client e ignorat (test dedicat). Upsert în `student_progress` cu `attempts` incrementat.
- `GET /api/progress` — progresul propriu, filtrat pe `user.id` din sesiune, niciodată pe un id din query string.
- `lib/chapter-access.ts` — gating-ul de capitol (404 draft / 402 premium) extras din logica de la lecții. Rutele vechi de lecții **nu** au fost atinse (sunt acoperite de teste); pot adopta helperul la o trecere viitoare.
- `AppUser` are acum `id` (id-ul din `users`, cerut de FK-ul `student_progress.user_id`) — fixture-urile din testele existente actualizate.

**Rămas deschis:** înlocuirea variantelor unei întrebări (`PUT /api/questions/[id]/answers`) — n-am făcut-o ca să nu stric invariantul „exact una corectă" pe jumătate; de adăugat când Bogdan are nevoie de editare. UI-ul (test grilă + statistici progres) e la Bogdan.

**Verzi:** typecheck curat, **75/75 teste** (+20 noi în `tests/questions-api.test.ts`), lint doar cu warning-ul preexistent (`content-api.test.ts:64`).

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
