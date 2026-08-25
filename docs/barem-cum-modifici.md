# Cum modifici baremul (`data/barem.json`)

> Pentru cine: oricine corectează baremul. **Nu-ți trebuie să știi TypeScript.**
> Modifici un fișier de text, rulezi două comenzi, gata.

---

## Pe scurt — ciclul complet

```bash
# 1. deschizi si modifici fisierul
code data/barem.json

# 2. verifici ca n-ai stricat nimic (iti spune in romana ce e gresit)
npm run barem:check

# 3. il duci in baza de date
npm run barem:import
```

Dacă pasul 2 iese verde, pasul 3 e sigur. Dacă iese roșu, **nu trece la 3** — importul
oricum te refuză la greșelile care ar strica note.

După import, intri pe `/admin/barem` și vezi exact ce a ajuns în sistem. Aia e verificarea
finală: fișierul poate fi corect și importul să fi rămas nerulat.

---

## De ce un fișier și nu un ecran de administrare

Pentru că **baremul produce note**.

Un prag schimbat dintr-un click, fără diff și fără ca cineva să se uite peste, modifică tăcut
punctajele — inclusiv ale lucrărilor deja corectate. Într-un fișier din Git, fiecare corectură
lasă urmă: se vede cine a schimbat, ce a schimbat, când, și se poate da înapoi într-o comandă.

Compromisul e că trebuie să deschizi un fișier. În schimb primești verificare automată
înainte să apuce să facă rău.

> Dacă chiar nu vrei să atingi fișierul: spune-mi ce e greșit și fac eu modificarea, cu
> commit. Avantajul rămâne — urma în Git există oricum.

---

## Cum arată fișierul

Trei niveluri, de sus în jos:

```
barem.json
 └── rubrici[]           un subiect sau o parte de subiect (ex. „Subiectul I.B")
      └── criterii[]     rândul pe care se dau punctele (ex. „Ortografia")
           └── praguri[] cât iei în funcție de câte greșeli ai (ex. „2 greșeli → 1p")
```

Exemplu real, decupat din fișier:

```json
{
  "slug": "s3-redactare",
  "subiect": "III",
  "denumire": "Subiectul al III-lea — redactare",
  "puncte_total": 12,
  "minim_cuvinte": 400,
  "criterii": [
    {
      "slug": "s3-ortografie",
      "denumire": "Ortografia",
      "puncte_max": 2,
      "strat": "auto",
      "verificator": "languagetool",
      "praguri": [
        { "puncte": 2, "conditie": "0-1 greseli" },
        { "puncte": 1, "conditie": "2 greseli" },
        { "puncte": 0, "conditie": "3 sau mai multe greseli" }
      ]
    }
  ]
}
```

---

## Ce înseamnă fiecare câmp

### Pe rubrică

| Câmp | Ce e | Se schimbă? |
|---|---|---|
| `slug` | Numele intern, stabil. Codul se leagă de el | **Nu-l schimba.** Vezi mai jos de ce |
| `subiect` | `I.A`, `I.B`, `II` sau `III` | Rar |
| `denumire` | Ce vede omul | Oricând, e doar text |
| `puncte_total` | Punctajul rubricii din barem | Da, dacă baremul zice altceva |
| `minim_cuvinte` | Pragul din barem: 50 la Subiectul II, 150 la I.B, 400 la III. `null` = nu se aplică | Da |
| `observatii` | Notă pentru om. Opțional | Oricând |

### Pe criteriu

| Câmp | Ce e |
|---|---|
| `slug` | Nume intern, stabil, **unic în tot fișierul** |
| `denumire` | Textul criteriului, ideal cuvânt cu cuvânt din barem |
| `puncte_max` | Cât face criteriul |
| `strat` | Cine poate da punctul — `auto`, `ai` sau `mentor`. Vezi mai jos |
| `verificator` | Ce unealtă îl aplică. **Doar** la `strat: "auto"` |
| `praguri` | Lista de „câte puncte, în ce condiție" |
| `parametri` | Reglaje pentru verificator, ex. `{ "minim": 150 }` |
| `observatii` | Notă pentru om. Opțional |

---

## `strat` — cine dă punctul

Ăsta e câmpul cu cea mai mare miză. Clasificarea vine din
[`bac-barem-analiza.md`](bac-barem-analiza.md) §6.

| Valoare | Înseamnă | Exemplu |
|---|---|---|
| `auto` | Determinist. Fără AI, fără om. Pragul e explicit în barem | numărul de cuvinte, ortografia |
| `ai` | AI-ul **pre-notează pentru mentor**. Niciodată notă finală | „prezentare adecvată și nuanțată" |
| `mentor` | Doar om | judecata pe originalitate |

**Regula de aur:** pune `auto` **doar** dacă se poate verifica fără nicio interpretare. Dacă
trebuie ca cineva să judece, e `ai` sau `mentor`. Un criteriu mutat greșit pe `auto` produce
note greșite în tăcere — cel mai prost tip de bug care există la noi.

Acum sunt **20 din cele 90 de puncte** ale examenului pe `auto`. Dacă numărul ăsta sare brusc
după o modificare de-a ta, verifică de două ori: testele te avertizează dacă iese din
intervalul 18–24.

---

## `verificator` — ce unealtă aplică criteriul

Se pune **numai** la `strat: "auto"`, și acolo e **obligatoriu**.

| Verificator | Ce face | Cere `parametri` |
|---|---|---|
| `numar_cuvinte` | Numără cuvintele și compară cu pragul | Da: `{ "minim": 150 }` |
| `conectori` | Caută conectorii din lista închisă („în primul rând", „prin urmare"…) | Nu |
| `parti_componente` | Verifică introducere / cuprins / încheiere | Nu |
| `concluzie` | Caută enunțul final de concluzie | Nu |
| `citat` | Verifică prezența unui citat din textul-suport | Nu |
| `raspuns_in_enunt` | Verifică dacă răspunsul e formulat ca enunț complet | Nu |
| `languagetool` | Numără greșelile de ortografie/punctuație | Nu |
| `acordat_implicit` | Nu verifică nimic, dă punctul mereu | Nu |

**`acordat_implicit`** e pentru criteriile care n-au corespondent digital — „așezarea în
pagină, lizibilitatea". Le ținem în grilă ca elevul să vadă baremul oficial întreg, dar nu
avem ce măsura într-un text scris la tastatură.

Nu inventa verificatoare noi: lista e închisă și în validator, și în baza de date. Unul
necunoscut e respins la `npm run barem:check`.

---

## `praguri` — cât iei, în ce condiție

Se scriu **de la mult la puțin**, ca în barem:

```json
"praguri": [
  { "puncte": 2, "conditie": "0-1 greseli" },
  { "puncte": 1, "conditie": "2 greseli" },
  { "puncte": 0, "conditie": "3 sau mai multe greseli" }
]
```

- Ordinea contează — se citesc de sus în jos, ca la corectarea pe hârtie. Ordinea greșită e
  semnalată.
- `puncte` nu poate depăși `puncte_max` al criteriului.
- `conditie` e text pentru om. Scrie-l cât mai aproape de barem, pentru că **ajunge sub ochii
  elevului**, nu doar în cod.
- Un criteriu pe `ai` sau `mentor` poate avea `praguri` goale (`[]`) — atunci punctajul e
  la aprecierea celui care corectează.

---

## Trei modificări tipice, pas cu pas

### 1. Am transcris greșit un prag

Găsești criteriul, schimbi numărul, rulezi `npm run barem:check`. Dacă praguri și
`puncte_max` rămân coerente, trece.

### 2. Punctajul unui criteriu se schimbă

Aici e capcana cea mai frecventă: dacă schimbi `puncte_max` la un criteriu, **suma criteriilor
nu mai dă `puncte_total` al rubricii**. Verificarea îți spune exact:

```
rubrica "s3-redactare": criteriile insumeaza 11 puncte, dar rubrica declara 12.
```

Ori corectezi și alt criteriu, ori corectezi `puncte_total`. Verificarea asta prinde cele mai
multe greșeli de transcriere — de-aia există.

### 3. Adaug un criteriu care lipsea

Copiezi un criteriu existent, îi schimbi `slug` (unic!), `denumire`, `puncte_max`, `strat`.
Apoi **ajustezi `puncte_total`** al rubricii sau scazi din alt criteriu, ca suma să iasă.

> **Nu adăuga criterii care nu sunt în baremul oficial.** Nu îmbunătățim baremul, îl
> transcriem. Dacă ți se pare că lipsește ceva, verifică întâi în
> [`bac-barem-analiza.md`](bac-barem-analiza.md) sau în baremul original.

---

## De ce nu schimbi `slug`-urile

`slug` e numele stabil sub care codul și baza de date cunosc rubrica sau criteriul. Denumirea
o poți rescrie oricând — e doar text pentru om. Slug-ul nu.

Motivul serios: notele acordate se leagă de criteriul pe care au fost date. Un slug schimbat
rupe legătura cu tot istoricul, tăcut. Dacă chiar trebuie redenumit, e o operație conștientă,
cu migrarea datelor vechi — nu o corectură de rutină.

---

## Ce se întâmplă la import

Importul **nu suprascrie** baremul existent. Creează o **versiune nouă** și o marchează activă;
versiunile vechi rămân în bază.

De ce contează: dacă am rescrie rândurile existente, prima corectură ar face toate notele deja
acordate imposibil de explicat. Elevul vede 7 pe ecran, sistemul recalculează 8, și nimeni nu
poate spune care e adevărul. Cu versionare, fiecare notă rămâne legată de baremul pe care a
fost calculată.

Alte lucruri utile despre import:

- **E idempotent.** Rulează-l de câte ori vrei — dacă fișierul n-a fost modificat, nu scrie
  nimic și îți spune asta.
- **`npm run barem:import -- --dry`** îți zice ce ar face, fără să scrie.
- **Dacă revii pe o variantă veche** a fișierului, reactivează versiunea existentă în loc să
  creeze un duplicat.
- **Dacă crapă la jumătate**, versiunea nouă rămâne inactivă și aplicația continuă să
  folosească baremul vechi, întreg. Nu rămâi cu jumătate de barem activ.

---

## Ce fac erorile

| Mesaj | Ce e de făcut |
|---|---|
| `criteriile insumeaza X, dar rubrica declara Y` | Suma nu dă. Corectează un criteriu sau `puncte_total` |
| `e pe stratul "auto" dar nu are verificator` | Ori pui verificator, ori muți criteriul pe `ai` |
| `are verificator ... dar nu e pe stratul "auto"` | Scoate verificatorul sau mută criteriul pe `auto` |
| `verificator necunoscut` | Ai scris un verificator care nu există. Vezi tabelul de mai sus |
| `verificatorul "numar_cuvinte" cere parametri.minim` | Adaugă `"parametri": { "minim": 150 }` |
| `pragul de N puncte depaseste puncte_max` | Pragul e mai mare decât face criteriul |
| `pragurile nu sunt in ordine descrescatoare` | Rearanjează-le de la mult la puțin |
| `slug duplicat` | Două criterii cu același `slug`. Trebuie unice în tot fișierul |

Dacă JSON-ul e stricat de tot (o virgulă lipsă, o acoladă în plus), comanda crapă cu un mesaj
de la Node care spune linia. Editorul îți colorează de obicei greșeala înainte să salvezi.

---

## Ce NU e în fișier și de ce

- **Arhetipul C de la Subiectul III** (relația dintre două personaje, apărut la uman în 2025)
  n-are descompunere pe puncte în analiză, deci nu e codificat. De recuperat din baremul
  oficial 2025 înainte de a-l adăuga.
- **Limita de cuvinte de la cerința 5 a Subiectului I.A** variază de la an la an, e în enunț,
  nu în barem. De aceea nu e o constantă.

---

## Unde se leagă restul

- Sursa cifrelor: [`bac-barem-analiza.md`](bac-barem-analiza.md) — corpus 2021-2026.
- Tabelele și versionarea: [`database.md`](database.md), secțiunea `barem_versions`.
- Tipurile și validatorul: [`lib/barem.ts`](../lib/barem.ts).
- Vizualizare: `/admin/barem` (doar admini).
