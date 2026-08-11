import type { Metadata } from "next";
import Link from "next/link";
import { currentUser } from "@clerk/nextjs/server";
import { UserProfile } from "@clerk/nextjs";
import { getCurrentAppUser, canAccessPremium, isTeacher } from "@/lib/current-user";
import { AppHeader } from "../_components/app-header";

export const metadata: Metadata = {
  title: "Profil — Platforma BAC",
};

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("ro-RO", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

// Datele specifice aplicatiei (rol + abonament) le afisam noi; editarea contului
// (nume, email, parola, securitate) o lasam pe <UserProfile /> de la Clerk, ca sa
// nu reimplementam un flux deja rezolvat si testat.
export default async function ProfilPage() {
  const [clerkUser, appUser] = await Promise.all([
    currentUser(),
    getCurrentAppUser(),
  ]);

  const isPremium = canAccessPremium(appUser);
  const teacher = isTeacher(appUser);
  const isCancelled = appUser?.subscription_status === "cancelled";
  const endDate = formatDate(appUser?.subscription_end_date ?? null);

  const fullName =
    [clerkUser?.firstName, clerkUser?.lastName].filter(Boolean).join(" ") ||
    null;

  return (
    <div className="flex flex-1 flex-col bg-white text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
      <AppHeader />

      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-12">
        <h1 className="text-3xl font-bold tracking-tight">Profilul tău</h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          Datele contului și starea abonamentului tău.
        </p>

        <div className="mt-8 grid gap-6 sm:grid-cols-2">
          {/* Rezumat cont */}
          <section className="rounded-2xl border border-zinc-200 p-6 dark:border-zinc-800">
            <h2 className="text-sm font-medium text-zinc-500">Cont</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-zinc-500">Nume</dt>
                <dd className="truncate font-medium">{fullName ?? "—"}</dd>
              </div>
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

          {/* Abonament */}
          <section className="rounded-2xl border border-zinc-200 p-6 dark:border-zinc-800">
            <h2 className="text-sm font-medium text-zinc-500">Abonament</h2>
            <p className="mt-2 flex items-center gap-2 text-2xl font-bold">
              {teacher ? "Profesor" : isPremium ? "Premium" : "Gratuit"}
              <span
                className={
                  teacher || isPremium
                    ? "rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700 dark:bg-green-950 dark:text-green-400"
                    : "rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                }
              >
                {teacher || isPremium
                  ? "activ"
                  : isCancelled
                    ? "anulat"
                    : "limitat"}
              </span>
            </p>

            {/* Profesorul are acces la tot continutul prin rol, nu prin abonament —
                deci nu-i aratam nici starea de plan, nici butonul de upgrade. */}
            {teacher ? (
              <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
                Ca profesor ai acces complet la conținut, fără abonament.
              </p>
            ) : isPremium ? (
              <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
                Ai acces complet la lecții, teste și mentorat.
                {endDate && ` Valabil până la ${endDate}.`}
              </p>
            ) : (
              <>
                <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
                  {isCancelled
                    ? "Abonamentul a fost anulat. Reactivează-l oricând pentru acces complet."
                    : "Cu Premium deblochezi toate lecțiile, teste nelimitate și mentoratul „Nu am înțeles”."}
                </p>
                <Link
                  href="/upgrade"
                  className="mt-5 inline-flex h-11 items-center justify-center rounded-full bg-indigo-600 px-6 font-medium text-white transition-colors hover:bg-indigo-500"
                >
                  {isCancelled ? "Reactivează Premium" : "Upgrade la Premium"}
                </Link>
              </>
            )}
          </section>
        </div>

        {/* Setari cont (Clerk) */}
        <section className="mt-10">
          <h2 className="mb-4 text-lg font-semibold">Setările contului</h2>
          <UserProfile
            routing="hash"
            appearance={{ elements: { rootBox: "w-full", card: "w-full" } }}
          />
        </section>
      </main>
    </div>
  );
}
