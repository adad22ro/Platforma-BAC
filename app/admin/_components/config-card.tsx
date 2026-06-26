import { runConfigChecks } from "@/lib/config-check";
import { Card } from "./ui";

const STATUS_STYLE: Record<string, { dot: string; text: string }> = {
  ok: { dot: "bg-green-500", text: "text-zinc-600" },
  warn: { dot: "bg-amber-400", text: "text-amber-700" },
  error: { dot: "bg-red-500", text: "text-red-700" },
};

export function ConfigCard() {
  const checks = runConfigChecks();
  const errors = checks.filter((c) => c.status === "error").length;

  return (
    <Card
      title="Verificare configurare"
      subtitle={
        errors === 0 ? "✓ totul ok" : `${errors} ${errors === 1 ? "problema" : "probleme"}`
      }
    >
      <div className="space-y-1">
        {checks.map((c) => {
          const style = STATUS_STYLE[c.status];
          return (
            <div
              key={c.name}
              className="flex items-center justify-between gap-3 border-b border-zinc-100 py-2 last:border-0"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className={`h-2 w-2 shrink-0 rounded-full ${style.dot}`} />
                <span className="truncate font-mono text-xs text-zinc-700">
                  {c.name}
                </span>
              </div>
              <span className={`shrink-0 text-xs ${style.text}`}>{c.detail}</span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
