import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-zinc-200 dark:border-zinc-800">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 text-sm text-zinc-500 sm:flex-row">
        <span>© {new Date().getFullYear()} Platforma BAC</span>
        <div className="flex gap-6">
          <Link
            href="/sign-in"
            className="hover:text-zinc-900 dark:hover:text-zinc-300"
          >
            Autentificare
          </Link>
          <Link
            href="/pricing"
            className="hover:text-zinc-900 dark:hover:text-zinc-300"
          >
            Prețuri
          </Link>
        </div>
      </div>
    </footer>
  );
}
