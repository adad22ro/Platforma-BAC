import { requireAdmin } from "@/lib/admin";
import { citesteBaremActiv, type CriteriuDb } from "@/lib/barem-db";

// Baremul oficial, asa cum il vede aplicatia. DOAR CITIRE, deliberat.
//
// Baremul produce note. Un prag schimbat dintr-un click, fara diff si fara review,
// ar modifica tacit punctajele — inclusiv retroactiv. Corecturile se fac in
// `data/barem.json`, trec prin commit, si intra cu `npm run barem:import`.
//
// Pagina asta raspunde la singura intrebare care ramane: „ce e in sistem ACUM, si e
// corect?". Fisierul poate fi corect si importul poate lipsi — de aici se vede.
export const dynamic = "force-dynamic";

const CULOARE_STRAT: Record<string, string> = {
  auto: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  ai: "bg-amber-50 text-amber-700 ring-amber-200",
  mentor: "bg-sky-50 text-sky-700 ring-sky-200",
};

const EXPLICATIE_STRAT: Record<string, string> = {
  auto: "determinist, fara AI",
  ai: "pre-notare pentru mentor",
  mentor: "doar om",
};

function Criteriu({ c }: { c: CriteriuDb }) {
  return (
    <li className="border-t border-zinc-100 px-4 py-3">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="font-medium text-zinc-900">{c.denumire}</span>
        <span className="text-sm tabular-nums text-zinc-500">
          {c.puncte_max}p
        </span>
        <span
          className={`rounded-full px-2 py-0.5 text-xs ring-1 ring-inset ${
            CULOARE_STRAT[c.strat] ?? "bg-zinc-50 text-zinc-600 ring-zinc-200"
          }`}
          title={EXPLICATIE_STRAT[c.strat]}
        >
          {c.strat}
        </span>
        {c.verificator && (
          <span className="font-mono text-xs text-zinc-400">
            {c.verificator}
            {c.parametri ? ` (${JSON.stringify(c.parametri)})` : ""}
          </span>
        )}
      </div>

      {c.praguri.length > 0 && (
        <ul className="mt-1.5 space-y-0.5">
          {c.praguri.map((p, i) => (
            <li key={i} className="text-sm text-zinc-600">
              <span className="tabular-nums font-medium">{p.puncte}p</span>
              <span className="text-zinc-400"> — </span>
              {p.conditie}
            </li>
          ))}
        </ul>
      )}

      {c.observatii && (
        <p className="mt-1.5 text-sm italic text-zinc-500">{c.observatii}</p>
      )}
    </li>
  );
}

export default async function BaremPage() {
  await requireAdmin();
  const barem = await citesteBaremActiv();

  return (
    <div className="min-h-screen bg-zinc-50 px-6 py-10">
      <div className="mx-auto max-w-3xl">
        <header className="mb-8">
          <a href="/admin" className="text-sm text-blue-600 underline">
            ← Panou de monitorizare
          </a>
          <h1 className="mt-3 text-2xl font-semibold text-zinc-900">
            Baremul oficial
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Doar citire. Corecturile se fac in <code>data/barem.json</code>, apoi{" "}
            <code>npm run barem:import</code>.
          </p>
        </header>

        {!barem ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
            <p className="font-medium text-amber-900">
              Nu exista nicio versiune de barem activa.
            </p>
            <p className="mt-1 text-sm text-amber-800">
              Migrarea e aplicata, dar baremul n-a fost inca importat. Ruleaza{" "}
              <code>npm run barem:import</code>.
            </p>
          </div>
        ) : (
          <>
            <div className="mb-8 rounded-lg border border-zinc-200 bg-white p-4">
              <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                <dt className="text-zinc-500">Versiune</dt>
                <dd className="text-zinc-900">{barem.versiune_document}</dd>
                <dt className="text-zinc-500">Importata</dt>
                <dd className="text-zinc-900">
                  {barem.created_at.slice(0, 10)}
                </dd>
                <dt className="text-zinc-500">Checksum</dt>
                <dd className="font-mono text-xs text-zinc-500">
                  {barem.checksum.slice(0, 12)}…
                </dd>
              </dl>
              <p className="mt-3 border-t border-zinc-100 pt-3 text-sm text-zinc-500">
                {barem.sursa}
              </p>
            </div>

            <div className="space-y-6">
              {barem.rubrici.map((r) => {
                const puncteAuto = r.criterii
                  .filter((c) => c.strat === "auto")
                  .reduce((s, c) => s + c.puncte_max, 0);

                return (
                  <section
                    key={r.slug}
                    className="overflow-hidden rounded-lg border border-zinc-200 bg-white"
                  >
                    <div className="px-4 py-3">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <h2 className="font-semibold text-zinc-900">
                          {r.denumire}
                        </h2>
                        <span className="text-sm tabular-nums text-zinc-500">
                          {r.puncte_total} puncte
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-zinc-500">
                        {r.minim_cuvinte
                          ? `Minimum ${r.minim_cuvinte} de cuvinte · `
                          : ""}
                        {puncteAuto} din {r.puncte_total} se pot da automat
                        {r.profil ? ` · doar profil ${r.profil}` : ""}
                      </p>
                      {r.observatii && (
                        <p className="mt-2 text-sm italic text-zinc-500">
                          {r.observatii}
                        </p>
                      )}
                    </div>
                    <ul>
                      {r.criterii.map((c) => (
                        <Criteriu key={c.slug} c={c} />
                      ))}
                    </ul>
                  </section>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
