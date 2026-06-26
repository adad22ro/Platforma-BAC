import { supabaseAdmin } from "@/lib/supabase-admin";

// Scrie o eroare in tabelul error_logs din Supabase.
// Loggerul NU arunca erori (daca scrierea esueaza, doar afiseaza in consola),
// ca sa nu strice fluxul codului care il apeleaza.
export async function logError(
  source: string,
  message: string,
  context?: Record<string, unknown>
): Promise<void> {
  try {
    await supabaseAdmin.from("error_logs").insert({
      source,
      message,
      context: context ?? null,
    });
  } catch (e) {
    console.error("logError a esuat:", e);
  }
}
