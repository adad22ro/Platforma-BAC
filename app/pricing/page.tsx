import type { Metadata } from "next";
import { PricingPlans } from "../_components/pricing-plans";
import { SiteHeader } from "../_components/site-header";
import { SiteFooter } from "../_components/site-footer";

export const metadata: Metadata = {
  title: "Prețuri — Platforma BAC",
  description:
    "Planuri Gratuit și Premium pentru pregătirea de Bacalaureat. Începe gratuit, treci la Premium când vrei acces complet.",
};

const faq = [
  {
    q: "Pot începe gratuit?",
    a: "Da. Îți faci cont fără card și ai acces la lecțiile introductive și la teste limitate. Treci la Premium doar când vrei acces complet.",
  },
  {
    q: "Pot renunța oricând?",
    a: "Da. Abonamentul e lunar și îl poți anula oricând — păstrezi accesul până la finalul perioadei deja plătite.",
  },
  {
    q: "Ce înseamnă mentoratul „Nu am înțeles”?",
    a: "Din orice lecție sau test poți trimite o întrebare cu un click. Un profesor real îți răspunde, de regulă în 24h.",
  },
  {
    q: "Cum se face plata?",
    a: "Plata se face securizat prin Stripe, cu cardul. Noi nu stocăm datele cardului tău.",
  },
];

export default function PricingPage() {
  return (
    <div className="flex flex-1 flex-col bg-white text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
      <SiteHeader />

      {/* Titlu */}
      <section className="mx-auto w-full max-w-6xl px-6 pt-20 pb-14 text-center sm:pt-24">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Alege planul potrivit
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-lg leading-8 text-zinc-600 dark:text-zinc-400">
          Începe gratuit, fără card. Treci la Premium când vrei acces complet la
          lecții, teste și mentorat.
        </p>
      </section>

      {/* Planuri */}
      <section className="mx-auto w-full max-w-6xl px-6 pb-24">
        <PricingPlans />
      </section>

      {/* Intrebari frecvente */}
      <section className="mx-auto w-full max-w-3xl px-6 pb-28">
        <h2 className="mb-10 text-center text-2xl font-bold tracking-tight">
          Întrebări frecvente
        </h2>
        <dl className="space-y-8">
          {faq.map((item) => (
            <div key={item.q}>
              <dt className="font-semibold">{item.q}</dt>
              <dd className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                {item.a}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <SiteFooter />
    </div>
  );
}
