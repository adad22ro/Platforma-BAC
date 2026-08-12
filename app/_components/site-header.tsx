import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { ThemeToggle } from "./theme-toggle";
import { btn } from "./ui";

// Header-ul public (landing + /pricing). Server component: citeste sesiunea
// direct din Clerk, fara flash de continut gresit la hidratare.
export async function SiteHeader() {
  const { userId } = await auth();

  return (
    <header className="sticky top-0 z-10 border-b border-zinc-200/70 bg-white/80 backdrop-blur dark:border-zinc-800/70 dark:bg-zinc-950/80">
      <nav className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6">
        <Link
          href="/"
          className="flex items-center gap-2 font-semibold tracking-tight"
        >
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-indigo-600 text-sm font-bold text-white">
            B
          </span>
          <span className="text-lg">Platforma&nbsp;BAC</span>
        </Link>
        <div className="flex items-center gap-3 text-sm font-medium">
          <ThemeToggle />
          <Link
            href="/pricing"
            className="hidden text-zinc-600 hover:text-zinc-900 sm:inline dark:text-zinc-400 dark:hover:text-zinc-50"
          >
            Prețuri
          </Link>
          {userId ? (
            <Link
              href="/dashboard"
              className={btn("primary", "md")}
            >
              Contul meu
            </Link>
          ) : (
            <>
              <Link
                href="/sign-in"
                className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
              >
                Autentificare
              </Link>
              <Link
                href="/sign-up"
                className={btn("primary", "md")}
              >
                Începe gratuit
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
