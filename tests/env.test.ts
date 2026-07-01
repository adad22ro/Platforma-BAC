import { describe, it, expect } from "vitest";
import { validateEnv } from "@/lib/env";

// Un set complet, valid, de variabile server (folosit ca baza in teste).
function fullEnv(): Record<string, string> {
  return {
    NEXT_PUBLIC_SUPABASE_URL: "https://x.supabase.co",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon",
    SUPABASE_SERVICE_ROLE_KEY: "service",
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test",
    CLERK_SECRET_KEY: "sk_test",
    CLERK_WEBHOOK_SIGNING_SECRET: "whsec",
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_stripe",
    STRIPE_SECRET_KEY: "sk_stripe",
    STRIPE_WEBHOOK_SECRET: "whsec_stripe",
    STRIPE_PRICE_ID_MONTHLY: "price_123",
    NEXT_PUBLIC_APP_URL: "http://localhost:3000",
  };
}

// validateEnv citeste process.env; setam/curatam in jurul fiecarui caz.
function withEnv(vars: Record<string, string | undefined>, fn: () => void) {
  const keys = Object.keys({ ...fullEnv(), ...vars });
  const saved: Record<string, string | undefined> = {};
  for (const k of keys) saved[k] = process.env[k];
  try {
    const base = fullEnv();
    for (const k of keys) {
      // Un override explicit (chiar si `undefined`) are prioritate fata de baza.
      const v = k in vars ? vars[k] : base[k];
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
    fn();
  } finally {
    for (const k of keys) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
  }
}

describe("validateEnv", () => {
  it("trece cu setul complet de variabile", () => {
    withEnv({}, () => {
      expect(() => validateEnv()).not.toThrow();
    });
  });

  it("arunca daca lipseste o variabila obligatorie (Stripe)", () => {
    withEnv({ STRIPE_PRICE_ID_MONTHLY: undefined }, () => {
      expect(() => validateEnv()).toThrow(/STRIPE_PRICE_ID_MONTHLY/);
    });
  });

  it("arunca daca un URL e invalid", () => {
    withEnv({ NEXT_PUBLIC_APP_URL: "nu-e-url" }, () => {
      expect(() => validateEnv()).toThrow(/NEXT_PUBLIC_APP_URL/);
    });
  });

  it("accepta lipsa variabilelor optionale (Discord/Vercel)", () => {
    withEnv(
      {
        DISCORD_ALERT_WEBHOOK_URL: undefined,
        VERCEL_API_TOKEN: undefined,
        ADMIN_EMAILS: undefined,
      },
      () => {
        expect(() => validateEnv()).not.toThrow();
      }
    );
  });
});
