import { clerkClient } from "@clerk/nextjs/server";
import { Card, Stat, Empty, ErrorBox } from "./ui";

export async function ClerkCard() {
  let res;
  try {
    const client = await clerkClient();
    res = await client.users.getUserList({
      limit: 5,
      orderBy: "-created_at",
    });
  } catch (error) {
    return (
      <Card title="Clerk — Utilizatori">
        <ErrorBox error={error} />
      </Card>
    );
  }

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
                u.emailAddresses[0]?.emailAddress ?? u.firstName ?? u.id
              }
              value={new Date(u.createdAt).toLocaleDateString("ro-RO")}
            />
          ))}
        </div>
      )}
    </Card>
  );
}
