import type { Metadata } from "next";
import Link from "next/link";
import { currentUser } from "@clerk/nextjs/server";
import { getCurrentAppUser, canAccessPremium } from "@/lib/current-user";
import { AppHeader } from "../_components/app-header";

export const metadata: Metadata = {
  title: "Contul meu — Platforma BAC",
};

// Aici aterizeaza:
//  - inregistrarea pe plan free (forceRedirectUrl din /sign-up)
//  - intoarcerea de la Stripe Checkout (?checkout=success | cancel)
export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string }>;
}) {
  const { checkout } = await searchParams;
  const [clerkUser, appUser] = await Promise.all([
    currentUser(),
    getCurrentAppUser(),
  ]);

  const isPremium = canAccessPremium(appUser);
  const firstName = clerkUser?.firstName ?? null;

  // Dupa plata, Stripe ne trimite inapoi imediat — dar abonamentul e activat de
  // webhook, care poate intarzia cateva secunde. Deci "success" + inca free nu e
  // o eroare: e o cursa de sincronizare, si o spunem ca atare.
  const plataInAsteptare = checkout === "success" && !isPremium;

  return (
    <div className="flex flex-1 flex-col bg-white text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
      <AppHeader />

      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-12">
        <h1 className="text-3xl font-bold tracking-tight">
          {firstName ? `Bun venit, ${firstName}!` : "Bun venit!"}
        </h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          De aici îți continui pregătirea pentru Bacalaureat.
        </p>

        {/* Mesaje dupa intoarcerea de la Stripe */}
        {checkout === "success" && (
          <div className="mt-8 rounded-xl border border-green-200 bg-green-50 p-5 dark:border-green-900 dark:bg-green-950/40">
            <p className="font-semibold text-green-800 dark:text-green-300">
              Plata a fost înregistrată. Îți mulțumim!
            </p>
            <p className="mt-1 text-sm text-green-700 dark:text-green-400">
              {plataInAsteptare
                ? "Abonamentul se activează în câteva secunde. Reîmprospătează pagina dacă nu apare imediat ca activ."
                : "Abonamentul Premium este activ — ai acces complet la lecții și teste."}
            </p>
          </div>
        )}

        {checkout === "cancel" && (
          <div className="mt-8 rounded-xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-900 dark:bg-amber-950/40">
            <p className="font-semibold text-amber-800 dark:text-amber-300">
              Plata a fost anulată.
            </p>
            <p className="mt-1 text-sm text-amber-700 dark:text-amber-400">
              Nu ți s-a reținut nimic. Poți relua oricând upgrade-ul.
            </p>
          </div>
        )}

        <div className="mt-8 grid gap-6 sm:grid-cols-2">
          {/* Abonament */}
          <section className="rounded-2xl border border-zinc-200 p-6 dark:border-zinc-800">
            <h2 className="text-sm font-medium text-zinc-500">Abonament</h2>
            <p className="mt-2 flex items-center gap-2 text-2xl font-bold">
              {isPremium ? "Premium" : "Gratuit"}
              <span
                className={
                  isPremium
                    ? "rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700 dark:bg-green-950 dark:text-green-400"
                    : "rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                }
              >
                {isPremium ? "activ" : "limitat"}
              </span>
            </p>

            {isPremium ? (
              <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
                Ai acces complet la lecții, teste și mentorat.
              </p>
            ) : (
              <>
                <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
                  Cu Premium deblochezi toate lecțiile, teste nelimitate și
                  mentoratul „Nu am înțeles”.
                </p>
                <Link
                  href="/upgrade"
                  className="mt-5 inline-flex h-11 items-center justify-center rounded-full bg-indigo-600 px-6 font-medium text-white transition-colors hover:bg-indigo-500"
                >
                  Upgrade la Premium
                </Link>
              </>
            )}
          </section>

          {/* Cont */}
          <section className="rounded-2xl border border-zinc-200 p-6 dark:border-zinc-800">
            <h2 className="text-sm font-medium text-zinc-500">Contul tău</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-zinc-500">Email</dt>
                <dd className="truncate font-medium">
                  {clerkUser?.primaryEmailAddress?.emailAddress ?? "—"}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-zinc-500">Rol</dt>
                <dd className="font-medium">
                  {appUser?.role === "teacher" ? "Profesor" : "Elev"}
                </dd>
              </div>
            </dl>
            {!appUser && (
              <p className="mt-4 text-sm text-amber-700 dark:text-amber-400">
                Îți pregătim contul. Reîmprospătează pagina în câteva secunde.
              </p>
            )}
          </section>
        </div>

        {/* Continut — pagina de capitole urmeaza */}
        <section className="mt-6 rounded-2xl border border-dashed border-zinc-300 p-8 text-center dark:border-zinc-700">
          <h2 className="font-semibold">Lecțiile tale</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-zinc-600 dark:text-zinc-400">
            Capitolele și lecțiile apar aici în curând.
          </p>
        </section>
      </main>
    </div>
  );
}
