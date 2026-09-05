# Secrete locale (.env.local) — cum le obții

Secretele (Clerk, Supabase, Stripe etc.) **nu sunt în Git în clar**. Le ținem
criptate în `.env.vault` (comis în repo) și le decriptăm local cu o cheie privată
(`DOTENV_KEY`) pe care o primești **o singură dată, securizat** (Signal / mesaj
privat — niciodată pe Git, email sau chat public).

Unealtă: [dotenv-vault](https://www.dotenv.org/). Nu trebuie să instalezi nimic
global — rulezi prin `npx` (ai deja Node).

---

## Setup (o singură dată)

1. **Ia codul la zi** (conține `.env.vault` criptat):
   ```bash
   git pull
   ```

2. **Cere-i lui Andrei `DOTENV_KEY`-ul** pentru mediul `development`. Arată așa:
   ```
   dotenv://:key_xxxxxxxx@dotenv.org/vault/.env.vault?environment=development
   ```

3. **Decriptează în `.env.local`** (fișierul pe care îl citește Next.js):
   ```bash
   # PowerShell:
   $env:DOTENV_KEY="dotenv://:key_xxxx@dotenv.org/vault/.env.vault?environment=development"
   npx dotenv-vault@latest decrypt > .env.local

   # sau Git Bash:
   DOTENV_KEY='dotenv://:key_xxxx@dotenv.org/vault/.env.vault?environment=development' \
     npx dotenv-vault@latest decrypt > .env.local
   ```
   > Dacă subcomanda diferă între versiuni, rulează `npx dotenv-vault@latest help`.
   > Scopul e simplu: decriptezi `.env.vault` → `.env.local`.

4. **Verifică** că `.env.local` are valorile reale (Stripe/Clerk/Supabase), apoi:
   ```bash
   npm run dev
   ```

---

## Când Andrei schimbă un secret

Andrei face `push` în vault + comite noul `.env.vault`. Tu doar:
```bash
git pull
# re-decriptezi (pasul 3 de mai sus)
```
Nicio trimitere manuală de fișiere.

---

## Reguli (important)

- `.env.local`, `.env.me`, `.env.keys`, `DOTENV_KEY` → **NICIODATĂ în Git** (sunt în `.gitignore`).
- Se comite doar `.env.vault` (criptat) și `.env.project` (doar ID-ul vault-ului).
- Dacă bănuiești că `DOTENV_KEY` a fost expus → anunță-l pe Andrei să-l regenereze
  din dashboard-ul dotenv-vault.

> Vezi și `docs/stripe.md` (variabilele Stripe) și `.env.example` (lista completă).

---

## Mesaj gata de trimis unui coleg nou

> **Setup secrete (o singură dată):**
>
> ```bash
> # 1. Ia codul la zi (conține .env.vault criptat)
> git pull
>
> # 2. Decriptează secretele în .env.local (cu cheia trimisă separat, securizat)
> npx dotenv-vault@latest decrypt "<DOTENV_KEY>" > .env.local
>
> # 3. Pornește aplicația
> npm run dev
> ```
>
> Când un secret se schimbă: doar `git pull` + repeți pasul 2. Fără fișiere trimise manual.
> `.env.local` și cheia nu intră niciodată în Git.

`DOTENV_KEY`-ul se trimite **separat**, pe canal securizat (Signal / mesaj privat / manager de parole) — niciodată în acest fișier, în Git, email sau chat public.

---

## Aplicarea migrărilor fără să fii la calculator

**Problema.** `supabase db push --linked` cere autentificare în browser și parola bazei,
introduse de un om. Într-o sesiune fără om în față — cum sunt cele în care se lucrează de
pe telefon — migrările rămâneau blocate până ajungea cineva la calculator, iar codul
merged fără migrarea aplicată e o rută care citește coloane inexistente.

**Soluția.** O singură variabilă în `.env.local`, iar unealta nu mai cere login deloc:

```
SUPABASE_DB_URL="postgresql://postgres.<ref>:<parola>@aws-...pooler.supabase.com:5432/postgres"
```

De unde: panoul Supabase → **Connect** → *Connection string* → **Session pooler**
(„Direct connection" cere IPv6). Înlocuiește `[YOUR-PASSWORD]` cu parola bazei. Dacă
parola conține caractere speciale, trebuie codate procentual în adresă.

Apoi:

```bash
npm run db:plan   # arată ce s-ar aplica, NU schimbă nimic
npm run db:push   # aplică
```

**De ce adresa bazei și nu un Personal Access Token.** Un PAT de Supabase e pe **cont**, nu
pe proiect: acoperă toate proiectele și Management API, inclusiv ștergerea proiectului.
Adresa de conexiune ajunge la o singură bază de date — strictul necesar pentru migrări.

**De ce nu e în `lib/env.ts`.** E o unealtă de dezvoltare; aplicația nu o folosește. Pusă
în schema validată la pornire ca obligatorie, ar fi dărâmat deployul pe Vercel, unde
variabila nu există și nici n-are ce căuta.

**Regula de lucru.** Se rulează **doar** `db:plan` și `db:push`, adică se aplică fișiere de
migrare care sunt deja în git și au trecut printr-un PR. Niciodată SQL scris pe loc: prima
variantă e revizuibilă înainte și reconstruibilă după, a doua nu lasă urmă nicăieri.

`scripts/db-push.mjs` șterge parola din tot ce afișează pe ecran, ca un mesaj de eroare al
uneltei să n-o ducă în log-uri sau în conversații.

---

## Pentru asistentul AI (Claude) și viitoarele sesiuni

- Secretele NU sunt în Git în clar. Sursa de adevăr locală e `.env.local` (gitignored),
  obținut prin decriptarea `.env.vault` cu `DOTENV_KEY` (dotenv-vault).
- **Nu** sugera trimiterea `.env.local` prin email/chat și **nu** scrie valori reale de
  secrete sau `DOTENV_KEY` în niciun fișier comis.
- Pe Vercel, variabilele se gestionează direct în dashboard / prin `vercel env` — nu prin
  `DOTENV_KEY`. Producția nu folosește dotenv-vault.
- La rotirea cheii (`npx dotenv-vault rotatekey development`): `.env.vault` trebuie
  re-criptat (`push development .env.local`), re-comis și cheia nouă redistribuită;
  altfel decriptarea eșuează cu `DECRYPTION_FAILED`.
- Migrările se aplică prin `npm run db:plan` apoi `npm run db:push`, care citesc
  `SUPABASE_DB_URL` din `.env.local`. **Nu** cere niciodată acest șir în conversație — se
  adaugă în fișier de către om, o singură dată.
- Rulează **doar** aceste două comenzi împotriva producției. Fără SQL ad-hoc: migrările
  trec prin PR, ca să rămână revizuibile și reconstruibile.
