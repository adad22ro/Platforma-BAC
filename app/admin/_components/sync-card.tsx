import { clerkClient } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { Card, Stat, ErrorBox } from "./ui";

export async function SyncCard() {
  let clerkCount: number;
  let supaCount: number;
  try {
    const client = await clerkClient();
    const [clerkList, supa] = await Promise.all([
      client.users.getUserList({ limit: 1 }),
      supabaseAdmin.from("users").select("*", { count: "exact", head: true }),
    ]);

    if (supa.error) throw supa.error;

    clerkCount = clerkList.totalCount;
    supaCount = supa.count ?? 0;
  } catch (error) {
    return (
      <Card title="Sincronizare Clerk ↔ Supabase">
        <ErrorBox error={error} />
      </Card>
    );
  }

  const inSync = clerkCount === supaCount;

  return (
    <Card title="Sincronizare Clerk ↔ Supabase">
      <Stat label="Utilizatori Clerk" value={clerkCount} />
      <Stat label="Randuri Supabase" value={supaCount} />
      <div
        className={`mt-3 rounded-lg p-3 text-sm font-medium ${
          inSync ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
        }`}
      >
        {inSync
          ? "✓ Sincronizat"
          : `✗ Nesincronizat — diferenta de ${Math.abs(
              clerkCount - supaCount
            )}. Verifica webhook-urile Clerk.`}
      </div>
    </Card>
  );
}
