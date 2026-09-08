import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { citesteBaremActiv } from "@/lib/barem-db";
import { Card } from "../_components/ui";
import { LucrariTester } from "./lucrari-tester";

// Banc de test pentru corectarea lucrarilor.
//
// De ce exista: sistemul de corectare e complet in backend, dar interfata pentru
// elev si pentru mentor tine de frontend si inca nu exista. Pana atunci, singura
// cale de a atinge fluxul cu mana erau testele automate — care verifica ce ne-am
// gandit noi sa verificam, nu ce se intampla cu date reale.
//
// Pagina asta face drumul intreg vizibil: text trimis -> notat automat -> completat
// de om -> total. Nu e o pagina de produs si nu incearca sa arate ca una: cand
// apare interfata reala, se poate sterge fara sa lipseasca nimanui.
//
// Scrie in baza de date REALA. Lucrarile create de aici sunt lucrari adevarate, pe
// contul tau de admin.
export const dynamic = "force-dynamic";

export default async function AdminLucrariPage() {
  await requireAdmin();

  const barem = await citesteBaremActiv();

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-6">
        <Link href="/admin" className="text-sm text-zinc-500 hover:text-zinc-900">
          ← Admin
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-zinc-900">Banc de test — corectare</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Trimite o lucrare, vezi ce acordă corectarea automată, apoi completează ca mentor.
          Scrie în baza de date reală.
        </p>
      </div>

      {!barem ? (
        <Card title="Barem">
          <p className="text-sm text-zinc-600">
            Nu există niciun barem activ în baza de date, deci nu e cu ce nota. Importă-l cu{" "}
            <code className="rounded bg-zinc-100 px-1 py-0.5 text-xs">npm run barem:import</code>.
          </p>
        </Card>
      ) : (
        <Card
          title="Flux complet"
          subtitle={`barem ${barem.versiune_document} · ${barem.rubrici.length} rubrici`}
        >
          <LucrariTester
            rubrici={barem.rubrici.map((r) => ({
              slug: r.slug,
              denumire: r.denumire,
              criterii: r.criterii.map((c) => ({
                slug: c.slug,
                denumire: c.denumire,
                puncte_max: c.puncte_max,
                strat: c.strat,
              })),
            }))}
          />
        </Card>
      )}
    </main>
  );
}
