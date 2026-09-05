# Dicționar de funcții

> **Pentru cine e.** Pentru Andrei, și pentru oricine vrea să înțeleagă ce face codul fără
> să-l citească. Fiecare funcție importantă e explicată în trei rânduri: **ce face**, **de
> ce există**, **ce s-ar strica fără ea**.
>
> **Regulă.** Orice funcție nouă mare sau complexă intră aici, în același PR cu codul.
> Nu intră tot — funcțiile mici și evidente ar îneca lista și ar face-o inutilă.
>
> Termenii tehnici din text: [`dictionar.md`](dictionar.md).

---

## Cuprins

- [Cine ești și ce ai voie](#cine-ești-și-ce-ai-voie)
- [Bani: abonament și trial](#bani-abonament-și-trial)
- [Tichete: cine răspunde elevului](#tichete-cine-răspunde-elevului)
- [Liste și paginare](#liste-și-paginare)
- [Corectare](#corectare)
- [Unelte de bază](#unelte-de-bază)

---

## Cine ești și ce ai voie

### `getCurrentAppUser()` — `lib/current-user.ts`

**Ce face.** Întreabă „cine e omul care a trimis cererea asta?" și întoarce fișa lui din
baza noastră: rolul și starea abonamentului.

**De ce există.** Clerk știe că ești logat, dar nu știe că ești profesor sau că ai plătit —
alea sunt informațiile noastre. Funcția asta le pune cap la cap, într-un singur loc.

**Fără ea.** Fiecare rută ar întreba pe cont propriu, în felul ei. Zece variante ușor
diferite ale aceleiași verificări, dintre care una greșită deschide o ușă.

### `isTeacher()` / `poateCorecta()` / `rolInFir()`

**Ce fac.** Răspund la trei întrebări diferite: cine poate **scrie materie** (doar
profesorul), cine poate **corecta și răspunde** (profesorul *și* mentorul), și cum apare
autorul în firul de discuție.

**De ce există separat.** Aici stă tot rostul rolului de mentor. Scrisul de conținut vine în
valuri, la început. Corectarea crește liniar cu numărul de elevi și e cea mai mare muncă din
sistem. Dacă le țineam pe același rol, n-am fi putut aduce oameni **doar** pe corectare fără
să le dăm și drept de scris în materie.

**Fără ele.** Ori mentorii ar putea modifica lecțiile, ori profesorii ar rămâne singurii
care corectează.

### `canAccessPremium()`

**Ce face.** Spune dacă omul are voie la conținutul cu plată.

**De ce există.** Nu se uită doar la „scrie activ în bază", ci și la data de expirare: dacă
data a trecut, blochează, chiar dacă starea a rămas „activ". Un anunț de anulare pierdut de
la Stripe ar fi lăsat altfel accesul deschis la nesfârșit.

**Fără ea.** Cine anulează abonamentul ar putea rămâne cu acces, fără ca cineva să observe.

---

## Bani: abonament și trial

### `POST /api/checkout` — `app/api/checkout/route.ts`

**Ce face.** Pregătește pagina de plată de la Stripe și trimite elevul acolo.

**De ce există așa.** Două verificări stau **aici**, nu în interfață:
1. Profesorii și mentorii sunt refuzați — ei au acces prin rol, o plată de la ei ar fi bani
   luați degeaba, cu rambursare și abonament de anulat manual.
2. Se decide dacă omul primește trial.

**Fără ea.** Ascunderea butonului n-ar fi fost de ajuns: pagina `/upgrade` pornește plata
singură la deschidere, deci simpla vizitare a adresei ducea pe Stripe. Butonul ascuns nu
închide o ușă — ruta o închide.

### `decideTrial()` — `lib/trial.ts`

**Ce face.** Răspunde la „omul ăsta are dreptul la cele 14 zile gratuite?"

**Cum.** Trei filtre, în ordinea costului: are adresa formă de email? e de la un furnizor de
căsuțe temporare? a mai folosit cineva trialul pe aceeași căsuță?

**Decizia importantă.** Dacă baza de date nu răspunde, **acordă** trialul. Un elev real
rămas fără trial din cauza unei defecțiuni la noi e o pierdere mai mare decât un trial dat
în plus unui abuzator.

**Fără ea.** Trialul s-ar reînnoi la infinit cu un cont nou la fiecare două săptămâni.

### `normalizeazaEmail()` — `lib/email-normalizat.ts`

**Ce face.** Aduce adresa la o formă unică, ca să recunoaștem aceeași căsuță scrisă în zece
feluri. `E.l.e.v+bac2@Googlemail.com` devine `elev@gmail.com`.

**Amănuntul care contează.** Punctele se scot **doar** la Gmail, unde chiar sunt ignorate de
furnizor. La restul domeniilor, `ion.popescu@scoala.ro` și `ionpopescu@scoala.ro` sunt doi
oameni diferiți.

**Fără grija asta.** Am fi refuzat trialul unor elevi nevinovați, tăcut, fără ca ei sau noi
să înțelegem de ce. Are test de regresie tocmai ca nimeni să nu „simplifice" regula mai
târziu.

### `marcheazaTrialConsumat()` — `lib/trial.ts`

**Ce face.** Notează că această căsuță și-a folosit trialul.

**Când.** Abia **după** ce plata s-a finalizat, nu când începe. Între „am apăsat Upgrade" și
Stripe, elevul se poate răzgândi.

**Fără momentul ăsta bine ales.** Un elev care deschide pagina de plată și se răzgândește
și-ar arde trialul fără să fi primit nimic — și n-ar avea cum să-l recupereze.

### `POST /api/webhooks/stripe` — `app/api/webhooks/stripe/route.ts`

**Ce face.** Ascultă anunțurile de la Stripe: s-a plătit, s-a reînnoit, s-a anulat — și
actualizează abonamentul în baza noastră.

**De ce e complicat.** Stripe poate trimite **același anunț de mai multe ori**. Ruta
„revendică" fiecare anunț printr-o scriere unică; dacă a mai fost procesat, îl ignoră.

**Fără asta.** Un anunț repetat ar activa abonamentul de mai multe ori, ar trimite mai multe
emailuri și ar strica socoteala.

---

## Tichete: cine răspunde elevului

### `ultimulMentorAlElevului()` — `lib/alocare-tichete.ts`

**Ce face.** Caută cine i-a răspuns ultima dată elevului ăstuia.

**De ce contează.** La corectarea de eseuri, omul care ți-a corectat data trecută știe ce ai
greșit atunci. Continuitatea are valoare reală, nu e o preferință.

**Fără ea.** Elevul ar primi de fiecare dată alt mentor, care pornește de la zero.

### `ePool()` — `lib/alocare-tichete.ts`

**Ce face.** Spune dacă un tichet e liber, adică îl poate lua orice corector.

**Ideea de bază.** Tichetul nou se **rezervă** 8 ore pentru ultimul mentor al elevului.
Mentorul are drept de prim refuz, nu proprietate pe elev. După 8 ore, tichetul devine liber
de la sine — nimeni nu trebuie să-l „elibereze".

**Fără expirare.** Dacă un mentor n-are timp, elevii lui ar aștepta la nesfârșit și nimeni
altcineva n-ar vedea problema. Indisponibilitatea unui om ar deveni o defecțiune tăcută.

### `eIntarziat()` — `lib/alocare-tichete.ts`

**Ce face.** Marchează tichetele mai vechi de 24 de ore pe care nu le-a luat nimeni.

**De ce e nevoie și de al doilea prag.** Un tichet pe care nu-l vrea nimeni ar sta în morman
la nesfârșit. Marcat și urcat în capul listei, devine vizibil.

**Amănunt.** Un tichet **preluat** nu e niciodată „întârziat", oricât ar sta — are un om pe
el. Problema semnalată aici e alta: că nu-l vrea nimeni.

### `POST /api/tickets/[id]/preia` — `app/api/tickets/[id]/preia/route.ts`

**Ce face.** Un corector ia un tichet din morman.

**Partea interesantă.** Doi mentori pot apăsa în aceeași secundă. Ruta nu verifică întâi și
scrie după — asta ar lăsa o fereastră între cele două momente. Scrie direct, **cu condiția
inclusă**: „ia-l, dar numai dacă nu l-a luat nimeni". Baza de date decide, iar cel de-al
doilea primește 409.

**Fără asta.** Ambii mentori ar crede că au tichetul și ar scrie amândoi elevului.

### `POST /api/tickets` — deschiderea unui tichet

**Ce face.** Elevul apasă „Nu am înțeles" într-o lecție și se creează firul de discuție.

**Ce se întâmplă pe ascuns.** Aproape tot contextul pe care îl vede profesorul se citește
**pe server**: ce lecție, ce capitol, cum stătea elevul la testul capitolului în acel
moment. De la client vin doar lucrurile pe care serverul n-are de unde să le știe — ce
fragment a selectat și unde ajunsese în pagină.

**De ce.** Ce trimite clientul poate fi modificat. Dacă am fi crezut clientul pe cuvânt,
cineva ar fi putut deschide tichete despre lecții la care nu are acces.

**Notă despre progres.** Cifrele se **îngheață** la momentul întrebării. Profesorul trebuie
să vadă cum stătea elevul **când a întrebat**, nu cum stă când citește, două zile mai
târziu.

### `POST /api/tickets/[id]/messages` — răspunsul în fir

**Ce face.** Adaugă un mesaj în discuție și mută starea tichetului după cine a vorbit
ultimul: răspunde profesorul → „răspuns"; revine elevul → „deschis", și reintră în coadă.

**Amănunt.** Rolul autorului se **îngheață** la momentul scrierii. Dacă un elev devine mai
târziu profesor, mesajele lui vechi nu se transformă retroactiv în răspunsuri oficiale.

**Emailul.** Notificarea către elev se trimite **după** ce mesajul e deja salvat, și nu poate
dărâma ruta dacă eșuează. Un email nelivrat nu are voie să piardă munca profesorului.

---

## Liste și paginare

### `citestePaginarea()` și `taiePagina()` — `lib/paginare.ts`

**Ce fac.** Împart listele lungi în pagini. Prima citește din cerere câte rânduri se vor și
de unde; a doua taie rezultatul și spune dacă mai urmează ceva.

**Trucul.** Cerem mereu **un rând în plus** decât se afișează. Dacă vine, știm că mai
urmează o pagină. Alternativa era o a doua interogare care numără tot tabelul, la fiecare
pagină, pentru un număr pe care interfața nici nu-l afișează.

**Fără ele.** Lista de tichete a unui corector ar crește cu fiecare întrebare pusă vreodată
pe platformă și ar fi trimisă întreagă, de fiecare dată — pe telefon, pe datele elevului.

### `GET /api/tickets`

**Ce face.** Dă lista de tichete: elevului, pe ale lui; corectorului, trei liste — toate,
„ale mele" și mormanul comun.

**Ce s-a învățat aici.** La început, cele trei liste se despărțeau în cod, după ce se
aduceau toate tichetele. Corect — dar **numai** cât timp se aduceau chiar toate. Odată
paginate, „mormanul" ar fi însemnat „ce s-a nimerit în primele 50", adică o listă care arată
ca o coadă și nu e. Acum despărțirea se cere direct de la baza de date.

---

## Corectare

### `lib/corectare-strat1.ts`

**Ce face.** Acordă automat punctele care se pot da **fără interpretare**: are lucrarea
numărul cerut de cuvinte, are cele trei părți, apare citatul, câte greșeli de limbă sunt.
Pe tot baremul înseamnă circa 20 din cele 90 de puncte.

**Regula care guvernează tot fișierul.** Mai bine spune „nu pot verifica" decât să dea 0.
Un 0 nemeritat, dat tăcut pentru că o unealtă lipsea, e mai rău decât un criteriu lăsat
nenotat — elevul crede că a greșit ceva ce de fapt nu s-a măsurat. De aceea fiecare
rezultat are o **stare**, nu doar un punctaj.

**Limita, spusă pe față.** Poate verifica **prezența și forma**, nu calitatea. Poate spune
că există trei paragrafe, nu că introducerea e bună.

---

## Unelte de bază

### `logError()` — `lib/log-error.ts`

**Ce face.** Scrie erorile într-un tabel, ca să se vadă în panoul de administrare. Cele
critice (plăți) trimit și o alertă instant pe Discord.

**De ce.** O eroare pe care n-o vede nimeni e o eroare care se repetă.

### `apiError()` — `lib/api-error.ts`

**Ce face.** Dă tuturor erorilor aceeași formă: un cod stabil plus un mesaj.

**De ce.** Frontendul se poate lega de codul care nu se schimbă, în loc să ghicească după
textul mesajului. Textul se poate rescrie oricând fără să strice nimic.

### `lib/env.ts` + `instrumentation.ts`

**Ce fac.** Verifică, o singură dată la pornire, că toate setările obligatorii există și
arată cum trebuie. Dacă lipsește una, serverul **refuză să pornească**, cu un mesaj clar.

**De ce așa de dur.** Alternativa e un server care pornește și se comportă ciudat abia peste
două ore, la prima plată — cu mult mai greu de legat de cauză.
