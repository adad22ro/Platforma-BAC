import { requireAdmin } from "@/lib/admin";
import { ClerkCard } from "./_components/clerk-card";
import { SupabaseCard } from "./_components/supabase-card";
import { StripeCard } from "./_components/stripe-card";
import { VercelCard } from "./_components/vercel-card";
import { VercelLogsCard } from "./_components/vercel-logs-card";
import { SyncCard } from "./_components/sync-card";
import { ErrorLogsCard } from "./_components/error-logs-card";
import { ConfigCard } from "./_components/config-card";

// Dashboard intern de monitorizare — agrega date din Clerk, Supabase, Stripe, Vercel.
// Acces restrictionat prin requireAdmin() (allowlist de email-uri).
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const adminEmail = await requireAdmin();

  return (
    <div className="min-h-screen bg-zinc-50 px-6 py-10">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8">
          <h1 className="text-2xl font-semibold text-zinc-900">
            Panou de monitorizare
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Conectat ca {adminEmail}
          </p>
          <a
            href="/admin/content"
            className="mt-2 inline-block text-sm text-blue-600 underline"
          >
            → Test API conținut (capitole/lecții)
          </a>
        </header>

        <section className="mb-10">
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-zinc-400">
            Overview
          </h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <SyncCard />
            <ClerkCard />
            <SupabaseCard />
            <StripeCard />
            <VercelCard />
          </div>
        </section>

        <section>
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-zinc-400">
            Debug & Loguri
          </h2>
          <div className="grid grid-cols-1 gap-4">
            <ConfigCard />
            <ErrorLogsCard />
            <VercelLogsCard />
          </div>
        </section>
      </div>
    </div>
  );
}
