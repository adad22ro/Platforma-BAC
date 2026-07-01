import { requireAdmin } from "@/lib/admin";
import { ContentTester } from "./content-tester";

// Banc de test intern pentru API-ul de continut (capitole/lectii).
// Unealta de dezvoltare — NU e UI de produs (ala e al lui Bogdan).
export const dynamic = "force-dynamic";

export default async function AdminContentPage() {
  await requireAdmin();
  return (
    <div className="min-h-screen bg-zinc-50 px-6 py-10">
      <div className="mx-auto max-w-4xl">
        <header className="mb-8">
          <h1 className="text-2xl font-semibold text-zinc-900">
            Test API conținut
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Banc de test intern pentru capitole/lecții.{" "}
            <a href="/admin" className="underline">
              ← înapoi la panou
            </a>
          </p>
        </header>
        <ContentTester />
      </div>
    </div>
  );
}
