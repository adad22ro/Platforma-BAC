# Jurnal de erori — Platformă BAC

> Verifică acest fișier înainte de a investiga o eroare nouă.
> Adaugă fiecare eroare nouă cu data, descrierea și soluția aplicată.

---

## #012 — `Invalid API Key provided` la Stripe (pe Vercel)
**Data:** 2026-06-26  
**Context:** Cardul Stripe din `/admin` dădea eroare pe producție (local mergea). Valoarea din eroare începea cu `eyJhbGci...` (un JWT).  
**Cauză:** Pe Vercel, variabila `STRIPE_SECRET_KEY` conținea din greșeală o cheie **Supabase** (JWT), nu cheia Stripe. Cheile Stripe încep cu `sk_test_` / `sk_live_`; cele Supabase sunt JWT-uri (`eyJ...`).  
**Diagnostic cheie:** prefixul valorii — `eyJ` = Supabase/JWT, `sk_` = Stripe. Panoul `/admin` a prins eroarea înainte să afecteze fluxul real de plată.  
**Soluție:** Vercel → Environment Variables → `STRIPE_SECRET_KEY` → înlocuire cu Secret key-ul corect din Stripe Dashboard (Developers → API keys) → Redeploy

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

## #011 — `null value in column "email"` la insert
**Data:** 2026-06-26  
**Context:** Webhook dădea 500 "Database error" cu `23502 not-null constraint` pe `email`  
**Cauză:** Se testa cu payload-ul **sample** de la Clerk (user "John Doe", fără email real). Coloana `email` e `NOT NULL` (corect). Sample-ul nu are email → violare constrângere.  
**Soluție:** Testare cu eveniment real (înregistrare cont nou cu email real), nu cu sample-ul din tab-ul Testing

---

## #010 — `permission denied for table users` (cod 42501) pentru service_role
**Data:** 2026-06-26  
**Context:** Webhook dădea 500 "Database error"; log: `42501 permission denied for table users`  
**Cauză:** Rolul `service_role` nu avea privilegii pe tabelul `users` (grant-urile nu s-au aplicat la crearea tabelului). Cheia era corectă — Postgres pune rolul curent în hint, iar hint-ul arăta `service_role`, confirmând autentificarea corectă.  
**Soluție:** Supabase → SQL Editor → `GRANT INSERT, SELECT, UPDATE, DELETE ON public.users TO service_role;`

---

## #009 — Două proiecte Vercel duplicate pe același repo
**Data:** 2026-06-26  
**Context:** Modificările de setări (ex: Framework Preset) păreau că nu se aplică; build-uri duble la fiecare push  
**Cauză:** Existau două proiecte Vercel conectate la același repo: `platforma-bac` (deține domeniul `platforma-bac.vercel.app`) și `platforma-bac-nq6x` (duplicat). Se modifica setarea într-unul, dar domeniul era servit de celălalt.  
**Soluție:** Identificare proiect care deține domeniul de producție (Settings → Domains), configurare doar a aceluia, ștergere proiect duplicat

---

## #008 — API routes returnează 404 (Vercel) deși funcționează local
**Data:** 2026-06-26  
**Context:** `/api/webhooks/clerk` dădea 404 (pagina stilizată Vercel `NOT_FOUND`) pe producție, deși local răspundea corect (POST 400, GET 405). Build-ul dura doar ~27s fără loguri.  
**Cauză:** Pe Vercel, **Framework Preset** era setat la **"Other"** (probabil pierdut la mutarea proiectului din folderul vechi). Vercel rula `next build` dar publica doar output-ul static din `public/`, fără să creeze funcțiile serverless. Toate rutele dinamice (`ƒ` — API + pagini SSR) dădeau 404, doar paginile statice (`○`) funcționau.  
**Diagnostic cheie:** 404-ul *stilizat de Vercel* (nu pagina 404 a Next.js) = cererea nu ajunge deloc la aplicația Next.js.  
**Soluție:** Vercel → Settings → Build and Deployment → Framework Settings → **Framework Preset = Next.js** → Save → Redeploy fără cache

---
