import { readFileSync } from "node:fs";
import { join } from "node:path";
import { requireAdmin } from "@/lib/admin";

// Servește cursul-manual intern (HTML standalone din curs.html), vizibil DOAR
// pentru adminii din allowlist (ADMIN_EMAILS) — adică Andrei + Bogdan. Pe planul
// Pro nu există share de artifact, așa că îl găzduim aici, în spatele admin gate.
export const dynamic = "force-dynamic";

let cached: string | null = null;
function loadHtml(): string {
  if (cached === null) {
    cached = readFileSync(join(process.cwd(), "app/admin/curs/curs.html"), "utf-8");
  }
  return cached;
}

export async function GET() {
  await requireAdmin(); // redirecționează non-adminii (login + allowlist)
  return new Response(loadHtml(), {
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}
