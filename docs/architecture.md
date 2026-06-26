# Arhitectura proiectului

> Actualizat la: 2026-06-26

## Prezentare generală

Platforma BAC este o aplicație web construită cu **Next.js** (React), găzduită pe **Vercel**. Utilizează servicii externe pentru autentificare, bază de date și plăți — în loc să le construiască de la zero.

## Structura aplicației (de completat pe măsură ce se construiește)

```
/
├── app/                  # Rutele Next.js (App Router)
├── components/           # Componente React reutilizabile
├── lib/                  # Funcții utilitare, clienți pentru servicii externe
├── docs/                 # Documentație tehnică (acest folder)
├── CLAUDE.md             # Instrucțiuni pentru Claude Code
├── TASKS.md              # Lista de sarcini și responsabili
├── DEVLOG.md             # Jurnal zilnic de progres
├── CONTRIBUTING.md       # Reguli de colaborare
└── .env.example          # Variabile de mediu necesare (fără valori reale)
```

## Servicii externe folosite

| Serviciu | Scop | Documentație |
|---|---|---|
| **Supabase** | Bază de date PostgreSQL + storage | [docs/database.md](database.md) |
| **Clerk** | Autentificare utilizatori + roluri | [docs/auth.md](auth.md) |
| **Stripe** | Plăți și abonamente recurente | [docs/stripe.md](stripe.md) |
| **Vercel** | Hosting și deploy automat | — |

## Roluri în aplicație

1. **Elev** — accesează lecții, teste, trimite întrebări către mentor
2. **Profesor** — administrează conținut, răspunde la întrebările elevilor
3. **Părinte** — vizualizează progresul elevului *(Faza 2, nu în MVP)*

## Fluxul general al aplicației (MVP)

```
Elev → Înregistrare (Clerk) → Plată abonament (Stripe)
     → Lecții + Teste (conținut din Supabase)
     → Întrebare mentor (tichet în Supabase)
     → Notificare email când primește răspuns

Profesor → Login (Clerk, rol distinct)
         → Panel admin: adaugă capitole, lecții, întrebări
         → Răspunde la tichete elevilor
```
