# Panou de monitorizare & debug

> Actualizat la: 2026-07-01

Unelte interne pentru a urmări starea celor 4 platforme (Clerk, Supabase, Stripe,
Vercel) și erorile aplicației — fără a sări dintr-un tab în altul.

Există două forme:
1. **Pagina `/admin`** — dashboard vizual în browser.
2. **Scriptul `npm run debug`** — raport consolidat în terminal (util la depanare).

---

## 1. Pagina `/admin`

Rută protejată: `app/admin/page.tsx`. Accesibilă doar utilizatorilor al căror email
e în allowlist-ul de admini.

### Acces (allowlist)
Controlat de `lib/admin.ts` → funcția `requireAdmin()`:
- Citește variabila de mediu `ADMIN_EMAILS` (email-uri separate prin virgulă).
- Dacă nu e setată, folosește un default (`gabirusu2000@gmail.com`).
- Un utilizator care nu e în listă e redirecționat la `/`.

> Pentru a da acces unui coleg (ex: Bogdan), adaugă-i email-ul în `ADMIN_EMAILS`
> (în `.env.local` local și în variabilele de mediu Vercel pentru producție).

### Secțiuni
**Overview:**
- **Sincronizare Clerk ↔ Supabase** — compară numărul de utilizatori; alert roșu
  dacă diferă (semn că un webhook a eșuat).
- **Clerk** — ultimii utilizatori + total.
- **Supabase** — rândurile din `users`. Fiecare user are un buton de **promovare rol**
  (student ↔ teacher) → apelează `POST /api/admin/set-role` (doar admini). Așa dai
  cuiva rol de profesor fără SQL manual.
- **Stripe** — clienți + abonamente.
- **Vercel** — ultimele deploy-uri cu starea lor.

**Debug & Loguri:**
- **Loguri de erori (aplicație)** — rândurile din tabelul `error_logs`.
- **Vercel — Loguri build** — logurile ultimului deploy eșuat (sau cel mai recent).

Fiecare card își izolează erorile (dacă o platformă pică, restul se afișează normal).

### Banc de test conținut (`/admin/content`)
Link din header-ul `/admin`. Unealtă internă de dezvoltare (nu UI de produs) care
exercită API-ul de capitole/lecții cu sesiune Clerk reală: listare, creare/editare/
ștergere, toggle `published`/`is_free`, încărcare lecții și afișarea răspunsului brut
(inclusiv `402 premium_required`, `403` la scriere fără rol `teacher`).

> Scrierea cere rol `teacher` — promovează-te întâi din cardul Supabase (buton de rol).
> Detalii despre rute în `docs/api.md`.

---

## 2. Scriptul `npm run debug`

Fișier: `scripts/debug.mjs`. Rulează cu:
```bash
npm run debug
```
Încarcă automat `.env.local` (prin `node --env-file`) și tipărește un raport cu:
- Supabase: nr. utilizatori + ultimele erori din `error_logs`
- Clerk: ultimii utilizatori
- Stripe: ultimele evenimente (marcate ⚠ dacă sunt eșecuri)
- Vercel: ultimele deploy-uri + logurile ultimului deploy eșuat

**Când îl folosești:** când apare o eroare, rulează-l pentru o imagine completă a
tuturor platformelor într-un singur loc. Util și pentru asistentul AI la depanare.

---

## 3. Logarea erorilor în cod

Helper: `lib/log-error.ts` → `logError(source, message, context?, severity?)`.
Scrie în tabelul `error_logs` din Supabase. Nu aruncă erori el însuși (dacă scrierea
eșuează, doar afișează în consolă), ca să nu strice fluxul apelantului.

Cu `severity = 'critical'` trimite în plus o **alertă instant pe Discord** (dacă
`DISCORD_ALERT_WEBHOOK_URL` e setat) — folosit pentru erori de plăți/webhook. Detalii
în `docs/monitoring.md`.

Exemplu (din webhook-ul Clerk):
```ts
await logError('clerk-webhook', 'Supabase insert error', {
  type: evt.type, clerk_id: id, code: error.code, message: error.message,
})
```

Pentru a loga erori și din alte locuri, importă și apelează `logError` în blocurile
`catch`.

---

## 4. Variabile de mediu necesare

Pe lângă cheile existente (Clerk, Supabase, Stripe), monitorizarea folosește:

| Variabilă | Obligatorie | Descriere |
|---|---|---|
| `ADMIN_EMAILS` | recomandat | Email-uri cu acces la `/admin` (virgulă) |
| `DISCORD_ALERT_WEBHOOK_URL` | opțional | Alerte instant la erori critice (vezi `docs/monitoring.md`) |
| `VERCEL_API_TOKEN` | pentru cardul Vercel | Token din vercel.com/account/tokens |
| `VERCEL_TEAM_ID` | opțional | Doar dacă proiectul e într-o echipă Vercel |
| `VERCEL_PROJECT_NAME` | opțional | Default: `platforma-bac` |

> Toate sunt documentate și în `.env.example`. Cheile reale stau în `.env.local`
> (negat de Git) și în variabilele de mediu Vercel — **nu** se comit niciodată.

---

## 5. Acces pentru un coleg nou (ex: Bogdan)

Scriptul de debug și pagina `/admin` ajung la el prin `git pull` (sunt în repo).
Ca să le **ruleze**, are nevoie de:
1. Propriul `.env.local` cu cheile reale — primite securizat (NU prin Git/chat).
   `.env.example` listează ce variabile trebuie.
2. Email-ul lui adăugat în `ADMIN_EMAILS` (pentru `/admin`).
