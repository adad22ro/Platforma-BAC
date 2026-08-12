import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { getCurrentAppUser, isTeacher } from "@/lib/current-user";
import { ThemeToggle } from "./theme-toggle";
import { TICHETE_UI_ACTIVE } from "./feature-flags";

// Header pentru zona logata (dashboard, lectii, profil).
// Diferit de SiteHeader (public): are meniul de cont Clerk, nu CTA-uri de inregistrare.
export async function AppHeader() {
  const user = await getCurrentAppUser();
  const teacher = isTeacher(user);
  return (
    <header className="sticky top-0 z-10 border-b border-zinc-200/70 bg-white/80 backdrop-blur dark:border-zinc-800/70 dark:bg-zinc-950/80">
      <nav className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between px-6">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 font-semibold tracking-tight"
        >
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-indigo-600 text-sm font-bold text-white">
            B
          </span>
          <span className="text-lg">Platforma&nbsp;BAC</span>
        </Link>
        <div className="flex items-center gap-4">
          <ThemeToggle />
          {teacher && (
            <Link
              href="/profesor"
              className="text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
            >
              Profesor
            </Link>
          )}
          {TICHETE_UI_ACTIVE && (
            <Link
              href="/intrebari"
              className="text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
            >
              Întrebările mele
            </Link>
          )}
          <Link
            href="/profil"
            className="text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
          >
            Profil
          </Link>
          <UserButton />
        </div>
      </nav>
    </header>
  );
}
