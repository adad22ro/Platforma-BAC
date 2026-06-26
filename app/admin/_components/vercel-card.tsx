import { getDeployments } from "@/lib/vercel";
import { Card, Empty, ErrorBox } from "./ui";

function stateColor(state?: string): string {
  switch (state) {
    case "READY":
      return "text-green-600";
    case "ERROR":
      return "text-red-600";
    case "BUILDING":
    case "QUEUED":
    case "INITIALIZING":
      return "text-amber-600";
    case "CANCELED":
      return "text-zinc-400";
    default:
      return "text-zinc-500";
  }
}

export async function VercelCard() {
  try {
    const deployments = await getDeployments(6);

    return (
      <Card title="Vercel — Deploy-uri" subtitle={`ultimele ${deployments.length}`}>
        {deployments.length === 0 ? (
          <Empty text="Niciun deploy gasit." />
        ) : (
          <div className="space-y-2">
            {deployments.map((d) => {
              const state = d.state ?? d.readyState;
              return (
                <div
                  key={d.uid}
                  className="flex items-center justify-between gap-3 border-b border-zinc-100 py-2 last:border-0"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm text-zinc-800">
                      {d.meta?.githubCommitMessage ?? d.url}
                    </p>
                    <p className="text-xs text-zinc-400">
                      {d.target === "production" ? "Production" : "Preview"} ·{" "}
                      {new Date(d.created).toLocaleString("ro-RO")}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 text-xs font-semibold ${stateColor(state)}`}
                  >
                    {state ?? "?"}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    );
  } catch (error) {
    return (
      <Card title="Vercel — Deploy-uri">
        <ErrorBox error={error} />
      </Card>
    );
  }
}
