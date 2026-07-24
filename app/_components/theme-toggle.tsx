"use client";

import { useSyncExternalStore } from "react";

// Sursa de adevar a temei e clasa `dark` de pe <html> (setata inainte de paint
// de scriptul din layout.tsx). O citim reactiv cu useSyncExternalStore: pe
// server nu o stim (=> placeholder), pe client o luam din DOM si re-randam la
// fiecare comutare. Fara setState-in-effect, fara mismatch de hidratare.
const listeners = new Set<() => void>();

function subscribe(cb: () => void) {
  listeners.add(cb);
  // Sincronizeaza si intre tab-uri (alegerea e in localStorage).
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}

function getSnapshot(): boolean {
  return document.documentElement.classList.contains("dark");
}

function getServerSnapshot(): boolean | null {
  return null; // pe server nu stim tema => placeholder neutru
}

function setDark(next: boolean) {
  document.documentElement.classList.toggle("dark", next);
  try {
    localStorage.setItem("theme", next ? "dark" : "light");
  } catch {
    // localStorage indisponibil (mod privat) — tema tine doar cat e pagina deschisa
  }
  listeners.forEach((l) => l());
}

export function ThemeToggle() {
  const isDark = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  return (
    <button
      type="button"
      onClick={() => setDark(!getSnapshot())}
      aria-label={isDark ? "Comută pe tema luminoasă" : "Comută pe tema întunecată"}
      title="Comută tema"
      className="grid h-9 w-9 place-items-center rounded-full text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
    >
      {isDark === null ? (
        // Pana la hidratare nu stim tema pe client => placeholder neutru
        <span className="h-5 w-5" />
      ) : isDark ? (
        // Soare — click => trecem pe tema luminoasa
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-5 w-5"
          aria-hidden
        >
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
        </svg>
      ) : (
        // Luna — click => trecem pe tema intunecata
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-5 w-5"
          aria-hidden
        >
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      )}
    </button>
  );
}
