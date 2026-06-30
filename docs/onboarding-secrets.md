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
