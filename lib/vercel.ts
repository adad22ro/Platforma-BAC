// Helper minimal pentru Vercel REST API (deploy-uri + loguri de build).
// Necesita VERCEL_API_TOKEN. Optional: VERCEL_TEAM_ID (daca proiectul e intr-o echipa)
// si VERCEL_PROJECT_NAME (default: "platforma-bac").

const API = "https://api.vercel.com";

function token(): string {
  const t = process.env.VERCEL_API_TOKEN;
  if (!t) throw new Error("VERCEL_API_TOKEN lipseste");
  return t;
}

function teamQuery(): string {
  const team = process.env.VERCEL_TEAM_ID;
  return team ? `&teamId=${team}` : "";
}

function projectName(): string {
  return process.env.VERCEL_PROJECT_NAME ?? "platforma-bac";
}

export type Deployment = {
  uid: string;
  name: string;
  url: string;
  state?: string;
  readyState?: string;
  target?: string | null;
  created: number;
  meta?: {
    githubCommitMessage?: string;
    githubCommitRef?: string;
  };
};

export async function getDeployments(limit = 6): Promise<Deployment[]> {
  const res = await fetch(
    `${API}/v6/deployments?app=${projectName()}&limit=${limit}${teamQuery()}`,
    {
      headers: { Authorization: `Bearer ${token()}` },
      cache: "no-store",
    }
  );
  if (!res.ok) {
    throw new Error(`Vercel API ${res.status}: ${await res.text()}`);
  }
  const json = await res.json();
  return (json.deployments ?? []) as Deployment[];
}

export type DeploymentEvent = {
  type: string;
  created?: number;
  payload?: { text?: string };
  text?: string;
};

// Logurile de build/runtime ale unui deployment.
export async function getDeploymentEvents(
  deploymentId: string
): Promise<DeploymentEvent[]> {
  const res = await fetch(
    `${API}/v3/deployments/${deploymentId}/events?limit=100${teamQuery()}`,
    {
      headers: { Authorization: `Bearer ${token()}` },
      cache: "no-store",
    }
  );
  if (!res.ok) {
    throw new Error(`Vercel API ${res.status}: ${await res.text()}`);
  }
  const json = await res.json();
  // Endpoint-ul poate returna un array direct sau { events: [...] }
  const events = Array.isArray(json) ? json : (json.events ?? []);
  return events as DeploymentEvent[];
}
