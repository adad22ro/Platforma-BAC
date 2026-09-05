# Dicționar de termeni

> **Pentru cine e.** Pentru Andrei, și pentru oricine intră în proiect fără pregătire
> tehnică. Fiecare termen e explicat în cuvinte obișnuite, cu exemplu din **acest**
> proiect acolo unde există.
>
> **Regulă.** Orice termen tehnic nou folosit în discuție, în `DEVLOG.md` sau într-un PR
> intră aici, în același PR cu codul. Un dicționar rămas în urmă e mai rău decât niciunul,
> pentru că te face să crezi că e complet.
>
> Pentru funcțiile din cod, explicate una câte una: [`dictionar-functii.md`](dictionar-functii.md).

---

## Cuprins

- [Cum e construită aplicația](#cum-e-construită-aplicația)
- [Baza de date](#baza-de-date)
- [Cum se scrie și se livrează codul](#cum-se-scrie-și-se-livrează-codul)
- [Verificări automate](#verificări-automate)
- [Lucruri care merg prost](#lucruri-care-merg-prost)
- [Bani și abonamente](#bani-și-abonamente)
- [Cuvinte care apar des în discuție](#cuvinte-care-apar-des-în-discuție)

---

## Cum e construită aplicația

### Server și client
**Clientul** e programul care rulează pe dispozitivul elevului — browserul, sau mâine
aplicația de telefon. **Serverul** e calculatorul nostru, unde stau datele și regulile.

De ce contează: clientul poate fi păcălit. Oricine poate deschide browserul și trimite
altceva decât trimite butonul. De aceea toate verificările importante — cine ești, ce ai
voie — se fac pe server. E motivul pentru care verificarea de rol la plată stă în API, nu
în butonul ascuns din pagină.

### API
Lista de „lucruri pe care le poate cere clientul de la server". Ca un meniu la restaurant:
clientul comandă de pe meniu, bucătăria decide ce iese.

### Rută (endpoint)
O poziție anume din meniul de mai sus. `/api/tickets` e ruta care dă lista de întrebări
trimise de elevi. Fiecare rută are o adresă și un verb (vezi mai jos).

### GET, POST, PATCH, DELETE
Verbele. **GET** = „dă-mi", nu schimbă nimic. **POST** = „creează ceva nou". **PATCH** =
„modifică o parte". **DELETE** = „șterge".

Regula practică: un GET trebuie să poți să-l repeți de o sută de ori fără efect. Un POST,
nu — de asta contează idempotența (mai jos).

### Cod de status (200, 401, 403, 404, 409, 500)
Numărul cu care serverul răspunde, ca să spună pe scurt cum a mers:

| Cod | Ce înseamnă | La noi |
|---|---|---|
| **200** | A mers | Ai primit datele |
| **201** | A mers, am creat ceva | Tichet nou deschis |
| **401** | Nu ești autentificat | N-ai cont / nu ești logat |
| **402** | Trebuie să plătești | Conținut premium fără abonament |
| **403** | Ești logat, dar n-ai voie | Un profesor care încearcă să plătească abonament |
| **404** | Nu există | Sau: există, dar nu-ți spunem — vezi mai jos |
| **409** | Conflict | Doi mentori au vrut același tichet; unul pierde |
| **500** | S-a stricat ceva la noi | Nu e vina utilizatorului |

Un amănunt care revine des: pentru un tichet care nu-i aparține, răspundem **404, nu 403**.
403 ar însemna „există, dar n-ai voie" — adică i-am confirma existența. 404 nu confirmă
nimic.

### Frontend și backend
**Frontend** = ce se vede și se atinge: pagini, butoane, formulare. Bogdan.
**Backend** = ce nu se vede: baza de date, regulile, plățile, verificările. Andrei.

### Framework, Next.js, React
Un **framework** e un schelet gata făcut, ca să nu construiești o casă de la zero de
fiecare dată. **React** desenează interfața. **Next.js** e stratul de deasupra, care
adaugă paginile, rutele de API și randarea pe server.

### Randare (rendering)
Transformarea datelor în ceva ce vede omul. Se poate face pe server (pagina ajunge gata
făcută) sau în browser (pagina se construiește la tine în dispozitiv). Amestecul lor e
motivul pentru care termeni ca **PPR** (mai jos) contează.

### PPR — randare parțială dinainte
Pagina se rupe în două: partea care e la fel pentru toți (antet, structură) se pregătește
din timp și ajunge instant; partea care depinde de tine (numele tău, progresul tău) vine
imediat după. E o schimbare de comportament pentru **toată** aplicația, nu pentru o pagină
— de asta am amânat-o, ca să n-o pornim peste munca lui Bogdan fără să știe.

### Cache
O copie ținută la îndemână, ca să nu ceri același lucru de zece ori. Ca și cum ai scrie pe
un bilețel răspunsul la o întrebare pusă des.

Capcana: dacă răspunsul **diferă în funcție de cine întreabă**, un cache prost pus îi dă
elevului răspunsul pregătit pentru profesor. La noi, `/api/chapters` arată capitolele
nepublicate doar profesorilor — exact tipul de rută unde un cache greșit scurge date.

### Serverless
Nu înseamnă „fără server". Înseamnă că nu ținem noi un calculator pornit non-stop:
furnizorul (Vercel) pornește codul când vine o cerere și îl oprește după. Plătim pe
utilizare, nu pe capacitate rezervată. Bun pentru noi, fiindcă sarcina e sezonieră —
aproape nimic toamna, vârf uriaș în mai-iunie.

### PWA vs. aplicație nativă
**Nativă** = instalată din App Store / Google Play, scrisă separat pentru fiecare telefon.
**PWA** = site-ul nostru, dar instalabil pe ecranul telefonului, fără magazin de aplicații.

Diferența care contează la bani: Apple ia 15-30% din abonamentele vândute într-o aplicație
nativă. PWA nu trece prin ei.

---

## Baza de date

### Bază de date, tabel, rând, coloană
Gândește-o ca un teanc de foi de Excel. Un **tabel** e o foaie (`users`, `tickets`). Un
**rând** e o înregistrare (un elev anume). O **coloană** e un câmp (`email`, `rol`).

### Schemă
Structura foilor: ce tabele există, ce coloane are fiecare, ce reguli respectă. Nu datele
în sine, ci forma lor.

### Migrare
Un fișier care descrie o schimbare de structură — „adaugă coloana asta", „creează tabelul
ăsta". Se păstrează toate, în ordine, ca istoric.

De ce nu modificăm baza direct cu mâna: dacă schimbarea nu e scrisă într-un fișier, nimeni
nu poate reface aceeași bază de date pe alt calculator, și nimeni nu știe peste un an de ce
arată așa. La noi stau în `supabase/migrations/`.

### DDL
Comenzile care schimbă **structura** (creează tabele, adaugă coloane), spre deosebire de
cele care schimbă **datele**. Migrările sunt DDL.

### Cheie primară
Coloana care identifică unic un rând. Nu pot exista două rânduri cu aceeași valoare. La
`trialuri_consumate`, cheia primară e emailul normalizat — de aceea aceeași căsuță nu poate
primi trial de două ori.

### Cheie străină (foreign key)
O coloană care „arată către" un rând din alt tabel. `tickets.user_id` arată către elevul
din `users`.

### ON DELETE SET NULL / ON DELETE CASCADE
Ce se întâmplă cu rândurile care arătau către ceva șters.
**CASCADE** = se șterg și ele (ștergi tichetul → dispar și mesajele lui).
**SET NULL** = rămân, dar legătura se golește (profesorul șterge lecția → întrebarea
elevului **nu** dispare, doar nu mai are lecție atașată).

Alegerea nu e tehnică, e despre ce merită păstrat.

### Index
Ca alfabetarul unei cărți: în loc să citești toate paginile, te duci direct unde trebuie.
Fără index, căutarea într-un tabel mare devine tot mai lentă pe măsură ce crește.

### Constrângere (constraint / CHECK)
O regulă pe care baza de date o impune singură, indiferent ce trimite codul. La noi,
`role` poate fi doar `student`, `teacher` sau `mentor` — o valoare scrisă greșit e refuzată
de bază, nu doar de cod.

### Vedere (view)
O „foaie" care nu conține date proprii, ci un mod de a privi alte tabele — ca o formulă în
Excel. `latest_answer_per_question` arată ultimul răspuns al fiecărui elev la fiecare
întrebare. Definiția stă într-un singur loc, deci nu poate fi interpretată diferit în două
locuri din cod.

### RLS (securitate pe rând)
O funcție a bazei de date prin care baza însăși decide cine vede ce rânduri.

La noi e **pornită, dar fără nicio regulă**, ceea ce înseamnă „nimeni nu vede nimic direct".
Tot accesul trece prin serverul nostru, cu o cheie specială (`service_role`), iar verificarea
cine-are-voie se face în cod, într-un singur loc. E o alegere deliberată: regula scrisă de
două ori (o dată în cod, o dată în bază) ajunge să difere.

### service_role vs. cheia publică (anon)
`service_role` e cheia de administrator: vede tot, ocolește RLS, stă **doar** pe server și
nu ajunge niciodată în browser. Cheia `anon` e cea publică, gândită pentru browser — noi nu
o folosim, tocmai pentru că tot accesul trece prin server.

### Paginare, offset, limit
Nu ceri toată lista deodată, ci pe bucăți. `limit` = câte rânduri; `offset` = de la al
câtelea începi. Pagina 3 la 50 pe pagină înseamnă `limit=50&offset=100`.

De ce contează pe telefon: o listă întreagă înseamnă transfer de date și baterie consumată,
plătite de elev.

### Cursor (keyset)
Alt fel de paginare: în loc de „sari peste 100", spui „dă-mi ce vine după rândul ăsta". Mai
corect când se adaugă rânduri în timp ce răsfoiești, dar mai complicat de folosit. La
volumele noastre — mii de rânduri, nu milioane — nu-și merită prețul.

### FIFO
„Primul venit, primul servit". Coada de la brutărie. Tichetele din pool se iau așa, nu
invers — altfel cel uitat rămâne uitat pentru totdeauna.

---

## Cum se scrie și se livrează codul

### Git
Un fel de „istoric al versiunilor" pentru cod, care ține minte fiecare schimbare, cine a
făcut-o și de ce.

### Commit
O schimbare salvată, cu o explicație atașată. Ca un punct de salvare într-un joc.

### Branch (ramură)
O copie separată a proiectului, unde lucrezi fără să strici ce e bun. Andrei lucrează pe
ramura lui, Bogdan pe a lui, nu se calcă pe picioare.

Capcana pe care am pățit-o deja: ce rămâne pe o ramură **pentru celălalt nu există**. De
asta e regula ca schimbările care îl afectează pe celălalt să ajungă repede în `main`.

### main
Ramura principală — versiunea „oficială", cea care ajunge la utilizatori.

### Merge
Aducerea muncii de pe o ramură înapoi în `main`.

### PR (pull request)
Cererea de merge, cu descriere și cu verificările automate atașate. Locul unde se discută
o schimbare **înainte** să intre. Butonul pe care îl apeși tu.

### Rebase
Rescrierea ramurii tale ca și cum ai fi pornit de la `main`-ul de acum, nu de la cel vechi.
Rezultatul e un istoric drept, fără noduri.

### Conflict
Când două ramuri au schimbat același rând și Git nu poate ghici care variantă e bună.
Trebuie decis de om.

### Deploy
Punerea codului nou în funcțiune, acolo unde îl folosesc oamenii.

### Producție vs. preview
**Producție** = aplicația reală, cu utilizatori reali și bani reali. **Preview** = o copie
de probă, generată automat pentru fiecare PR, ca să vezi schimbarea înainte s-o dai drumul.

De asta cheia de email se pune **doar** în producție: un preview care trimite emailuri
reale elevilor e o greșeală ușor de făcut și greu de reparat.

### Variabilă de mediu
O setare ținută în afara codului — chei, parole, adrese. Nu intră niciodată în Git, pentru
că oricine vede codul ar vedea și cheile.

### Feature flag (comutator de funcționalitate)
Un întrerupător care ascunde o parte din aplicație fără s-o ștergi. `TICHETE_UI_ACTIVE`
ține ascuns tot ce ține de tichete până e reconectat corect.

Capcana: munca ascunsă după un comutator e invizibilă în producție. De asta reaprinderea
lui e sarcină separată, scrisă explicit — altfel se uită.

---

## Verificări automate

### Test
Cod care verifică alt cod. Descrii ce **ar trebui** să se întâmple, iar calculatorul
verifică de fiecare dată că încă se întâmplă. Rostul lor nu e să demonstreze că merge azi,
ci să te avertizeze când se strică peste trei luni.

### Mock (dublură)
Un înlocuitor fals pentru ceva real, folosit în teste. Testele noastre de plăți nu vorbesc
cu Stripe — vorbesc cu o dublură care se poartă ca Stripe. De asta merg fără chei și fără
internet.

### CI (integrare continuă)
Robotul care rulează toate verificările la fiecare PR. Dacă e roșu, ceva e stricat.

### Lint
Verificarea „de stil și de neatenție": cod scris neîngrijit, variabile nefolosite, greșeli
comune. Nu prinde erori de logică, prinde neglijențe.

### Typecheck
Verifică dacă piesele se potrivesc: dacă o funcție așteaptă un număr și primește un text,
se plânge **înainte** de a rula, nu în producție.

### Hook (pre-push)
O verificare care pornește automat înainte să trimiți codul, ca să nu ajungi cu ceva stricat
pe server.

---

## Lucruri care merg prost

### Bug
O greșeală în cod. Nu „aplicația e stricată" în general, ci un comportament anume care nu e
cel dorit.

### Cursă (race condition)
Două acțiuni care se întâmplă în același timp și se calcă una pe alta.

Exemplul nostru: doi mentori apasă „Preia" pe același tichet în aceeași secundă. Fără grijă,
amândoi ar crede că l-au luat. Soluția e ca **baza de date** să decidă, nu codul: scrierea
se face cu condiția „doar dacă nu l-a luat nimeni", iar cine pierde primește 409.

### Atomic
O operațiune care se face fie complet, fie deloc — nu pe jumătate. Nu poate fi „prinsă la
mijloc" de altcineva.

### Idempotent
O acțiune pe care poți s-o repeți fără efecte suplimentare. Apeși de trei ori pe buton, se
întâmplă o singură dată.

Ne trebuie fiindcă Stripe ne poate anunța de mai multe ori de aceeași plată — dacă n-am fi
idempotenți, am activa abonamentul de trei ori.

### Fail-open vs. fail-fast
Ce faci când ceva nu merge.
**Fail-open** = în caz de defecțiune, lași să treacă. Așa e la trial: dacă baza de date nu
răspunde, elevul **primește** trial. Un elev real rămas fără trial din cauza unei defecțiuni
e o pierdere mai mare decât un trial dat în plus unui abuzator.
**Fail-fast** = în caz de defecțiune, oprești imediat și zgomotos. Așa e la pornirea
serverului: dacă lipsește o setare obligatorie, aplicația refuză să pornească, în loc să
meargă stricat pe tăcute.

Alegerea depinde de ce doare mai tare, și se ia de fiecare dată explicit.

### Eșec tăcut
Când ceva nu funcționează, dar nimeni nu observă, pentru că nu crapă nimic. Cel mai
periculos tip de defecțiune.

Exemplu real din proiect: interfața tichetelor citea câmpuri care nu mai existau. Nu dădea
nicio eroare — doar arăta toate tichetele ca „în așteptare", inclusiv pe cele la care
profesorul răspunsese.

### Regresie
Ceva care mergea și s-a stricat la o schimbare ulterioară. Testele există în mare parte
pentru asta.

### Datorie tehnică
Scurtături luate azi, care costă mâine. Nu e neapărat rău — uneori e alegerea corectă. Rău
e să nu știi că ai luat-o.

---

## Bani și abonamente

### Stripe
Firma care procesează plățile. Nu ținem noi carduri — nici nu ne-am dori.

### Checkout Session
Pagina de plată a lui Stripe, generată pentru o comandă anume. Noi n-avem formular de card;
trimitem omul la ei și ne întoarcem cu răspunsul.

### Webhook
Un anunț trimis de un serviciu extern către noi, când se întâmplă ceva la ei. Invers decât
de obicei: nu întrebăm noi, ne spun ei.

Stripe ne anunță „s-a plătit", „s-a anulat". Clerk ne anunță „s-a înregistrat cineva".

### Trial
Perioada gratuită de la început. La noi: 14 zile, iar ceasul îl ține Stripe, nu noi.

De ce la ei: dacă am ține noi socoteala zilelor, am avea două surse de adevăr care se pot
contrazice — a lui Stripe și a noastră. Când se contrazic, cineva plătește pe nedrept sau
primește gratis.

### Clerk
Serviciul care se ocupă de conturi: înregistrare, autentificare, parole, login cu Google.

### Sesiune, cookie, token
Cum își amintește aplicația că ești tu, după ce te-ai logat.
Pe web se folosește un **cookie** — un bilețel pe care browserul îl trimite automat.
Pe telefon nu există cookie-uri în același fel; aplicația trimite un **token**, un bilețel
pe care îl atașează singură la fiecare cerere.

De asta trecerea la mobil cere o schimbare: tot ce avem azi presupune cookie.

---

## Cuvinte care apar des în discuție

### Contract (de API)
Înțelegerea nescrisă despre ce trimite și ce primește fiecare parte. Dacă backendul schimbă
un nume de câmp, frontendul se strică — nu pentru că e prost scris, ci pentru că înțelegerea
s-a schimbat fără ca ambele părți să afle.

Cu aplicație mobilă devine serios: o versiune veche, instalată pe telefonul cuiva, continuă
să folosească contractul vechi luni de zile, și nu poți forța pe nimeni să actualizeze.

### Aditiv
O schimbare care **adaugă** fără să strice ce era. Adăugăm `meta` lângă listă: cine nu știe
de el primește exact ce primea. Opusul e o schimbare care redenumește sau elimină.

### Sursă de adevăr
Locul unic unde se ține un lucru. Când același lucru e ținut în două locuri, ele ajung
inevitabil să difere, și atunci nimeni nu știe care are dreptate.

### Pool
Un morman comun din care se servește oricine. Tichetele nerevendicate stau în pool.

### Normalizare
Aducerea la o formă unică, ca să poți compara. `E.l.e.v+bac@Gmail.com` și `elev@gmail.com`
sunt aceeași căsuță; normalizarea le face să arate la fel, ca să știm că e același om.

### Retenție
Cât timp păstrăm datele înainte să le ștergem. Fără o regulă, tabelele cresc la nesfârșit
până se lovesc de o limită — de obicei în cel mai prost moment.

### Blast radius (raza de efect)
Cât de mult se strică dacă schimbarea asta merge prost. O schimbare cu rază mică atinge o
pagină; una cu rază mare atinge toată aplicația. Merită întrebat înainte, nu după.
