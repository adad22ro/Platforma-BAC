import { supabaseAdmin } from "@/lib/supabase-admin";
import type { Database } from "@/types/database";
import { Card, Empty, ErrorBox } from "./ui";

type LogRow = Database["public"]["Tables"]["error_logs"]["Row"];

export async function ErrorLogsCard() {
  let rows: LogRow[];
  try {
    const { data, error } = await supabaseAdmin
      .from("error_logs")
      .select("id, source, message, context, created_at")
      .order("created_at", { ascending: false })
      .limit(15);

    if (error) throw error;
    rows = data ?? [];
  } catch (error) {
    return (
      <Card title="Loguri de erori (aplicatie)">
        <ErrorBox error={error} />
      </Card>
    );
  }

  return (
    <Card
      title="Loguri de erori (aplicatie)"
      subtitle={`ultimele ${rows.length}`}
    >
      {rows.length === 0 ? (
          <Empty text="Nicio eroare inregistrata. 🎉" />
        ) : (
          <div className="space-y-2">
            {rows.map((r) => (
              <div
                key={r.id}
                className="rounded-lg border border-zinc-100 bg-zinc-50 p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-zinc-700">
                    {r.source ?? "—"}
                  </span>
                  <span className="text-xs text-zinc-400">
                    {r.created_at
                      ? new Date(r.created_at).toLocaleString("ro-RO")
                      : ""}
                  </span>
                </div>
                <p className="mt-1 text-sm text-zinc-800">{r.message}</p>
                {r.context && (
                  <pre className="mt-1 overflow-auto whitespace-pre-wrap break-words text-xs text-zinc-500">
                    {JSON.stringify(r.context, null, 2)}
                  </pre>
                )}
              </div>
          ))}
        </div>
      )}
    </Card>
  );
}
