# Viziunea produsului — decizii și direcție

> Notat la 2026-08-07, din discuția cu Andrei. Acesta e documentul de **intenție**:
> ce vrem să construim și de ce. Cum se traduce în conținut → [`bac-romana-programa.md`](bac-romana-programa.md)
> și [`bac-barem-analiza.md`](bac-barem-analiza.md). De unde ne inspirăm → [`duolingo-research.md`](duolingo-research.md).
>
> Nimic de aici nu e încă în TASKS.md. Se sparge în sarcini după ce se validează.

---

## Principiul de bază

**Nu vindem conținut, vindem înțelegere.** Materia de BAC e disponibilă gratuit în
manuale, pe zeci de site-uri și în orice librărie. Ce lipsește e răspunsul la
„de ce am greșit" și „ce fac mai departe".

Și, din analiza baremelor: **elevul trebuie să învețe să lucreze pe barem.** Un elev
care știe *Ion* dar nu știe cum se punctează eseul pierde puncte pe care le-a meritat.
Asta e o problemă rezolvabilă prin software, spre deosebire de „a ști literatură".

---

## 1. Parcurs diferențiat per elev

**Ce vrem:** fiecare elev avansează în ritmul lui. Cine înțelege repede merge mai
departe; cine se blochează primește sprijin, nu presiune.

**Cum:** un model simplu de **stăpânire per concept** — pentru fiecare etichetă
(perspectivă narativă, paronime, realism…), rata de răspunsuri corecte recente.
Din ea ies „ce știi", „ce nu știi" și „ce urmează". **Nu** ne trebuie IRT/Birdbrain
la început; ne trebuie date corecte.

**Precondiție tehnică — blocantă:** `student_progress` face upsert și suprascrie.
Nu reținem ce a răspuns elevul la fiecare întrebare, nici când. Fără un jurnal de
răspunsuri (`answer_events`: elev, întrebare, ce a ales, corect, timestamp), nu există
parcurs adaptiv, nici „greșelile mele", nici statistici per întrebare. **O migrare de
o oră acum; mult mai scump peste un an.**

**Ideea centrală pentru „a-i face să înțeleagă":**

> Nu explicăm doar răspunsul corect. Explicăm **de ce fiecare variantă greșită e greșită.**

Un elev care alege „perspectivă obiectivă" în loc de „subiectivă" are o confuzie
*specifică*. Dacă îi arăți doar răspunsul bun, o repetă. Avem deja
`questions.explanation` nefolosit — trebuie una **per variantă**. Costă o migrare mică
și transformă fiecare greșeală în lecție. E exact ce a făcut Duolingo când a mutat
„Explain My Answer" din abonamentul plătit în cel gratuit: explicația greșelii nu e
lux, e necesitate pedagogică.

---

## 2. Motivație și combaterea abandonului

**Ce vrem:** elevii își pierd motivația și abandonează, chiar dacă examenul e la o
dată fixă. Vrem să contracarăm asta.

**Diferența față de Duolingo:** ei fabrică motivația de la zero. La noi, examenul o
oferă gratis — dar e **fragilă și intermitentă**. Nu trebuie fabricată, ci
**întreținută și direcționată**.

**Mecanici, adaptate (nu copiate):**
- **Nota estimată**, nu XP. „Ești la ~6,4; cu 20 de minute pe zi până în iunie ajungi
  la ~7,5." Singura metrică pe care un elev de a XII-a o simte reală.
- **Numărătoare inversă cu plan**, nu doar cu presiune: „47 de zile, n-ai atins
  Integralele" bate „mai sunt 47 de zile".
- **Streak cu îngheț, obligatoriu împreună.** Un elev care învață 6 zile și ratează
  duminica nu trebuie pedepsit — altfel abandonează complet, logica „oricum am pierdut
  totul".
- **Cale de revenire.** Duolingo optimizează pentru cei activi; noi trebuie să
  optimizăm pentru **cel care a lipsit două săptămâni**. Ecranul de la revenire e cel
  mai important din aplicație: nu „ai pierdut 14 zile", ci „hai să recuperăm, uite trei
  lucruri esențiale".

**Ce respingem explicit:** vieți/hearts (pedepsesc exact comportamentul dorit —
exersatul), ligi publice (stres inutil la un public deja stresat), XP ca metrică
centrală (avem una onestă: nota estimată).

**Rezervă onestă:** putem reduce abandonul *din aplicație*. Abandonul școlar din
România are cauze socio-economice pe care o platformă nu le atinge. Nu construim
promisiuni pe care produsul nu le poate ține.

---

## 3. AI progresiv, în două faze

**Faza 1 — acum. AI ieftin, în lot, fără cereri de la elevi.**
Exact tiparul **DuoFactory** de la Duolingo: generează mai multe variante → un al
doilea model le evaluează → **omul revizuiește** → intră în DB ca date statice.

Ce generăm:
- întrebări grilă **cu explicație per variantă**;
- texte la prima vedere cu cerințe (Subiectul I) — reutilizabile la infinit;
- etichetarea automată a conținutului existent;
- pre-notarea pe barem (vezi documentul de bareme).

**De ce contează:** profesorul devine **revizor, nu autor**. Asta deblochează exact
gâtuirea de acum — „structura reală BAC" și „conținut lecții" stau de săptămâni pe
disponibilitatea profesorului partener. Costul e o singură dată, nu per elev: ordinul
zecilor de euro pentru câteva mii de întrebări (estimare, de confirmat la prima rulare).

**Faza 2 — când există buget.** Agent conversațional pentru elevi, cu limite stricte
per elev (buget de token-uri, rate limit, răspunsuri cache-uite pentru întrebări
frecvente).

---

## 4. Gramatica

**Ce vrem:** tratată serios, nu ca detaliu. Din analiza baremelor rezultă că e chiar
mai important decât părea — **ortografia și punctuația se punctează explicit la fiecare
subiect**.

**Răspunsul e „ambele, dar în ordinea asta":**

| Tip de problemă | Unealtă | Cost per corectare |
|---|---|---|
| Ortografie, punctuație, acord, paronime, pleonasm | **LanguageTool** self-hostat (open-source, suport de română: dicționar + ~300 de reguli, contribuite de archeus.ro) | **zero** |
| Coerență, coeziune, structura argumentării, registru | LLM, faza 2 | per cerere |

LanguageTool întâi, pentru că acoperă fix ce se punctează la „redactare" în barem, e
explicabil („regula X"), nu halucinează și e gratuit la rulare.

**Două avertismente:** regulile de română sunt bune, dar nu exhaustive; și orice
corector produce **fals-pozitive**. Într-un produs educațional, un corector care
„corectează" greșit e mai dăunător decât unul absent — deci se prezintă ca **sugestie**,
nu ca verdict.

---

## 5. Adăugiri din partea mea

- **Începem cu Subiectul II.** 10 puncte, ~6 tipuri de cerință, schemă fixă, punctaj
  cunoscut. Singura bucată din examen automatizabilă aproape integral. Cel mai bun
  raport valoare/efort pentru primul conținut real. (Analiza baremelor confirmă: în
  6 ani au fost **3 tipuri** de cerință, identice la ambele profiluri.)
- **Simulare cronometrată de 3 ore.** Mulți elevi nu pică din necunoaștere, ci din
  gestionarea timpului.
- **Publicul uitat: promoțiile anterioare.** 31,7% promovabilitate față de 79,7% la
  promoția curentă. Cea mai mare nevoie, cea mai mare disponibilitate de a plăti,
  zero concurență din partea școlii.
- **Marginea de 0,5 puncte.** ~5.500 de elevi pe an ratează bacul cu sub jumătate de
  punct. E fix marja pe care o mută o platformă de exerciții — și cel mai bun argument
  de marketing pe care îl aveți.

---

## 6. Reutilizare — ce există deja, ce nu

**Corectare importantă:** Duolingo **nu are cod de produs public**. Cele 12 depozite
publice sunt unelte interne (pre-commit hooks, linter pe regex, agregator de căutare).
Excepția: [halflife-regression](https://github.com/duolingo/halflife-regression) —
algoritmul de repetiție spațiată, cu cod și 13 milioane de trasee reale de învățare.

Ce reutilizăm de fapt sunt **tiparele documentate** (bucla generează-evaluează-revizuiește,
principiul „elimină resursele partajate", disciplina de măsurare) și, ca **cod**:

| Nevoie | Soluție open-source | Observație |
|---|---|---|
| Repetiție spațiată | **FSRS** | mai modern și mai întreținut decât HLR (2016); folosit de Anki |
| Gramatică română | **LanguageTool** + dicționar RO | self-hostabil, cost zero per cerere |
| Cercetare pe uitare | halflife-regression | valoros ca referință, nu ca dependență |

---

## 7. Ce rămâne de decis

1. **Evaluarea textului liber** (Subiectele I.B și III = **50 din 90 de puncte**):
   mentor, autoevaluare pe barem, sau AI? Vezi `bac-barem-analiza.md` — răspunsul de
   acolo e **stratificat**, nu unic.
2. Free generos vs. capitole premium blocate.
3. Etichete de la început sau ierarhie simplă acum?
4. Real și uman în aceeași aplicație (filtrate) sau parcursuri separate?
5. Ne asumăm colectarea notelor reale de BAC, ca să putem măsura eficacitatea?
