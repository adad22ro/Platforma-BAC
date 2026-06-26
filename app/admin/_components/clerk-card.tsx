import { clerkClient } from "@clerk/nextjs/server";
import { Card, Stat, Empty, ErrorBox } from "./ui";

export async function ClerkCard() {
  try {
    const client = await clerkClient();
    const res = await client.users.getUserList({
      limit: 5,
      orderBy: "-created_at",
    });

    return (
      <Card title="Clerk — Utilizatori" subtitle={`${res.totalCount} total`}>
        {res.data.length === 0 ? (
          <Empty text="Niciun utilizator inca." />
        ) : (
          <div>
            {res.data.map((u) => (
              <Stat
                key={u.id}
                label={
                  u.emailAddresses[0]?.emailAddress ??
                  u.firstName ??
                  u.id
                }
                value={new Date(u.createdAt).toLocaleDateString("ro-RO")}
              />
            ))}
          </div>
        )}
      </Card>
    );
  } catch (error) {
    return (
      <Card title="Clerk — Utilizatori">
        <ErrorBox error={error} />
      </Card>
    );
  }
}
