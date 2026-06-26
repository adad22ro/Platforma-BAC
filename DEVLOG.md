# Jurnal de dezvoltare — Platformă BAC

> Adaugă o intrare la **sfârșitul fiecărei sesiuni de lucru**.
> Format: `## YYYY-MM-DD — Andrei / Bogdan`
> Fii scurt și concret: ce s-a făcut, ce decizii s-au luat, ce probleme au rămas deschise.

---

## 2026-06-26 — Andrei (Sesiunea 3)

**Ce s-a făcut:**
- Verificat că setup-ul Clerk din sesiunea anterioară e complet funcțional (sign-in/sign-up merg, proxy.ts corect)
- Descoperit că în Next.js 16 fișierul middleware se numește `proxy.ts` (nu `middleware.ts` ca în versiunile anterioare)
- Creat tabel `users` în Supabase cu RLS activat (câmpuri: id, clerk_id, email, full_name, role, subscription_status, subscription_end_date)
- Creat `lib/supabase-admin.ts` — client Supabase cu service_role key pentru operații server-side
- Creat `app/api/webhooks/clerk/route.ts` — webhook handler pentru sync users (user.created, user.updated, user.deleted)
- Actualizat `proxy.ts` să facă ruta `/api/webhooks/(.*)` publică
- Configurat endpoint webhook în Clerk dashboard cu localtunnel
- Adăugat `CLERK_WEBHOOK_SIGNING_SECRET` în `.env.local`
- Mutat proiectul pe SSD pentru performanță mai bună (Turbopack era lent pe HDD)

**Decizii luate:**
- Folosim `supabase-admin.ts` (service role) în webhook, nu clientul anon — pentru a ocoli RLS
- Webhook-ul gestionează și ștergerea userilor din DB la `user.deleted`

**Probleme deschise / Next steps:**
- De verificat că webhook-ul funcționează (test: înregistrare user nou → apare în tabelul `users`)
- Urmează: pagină profil elev, pagină upgrade abonament, Stripe Checkout

---

## 2026-06-26 — Andrei (Sesiunea 2)

**Ce s-a făcut:**
- Instalare și configurare Next.js 16 cu TypeScript, Tailwind CSS, ESLint, App Router
- Configurare Supabase: cont, proiect, chei în .env.local, client în lib/supabase.ts
- Configurare Clerk: cont, aplicație (email + Google login), middleware, pagini sign-in/sign-up
- Configurare Stripe: cont, chei sandbox în .env.local, client în lib/stripe.ts
- Deploy inițial pe Vercel: platforma-bac.vercel.app, conectat la GitHub (deploy automat la fiecare merge în main)
- PR #1 creat și merged în main

**Decizii luate:**
- Librărie UI: Tailwind CSS (inclus în create-next-app)
- Clerk: autentificare cu email și Google, fără telefon/username/GitHub
- Stripe: mod "I'll do it" (nu global), recurring payments + invoicing
- Vercel: deploy automat din branch main

**Probleme deschise / Next steps:**
- Săptămânile 1-2 complete ✅
- Urmează Săptămânile 3-4: autentificare cont elev, pagini profil, integrare Stripe Checkout
- De stabilit împărțirea sarcinilor cu Bogdan

---

## 2026-06-26 — Andrei

**Ce s-a făcut:**
- Creat și configurat CLAUDE.md cu contextul complet al proiectului
- Creat TASKS.md — lista de sarcini cu responsabili și branch-uri, actualizată continuu
- Creat DEVLOG.md (acest fișier) — jurnal zilnic de progres
- Creat CONTRIBUTING.md — reguli de colaborare și rezolvare conflicte
- Creat .env.example — toate variabilele de mediu necesare, fără valori reale

**Decizii luate:**
- Andrei începe configurarea inițială (Săpt. 1-2); rolurile pe termen lung se stabilesc cu Bogdan
- Sarcinile din Săpt. 3-12 sunt marcate ca nedecise până la împărțirea cu Bogdan
- CLAUDE.md este punctul central de instrucțiuni pentru ambele instanțe de Claude Code

**Probleme deschise / Next steps:**
- Niciun cod scris încă — urmează instalarea Next.js și configurarea serviciilor
- Profesorul partener nu este disponibil pentru conținut real — se lucrează cu placeholder
