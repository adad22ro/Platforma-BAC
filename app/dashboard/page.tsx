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

        {/* CTA subtire de upgrade — doar pentru userii free. Detaliile de
            abonament traiesc pe /profil. */}
        {!isPremium && (
          <Link
            href="/upgrade"
            className="mt-5 inline-flex h-10 items-center justify-center rounded-full bg-indigo-600 px-5 text-sm font-medium text-white transition-colors hover:bg-indigo-500"
          >
            Treci la Premium
          </Link>
        )}

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

        {/* Continut — pagina de capitole urmeaza. Datele de cont si abonament
            traiesc pe /profil, ca sa nu le duplicam aici. */}
        <section className="mt-8 rounded-2xl border border-dashed border-zinc-300 p-8 text-center dark:border-zinc-700">
          <h2 className="font-semibold">Lecțiile tale</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-zinc-600 dark:text-zinc-400">
            Capitolele și lecțiile apar aici în curând.
          </p>
        </section>
      </main>
    </div>
  );
}
