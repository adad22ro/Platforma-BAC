import { z } from "zod";

// Schema tuturor variabilelor de mediu folosite server-side.
// Validata o data la pornirea serverului (vezi instrumentation.ts), ca sa esueze
// RAPID cu mesaj clar daca lipseste ceva — in loc de un 500 obscur la runtime.
// Vezi .env.example pentru lista completa si docs/testing.md / onboarding-secrets.md.
const schema = z.object({
  // ─── Supabase ───
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

  // ─── Clerk ───
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1),
  CLERK_SECRET_KEY: z.string().min(1),
  CLERK_WEBHOOK_SIGNING_SECRET: z.string().min(1),

  // ─── Stripe ───
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().min(1),
  STRIPE_SECRET_KEY: z.string().min(1),
  STRIPE_WEBHOOK_SECRET: z.string().min(1),
  STRIPE_PRICE_ID_MONTHLY: z.string().min(1),

  // ─── Aplicatie ───
  NEXT_PUBLIC_APP_URL: z.string().url(),

  // ─── Optionale (functionalitate degradata gratios daca lipsesc) ───
  // Panou /admin: fara ADMIN_EMAILS nimeni nu are acces; fara token Vercel,
  // cardurile de deploy raman goale. Discord: fara URL, alertele doar se logeaza.
  ADMIN_EMAILS: z.string().optional(),
  VERCEL_API_TOKEN: z.string().optional(),
  VERCEL_TEAM_ID: z.string().optional(),
  VERCEL_PROJECT_NAME: z.string().optional(),
  DISCORD_ALERT_WEBHOOK_URL: z.union([z.string().url(), z.literal("")]).optional(),
});

export type Env = z.infer<typeof schema>;

// Valideaza process.env. Arunca o eroare agregata (toate problemele deodata)
// daca ceva lipseste sau e invalid. Apelata din instrumentation.ts la boot.
export function validateEnv(): Env {
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(
      `Variabile de mediu invalide sau lipsa:\n${issues}\n\n` +
        `Verifica .env.local (model in .env.example). ` +
        `Pe Vercel: dashboard sau 'vercel env'.`
    );
  }
  return parsed.data;
}
