import { getDeployments, getDeploymentEvents } from "@/lib/vercel";
import { Card, Empty, ErrorBox } from "./ui";

export async function VercelLogsCard() {
  try {
    const deployments = await getDeployments(10);
    if (deployments.length === 0) {
      return (
        <Card title="Vercel — Loguri build">
          <Empty text="Niciun deploy gasit." />
        </Card>
      );
    }

    // Prioritizeaza ultimul deploy cu eroare; altfel cel mai recent.
    const target =
      deployments.find((d) => (d.state ?? d.readyState) === "ERROR") ??
      deployments[0];

    const events = await getDeploymentEvents(target.uid);
    const lines = events
      .map((e) => e.payload?.text ?? e.text ?? "")
      .filter((t) => t.trim().length > 0);

    const state = target.state ?? target.readyState;

    return (
      <Card
        title="Vercel — Loguri build"
        subtitle={`${state} · ${target.meta?.githubCommitMessage ?? target.url}`}
      >
        {lines.length === 0 ? (
          <Empty text="Niciun log disponibil pentru acest deploy." />
        ) : (
          <pre className="max-h-80 overflow-auto rounded-lg bg-zinc-900 p-3 text-xs leading-relaxed text-zinc-100">
            {lines.map((line, i) => {
              const isError = /error|failed|panic|✗|⨯/i.test(line);
              return (
                <div
                  key={i}
                  className={isError ? "text-red-400" : "text-zinc-300"}
                >
                  {line}
                </div>
              );
            })}
          </pre>
        )}
      </Card>
    );
  } catch (error) {
    return (
      <Card title="Vercel — Loguri build">
        <ErrorBox error={error} />
      </Card>
    );
  }
}
