import { describe, it, expect } from "vitest";
import { validateEnv } from "@/lib/env";

// Valoare falsa pentru o variabila: generata, nu scrisa ca literal. Doua motive —
// se vede din prima ca nu e un secret real, si scannerele de secrete (Snyk Code)
// nu mai raporteaza siruri care „arata a cheie" intr-un fisier de test.
const fals = (nume: string) => `test-${nume.toLowerCase()}`;

// Un set complet, valid, de variabile server (folosit ca baza in teste).
function fullEnv(): Record<string, string> {
  const generate = [
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
    "CLERK_SECRET_KEY",
    "CLERK_WEBHOOK_SIGNING_SECRET",
    "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
    "STRIPE_SECRET_KEY",
    "STRIPE_WEBHOOK_SECRET",
    "STRIPE_PRICE_ID_MONTHLY",
  ];

  return {
    // Cele doua URL-uri raman explicite: schema si forma lor chiar sunt validate.
    NEXT_PUBLIC_SUPABASE_URL: "https://x.supabase.co",
    NEXT_PUBLIC_APP_URL: "http://localhost:3000",
    ...Object.fromEntries(generate.map((k) => [k, fals(k)])),
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
