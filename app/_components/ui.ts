// Primitive de stil partajate.
//
// Nu folosim o librarie de componente (shadcn/ui & co) — vezi decizia din
// TASKS.md / DEVLOG. Stilul e Tailwind curat, dar sirurile de clase pentru
// butoane, inputuri si carduri se repetau identic in ~10 fisiere. Aici sunt
// o singura data, ca sa nu mai divergheze (h-10 vs h-11, hover:bg-zinc-50 vs
// hover:bg-white etc.).
//
// Sunt siruri de clase, nu componente React: se pun in `className` si raman
// compozabile cu clase de pozitionare (`mt-5`, `w-full`) la locul folosirii.

type ButtonVariant = "primary" | "outline";
type ButtonSize = "sm" | "md" | "lg";

const BUTTON_BASE =
  "inline-flex items-center justify-center rounded-full font-medium transition-colors disabled:opacity-50";

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-indigo-600 text-white hover:bg-indigo-500",
  outline:
    "border border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900",
};

const BUTTON_SIZES: Record<ButtonSize, string> = {
  sm: "h-9 gap-2 px-4 text-sm",
  md: "h-10 gap-2 px-5 text-sm",
  lg: "h-12 gap-2 px-8 text-base",
};

/**
 * Clasele unui buton (sau ale unui `<Link>` care arata ca un buton).
 *
 * `extra` se adauga la final, deci poate suprascrie: pozitionare (`mt-5`,
 * `w-full`) sau, cand butonul sta pe un fundal colorat, hover-ul.
 */
export function btn(
  variant: ButtonVariant = "primary",
  size: ButtonSize = "md",
  extra = "",
) {
  return [BUTTON_BASE, BUTTON_VARIANTS[variant], BUTTON_SIZES[size], extra]
    .filter(Boolean)
    .join(" ");
}

/** Input / select / textarea. */
export const inputCls =
  "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 dark:border-zinc-700 dark:bg-zinc-900";

/** Card / panou cu chenar — folosit si pentru listele cu randuri separate. */
export const cardCls =
  "rounded-2xl border border-zinc-200 dark:border-zinc-800";

/** Lista in card: randuri separate prin linie. */
export const listCls = `divide-y divide-zinc-200 overflow-hidden dark:divide-zinc-800 ${cardCls}`;

/** Bulina de stare (Gratuit/Premium, Publicat/Draft). */
export const badgeCls =
  "shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium";
