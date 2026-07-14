import Link from "next/link";

// Cardurile Free / Premium. Folosite in doua locuri:
//  - sectiunea de preturi de pe landing (/)
//  - pagina dedicata /pricing
// CTA-urile duc in fluxul existent de inregistrare:
//  - Gratuit  -> /sign-up            (aterizeaza pe /dashboard)
//  - Premium  -> /sign-up?plan=premium (aterizeaza pe /upgrade -> Stripe Checkout)
const plans = [
  {
    name: "Gratuit",
    tagline: "Perfect ca să începi și să testezi platforma.",
    price: "0 lei",
    features: [
      "Acces la lecțiile introductive",
      "Teste grilă limitate",
      "Cont și progres salvat",
    ],
    cta: { label: "Creează cont gratuit", href: "/sign-up" },
    highlighted: false,
  },
  {
    name: "Premium",
    tagline: "Tot ce ai nevoie ca să iei BAC-ul cu note mari.",
    price: "Premium",
    features: [
      "Toate lecțiile și capitolele",
      "Teste nelimitate cu corectare",
      "Mentorat „Nu am înțeles” (răspuns în 24h)",
      "Statistici de progres",
    ],
    cta: { label: "Începe cu Premium", href: "/sign-up?plan=premium" },
    highlighted: true,
  },
];

export function PricingPlans() {
  return (
    <div className="mx-auto grid max-w-3xl gap-6 sm:grid-cols-2">
      {plans.map((plan) => (
        <div
          key={plan.name}
          className={
            plan.highlighted
              ? "relative flex flex-col rounded-2xl border-2 border-indigo-600 p-8"
              : "flex flex-col rounded-2xl border border-zinc-200 p-8 dark:border-zinc-800"
          }
        >
          {plan.highlighted && (
            <span className="absolute -top-3 left-8 rounded-full bg-indigo-600 px-3 py-1 text-xs font-semibold text-white">
              Recomandat
            </span>
          )}
          <h3 className="text-lg font-semibold">{plan.name}</h3>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            {plan.tagline}
          </p>
          <p className="mt-6 text-4xl font-bold">
            {plan.price}
            <span className="text-base font-normal text-zinc-500">/lună</span>
          </p>
          <ul className="mt-6 flex-1 space-y-3 text-sm text-zinc-600 dark:text-zinc-400">
            {plan.features.map((feature) => (
              <li key={feature}>✓ {feature}</li>
            ))}
          </ul>
          <Link
            href={plan.cta.href}
            className={
              plan.highlighted
                ? "mt-8 flex h-11 items-center justify-center rounded-full bg-indigo-600 font-medium text-white transition-colors hover:bg-indigo-500"
                : "mt-8 flex h-11 items-center justify-center rounded-full border border-zinc-300 font-medium transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
            }
          >
            {plan.cta.label}
          </Link>
        </div>
      ))}
    </div>
  );
}
