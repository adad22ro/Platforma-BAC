import Link from "next/link";
import { SiteHeader } from "./_components/site-header";
import { SiteFooter } from "./_components/site-footer";
import { btn } from "./_components/ui";

const features = [
  {
    title: "Lecții pe capitole",
    desc: "Materia structurată clar, capitol cu capitol, cu text și video — înveți în ritmul tău, fără să te pierzi în manuale.",
    icon: "📚",
  },
  {
    title: "Teste grilă cu corectare",
    desc: "Rezolvi teste pe fiecare capitol și primești scorul instant. Vezi exact unde greșești și ce mai ai de recuperat.",
    icon: "✅",
  },
  {
    title: "Mentorat „Nu am înțeles”",
    desc: "Blocat la o lecție? Trimiți o întrebare cu un click și primești răspuns de la un profesor real în 24h.",
    icon: "💬",
  },
];

export default function Home() {
  return (
    <div className="flex flex-1 flex-col bg-white text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
      <SiteHeader />

      {/* Hero */}
      <section className="mx-auto flex w-full max-w-6xl flex-col items-center px-6 py-24 text-center sm:py-32">
        <span className="mb-6 rounded-full border border-indigo-200 bg-indigo-50 px-4 py-1.5 text-sm font-medium text-indigo-700 dark:border-indigo-900 dark:bg-indigo-950/50 dark:text-indigo-300">
          Pregătire pentru Bacalaureat
        </span>
        <h1 className="max-w-3xl text-4xl font-bold leading-tight tracking-tight sm:text-6xl">
          Ia BAC-ul fără stres, cu un plan clar de învățare
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-zinc-600 dark:text-zinc-400">
          Lecții pe capitole, teste grilă cu corectare automată și un profesor
          care îți răspunde când te blochezi. Totul într-un singur loc.
        </p>
        <div className="mt-10 flex flex-col gap-4 sm:flex-row">
          <Link
            href="/sign-up?plan=premium"
            className={btn("primary", "lg")}
          >
            Începe acum
          </Link>
          <Link
            href="/pricing"
            className={btn("outline", "lg")}
          >
            Vezi prețurile
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto w-full max-w-6xl px-6 pb-24">
        <div className="grid gap-6 sm:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-zinc-200 bg-zinc-50/50 p-8 dark:border-zinc-800 dark:bg-zinc-900/40"
            >
              <div className="mb-4 text-3xl">{f.icon}</div>
              <h3 className="mb-2 text-lg font-semibold">{f.title}</h3>
              <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
