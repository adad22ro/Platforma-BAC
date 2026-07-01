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

export async function GET() {
  const [database, stripeOk] = await Promise.all([checkDatabase(), checkStripe()]);

  // DB jos => down (503). DB ok dar Stripe jos => degraded (200, dar semnalat).
  const httpOk = database;
  const status = !database ? "down" : stripeOk ? "ok" : "degraded";

  return Response.json(
    {
      status,
      checks: {
        database: database ? "ok" : "down",
        stripe: stripeOk ? "ok" : "down",
      },
      timestamp: new Date().toISOString(),
    },
    { status: httpOk ? 200 : 503 }
  );
}
