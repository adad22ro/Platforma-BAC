# Autentificare și roluri

> Actualizat la: 2026-07-01
> Serviciu: Clerk (auth) + Supabase (rol & abonament)

## Cum funcționează

Clerk gestionează identitatea: înregistrare, login, sesiuni, parole, OAuth (email +
Google). Nu stocăm parole — Clerk se ocupă de securitate.

La `user.created` / `user.updated` / `user.deleted`, un webhook Clerk
(`app/api/webhooks/clerk/route.ts`) sincronizează userul în tabelul `users` din
Supabase (oglinda locală). `clerk_id` leagă cele două.

## Roluri

Sursa de adevăr pentru rol e **`users.role` în Supabase** (nu Clerk).

| Rol | Cum e setat | Ce poate face |
|---|---|---|
| `student` | implicit la înregistrare | vede capitolele/lecțiile; conținut premium doar cu abonament |
| `teacher` | promovat din `/admin` (buton → `POST /api/admin/set-role`) | CRUD pe capitole și lecții |

Nu există cont separat sau cod de invitație pentru profesor — un admin promovează un
user existent. Vezi `docs/admin.md`.

## Abonament & acces premium

`users.subscription_status` (`free` / `active` / `cancelled`) + `subscription_end_date`,
actualizate de webhook-ul Stripe. `lib/current-user.ts`:
- `isTeacher(user)` — rol `teacher`
- `canAccessPremium(user)` — abonament `active` **și** `subscription_end_date` în viitor
  (sau nesetat). Apărare în adâncime dacă un webhook de anulare se pierde.

Model de gating conținut: userul free vede lista completă (titluri); conținutul lecțiilor
premium e blocat. Detalii în `docs/api.md`.

## Protejarea rutelor

`proxy.ts` (Next.js 16 — fișierul de middleware se numește `proxy.ts`) rulează
`clerkMiddleware` și cere login pe tot, **exceptând** rutele publice:
`/sign-in`, `/sign-up`, `/api/webhooks/*`, `/api/health`.

Autorizarea fină (rol, abonament) se face în handlere, nu în middleware:
- scriere conținut → `isTeacher`
- conținut premium → `canAccessPremium`
- `/admin` și `/api/admin/*` → allowlist de email-uri (`ADMIN_EMAILS`, vezi `lib/admin.ts`),
  verificat pe `primaryEmailAddress`.
