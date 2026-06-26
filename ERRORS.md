# Jurnal de erori — Platformă BAC

> Verifică acest fișier înainte de a investiga o eroare nouă.
> Adaugă fiecare eroare nouă cu data, descrierea și soluția aplicată.

---

## #001 — `@clerk/backend: Missing publishableKey`
**Data:** 2026-06-26  
**Context:** La pornirea serverului de dev (`npm run dev`)  
**Cauză:** Lipsea fișierul `.env.local` cu cheile Clerk  
**Soluție:** Creare `.env.local` cu valorile reale din dashboard.clerk.com → API Keys

---

## #002 — `Both middleware.ts and proxy.ts detected`
**Data:** 2026-06-26  
**Context:** Next.js 16 — eroare la pornirea serverului  
**Cauză:** În Next.js 16, `middleware.ts` a fost redenumit în `proxy.ts`. Ambele existau simultan.  
**Soluție:** Ștergere `middleware.ts`, păstrare doar `proxy.ts`

---

## #003 — Cache Turbopack corupt (panic / SST file not found)
**Data:** 2026-06-26  
**Context:** Eroare fatală Turbopack la `npm run dev`  
**Cauză:** Cache-ul `.next` corupt după mutarea proiectului sau schimbări majore  
**Soluție:** `Remove-Item -Recurse -Force .next` apoi `npm run dev`

---

## #004 — `supabaseUrl is required` la build pe Vercel
**Data:** 2026-06-26  
**Context:** Build eșuat pe Vercel — `Failed to collect page data for /api/webhooks/clerk`  
**Cauză:** Variabila `NEXT_PUBLIC_SUPABASE_URL` nu era setată în Environment Variables pe Vercel  
**Soluție:** Adăugare variabilă în Vercel → Settings → Environment Variables

---

## #005 — Webhook Clerk cu 404 pe Vercel
**Data:** 2026-06-26  
**Context:** Clerk trimitea webhook la `https://true-hornets-call.loca.lt` (tunel local vechi)  
**Cauză:** URL-ul webhook-ului nu fusese actualizat după deploy pe Vercel  
**Soluție:** Clerk Dashboard → Webhooks → Edit → schimbare URL la `https://platforma-bac.vercel.app/api/webhooks/clerk`

---

## #006 — `Edge Function "middleware" referencing unsupported modules` (Clerk)
**Data:** 2026-06-26  
**Context:** Build eșuat pe Vercel după downgrade la Next.js 15  
**Cauză:** În Next.js 15, middleware rulează pe Edge runtime implicit; Clerk 7 necesită Node.js runtime și nu e compatibil cu Edge  
**Soluție:** Upgrade înapoi la Next.js 16 (care rulează proxy/middleware pe Node.js implicit) + folosire `proxy.ts` în loc de `middleware.ts`

---

## #007 — Clerk nu redirecționează utilizatorul neautentificat
**Data:** 2026-06-26  
**Context:** Pagina `/` afișa conținut deși utilizatorul nu era autentificat  
**Cauză:** Utilizatorul era deja autentificat în browser (sesiune activă Clerk) — nu era o eroare reală  
**Soluție:** Testare în fereastră Incognito pentru a simula un utilizator neautentificat

---
