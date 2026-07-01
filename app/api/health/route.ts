import { supabaseAdmin } from "@/lib/supabase-admin";
import { stripe } from "@/lib/stripe";

// GET /api/health — sondă de sănătate pentru monitorizare uptime (rută publică,
// vezi proxy.ts). Verifică conexiunile la Supabase (critic) și Stripe (informativ).
// Nu se cache-uiește niciodată.
export const dynamic = "force-dynamic";

// Baza de date e critică: dacă e jos, aplicația nu funcționează.
async function checkDatabase(): Promise<boolean> {
  try {
    const { error } = await supabaseAdmin
      .from("processed_events")
      .select("*", { count: "exact", head: true });
    return !error;
  } catch {
    return false;
  }
}

// Stripe e informativ: dacă e jos, restul aplicației (conținut) încă merge.
async function checkStripe(): Promise<boolean> {
  try {
    await stripe.balance.retrieve();
    return true;
  } catch {
    return false;
  }
}

// Cache scurt: ruta e publica si fiecare hit face apeluri externe (Stripe + DB).
// Cache-uim rezultatul cateva secunde ca un uptime monitor (sau spam) sa nu
// amplifice apelurile catre servicii externe.
const CACHE_TTL_MS = 15_000;
let cache: { body: unknown; httpOk: boolean; at: number } | null = null;

// Doar pentru teste — resetează cache-ul între cazuri.
export function __resetHealthCache() {
  cache = null;
}

export async function GET() {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) {
    return Response.json(cache.body, { status: cache.httpOk ? 200 : 503 });
  }

  const [database, stripeOk] = await Promise.all([checkDatabase(), checkStripe()]);

  // DB jos => down (503). DB ok dar Stripe jos => degraded (200, dar semnalat).
  const httpOk = database;
  const status = !database ? "down" : stripeOk ? "ok" : "degraded";
  const body = {
    status,
    checks: {
      database: database ? "ok" : "down",
      stripe: stripeOk ? "ok" : "down",
    },
    timestamp: new Date().toISOString(),
  };

  cache = { body, httpOk, at: Date.now() };
  return Response.json(body, { status: httpOk ? 200 : 503 });
}
