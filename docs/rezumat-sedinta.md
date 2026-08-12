# Platforma BAC — rezumat pentru ședință

**7 august 2026** · document de discuție · însoțește cele patru documente detaliate:
`duolingo-research`, `bac-romana-programa`, `bac-barem-analiza`, `viziune-produs`

---

## 1. Unde suntem astăzi

Backendul e **complet până la finalul Săptămânii 10** din planul inițial și rulează în
producție.

| Livrat | Stare |
|---|---|
| Autentificare (Clerk), plăți (Stripe), roluri elev/profesor | în producție |
| Conținut: capitole, lecții, gating premium | în producție |
| Teste grilă: întrebări, variante, corectare automată, progres | în producție |
| Mentorat: tichete ca fir de mesaje, cu context de lecție | în producție |
| Monitorizare: panou `/admin`, jurnal de erori, alerte | în producție |

**114 teste automate**, verificări de calitate curate, CI verde la fiecare modificare.

**Blocaje reale, nu tehnice:**
- **Frontendul** e în urma backendului — interfețele pentru teste grilă și tichete nu
  există încă.
- **Conținutul real** (structura de capitole și lecțiile) așteaptă de săptămâni
  profesorul partener.
- **Notificarea pe email** e blocată: nu e ales un serviciu.

---

## 2. Ce am cercetat și de ce

Două direcții: **cum** se structurează învățarea (Duolingo, ca model de arhitectură) și
**ce** anume structurăm (programa și baremele oficiale de BAC).

### 2.1. Din Duolingo — trei lucruri care contează

**a) Ei fabrică motivația; noi o primim gratis.**
Duolingo își petrece cea mai mare parte din efortul de produs convingând oamenii să
revină. Un elev în martie nu trebuie convins să învețe — examenul face asta. **Deci nu
copiem mecanicile lor de retenție**: fără vieți/hearts (pedepsesc exact exersatul, care
e comportamentul dorit), fără ligi publice (stres inutil la un public deja stresat),
fără XP (avem o metrică onestă: nota estimată).

**b) Ei rețin evenimente, noi reținem stări.**
Aproape tot ce e valoros la ei — personalizare, repetiție, statistici, măsurarea
eficacității — derivă din faptul că păstrează **fiecare interacțiune** a userului.
Noi suprascriem: știm scorul final pe capitol, nu și ce a greșit elevul și când.
**E o decizie de arhitectură mult mai ieftină acum, cu 5 utilizatori, decât peste un an.**

**c) Generarea de conținut cu AI + revizie umană.**
Tiparul lor documentat: generează mai multe variante → un al doilea model le evaluează →
**omul revizuiește**. Rezultat raportat la ei: producția unui material a scăzut de la
~o lună la ~6 ore, cu 99% cost mai mic. **Profesorul devine revizor, nu autor** — exact
ce ne deblochează gâtuirea de conținut.

### 2.2. Din analiza oficială a BAC-ului

Am descărcat **21 de documente oficiale** ale Ministerului (subiecte + bareme, ambele
profiluri, 2021-2026), le-am extras textul și le-am comparat automat.

---

## 3. Descoperirea principală: baremul este o constantă

Aceasta e cea mai importantă concluzie a întregii cercetări.

### 3.1. Peste o treime din examen se dă pe FORMĂ, nu pe literatură

| Unde | Ce se punctează | Puncte |
|---|---|---|
| Subiectul I.A | răspuns formulat în enunț + corectitudine, la fiecare din cele 5 cerințe | 10 |
| Subiectul I.B | conectori, normele limbii, ortografie/punctuație, așezare, număr de cuvinte | 6 |
| Subiectul II | limbă literară, logica ideilor, ortografie, punctuație | 4 |
| Subiectul III | părți componente, logica ideilor, analiză/argumentare, limbă, ortografie, punctuație, așezare | 12 |
| | **TOTAL** | **~32 din 90** |

Și baremul precizează explicit că aceste puncte **se acordă chiar dacă răspunsul nu e
corect sau complet**, atâta timp cât elevul dezvoltă subiectul. Adică: **se iau puncte
scriind îngrijit, în enunț, pe subiect — chiar cu răspuns greșit la conținut.**
Foarte puțini elevi știu asta. Se învață în cinci minute.

### 3.2. Structura se repetă an de an

- **Subiectul I.A** — șablon fix de cinci verbe, în aceeași ordine în fiecare an:
  *indicarea sensului* → *menționarea* unui detaliu → *precizarea* unei reacții →
  *explicarea unui motiv* → *prezentarea unei trăsături*.
- **Subiectul II** — **trei tipuri de cerință în șase ani**, identice la real și uman:
  perspectiva narativă, relația idee poetică–mijloace artistice, rolul notațiilor
  autorului.
- **Subiectul III** — **trei arhetipuri** de eseu: încadrare într-un curent, construcția
  personajului, relația dintre două personaje.
- **Rubrica de redactare a eseului** — comparând textul normalizat, **9 din 11 bareme
  sunt identice caracter cu caracter**. Singura modificare în 2026 e tipografică.

### 3.3. De ce contează

**Elevul nu pierde puncte doar pentru că nu știe literatură. Le pierde pentru că nu
știe cum se punctează.** Asta e o problemă pe care software-ul o poate rezolva —
spre deosebire de „a ști literatură".

Baremul fiind constant, îl putem **codifica drept date** și îl putem preda explicit.
Cred că e cel mai subevaluat avantaj competitiv pe care îl avem.

---

## 4. Propunerea: corectare pe trei straturi

Problema pe care o aveam: sistemul nostru de grile poate corecta automat doar ~40% din
examen. Subiectele I.B și III înseamnă **50 din 90 de puncte** și sunt text liber.

Analiza baremelor arată că întrebarea „profesor **sau** AI?" e greșit pusă. Răspunsul e
pe straturi:

| Strat | Ce corectează | Cum | Acoperire |
|---|---|---|---|
| **1. Determinist** | număr de cuvinte, părți componente, concluzie, conectori, ortografie, punctuație, prezența citatului | reguli + corector gramatical open-source | **~20 din 90 p.**, exact, fără ambiguitate |
| **2. AI pe barem** | „prezentare adecvată și nuanțată" vs. „ezitantă" vs. „schematism" | LLM, criteriu cu criteriu | estimare, marcată ca atare |
| **3. Mentor** | judecata finală, cazurile de graniță, contestațiile | om | doar unde contează |

**Detaliul care face stratul 2 posibil:** baremul oficial ne dă **chiar vocabularul de
notare** — „adecvată și nuanțată" = 2 puncte, „încercare" = 1 punct. Nu-i cerem
inteligenței artificiale să „noteze eseul", ci să aplice **un criteriu precis, cu praguri
precise**, unul câte unul.

**Efectul asupra mentorului:** primește lucrarea deja pre-notată, pe aceeași grilă
oficială. Corectează în minute, nu în ore. Asta face mentoratul sustenabil la scară —
altfel un profesor nu poate corecta 200 de eseuri pe săptămână.

---

## 5. Direcția de produs — patru piloni

**1. Parcurs diferențiat.** Fiecare elev avansează în ritmul lui. Nu ne trebuie
inteligență artificială complicată, ci date corecte: un model simplu de stăpânire per
concept. *Ideea centrală:* nu explicăm doar răspunsul corect, ci **de ce fiecare variantă
greșită e greșită** — un elev care alege greșit are o confuzie specifică, iar dacă îi
arăți doar răspunsul bun, o repetă.

**2. Motivație și abandon.** Nota estimată în loc de puncte de joc. Numărătoare inversă
**cu plan**, nu doar cu presiune. Streak cu „îngheț" — cine învață 6 zile și ratează
duminica nu trebuie pedepsit, altfel abandonează complet. Și cel mai important ecran din
aplicație: **cel de la revenire după o absență** — „hai să recuperăm", nu „ai pierdut 14 zile".
*Rezervă onestă:* putem reduce abandonul din aplicație; abandonul școlar are cauze
socio-economice pe care o platformă nu le atinge.

**3. AI progresiv.** Faza 1, acum: AI ieftin, în lot, **fără nicio cerere venită de la
elevi** — generare de întrebări, explicații și exerciții, revizuite de profesor. Costul e
o singură dată, nu per elev. Faza 2, când există buget: agent conversațional pentru
elevi, cu limite stricte.

**4. Gramatica, tratată serios.** Analiza baremului arată că e chiar mai importantă decât
credeam. Soluția e în două trepte: **corector open-source self-hostat** (cost zero per
corectare, explicabil, nu inventează) pentru ortografie și punctuație; AI abia pentru
coerență și stil. *Avertisment:* orice corector produce fals-pozitive — într-un produs
educațional se prezintă ca sugestie, nu ca verdict.

---

## 6. Cifre despre piață, din datele oficiale

- **Promovabilitate 2026: 74,8%.** Promoția curentă 79,7% — **promoțiile anterioare
  doar 31,7%.**
- **~5.500 de elevi pe an ratează bacul cu sub 0,5 puncte** (medii între 5,5 și 5,98,
  față de 6,00 necesar).
- Româna dă **499 de note de 10**, față de 3.832 la proba de profil. **Româna e materia
  care blochează.**

**Două concluzii de discutat:**
1. **Publicul uitat sunt promoțiile anterioare** — cea mai mare nevoie, zero sprijin din
   partea școlii, cea mai mare disponibilitate de a plăti.
2. **Marja de 0,5 puncte** e fix ce mută o platformă de exerciții. E și cel mai onest
   argument de marketing pe care îl avem.

---

## 7. Puncte de decizie — pentru ședință

| # | Decizia | Opțiuni | Recomandarea mea |
|---|---|---|---|
| 1 | **Trecem pe jurnal de evenimente?** | acum / mai târziu | **Acum.** O migrare de o oră azi; peste un an, cu date reale, e o operație pe cord deschis. Blochează tot ce ține de personalizare |
| 2 | **Cum corectăm textul liber** (50 din 90 p.) | mentor / autoevaluare / AI | **Stratificat** (secțiunea 4) — nu una singură |
| 3 | **Model free vs. premium** | free generos, plătești pentru confort / capitole blocate | de discutat; modelul actual e opusul celui care a funcționat la Duolingo |
| 4 | **Cu ce conținut începem** | cronologic (ca la școală) / după examen | **Subiectul al II-lea** — 3 tipuri de cerință, punctaj fix, automatizabil aproape integral |
| 5 | **Public-țintă** | doar a XII-a / și promoțiile anterioare | de discutat — cifrele susțin puternic a doua variantă |
| 6 | **Serviciu de email** | Resend / altul | blochează notificările de mentorat, deja implementate pe restul |
| 7 | **Drepturi de autor** | — | textele de la Subiectul I sunt fragmente din volume publicate. Subiectele oficiale sunt publice, dar **republicarea în aplicație trebuie verificată juridic** înainte să construim o bancă de texte |

---

## 8. Ce **nu** facem

Merită spus explicit, ca să nu ne pierdem în ce e la modă:

- **Fără microservicii, fără infrastructură mare.** Suntem doi oameni. Ce citim în
  blogul de inginerie al Duolingo rezolvă, de la un punct încolo, probleme pe care e
  sănătos să nu le avem.
- **Fără teste A/B.** Ele au nevoie de 100.000 de utilizatori zilnici pentru
  semnificație statistică. Nouă ne trebuie **20 de interviuri cu elevi reali** — ne vor
  spune în 30 de minute mai mult decât orice test.
- **Fără gamificare de dragul gamificării.** Regula pe care o propun: fiecare element
  trebuie să răspundă la întrebarea *„îl apropie pe elev de o notă mai mare?"*. Dacă
  răspunsul e „nu, dar crește implicarea", e zgomot.

---

## 9. Ce urmează

Nimic nu a fost încă trecut în lista de sarcini — așteptăm deciziile de la punctul 7.
După ședință, direcția se sparge în sarcini concrete pe backend, frontend și decizii
de produs.

> **Notă de onestitate.** Cifrele despre examen, promovabilitate, programă și bareme vin
> din documente oficiale ale Ministerului Educației, verificate direct. Cifrele despre
> Duolingo vin din rapoartele lor către investitori și din blogul lor de inginerie —
> cu excepția câtorva date de gamificare care circulă prin presa de marketing, fără
> sursă primară verificabilă; acelea sunt marcate ca atare în documentul detaliat.
