import { supabaseAdmin } from "@/lib/supabase-admin";
import { Card, Stat, Empty, ErrorBox } from "./ui";
import { RoleToggle } from "./role-toggle";

type UserRow = {
  clerk_id: string | null;
  email: string | null;
  full_name: string | null;
  role: string | null;
  subscription_status: string | null;
  created_at: string | null;
};

export async function SupabaseCard() {
  let rows: UserRow[];
  let count: number | null;
  try {
    const res = await supabaseAdmin
      .from("users")
      .select("clerk_id, email, full_name, role, subscription_status, created_at", {
        count: "exact",
      })
      .order("created_at", { ascending: false })
      .limit(5);

    if (res.error) throw res.error;

    rows = (res.data ?? []) as UserRow[];
    count = res.count ?? 0;
  } catch (error) {
    return (
      <Card title="Supabase — Tabel users">
        <ErrorBox error={error} />
      </Card>
    );
  }

  return (
    <Card title="Supabase — Tabel users" subtitle={`${count ?? 0} randuri`}>
      {rows.length === 0 ? (
        <Empty text="Tabelul users e gol." />
      ) : (
        <div>
          {rows.map((r, i) => (
            <Stat
              key={r.clerk_id ?? r.email ?? i}
              label={r.email ?? r.full_name ?? r.clerk_id ?? "—"}
              value={
                <span className="flex items-center gap-2 text-zinc-500">
                  <RoleToggle clerkId={r.clerk_id} role={r.role} />
                  <span>· {r.subscription_status ?? "?"}</span>
                </span>
              }
            />
          ))}
        </div>
      )}
    </Card>
  );
}
