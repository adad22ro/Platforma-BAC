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
