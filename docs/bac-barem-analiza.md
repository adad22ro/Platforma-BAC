# Analiza subiectelor și baremelor de BAC la română, 2021-2026

> Scris la 2026-08-07. **Nu e cercetare din presă — e analiză pe documentele oficiale.**
> Am descărcat 21 de PDF-uri de pe `cdn.edupedu.ro` (subiecte + bareme, ambele profiluri,
> sesiunile de vară 2021-2026), le-am extras textul și le-am comparat automat.
>
> Concluzia scurtă: **baremul e o constantă, nu o variabilă.** Iar asta schimbă complet
> ce se poate automatiza.

---

## 0. Corpusul analizat

| An | Real+tehnologic | Uman+pedagogic |
|---|---|---|
| 2021 | barem | — (nu s-a găsit pe CDN) |
| 2022 | barem + subiect | barem + subiect |
| 2023 | barem + subiect | barem + subiect |
| 2024 | barem + subiect | barem + subiect |
| 2025 | barem + subiect | barem + subiect |
| 2026 | barem + subiect | barem + subiect |

**11 bareme + 10 seturi de subiecte.** Tiparul de URL, ca să se poată reface oricând:

```
https://cdn.edupedu.ro/wp-content/uploads/{AN}/{LUNA}/E_a_romana_{real_tehn|uman_ped}_{AN}_{bar|var}_{VARIANTA}.pdf
```

Extragerea textului din PDF: `pdf-parse` v2 (`new PDFParse({data}).getText()`).

---

## 1. Descoperirea principală: ~32 din 90 de puncte se dau pe FORMĂ

Adunând punctele care **nu depind de cunoașterea literaturii**:

| Unde | Ce se punctează | Puncte |
|---|---|---|
| Subiectul I.A | „formularea răspunsului în enunț" (1p) + „corectitudinea exprimării, ortografie, punctuație" (1p), la fiecare din cele 5 cerințe | **10** |
| Subiectul I.B | conectori (2p), normele limbii literare (1p), ortografie/punctuație (1p), așezare în pagină/lizibilitate (1p), număr minim de cuvinte (1p) | **6** |
| Subiectul II | utilizarea limbii literare, logica înlănțuirii ideilor, ortografia, punctuația — câte 1p | **4** |
| Subiectul III | părți componente (1p), logica ideilor (1p), abilități de analiză/argumentare (3p), limba literară (2p), ortografie (2p), punctuație (2p), așezare (1p) | **12** |
| | **TOTAL** | **~32 din 90** |

> **Peste o treime din examen se dă pe formă, structură și corectitudine — nu pe
> literatură.** Iar forma e exact ce se poate verifica automat.

Asta validează direct două decizii din [`viziune-produs.md`](viziune-produs.md):
gramatica tratată serios (punctul 4) și „elevul trebuie să învețe să lucreze pe barem".

**Nuanță importantă, din barem:** *„Punctajul pentru formularea răspunsurilor în enunțuri
și pentru corectitudinea exprimării […] se acordă în cazul în care răspunsul dezvoltă
subiectul propus, chiar dacă acesta nu este corect sau complet."* Adică **un elev poate
lua puncte de formă chiar cu răspuns greșit la conținut** — dacă scrie în enunț, corect
gramatical, pe subiect. Foarte puțini elevi știu asta. E genul de lucru pe care o
aplicație îl poate învăța în cinci minute și care valorează puncte reale.

---

## 2. Subiectul I.A — șablon fix de cinci verbe

**Cerințele sunt aceleași, în aceeași ordine, în fiecare an analizat:**

| # | Verb | Ce cere | Puncte |
|---|---|---|---|
| 1 | **indicarea sensului** din text al unui cuvânt/secvențe | lexic contextual | 6 |
| 2 | **menționarea** unui detaliu factual din text | extragere de informație | 6 |
| 3 | **precizarea** unei reacții/semnificații/mod/moment, adesea + justificare cu secvență | extragere + citare | 6 |
| 4 | **explicarea unui motiv** pentru care… | inferență | 6 |
| 5 | **prezentarea unei trăsături** (morale, de limbaj), în limită de cuvinte | interpretare | 4 + 2 |

Fiecare cerință de 6 puncte se descompune identic: **conținut (4p) + formulare în enunț
(1p) + corectitudine (1p)**.

**Textul-suport e mereu nonficțional și memorialistic, despre o figură din cultura
română:**

| An | Text |
|---|---|
| 2021 | Mihai Eminescu — debutul literar |
| 2022 | Elena Cuza |
| 2023 | Ion Creangă |
| 2024 | Gabriel Dimisianu / Tudor Arghezi |
| 2025 | Vasile Pârvan — curs inaugural |
| 2026 | Dinu Pillat / Pia Pillat |

> **Consecință pentru generarea de conținut:** putem produce exerciții de Subiectul I.A
> pornind de la orice text memorialistic despre un scriitor român, aplicând cele cinci
> verbe. Șablonul e cunoscut, punctajul e cunoscut. **Se generează automat, în lot.**

---

## 3. Subiectul I.B — rubrica e identică în fiecare an

Textul argumentativ, 20 de puncte, mereu descompuse la fel:

| Criteriu | Puncte | Automatizabil? |
|---|---|---|
| formularea unei opinii | 1 | AI |
| enunțarea a două argumente (2 × 2p) | 4 | AI |
| dezvoltarea celor două argumente (2 × 2p) | 4 | AI |
| valorificarea textului (3p) + raportare la experiență personală/culturală (1p) | 4 | AI (citarea: automat) |
| formularea unei concluzii | 1 | **automat** (detectare structurală) |
| utilizarea corectă a conectorilor | 2 | **automat** (listă de conectori) |
| respectarea normelor limbii literare (0-1 greșeli = 1p) | 1 | **automat** (LanguageTool) |
| ortografie și punctuație (0-1 greșeli = 1p) | 1 | **automat** (LanguageTool) |
| așezare în pagină, lizibilitate | 1 | n/a digital — se acordă implicit |
| număr minim de cuvinte (150) | 1 | **automat** |

**7 din 20 de puncte sunt pur mecanice.** Pragurile sunt binare și explicite:
„0-1 greșeli – 1 punct; 2 sau mai multe greșeli – 0 puncte". Un corector automat le poate
aplica exact, fără interpretare.

---

## 4. Subiectul al II-lea — cel mai previzibil din tot examenul

**Două constatări din date:**

1. **Cerința e identică la real și la uman**, în același an. Toate perechile de bareme
   din 2022-2026 coincid la Subiectul II.
2. **În șase ani au apărut doar trei tipuri de cerință:**

| An | Cerință |
|---|---|
| 2021 | perspectiva narativă (tip **subiectiv**) |
| 2022 | perspectiva narativă (tip **obiectiv**) |
| 2023 | relația dintre **ideea poetică și mijloacele artistice** |
| 2024 | rolul **notațiilor autorului** |
| 2025 | rolul **notațiilor autorului** |
| 2026 | perspectiva narativă (tip **obiectiv**) |

Structura de punctare, invariabilă:
- **Conținut 6p:** precizarea conceptului (2p) + prezentarea lui **ilustrată cu exemple
  din text** (4p / 2p „prezentare ezitantă" / 1p „simpla indicare, fără raportare la text")
- **Redactare 4p:** limba literară, logica ideilor, ortografie, punctuație — câte 1p
- **Minimum 50 de cuvinte**

> Un subiect de 10 puncte, cu **trei tipuri de cerință** și schemă de rezolvare fixă.
> Confirmă recomandarea de a începe cu el: **se poate automatiza aproape integral**,
> inclusiv notarea.

---

## 5. Subiectul al III-lea — trei arhetipuri de eseu

Împărțirea e mereu **Conținut 18p + Redactare 12p**, minimum 400 de cuvinte.

**Arhetipurile:**

**A. Încadrare într-o perioadă/curent** (numit uzual „particularități de operă")
- precizarea perioadei/curentului (2p) + numirea a două trăsături (2 × 1p) +
  evidențierea lor prin text (2 × 1p) → **6p**
- precizarea temei (2p) + comentarea a două imagini/episoade/secvențe (2 × 2p) → **6p**
- analiza a două elemente de compoziție/limbaj, cu justificarea relevanței (2 × 3p) → **6p**

**B. Construcția personajului**
- statutul social, psihologic, moral al personajului → **6p**
- o trăsătură ilustrată prin două episoade/secvențe comentate → **6p**
- elemente de construcție a personajului → **6p**

**C. Relația dintre două personaje** (apărut la uman în 2025)

**Distribuția pe profiluri și ani:**

| An | Real + tehnologic | Uman + pedagogic |
|---|---|---|
| 2021 | A — text dramatic | — |
| 2022 | A — comedie | B — personaj |
| 2023 | A — text narativ | B — personaj |
| 2024 | A — nuvelă | B — personaj |
| 2025 | B — personaj | C — relația dintre personaje |
| 2026 | A — text poetic | A — text poetic |

Se vede tiparul: **realul primește preponderent „încadrare", umanul preponderent
„personaj"** — dar nu e o regulă absolută (2025 și 2026 le-au inversat, respectiv
egalizat). Genul cerut variază an de an (dramatic, comedie, narativ, nuvelă, poetic),
ceea ce înseamnă că **elevul trebuie pregătit pe toate genurile**, nu doar pe cel „la modă".

**Rubrica de redactare (12p) e literalmente aceeași:** comparând textul normalizat,
9 din 11 bareme sunt **identice caracter cu caracter**; în 2026 singura schimbare e
tipografică („p." → „puncte"). Criteriile:

| Criteriu | Puncte | Prag |
|---|---|---|
| existența părților componente (introducere, cuprins, încheiere) | 1 | binar |
| logica înlănțuirii ideilor | 1 | binar |
| abilități de analiză și argumentare | 3 | 3 / 2 / 1 |
| utilizarea limbii literare | 2 | 2 / 1 |
| ortografia | 2 | **0-1 greșeli = 2p; 2 greșeli = 1p; 3+ = 0p** |
| punctuația | 2 | idem |
| așezarea în pagină, lizibilitatea | 1 | binar |

---

## 6. Ce se poate automatiza — clasificare pe trei straturi

Din analiza de mai sus, fiecare criteriu de barem intră într-una din trei categorii:

### Stratul 1 — automat, determinist (fără AI, fără mentor)
- numărul de cuvinte (50 / 150 / 400) — prag explicit în barem
- existența părților componente (introducere / cuprins / încheiere)
- prezența unei concluzii
- utilizarea conectorilor (listă închisă: *în primul rând, prin urmare, așadar, deoarece…*)
- **ortografia și punctuația** — LanguageTool, cu praguri exacte din barem
- prezența citatului din text („valorificarea textului" vs. „simpla citare")
- răspuns formulat în enunț (la Subiectul I.A)

**Acoperire estimată: ~20 din 90 de puncte, notabile exact, fără nicio ambiguitate.**

### Stratul 2 — AI cu barem, verificat de mentor la scor mic sau la nesiguranță
- „prezentare adecvată și nuanțată" vs. „ezitantă" vs. „schematism"
- „dezvoltare clară, nuanțată" vs. „încercare de dezvoltare"
- adecvarea argumentului la opinia formulată
- corectitudinea precizării conceptului (perspectivă narativă, curent, temă)

Baremul dă **exact vocabularul de notare** („adecvată și nuanțată" = 2p, „încercare" =
1p). Asta e un prompt gata scris: nu cerem LLM-ului „notează eseul", ci **„aplică acest
criteriu, cu aceste trei praguri"**, criteriu cu criteriu.

### Stratul 3 — doar mentor
- judecata finală pe originalitate și profunzime
- cazurile de graniță semnalate de stratul 2 cu încredere mică
- contestațiile elevului („de ce am primit 1 și nu 2?")

> **Modelul de corectare pe care îl propun: stratificat.** Elevul primește instant
> nota de la stratul 1 + estimarea stratului 2, cu marcaj clar „estimare, nu notă
> oficială". Mentorul intervine doar unde contează — și vede deja pre-notarea, deci
> lucrează în minute, nu în ore.
>
> Asta rezolvă exact problema din `bac-romana-programa.md` §6.5: cele 50 de puncte de
> text liber nu mai sunt „ori profesor, ori AI", ci **ambele, pe straturi**.

---

## 7. Ce înseamnă în schemă

Baremul fiind constant, se poate **codifica drept date**, nu logică:

```
rubrics                 (subiect, profil, tip_cerinta, an_valabilitate)
 └── rubric_criteria    (denumire, puncte_max, praguri, strat: auto|ai|mentor,
                         verificator: word_count|languagetool|connectors|llm|…)

submissions             (elev, item, text_trimis, timp_lucrat)
 └── submission_scores  (criteriu, puncte_acordate, sursa, explicatie, incredere)
```

Avantajele: baremul se actualizează fără deploy; elevul vede **exact criteriile
oficiale**, nu o interpretare; mentorul corectează pe aceeași grilă; iar dacă
Ministerul schimbă baremul (ex. reforma din 2030), se schimbă datele, nu codul.

---

## 8. Ce n-am putut verifica

- **2021 uman** nu s-a găsit pe CDN-ul edupedu — analiza pe 2021 e doar pe real.
- **Sesiunile de toamnă și cele speciale** nu sunt incluse; doar sesiunile de vară.
  Toamna are alte variante și, posibil, alte tipuri de cerință la Subiectul II.
- Am analizat **câte o variantă per an** (cea publicată). Nu știm cât variază între
  variantele aceleiași sesiuni — probabil deloc ca structură, dar merită confirmat.
- Textele-suport de la Subiectul I sunt protejate de drepturi de autor (fragmente din
  volume publicate). **Nu le putem reproduce în aplicație fără verificare juridică** —
  subiectele oficiale sunt publice, dar asta nu înseamnă automat că putem republica
  fragmentele literare. De clarificat înainte de a construi o bancă de texte.

---

## 9. Concluzii pentru produs

1. **Baremul e o constantă.** Poate fi codificat ca date și predat explicit elevului.
   Asta e, probabil, cel mai subevaluat avantaj competitiv pe care îl aveți.
2. **~32 din 90 de puncte se dau pe formă**, iar forma e automatizabilă. Un elev care
   învață doar regulile de formă câștigă puncte fără să învețe mai multă literatură.
3. **Subiectul II: 3 tipuri de cerință în 6 ani, identice la ambele profiluri.**
   Automatizabil aproape integral — de aici începem.
4. **Subiectul I.A: șablon fix de 5 verbe.** Exercițiile se pot genera în lot pornind
   de la orice text memorialistic.
5. **Subiectul III: 3 arhetipuri**, cu rubrică de redactare identică de 6 ani.
6. **Corectarea nu e „ori automat, ori mentor", ci pe trei straturi** — și baremul
   însuși ne dă vocabularul pentru stratul cu AI.

---

## Surse

Toate documentele sunt publicate de **Ministerul Educației / Centrul Național pentru
Curriculum și Evaluare** și preluate de Edupedu.ro:

- [Bareme și subiecte BAC 2026 — română real](https://www.edupedu.ro/bac-2026-baremul-de-corectare-pentru-limba-romana-real-publicat-de-ministerul-educatiei-si-cercetarii-cum-se-acorda-punctajul-pentru-fiecare-subiect/)
- [Bareme BAC 2026 — română uman](https://www.edupedu.ro/bac-2026-baremul-de-corectare-si-notare-pentru-proba-de-limba-romana-uman-publicat-de-ministerul-educatiei-si-cercetarii/)
- [Bareme BAC 2025 — real și tehnologic](https://www.edupedu.ro/bac-2025-bac-2025-baremul-de-corectare-si-notare-pentru-proba-de-limba-romana-real-si-tehnologic-publicat-de-ministerul-educatiei-si-cercetarii/)
- [Bareme BAC 2025 — uman](https://www.edupedu.ro/bac-2025-baremul-de-corectare-si-notare-pentru-proba-de-limba-romana-uman-publicat-de-ministerul-educatiei-si-cercetarii/)
- [Bareme BAC 2024](https://www.edupedu.ro/baremele-de-corectare-si-notare-pentru-proba-de-limba-romana-de-la-bacalaureat-2024-publicate-de-ministerul-educatiei/)
- [Bareme BAC 2023](https://www.edupedu.ro/baremele-de-corectare-si-subiectele-pentru-proba-de-limba-romana-de-la-bacalaureat-2023-publicate-de-ministerul-educatiei/)
- [Bareme BAC 2025 toamnă](https://www.edupedu.ro/ultima-ora-bareme-de-corectare-si-subiecte-limba-si-literatura-romana-bac-2025-toamna-eseu-despre-un-text-dramatic-studiat-pentru-candidatii-de-la-real-si-tehnologic-cerinta-la-subiectul-iii/) (neanalizat încă)
- Sursa oficială primară: **subiecte.edu.ro**, publicare la ora 15:00 în ziua examenului
