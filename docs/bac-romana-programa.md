# BAC la română — programa, structura examenului și cum o fragmentăm în aplicație

> Document de lucru, scris la 2026-08-07. Pereche cu [`duolingo-research.md`](duolingo-research.md):
> acela spune **cum** structurăm învățarea, ăsta spune **ce** structurăm.
> Secțiunile 1-5 sunt fapte despre examen. Secțiunea 6 e propunerea mea de arhitectură
> a conținutului — acolo e discuția.

---

## 1. Structura probei E)a) — Limba și literatura română

Probă **scrisă, 3 ore**, obligatorie pentru toți candidații, indiferent de filieră.

| | Ce se cere | Puncte |
|---|---|---|
| **Subiectul I. A** | 5 cerințe pe un **text la prima vedere** (literar sau nonliterar: jurnal, articol, memorialistic) | **30** |
| **Subiectul I. B** | **Text argumentativ** de minimum 150 de cuvinte, pornind de la o afirmație/temă | **20** |
| **Subiectul al II-lea** | Aplicarea unui **concept de teorie literară** pe un text dat | **10** |
| **Subiectul al III-lea** | **Eseu** de minimum 400 de cuvinte despre o operă/autor studiat | **30** |
| **Oficiu** | | **10** |
| | | **100 = nota 10** |

Punctele de **redactare** (organizare, coerență, ortografie, punctuație, registru) sunt
incluse în subiectele cu text lung (I.B și III), nu se dau separat.

> **Precizie:** împărțirea 50 / 10 / 30 + 10 oficiu și structura A (30p) / B (20p) sunt
> confirmate de mai multe surse. Alocarea exactă pe fiecare dintre cele 5 cerințe din
> I.A **nu am putut-o verifica** direct în baremul oficial (PDF-ul nu s-a putut citi
> automat). De confirmat înainte de a construi punctaje în aplicație — probabil
> 5 cerințe × 6 puncte, dar nu garantez.

**Promovare:** medie minimum **6,00**, cu **minimum 5 la fiecare probă**. O notă sub 5
la română înseamnă bac picat, oricât de bune ar fi celelalte.

---

## 2. Ce spune programa oficială

Programa de examen (ordin de ministru, actualizată anual doar formal — conținutul e
stabil de ani buni) definește **4 competențe** și **2 domenii de conținut**.

### Competențe evaluate
1. **Utilizarea corectă și adecvată a limbii** — comunicare orală și scrisă, adecvare
   stilistică, receptarea mesajelor.
2. **Comprehensiune și interpretare** — identificarea temei, analiza structurii
   narative/dramatice/poetice, compararea viziunilor despre lume, răspuns personal
   argumentat.
3. **Punere în context** — încadrarea textelor în curente culturale și literare,
   construirea unei viziuni de ansamblu asupra fenomenului cultural românesc.
4. **Argumentare** — susținerea unui punct de vedere, oral și scris.

### A. Literatura română — conținuturi

**Autori canonici** (17): Mihai Eminescu, Ion Creangă, I.L. Caragiale, Titu Maiorescu,
Ioan Slavici, G. Bacovia, Lucian Blaga, Tudor Arghezi, Ion Barbu, Mihail Sadoveanu,
Liviu Rebreanu, Camil Petrescu, G. Călinescu, E. Lovinescu, Marin Preda,
Nichita Stănescu, Marin Sorescu.

> **Detaliu important din programă:** *„examenul nu presupune studiul monografic al
> scriitorilor canonici, ci studierea a cel puțin unui text din opera lor"*.
> Cu alte cuvinte: **un text per autor e suficient.** Asta limitează dramatic
> volumul real de conținut și e o veste bună pentru noi.

**Perioade și curente:**
- Umanism și Iluminism (sec. XVII-XVIII)
- Perioada pașoptistă, criticismul junimist
- Romantism, Realism, Simbolism
- Interbelic: romanul psihologic și cel al experienței, modernism vs. tradiționalism,
  avangardă, identitate culturală în context european
- Postbelic: proză, poezie și teatru 1960-1980 și post-1980, postmodernism

**Genuri și concepte de analiză:**
- **Epic:** construcția subiectului (incipit, final, episoade), personaj și modalități
  de caracterizare, perspectivă narativă, specii (basm cult, nuvelă, roman), registre
  stilistice, stil direct/indirect/indirect liber
- **Dramatic:** construcția subiectului, caracterizare, specii (comedie, dramă),
  obligatoriu un text dramatic postbelic, cronica de spectacol
- **Liric:** titlu, incipit, relații de opoziție, motiv/laitmotiv/simbol central,
  figuri semantice, elemente de prozodie, instanțele comunicării în textul poetic

### B. Limbă și comunicare — conținuturi

Cinci niveluri, toate testabile la Subiectul I.A:
- **Fonetic:** pronunțarea neologismelor, hiat, diftong, triftong, accent
- **Lexico-semantic:** câmpuri semantice, **pleonasm, tautologie, confuzie paronimică**,
  derivare și compunere, polisemie, sinonimie, antonimie, omonimie, unități
  frazeologice, sens denotativ vs. conotativ
- **Morfosintactic:** flexiune, acord, elemente de relație
- **Ortografie și punctuație:** normele actuale, scrierea cu majusculă, despărțirea în
  silabe, semnele de punctuație
- **Stilistic-textual:** registre funcționale, coerență și coeziune, tipuri de text
  (narativ, descriptiv, informativ, argumentativ), limbaj popular/regional/arhaic,
  figuri de stil

---

## 3. Ce se cere efectiv — tipare recurente

Aici e observația cea mai utilă pentru construit conținut: **examenul e mult mai
previzibil decât pare**.

### Subiectul al II-lea (10p) — cel mai previzibil dintre toate
Cerința e aproape mereu una dintre:
1. **perspectiva narativă**
2. **rolul notațiilor autorului** (text dramatic)
3. **relația dintre ideea poetică și mijloacele artistice**
4. **două modalități de caracterizare a personajului**
5. mai rar: **trăsături ale unui curent literar** (romantism, simbolism, realism,
   modernism, neomodernism, tradiționalism, postmodernism, iluminism, ideologia pașoptistă)
6. mai rar: **rolul modurilor și timpurilor verbale**

Punctajul: **6 puncte conținut + 4 puncte prezentare** (structură cu introducere,
cuprins, încheiere).

**Greșelile tipice, semnalate de profesorii corectori:**
- începe direct cu exemple din text, fără să explice mai întâi conceptul cerut;
- lipsește concluzia.

> Un subiect de 10 puncte, cu ~6 tipuri de cerință și o schemă fixă de rezolvare.
> **Se poate automatiza aproape complet.**

### Subiectul al III-lea (30p) — eseul
Diferă pe profil:
- **Real / tehnologic:** prezentarea particularităților unei **opere** sau ale unui
  **personaj** studiat;
- **Uman / pedagogic:** abordări mai complexe, cu valorificarea unor concepte de
  **istorie și teorie literară**.

Exemplu real, BAC 2026: la uman — particularitățile unui text liric de Arghezi
(*Testament*); la real — de Bacovia (*Plumb*).

### Subiectul I (50p) — singurul care nu se poate „învăța"
Textul e **la prima vedere**. Nu există listă de memorat. Se antrenează exclusiv prin
**exercițiu repetat pe texte diferite** — ceea ce, arhitectural, seamănă mult mai mult
cu Duolingo decât restul examenului.

---

## 4. Unde pică elevii — date

- **Promovabilitate 2026:** 74,8% înainte de contestații (2025: 74,3%).
- **Promoția curentă: 79,7%.** Promoțiile anterioare: **31,7%** — o prăpastie.
- Dintre cei ~29.000 respinși, aproximativ **5.500 au ratat la mustață**: 1.106 cu
  medii 5-5,49 și 4.373 cu 5,5-5,98, față de 6,00 necesar.
- Note de 10: **499 la română**, față de 3.832 la proba obligatorie a profilului și
  3.312 la cea la alegere. **Româna e vizibil mai grea** decât materiile de profil.

**Ce spun datele astea pentru produs:**
1. **Publicul cel mai disperat sunt promoțiile anterioare** (31,7% promovare) — oameni
   care au picat deja o dată și încearcă din nou, fără școală în spate. Sunt și cei mai
   dispuși să plătească.
2. **5.500 de elevi pe an ratează cu sub 0,5 puncte.** Marginea aia e exact ce poate
   muta o platformă de exerciții. E și cel mai bun argument de marketing pe care îl
   aveți.
3. **Româna e materia care blochează.** Confirmă alegerea de a începe cu ea.

---

## 5. Se schimbă examenul? (reforma Legii 198/2023)

**Nu în orizontul vostru.** Schimbările majore (proba nouă „F — Competențe de bază",
evaluare la două limbi moderne, restructurarea probei de română pentru a elimina
„învățarea mecanică") se aplică **generațiilor care încep liceul din 2026-2027**, deci
primul bac nou e **2030**.

> **Consecință:** conținutul pe care îl construiți acum are cel puțin **3-4 ani de
> valabilitate** neschimbată. E o fereastră confortabilă. Dar arhitectura de conținut
> ar fi bine să nu presupună că formatul e etern — vezi propunerea de mai jos, unde
> separ „ce se învață" de „cum se testează".

---

## 6. Propunere: cum fragmentăm materia în aplicație

### 6.1. Problema de fond

Modelul nostru actual e **unidimensional**: `chapters → lessons`, o ierarhie de tip
manual. Materia de BAC la română **nu e unidimensională**. Un singur eseu despre *Ion*
atinge simultan:

- **autorul** Rebreanu · **specia** roman · **curentul** realism · **perioada** interbelic
- **conceptele** perspectivă narativă, caracterizare, incipit/final, temă
- **competența de redactare** eseu structurat, minimum 400 de cuvinte

Dacă facem un capitol „Ion" și altul „Realismul", conținutul se dublează. Dacă facem
doar „Realismul", elevul care caută „Ion" nu-l găsește.

### 6.2. Propunerea: trei axe, nu una

**Axa 1 — Conținut literar (ce citești).** Ierarhia principală, cea pe care o vede
elevul. Aici funcționează `chapters → lessons` fără modificări:

```
Perioada pașoptistă și romantismul
  ├── Curentul: romantismul românesc
  ├── Eminescu — Luceafărul (text liric)
  └── Negruzzi — Alexandru Lăpușneanul (nuvelă)
Realismul și romanul interbelic
  ├── Curentul: realismul
  ├── Rebreanu — Ion
  ├── Camil Petrescu — Ultima noapte de dragoste...
  └── Călinescu — Enigma Otiliei
...
```

**Axa 2 — Concepte de teorie literară (ce trebuie să știi să aplici).** Nu sunt
capitole de citit, sunt **unelte reutilizabile**: perspectivă narativă, caracterizare,
incipit/final, notațiile autorului, prozodie, figuri de stil, registre stilistice.
Fiecare se aplică la zeci de opere. Sunt exact ce se cere la **Subiectul II**.

**Axa 3 — Competențe de examen (ce trebuie să știi să faci).** Textul argumentativ,
eseul structurat, cerințele de limbă (pleonasm, paronime, ortografie). Se antrenează
prin exerciții, nu prin lectură.

> Axa 1 e **ierarhie**. Axele 2 și 3 sunt **etichete** care traversează ierarhia.
> Tehnic: un tabel `tags` + `content_tags`, sau, mai simplu la început, un câmp
> `tags text[]` pe `lessons` și pe `questions`.

### 6.3. De ce contează etichetele — cazuri concrete

Cu etichete, obții gratis lucruri care altfel cer conținut duplicat:
- „**Toate întrebările despre perspectivă narativă**", indiferent de operă → exact
  antrenamentul pentru Subiectul II;
- „**Simulare de Subiectul I**" — 5 cerințe extrase din bănci diferite, pe un text nou;
- „**Ce nu știi**" — Duolingo-style: capitolele/conceptele unde ai rata cea mai mare de
  greșeli (vezi `answer_events` din celălalt document);
- **profilul real vs. uman** — aceleași lecții, filtrare diferită a cerințelor.

### 6.4. Estimare de volum

Ăsta e argumentul că proiectul e fezabil:

| Axă | Unități | Observație |
|---|---|---|
| Autori canonici | **17** | *cel puțin un text per autor* — programa o spune explicit |
| Opere de studiat | **~25-30** | lista uzuală: Ion, Moromeții, Enigma Otiliei, Ultima noapte…, Maitreyi, Moara cu noroc, Baltagul, Hanul Ancuței, Alexandru Lăpușneanul, Harap-Alb, O scrisoare pierdută, Iona + ~13 poezii |
| Curente/perioade | **~10** | iluminism, pașoptism, junimism, romantism, realism, simbolism, modernism, tradiționalism, neomodernism, postmodernism |
| Concepte de teorie literară | **~15-20** | reutilizabile la toate operele |
| Niveluri de limbă | **5** | fonetic, lexico-semantic, morfosintactic, ortografie/punctuație, stilistic |

**Total: ~60-70 de unități de conținut.** Nu 500. Un profesor care validează conținut
generat poate acoperi asta în săptămâni, nu în ani — mai ales cu tiparul „generează →
evaluează → omul revizuiește" din cercetarea Duolingo.

### 6.5. Ciocnirea cu modelul nostru de testare — problema reală

Aici e lucrul care trebuie discutat înainte de orice cod:

> **Sistemul nostru de teste grilă (întrebare + 4 variante + o singură corectă) poate
> evalua onest cam 40% din examen.**

| Subiect | Puncte | Se poate grilă? |
|---|---|---|
| I.A — 5 cerințe pe text la prima vedere | 30 | **Parțial.** Cerințele de limbă (sinonime, sens, figuri) da. Cele de interpretare — nu, cer răspuns formulat |
| I.B — text argumentativ | 20 | **Nu.** Text liber |
| II — concept de teorie literară | 10 | **Parțial.** Recunoașterea conceptului da; redactarea celor 4 puncte de prezentare — nu |
| III — eseu | 30 | **Nu.** 400+ cuvinte |

Deci grila acoperă bine **~30-40 de puncte din 90**. Restul e text liber, care cere
**evaluare umană sau AI**.

**Trei opțiuni, cu costurile lor:**
1. **Grilă + tichete către profesor** (ce avem deja). Onest, dar nu scalează: un
   profesor nu poate corecta 200 de eseuri pe săptămână.
2. **Grilă + autoevaluare pe barem.** Elevul scrie, apoi vede baremul oficial și își
   bifează singur criteriile. Ieftin, educativ (învață baremul, care e jumătate din
   examen), dar depinde de onestitatea elevului.
3. **Grilă + evaluare AI pe barem.** Un LLM notează eseul după criteriile baremului și
   explică unde s-au pierdut puncte. Cel mai valoros pentru elev, dar e cost recurent
   și necesită validare atentă — un feedback greșit e mai rău decât niciunul.

> Nu recomand una acum. E **decizia de produs cea mai importantă** din următoarea
> perioadă și trebuie luată în cunoștință de cauză, nu implicit prin ce e mai ușor
> de codat.

### 6.6. Ce ar însemna concret în schema actuală

Modificări mici, aditive:
- `chapters` — adăugăm un `kind` (`opera` / `curent` / `concept` / `limba`), ca să
  putem randa diferit și filtra;
- `lessons` — `tags text[]`;
- `questions` — `tags text[]` + `subiect` (I.A / I.B / II / III) + `profil`
  (real / uman / ambele);
- eventual `question_type` — momentan avem doar grilă cu o singură variantă corectă;
  formatul examenului cere și **răspuns scurt** și **text liber**.

Nimic din toate astea nu strică ce e deja în producție.

---

## 7. Întrebări deschise

1. **Cum evaluăm textul liber** (I.B și III, adică **50 din 90 de puncte**)? Profesor,
   autoevaluare pe barem, sau AI?
2. **Etichete de la început sau ierarhie simplă acum?** Etichetele costă puțin acum și
   mult mai târziu.
3. **Real și uman în aceeași aplicație**, filtrat, sau două parcursuri separate?
4. **Publicul-țintă:** elevii de a XII-a, sau și **promoțiile anterioare** (31,7%
   promovare — cea mai mare nevoie și cea mai mare disponibilitate de a plăti)?
5. **Ordinea de construit conținut:** după structura examenului (întâi Subiectul II,
   cel mai previzibil și automatizabil), sau după cronologia literară (cum e la școală)?
6. **Confirmăm baremul exact** pe cerințele din I.A înainte să codăm punctaje?

---

## Surse

**Oficiale**
- [Ministerul Educației — programe pentru probele de bacalaureat](https://www.edu.ro/programe_probe_examen_bacalaureat_2024)
- [Programa simulare BAC 2026 — română, profil real (PDF)](https://cdn.edupedu.ro/wp-content/uploads/2026/02/Anexa_12_Programa_simulare_Limba_si_literatura_romana_profil_real_bac_2026.pdf)
- [Programa simulare BAC 2026 — română, profil umanist (PDF)](https://cdn.edupedu.ro/wp-content/uploads/2026/02/Anexa_13_Programa_simulare_Limba_si_literatura_romana_profil_umanist_bac_2026.pdf)
- [ROCNEE — ordine și programe de bacalaureat](https://rocnee.eu/)
- Subiectele și baremele oficiale se publică la ora 15:00 în ziua examenului pe **subiecte.edu.ro**

**Edupedu.ro**
- [Programele pentru simularea Bacalaureatului 2026](https://www.edupedu.ro/descarca-programele-pentru-simularea-bacalaureatului-2026-la-limba-romana-matematica-istorie-si-disciplinele-la-alegere-publicate-de-ministerul-educatiei-si-cercetarii/)
- [Baremul de corectare BAC 2026, limba română real](https://www.edupedu.ro/bac-2026-baremul-de-corectare-pentru-limba-romana-real-publicat-de-ministerul-educatiei-si-cercetarii-cum-se-acorda-punctajul-pentru-fiecare-subiect/)
- [Textul argumentativ pentru Bacalaureat — structură și model (Univ. de Vest Timișoara)](https://www.edupedu.ro/textul-argumentativ-pentru-bacalaureat-2025-structura-conectori-explicatii-si-model-de-rezolvare-pentru-elevii-de-liceu-de-universitatea-de-vest-din-timisoara/)
- [Modele de subiecte, competențe lingvistice și proba orală, BAC 2026](https://www.edupedu.ro/modele-de-subiecte-pentru-bacalaureat-2026-competente-lingvistice-proba-orala-la-limba-romana-si-romana-pentru-scolile-cu-predare-in-limba-maghiara-publicate-de-ministerul-educatiei-descarca-bile/)
- [Bacalaureat 2027 — propunerile din noua lege a educației](https://www.edupedu.ro/bac-2023-o-singura-proba-ce-va-contine-competente-generale-din-limba-romana-matematica-stiinte-istorie-si-geografie-si-doua-probe-de-limbi-straine-propunerile-din-noua-lege-a-educatiei/)

**Conținut și structură**
- [Programa BAC 2026 — română, conținuturi complete](https://www.teste-bacalaureat.ro/programa-bacalaureat/programa-bac-romana.html)
- [Subiectul II — schema de rezolvare și punctajul (HotNews)](https://hotnews.ro/bac-la-romana-cum-iei-toate-cele-10-puncte-la-subiectul-al-ii-lea-schema-de-rezolvare-care-te-ajuta-indiferent-de-textul-primit-2273664)
- [Subiectele la română, BAC 2026 — real și uman](https://www.mediafax.ro/social/bacalaureat-2026-subiectele-la-romana-bacovia-la-real-arghezi-la-uman-si-perspectiva-narativa-la-subiectul-ii-23762991)
- [Modele de subiecte pentru toate probele scrise (Digi24)](https://www.digi24.ro/stiri/actualitate/educatie/bacalaureat-2026-modele-de-subiecte-pentru-toate-probele-scrise-ce-au-avut-de-rezolvat-elevii-in-anii-trecuti-la-examen-si-simulare-3828047)

**Rezultate**
- [Rezultate BAC 2026 — promovabilitate 74,8%](https://www.euronews.ro/articole/rezultate-bac-2026-note-probele-scrise-bacalaureat-edu-ro)
- [Analiza completă a promovabilității pe județe și filiere (InfoCons)](https://infocons.ro/bacalaureat-2026-rezultatele-finale-dupa-contestatii-analiza-completa-a-promovabilitatii-pe-judete-filiere-si-medii/)
- [Rezultate BAC 2025 — 74,3% (ProTV)](https://stirileprotv.ro/stiri/bacalaureat/rezultate-bac-2025-publicate-in-timp-real-pe-stirileprotv-ro-cum-si-unde-verifici-notele-de-la-examenul-de-bacalaureat.html)

> **Notă despre surse:** programa și structura vin din documente oficiale ale
> Ministerului. Tiparele de la Subiectul II și „greșelile frecvente" vin din presa
> educațională și ghiduri de pregătire — bune ca orientare, dar **de validat cu
> profesorul partener** înainte să devină structură de produs.
