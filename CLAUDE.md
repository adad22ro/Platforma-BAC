# Context proiect — Platformă de pregătire BAC

Acest fișier conține contextul complet de business și tehnic stabilit pentru acest proiect. Claude Code ar trebui să citească acest document înainte de a începe lucrul, ca să respecte deciziile deja luate și să nu propună o arhitectură diferită fără să discute mai întâi.

## Instrucțiuni obligatorii la începutul fiecărei sesiuni

1. **Citește [`TASKS.md`](TASKS.md)** — înainte de orice altceva. Verifică ce sarcini sunt `🔄 În lucru` și nu atinge acele zone fără confirmare.
2. **Citește ultimele 3-5 intrări din [`DEVLOG.md`](DEVLOG.md)** — ca să știi ce s-a întâmplat recent și ce decizii s-au luat.
3. **Actualizează `TASKS.md`** imediat ce o sarcină este începută, finalizată sau blocată.
4. **Actualizează `DEVLOG.md`** la sfârșitul fiecărei sesiuni de lucru cu ce s-a făcut și ce decizii importante s-au luat.
5. **Actualizează documentația relevantă din `docs/`** după fiecare bucată de cod scrisă sau modificată — vezi regulile de mai jos.

## Reguli obligatorii pe parcursul sesiunii

### Cod nou
- **Explică întotdeauna codul scris** — după fiecare bloc de cod, oferă o explicație scurtă în română: ce face, de ce e structurat așa, ce ar trebui să știe cineva care îl vede prima dată.
- **La erori, explică cauza înainte de fix** — nu corecta codul fără să explici de ce a apărut eroarea. Scopul e să înveți, nu doar să meargă.
- **Scrie cod în bucăți mici, nu în blocuri mari** — o funcționalitate pe rând, verificată că merge înainte de a trece la următoarea. Blocurile mari sunt greu de depanat.
- **Verifică că aplicația pornește după fiecare modificare importantă** — nu declara că "ar trebui să meargă" fără să confirmi.
- **Nu instala pachete noi** (`npm install` etc.) fără să anunți mai întâi utilizatorul ce pachet vrei să adaugi și de ce. Așteaptă confirmarea.
- **Nu șterge și nu suprascrie fișiere existente** fără confirmare explicită din partea utilizatorului. Dacă vrei să înlocuiești ceva, arată mai întâi ce vrei să schimbi și de ce.

### Bază de date
- **Nicio modificare de schemă DB fără să documentezi impactul** — dacă schimbi un tabel (adaugi/ștergi coloane, modifici tipuri), menționează explicit ce alte părți ale aplicației sunt afectate și care trebuie actualizate.
- **Migrările DB se scriu întotdeauna în cod** — nu se modifică schema direct în Supabase dashboard fără să existe și un fișier de migrare în proiect. Altfel Bogdan nu poate replica schimbarea și baza de date devine inconsistentă între membri.

### Securitate
- **Nicio rută API fără verificare de autentificare** — la fiecare rută API nouă, verifică dacă e protejată. Dacă utilizatorul uită, reamintește-i activ înainte de a continua.
- **Datele trimise de utilizator se validează întotdeauna** — niciodată date brute din formular sau request direct în baza de date. Validează tipul, lungimea și formatul înainte de orice operație DB.
- **Nicio cheie API sau secret în cod** — dacă observi un secret hardcodat în cod, oprește-te și cere utilizatorului să îl mute în `.env.local`.

### Reguli noi pe parcurs

Pe măsură ce proiectul evoluează și apar situații noi (deploy, erori Stripe, backup DB, testare etc.), Claude Code trebuie să:
1. **Identifice când o situație recurentă nu are o regulă clară** — de exemplu, prima dată când apare o eroare de deploy sau o problemă de securitate neacoperită.
2. **Propună utilizatorului o regulă nouă** — formulată scurt și clar, explicând de ce e utilă.
3. **La confirmare, creeze un fișier dedicat în `docs/rules/`** cu regula respectivă și să adauge o referință către el în acest CLAUDE.md.

Fișierele din `docs/rules/` sunt citite și respectate la fel ca regulile din acest fișier. Exemple de fișiere care vor apărea pe parcurs:
- `docs/rules/deploy.md` — proceduri de deploy și rollback pe Vercel
- `docs/rules/stripe-errors.md` — cum se gestionează erorile de plată
- `docs/rules/testing.md` — când și cum se scriu teste
- `docs/rules/db-backup.md` — proceduri de backup și restaurare DB

### Documentație (`docs/`)
- **La fiecare cod nou scris** → actualizează fișierul relevant din `docs/` cu o explicație a ce face acel cod.
- **La fiecare modificare de cod existent** → actualizează documentația corespunzătoare imediat, în aceeași sesiune. Documentația veche care nu mai reflectă codul real e mai periculoasă decât lipsa documentației.
- **Fișiere de documentație disponibile:**
  - [`docs/architecture.md`](docs/architecture.md) — structura generală a proiectului
  - [`docs/database.md`](docs/database.md) — schema DB, ce face fiecare tabel și coloană
  - [`docs/auth.md`](docs/auth.md) — cum funcționează autentificarea și rolurile
  - [`docs/stripe.md`](docs/stripe.md) — cum funcționează plățile și abonamentele
  - [`docs/components.md`](docs/components.md) — componentele UI principale
  - [`docs/api.md`](docs/api.md) — toate rutele API, ce primesc și ce returnează
- **Stilul documentației:** scurt și la obiect, în română, fără jargon inutil. Scrie ca și cum explici unui coleg care nu a văzut codul niciodată.

## Echipa

| Nume | Rol |
|---|---|
| **Andrei** | Configurare inițială; rolul pe termen lung se stabilește cu Bogdan |
| **Bogdan** | Se alătură după configurarea inițială; rol de stabilit împreună |

## Ce este proiectul

O platformă web (ulterior și mobilă) de pregătire pentru examenul de Bacalaureat, începând cu materia **Limba și Literatura Română**. Este un produs propriu, vândut direct elevilor prin abonament, nu un proiect pentru un client.

Diferențiator central: nu e doar conținut static (ca majoritatea platformelor existente — Quest Bac, eBac etc.), ci conținut personalizat + mentorat real susținut de un profesor partener.

## Echipă

- 2 persoane pe partea tehnică (un al treilea membru se va alătura ulterior)
- 1 profesor partener — responsabil de conținut educațional și mentorat la Limba Română; momentan nu este disponibil pentru a furniza conținut, dar va deveni disponibil
- Echipa tehnică are cunoștințe de bază de programare (nu experiență extinsă), învață din mers, dezvoltă cu ajutorul Claude Code
- Tot codul este scris cu asistența Claude/Claude Code

## Termen

- Țintă: platformă funcțională din **septembrie 2026**
- Folosită pe tot parcursul anului școlar 2026-2027
- Examen real: sesiunea de BAC din **vara 2027**
- Buget de pornire: inexistent — platforma trebuie să fie funcțională ca să atragă profesori suplimentari și eventuali investitori

## Decizie de prioritate strategică (foarte important)

Echipa tehnică începe construcția **înainte** ca profesorul să fie disponibil cu conținut real. De aceea:

- Structura de capitole, lecții și teste trebuie construită cu **date placeholder/fictive** (ex: "Capitolul 1", text generic, întrebări exemplu)
- **Nu se inventează** o structură reală de capitole din proprie inițiativă, presupunând cum e programa oficială de BAC la Română — această listă trebuie să vină de la profesor când va fi disponibil
- Arhitectura trebuie să rămână validă indiferent de conținutul real care va fi introdus ulterior — adică design-ul bazei de date și al formularelor de admin nu trebuie să presupună un număr fix sau o ordine fixă de capitole

## Stack tehnic decis

| Componentă | Tehnologie | De ce |
|---|---|---|
| Framework principal | Next.js (React) | Documentație extinsă, integrare bună cu Claude Code |
| Autentificare | Clerk sau Supabase Auth | Nu se reinventează login/parole/securitate |
| Bază de date | Supabase (PostgreSQL) | Gata configurată, posibil integrată cu auth |
| Plăți și abonamente | Stripe | Standard pentru plăți recurente |
| Hosting video lecții | Mux sau YouTube nelistat | Fără infrastructură proprie de streaming |
| Hosting platformă | Vercel | Integrare nativă cu Next.js |

Decizie fermă: **fără WordPress**, fără platformă "de la zero" completă (fără servicii gata-făcute pentru auth/plăți — acolo unde greșelile costă cel mai mult). Control și flexibilitate maximă pe logica aplicației (UI, structură lecții/teste), nu pe părțile critice de securitate.

## Structura platformei — 3 roluri (pe termen lung)

1. **Elev** — lecții text + video, teste, progres, întrebări către mentor
2. **Părinte** — vizualizare progres al elevului
3. **Profesor** — administrare conținut, mentorat

**Decizie importantă: MVP-ul conține DOAR rolul de elev** (plus panelul de profesor necesar pentru a introduce conținut — vezi mai jos). Rolul de părinte și orice AI avansat NU fac parte din MVP.

## Funcționalități de diferențiere (introduse etapizat, nu toate în MVP)

1. **Diagnostic inițial (placement test)** — plan de studiu personalizat de la prima utilizare (Faza 2)
2. **Feedback explicat la greșeli** — nu doar corect/greșit, ci de ce a greșit elevul (conținut scris de profesor pe tipuri de erori comune)
3. **Întrebări contextuale către mentor** — buton "Nu am înțeles" direct din exercițiu, cu context automat trimis (MVP)
4. **Progres vizibil în timp** — grafice simple per capitol (MVP, versiune simplă; extins în Faza 2)
5. **Notificări de recapitulare spațiată** (Faza 2)
6. **Simulare de examen cronometrată**, structură identică cu BAC-ul real (Faza 2)

## Model de mentorat — sistem de tichete, NU chat live

Profesorul NU răspunde instant — procesează întrebările periodic (ex: o dată pe zi). Implicații tehnice obligatorii:

- Elevul trimite întrebarea direct din exercițiu, cu context automat atașat (ce exercițiu, ce a răspuns)
- Întrebarea intră într-o **coadă** (sistem de tichete), nu într-un chat live
- Înainte de a trimite, elevul vede o expectativă clară (ex: "Mentorul răspunde de obicei în 24 de ore") — esențial pentru UX, ca să nu se simtă ignorat
- Interfața profesorului arată întrebările grupate/organizate (pe capitol sau frecvență), ca să poată răspunde eficient la întrebări similare o singură dată
- Notificare automată (email) către elev când a primit răspuns
- Opțional, neesențial la MVP: poziție în coadă + timp estimat de răspuns vizibil pentru elev

## Panel de administrare pentru profesor (parte din MVP, NU opțional)

Profesorul nu e programator și nu trebuie să depindă de echipa tehnică pentru a introduce conținut. Se construiește un **panel personalizat** (nu un CMS extern ca WordPress/Strapi/Sanity), integrat în aceeași aplicație și aceeași bază de date ca aplicația elevului — fără sincronizare între sisteme separate.

Conține:
- Autentificare separată pentru profesor (rol distinct de elev)
- Formular "Capitol nou" — titlu, ordine, descriere scurtă
- Formular "Lecție" — legată de un capitol, editor de text simplu (tip Google Docs) + link video
- Formular "Întrebare test" — text întrebare, variante de răspuns, bifare răspuns corect, explicație opțională
- Tot ce salvează profesorul apare automat la elev, fără intervenția echipei tehnice

## Generarea testelor — decizie fermă

- **În MVP: exclusiv manual.** Profesorul scrie întrebările prin formularul din panel.
- **NU se introduce generare automată cu AI în MVP.**
- **Faza 2 (după date reale despre cât timp consumă varianta manuală):** se adaugă un buton "Generează propuneri din lecție" care folosește un model AI pentru a produce întrebări candidate pe baza textului lecției deja introdus. Propunerile NU se publică automat — profesorul le revizuiește, editează, elimină ce nu e bun, și doar ce aprobă el devine vizibil elevilor. Niciodată publicare automată fără supervizare umană, mai ales la o materie ca literatura română unde interpretarea/nuanța contează.

## Principiul general pentru AI în această platformă

AI-ul (orice tip — adaptare per elev, generare de întrebări, etc.) se introduce **abia în Faza 3, sau cel târziu Faza 2**, după ce există utilizatori reali și date reale de utilizare. Nu se construiește AI "adaptiv" sau "inteligent" de la început, fără date — ar fi doar o iluzie de funcție inteligentă, nereflectând realitatea, și ar adăuga complexitate/cost înainte de a fi nevoie.

## Model de venit

- **Freemium + abonament lunar**
- Nivel gratuit: acces la 2-3 capitole introductive
- Abonament complet (acces total + mentorat): recomandat **60-90 RON/lună**, poziționat între platformele fără mentor uman (75-150 RON/lună, fără interacțiune) și meditațiile private 1-la-1 (300-500+ RON/lună)
- Prețul final trebuie testat și ajustat cu primii utilizatori reali, nu e o decizie definitivă

## Etapizare generală

**Faza 1 — MVP (lunile 1-3, ~12 săptămâni)**
- Cont elev + autentificare + plată abonament (Stripe)
- Lecții text/video la Limba Română (conținut placeholder până profesorul e disponibil)
- Teste/grile cu corectare automată + statistici simple de progres per capitol
- Sistem de tichete pentru mentorat (întrebare contextuală → coadă → răspuns → notificare)
- Panel de administrare pentru profesor (capitole, lecții, întrebări — toate manuale)

**Faza 2 (lunile 3-5)**
- Acces pentru părinți la progresul elevului
- Diagnostic inițial (placement test) și plan de studiu personalizat
- Notificări de recapitulare spațiată
- Simulare de examen cronometrată
- Buton de generare AI a propunerilor de întrebări (cu aprobare obligatorie de profesor)

**Faza 3 (lunile 6-10)**
- AI pentru întrebări frecvente, bazat pe date reale acumulate
- Posibilă extindere la materii suplimentare (necesită profesori parteneri noi)
- Sistem multi-profesor, dacă volumul justifică

## Etapizare pe săptămâni — Faza 1 (din planul tehnic detaliat)

| Săptămâna | Obiectiv |
|---|---|
| 1-2 | Configurare proiect: Next.js, Supabase/Clerk, Stripe (mod test), deploy inițial pe Vercel |
| 3-4 | Autentificare și cont elev: înregistrare, login, profil, pagină de upgrade abonament |
| 5-6 | Conținut educațional + panel profesor: structură capitole, navigare, formulare admin (capitol, lecție) |
| 7-8 | Teste și progres: sistem întrebări/grile, corectare automată, statistici per capitol, extindere panel cu formularul "Întrebare test" |
| 9-10 | Sistem de mentorat (tichete): buton întrebare contextuală, coadă, interfață profesor, notificări |
| 11-12 | Testare internă cu 10-20 elevi reali, corectare bug-uri, colectare feedback |

## Împărțirea muncii (recomandată, nu rigidă)

- **Persoana A** — frontend/UX: interfața elevului, design vizual, navigare lecții/teste/statistici
- **Persoana B** — backend/infrastructură: bază de date, autentificare, Stripe, sistemul de coadă pentru tichete, logica de corectare a testelor
- Cu Claude Code, ambii pot lucra pe orice zonă — separarea e doar pentru claritate despre cine e responsabil principal

## Cerință despre documentație (importantă pentru acest utilizator)

Utilizatorul nu are experiență extinsă de programare și a cerut explicit:
- Explicații despre ce face codul, pe parcurs, nu doar codul în sine
- Un fișier README/documentație continuă, actualizată, nu doar la final
- La final de MVP: documentație completă — arhitectura aplicației, cum se rulează local, cum se face deploy, cum se adaugă conținut nou fără cunoștințe tehnice avansate (relevant mai ales pentru profesor)

## Riscuri identificate și cum sunt adresate

- **Echipa se blochează pe auth/plăți** → folosirea serviciilor gata-făcute (Clerk/Supabase, Stripe) elimină riscul
- **Cod scris cu AI dar neînțeles** → explicații + documentație obligatorii la fiecare etapă
- **Scope creep** (funcționalități din Faza 2/3 introduse prea devreme) → respectarea strictă a listei de MVP; orice idee nouă se notează separat
- **Conținut întârziat de la profesor** → MVP construit cu placeholder, fără să blocheze dezvoltarea tehnică

## Flux de lucru Git/GitHub (obligatoriu de respectat)

Echipa este formată din 2 persoane care scriu cod simultan. Pentru a evita conflicte și fișiere stricate, Claude Code trebuie să respecte strict acest flux, indiferent cu cine dintre cei doi lucrează:

- **Nu se lucrează niciodată direct pe branch-ul `main`.** `main` trebuie să rămână mereu o versiune funcțională și testată.
- **Pentru fiecare funcționalitate nouă, se creează un branch separat**, cu un nume descriptiv (ex: `auth-cont-elev`, `panel-profesor-capitole`, `sistem-tichete-mentorat`), pornit din `main` actualizat:
  ```
  git checkout main
  git pull
  git checkout -b nume-functionalitate
  ```
- **Commit-uri dese și mici**, cu mesaje clare în română sau engleză, descriind exact ce s-a schimbat (ex: "Adaug formular de înregistrare elev"), nu commit-uri gigantice care adună multe schimbări nelegate.
- **La finalul unei funcționalități**, branch-ul se trimite pe GitHub (`git push origin nume-functionalitate`) și se creează un Pull Request (PR) — codul nu se unește direct în `main` fără ca celălalt membru al echipei să îl poată verifica.
- **Zone de responsabilitate separate**, conform împărțirii muncii de mai sus (Persoana A — frontend/UX, Persoana B — backend/infrastructură), pentru a minimiza situațiile în care ambii editează aceleași fișiere în același timp. Dacă o sarcină necesită modificarea unei zone "a celuilalt", se comunică explicit înainte, nu se editează tacit.
- **Înainte de a începe orice sesiune de lucru**, primul pas este `git pull` pe `main` pentru a avea ultima versiune, evitând lucrul pe o bază veche de cod.
- **Fișiere de configurare/secrete** (chei API, parole, `.env`) nu se commit niciodată în Git — se adaugă în `.gitignore` de la primul commit al proiectului.
- Dacă apare un conflict de merge, Claude Code trebuie să explice clar utilizatorului ce anume e în conflict (ce fișier, ce linii) și să ceară decizia lui înainte de a alege automat o variantă, mai ales dacă cele două variante reflectă intenții de design diferite, nu doar formatare.

## Stare curentă (la momentul scrierii acestui document)

- Profesorul partener NU este disponibil momentan pentru a furniza conținut
- Echipa tehnică a decis să înceapă construcția de bază oricum, folosind date placeholder
- Proiectul este la început — niciun cod nu a fost scris încă în afara discuțiilor de planificare
