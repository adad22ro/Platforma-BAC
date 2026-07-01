import { describe, it, expect, beforeEach, vi } from "vitest";

const h = vi.hoisted(() => ({
  dbError: null as unknown,
  stripeThrows: false,
}));

vi.mock("@/lib/supabase-admin", () => ({
  supabaseAdmin: {
    from: () => ({
      select: () => Promise.resolve({ error: h.dbError }),
    }),
  },
}));
vi.mock("@/lib/stripe", () => ({
  stripe: {
    balance: {
      retrieve: vi.fn(async () => {
        if (h.stripeThrows) throw new Error("stripe down");
        return { available: [] };
      }),
    },
  },
}));

import { GET } from "@/app/api/health/route";

beforeEach(() => {
  vi.clearAllMocks();
  h.dbError = null;
  h.stripeThrows = false;
});

describe("GET /api/health", () => {
  it("tot ok -> 200 status ok", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({
      status: "ok",
      checks: { database: "ok", stripe: "ok" },
    });
  });

  it("DB jos -> 503 status down", async () => {
    h.dbError = { message: "connection refused" };
    const res = await GET();
    expect(res.status).toBe(503);
    expect((await res.json()).status).toBe("down");
  });

  it("Stripe jos (DB ok) -> 200 status degraded", async () => {
    h.stripeThrows = true;
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({
      status: "degraded",
      checks: { database: "ok", stripe: "down" },
    });
  });
});
