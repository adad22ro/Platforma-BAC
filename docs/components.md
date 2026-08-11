# Componente UI

> Actualizat la: 2026-08-11 — componentele de mentorat (tichete) + decizia „Tailwind curat, fără shadcn/ui" + primitivele din `app/_components/ui.ts`.

## Decizia: Tailwind curat, fără librărie de componente

Sarcina din TASKS.md („Alegere și configurare librărie UI, ex. Tailwind + shadcn/ui")
se închide cu: **rămânem pe Tailwind CSS curat, fără shadcn/ui.**

De ce:
- UI-ul e deja scris integral (landing, `/pricing`, `/dashboard`, `/profil`, `/lectii/[id]`,
  `/teste/[chapterId]`, `/profesor`, `/admin`) și e vizual coerent. shadcn/ui ar însemna
  rescrierea a ceea ce funcționează deja.
- shadcn aduce dependențe (Radix, CVA, `tailwind-merge`) și un director de componente
  generate, pe care le-am întreține noi. Pentru un MVP cu ~10 pagini, costul depășește
  câștigul.
- Proiectul e pe **Next.js 16** + **Tailwind 4**, unde convențiile diferă de documentația
  majorității generatoarelor (vezi `AGENTS.md`) — un pas în plus de risc, fără beneficiu clar.
- Componentele complexe unde shadcn chiar ajută (dialog, combobox, date picker) nu apar
  nicăieri în MVP.

**De reevaluat** dacă apar: modal/dialog accesibil, meniuri dropdown complexe sau un
al doilea dezvoltator de frontend. Până atunci, accesibilitatea o acoperim cu HTML
nativ (`<fieldset>`, `<label>`, `aria-*`).

## Primitivele de stil — `app/_components/ui.ts`

Problema pe care o rezolvă: aceleași șiruri de clase erau copiate în ~10 fișiere
(13 butoane primare identice, cu variații accidentale — `h-10` vs `h-11`,
`hover:bg-zinc-50` vs `hover:bg-white`). Nu sunt componente React, ci **șiruri de clase**,
ca să rămână compozabile cu clasele de poziționare de la locul folosirii.

| Export | Tip | Ce e |
|---|---|---|
| `btn(variant, size, extra)` | funcție | Clasele unui buton sau ale unui `<Link>` care arată ca buton. `variant`: `"primary"` (implicit) \| `"outline"`. `size`: `"sm"` (h-9) \| `"md"` (h-10, implicit) \| `"lg"` (h-12). `extra` se adaugă la final, deci poate suprascrie (poziționare, sau hover-ul când butonul stă pe fundal colorat). |
| `inputCls` | string | `input` / `select` / `textarea`. |
| `cardCls` | string | Card/panou cu chenar. |
| `listCls` | string | Listă în card, cu rânduri separate prin linie. |
| `badgeCls` | string | Bulină de stare (Gratuit/Premium, Publicat/Draft). |

```tsx
import { btn, inputCls } from "../_components/ui";

<Link href="/upgrade" className={btn("primary", "md", "mt-5")}>Treci la Premium</Link>
<button type="submit" className={btn()} disabled={saving}>Salvează</button>
<input className={`mt-1 ${inputCls}`} />
```

Culorile de stare (verde/ambru/roșu pentru scoruri, indigo pentru Premium) rămân inline
la locul folosirii — sunt semantice, nu primitive reutilizabile.

## Componente

Toate stau în `app/_components/` (partajate) sau lângă ruta care le folosește
(`app/profesor/`, `app/lectii/[id]/`, `app/teste/[chapterId]/`), conform convenției
App Router. Cele client-side sunt marcate `"use client"`.

| Componentă | Fișier | Scop |
|---|---|---|
| `SiteHeader` | `app/_components/site-header.tsx` | Antet pentru paginile publice (landing, pricing). |
| `AppHeader` | `app/_components/app-header.tsx` | Antet pentru paginile autentificate. |
| `SiteFooter` | `app/_components/site-footer.tsx` | Subsol. |
| `ThemeToggle` | `app/_components/theme-toggle.tsx` | Buton temă zi/noapte, persistent în `localStorage`. |
| `PricingPlans` | `app/_components/pricing-plans.tsx` | Cardurile de plan + pornirea Stripe Checkout. |
| `ChaptersBrowser` | `app/_components/chapters-browser.tsx` | Accordion capitole → lecții, cu marcaj 🔒 pe conținutul Premium și link către testul capitolului. |
| `ProgressSummary` | `app/_components/progress-summary.tsx` | „Progresul tău" pe `/dashboard` — scor per capitol. Depinde de `GET /api/progress`. |
| `HelpButton` | `app/_components/help-button.tsx` | Butonul „Nu am înțeles" — formular de tichet cu context completat automat din pagină. Depinde de `POST /api/tickets`. |
| `LessonView` | `app/lectii/[id]/lesson-view.tsx` | Conținutul unei lecții + paywall pe `402`. |
| `QuizView` | `app/teste/[chapterId]/quiz-view.tsx` | Testul grilă: variante, trimitere, scor și feedback per întrebare. Depinde de `GET /api/chapters/[id]/questions` + `POST .../attempts`. |
| `MyTickets` | `app/intrebari/my-tickets.tsx` | Întrebările elevului + răspunsurile primite, pe `/intrebari`. Depinde de `GET /api/tickets`. |
| `TeacherPanel` | `app/profesor/teacher-panel.tsx` | Containerul panelului profesor; ține lista de capitole (sursă unică) și o dă mai departe. |
| `TeacherChapters` | `app/profesor/teacher-chapters.tsx` | Formular „Capitol nou" + lista capitolelor. |
| `TeacherLessons` | `app/profesor/teacher-lessons.tsx` | Formular „Lecție nouă" (cu previzualizare) + lecțiile capitolului. |
| `TeacherQuestions` | `app/profesor/teacher-questions.tsx` | Formular „Întrebare test" (variante dinamice 2-6) + întrebările capitolului. |
| `TeacherTickets` | `app/profesor/teacher-tickets.tsx` | Lista de tichete grupată pe capitol, cu filtru „doar fără răspuns" și detaliu desfășurabil. Depinde de `GET /api/tickets`. |

Tipurile partajate din panelul profesor: `app/profesor/types.ts`.

## Convenții

- **Stări de fetch ca uniune discriminată**, nu boolean-uri separate:
  `{ status: "loading" } | { status: "error" } | { status: "loaded"; … }`.
  Pentru conținut cu gating se adaugă `premium` (HTTP `402`) și `notfound` (`404`).
- **Efectele de fetch** folosesc un flag `active` la cleanup, ca să nu scrie starea după
  demontare.
- **Texte în română**, cu diacritice, inclusiv mesajele de eroare — sunt vizibile elevului.
- **Fără dependențe noi de UI** fără să reevaluăm decizia de mai sus.
