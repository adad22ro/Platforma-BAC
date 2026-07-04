# Prompt reutilizabil — „Generează-mi un curs-manual al proiectului"

> Copiază tot textul de mai jos și dă-i-l lui Claude Code (sau Claude) la începutul
> unei sesiuni în ORICE alt proiect. Ai lângă tine și fișierul `_curs-template.html`
> (șablonul de design) — menționează-i calea în prompt, ca să păstreze aspectul.

---

**PROMPT (copiază de aici în jos):**

Vreau să generezi un „curs-manual" al acestui proiect: o pagină web (Artifact)
care explică, pe înțelesul oricui non-tehnic, toate tehnologiile folosite și cum
funcționează tot ce e implementat, plus ce urmează.

Pași:
1. **Explorează întâi proiectul.** Citește `README`, fișierele de configurare
   (`package.json` / echivalent), structura de foldere, documentația din `docs/`
   (dacă există) și 3–5 fișiere-cheie de cod reprezentative. Nu presupune — verifică
   în cod ce tehnologii și ce fluxuri există cu adevărat.
2. **Folosește șablonul de design** din `docs/_curs-template.html` (ți-l dau în
   proiect): păstrează CSS-ul, structura de capitole, casetele (analogie / idee de
   reținut / avertisment), tema light+dark și cuprinsul lateral. Înlocuiește doar
   conținutul.
3. **Reguli de conținut:**
   - Scrie în aceeași limbă ca documentația proiectului (aici: română).
   - Fiecare tehnologie primește: ce e (o frază), o **analogie** din viața reală, cum
     e folosită **în acest proiect**, și un **exemplu real din cod** (scurt).
   - Ordinea capitolelor: intro → vocabular de bază → straturile aplicației → fiecare
     tehnologie pe rând → un flux „pas cu pas" real din proiect → securitate → ce
     urmează (roadmap) → glosar.
   - Zero jargon nedeslușit. Dacă folosești un termen tehnic, explică-l imediat.
   - Ancorează-te în codul REAL (nume de fișiere, funcții, decizii), nu în generalități.
4. **Publică** pagina ca Artifact (favicon 🎓) și dă-mi link-ul.
5. Dacă e cazul, spune-mi ce ai presupus și ce ar trebui verificat manual.

Nu implementa nimic în cod — doar generează materialul educativ.

---

**Opțional — pentru a-l ține la zi:** cere-i lui Claude să-și noteze în memorie
că pagina e un „document viu" de reactualizat la fiecare modificare relevantă,
republicând la același URL de Artifact.
