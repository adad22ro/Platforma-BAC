import { stripe } from "@/lib/stripe";
import { Card, Stat, Empty, ErrorBox } from "./ui";

export async function StripeCard() {
  let customers;
  let subscriptions;
  try {
    [customers, subscriptions] = await Promise.all([
      stripe.customers.list({ limit: 100 }),
      stripe.subscriptions.list({ limit: 5, status: "all" }),
    ]);
  } catch (error) {
    return (
      <Card title="Stripe — Plati">
        <ErrorBox error={error} />
      </Card>
    );
  }

  return (
    <Card title="Stripe — Plati" subtitle={`${customers.data.length} clienti`}>
      <Stat label="Clienti" value={customers.data.length} />
      <Stat
        label="Abonamente active"
        value={subscriptions.data.filter((s) => s.status === "active").length}
      />
      {subscriptions.data.length === 0 ? (
        <Empty text="Niciun abonament inca." />
      ) : (
        subscriptions.data.map((s) => (
          <Stat
            key={s.id}
            label={`Abonament ${s.id.slice(-6)}`}
            value={<span className="text-zinc-500">{s.status}</span>}
          />
        ))
      )}
    </Card>
  );
}
