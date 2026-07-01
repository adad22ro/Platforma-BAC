import { supabaseAdmin } from "@/lib/supabase-admin";
import type { Json } from "@/types/database";

type Severity = "error" | "critical";

// Scrie o eroare in tabelul error_logs din Supabase.
// Loggerul NU arunca erori (daca scrierea esueaza, doar afiseaza in consola),
// ca sa nu strice fluxul codului care il apeleaza.
//
// severity="critical" trimite in plus o alerta instant pe Discord (daca
// DISCORD_ALERT_WEBHOOK_URL e setat). Foloseste "critical" doar pentru lucruri
// care inseamna bani/acces stricat in tacere (webhook plata esuat, checkout esuat).
export async function logError(
  source: string,
  message: string,
  context?: Record<string, unknown>,
  severity: Severity = "error"
): Promise<void> {
  try {
    await supabaseAdmin.from("error_logs").insert({
      source,
      message,
      context: (context ?? null) as Json,
    });
  } catch (e) {
    console.error("logError a esuat:", e);
  }

  if (severity === "critical") {
    await sendDiscordAlert(source, message, context);
  }
}

// Alerta instant pe Discord. Fire-and-forget: daca esueaza, nu strica fluxul.
async function sendDiscordAlert(
  source: string,
  message: string,
  context?: Record<string, unknown>
): Promise<void> {
  const url = process.env.DISCORD_ALERT_WEBHOOK_URL;
  if (!url) return; // alertele sunt optionale; fara URL, doar logam in DB

  const details = JSON.stringify(context ?? {}, null, 2).slice(0, 1500);
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: `🔴 **[${source}]** ${message}\n\`\`\`json\n${details}\n\`\`\``,
      }),
    });
  } catch (e) {
    console.error("Discord alert a esuat:", e);
  }
}
