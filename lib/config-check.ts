// Verifica formatul variabilelor de mediu de pe server si semnaleaza problemele
// inainte sa cauzeze erori in runtime. NU expune valorile reale (doar status).

export type CheckStatus = "ok" | "error" | "warn";

export type ConfigCheck = {
  name: string;
  status: CheckStatus;
  detail: string;
};

// Decodeaza rolul dintr-un JWT Supabase (claim-ul "role"), fara verificare de semnatura.
function jwtRole(token: string): string | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const json = JSON.parse(
      Buffer.from(payload, "base64").toString("utf8")
    );
    return typeof json.role === "string" ? json.role : null;
  } catch {
    return null;
  }
}

function check(
  name: string,
  value: string | undefined,
  opts: {
    required?: boolean;
    prefix?: string;
    validate?: (v: string) => string | null; // returneaza mesaj de eroare sau null
  }
): ConfigCheck {
  if (!value || value.trim().length === 0) {
    return {
      name,
      status: opts.required === false ? "warn" : "error",
      detail: opts.required === false ? "lipseste (optional)" : "lipseste",
    };
  }
  if (opts.prefix && !value.startsWith(opts.prefix)) {
    return {
      name,
      status: "error",
      detail: `ar trebui sa inceapa cu "${opts.prefix}" (incepe cu "${value.slice(0, 4)}...")`,
    };
  }
  if (opts.validate) {
    const err = opts.validate(value);
    if (err) return { name, status: "error", detail: err };
  }
  return { name, status: "ok", detail: "ok" };
}

export function runConfigChecks(): ConfigCheck[] {
  const env = process.env;
  return [
    check("NEXT_PUBLIC_SUPABASE_URL", env.NEXT_PUBLIC_SUPABASE_URL, {
      required: true,
      validate: (v) =>
        v.startsWith("https://") ? null : "ar trebui sa fie un URL https://",
    }),
    check("SUPABASE_SERVICE_ROLE_KEY", env.SUPABASE_SERVICE_ROLE_KEY, {
      required: true,
      validate: (v) => {
        const role = jwtRole(v);
        if (role === "service_role") return null;
        if (role === "anon")
          return "e cheia ANON, nu service_role! (verifica in Supabase)";
        return "nu pare un JWT Supabase valid";
      },
    }),
    check("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY, {
      required: true,
      prefix: "pk_",
    }),
    check("CLERK_SECRET_KEY", env.CLERK_SECRET_KEY, {
      required: true,
      prefix: "sk_",
    }),
    check("CLERK_WEBHOOK_SIGNING_SECRET", env.CLERK_WEBHOOK_SIGNING_SECRET, {
      required: true,
      prefix: "whsec_",
    }),
    check("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY", env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY, {
      required: true,
      prefix: "pk_",
    }),
    check("STRIPE_SECRET_KEY", env.STRIPE_SECRET_KEY, {
      required: true,
      validate: (v) =>
        v.startsWith("sk_") || v.startsWith("rk_")
          ? null
          : `ar trebui sa inceapa cu "sk_" (incepe cu "${v.slice(0, 4)}...")`,
    }),
    check("VERCEL_API_TOKEN", env.VERCEL_API_TOKEN, { required: false }),
  ];
}
