import { describe, it, expect, beforeEach, vi } from "vitest";
import type { AppUser } from "@/lib/current-user";

// Mock flexibil pentru query builder-ul Supabase: lant .select/.order/.eq/.insert/
// .update/.delete, terminat cu .single() SAU await direct (thenable). Rezultatul
// e configurabil per-tabel; inregistram apelurile ca sa verificam filtrarea.
const h = vi.hoisted(() => {
  const state = {
    user: null as AppUser | null,
    results: {} as Record<string, { data: unknown; error: unknown }>,
  };
  const fromCalls: { table: string; calls: unknown[][] }[] = [];

  function from(table: string) {
    const result = state.results[table] ?? { data: null, error: null };
    const record = { table, calls: [] as unknown[][] };
    fromCalls.push(record);
    const b: Record<string, unknown> = {};
    const chain =
      (name: string) =>
      (...args: unknown[]) => {
        record.calls.push([name, ...args]);
        return b;
      };
    for (const m of ["select", "order", "eq", "insert", "update", "delete"]) b[m] = chain(m);
    b.single = () => Promise.resolve(result);
    b.then = (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) =>
      Promise.resolve(result).then(res, rej);
    return b;
  }

  return {
    state,
    fromCalls,
    supabaseAdmin: { from: vi.fn(from) },
    logError: vi.fn(async () => {}),
    getCurrentAppUser: vi.fn(async () => state.user),
  };
});

vi.mock("@/lib/supabase-admin", () => ({ supabaseAdmin: h.supabaseAdmin }));
vi.mock("@/lib/log-error", () => ({ logError: h.logError }));
// Pastram isTeacher/canAccessPremium reale; mock-uim doar getCurrentAppUser.
vi.mock("@/lib/current-user", async (importActual) => {
  const actual = await importActual<typeof import("@/lib/current-user")>();
  return { ...actual, getCurrentAppUser: h.getCurrentAppUser };
});

import { GET as chaptersGET, POST as chaptersPOST } from "@/app/api/chapters/route";
import { POST as lessonsPOST } from "@/app/api/lessons/route";
import { GET as lessonByIdGET } from "@/app/api/lessons/[id]/route";
import { GET as chapterLessonsGET } from "@/app/api/chapters/[id]/lessons/route";

const teacher: AppUser = { clerk_id: "t", role: "teacher", subscription_status: "free" };
const studentFree: AppUser = { clerk_id: "s", role: "student", subscription_status: "free" };
const studentActive: AppUser = { clerk_id: "s", role: "student", subscription_status: "active" };

function jsonReq(body: unknown) {
  return new Request("http://x", { method: "POST", body: JSON.stringify(body) });
}
function ctx(id: string) {
  return { params: Promise.resolve({ id }) };
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function eqCalls(table: string): unknown[][] {
  const rec = h.fromCalls.filter((c) => c.table === table).at(-1);
  return (rec?.calls ?? []).filter((c) => c[0] === "eq");
}

beforeEach(() => {
  vi.clearAllMocks();
  h.fromCalls.length = 0;
  h.state.user = null;
  h.state.results = {};
});

describe("GET /api/chapters", () => {
  it("elev: filtreaza pe published=true", async () => {
    h.state.user = studentFree;
    h.state.results.chapters = { data: [], error: null };
    const res = await chaptersGET();
    expect(res.status).toBe(200);
    expect(eqCalls("chapters")).toContainEqual(["eq", "published", true]);
  });

  it("profesor: NU filtreaza (vede si draft)", async () => {
    h.state.user = teacher;
    h.state.results.chapters = { data: [], error: null };
    await chaptersGET();
    expect(eqCalls("chapters")).not.toContainEqual(["eq", "published", true]);
  });
});

describe("POST /api/chapters", () => {
  it("non-profesor -> 403", async () => {
    h.state.user = studentActive;
    const res = await chaptersPOST(jsonReq({ title: "X" }));
    expect(res.status).toBe(403);
    expect(h.supabaseAdmin.from).not.toHaveBeenCalled();
  });

  it("profesor fara titlu -> 400", async () => {
    h.state.user = teacher;
    const res = await chaptersPOST(jsonReq({ description: "fara titlu" }));
    expect(res.status).toBe(400);
  });

  it("profesor cu titlu -> 201", async () => {
    h.state.user = teacher;
    h.state.results.chapters = { data: { id: "c1", title: "X" }, error: null };
    const res = await chaptersPOST(jsonReq({ title: "X" }));
    expect(res.status).toBe(201);
  });
});

describe("POST /api/lessons", () => {
  it("non-profesor -> 403", async () => {
    h.state.user = studentActive;
    const res = await lessonsPOST(jsonReq({ chapter_id: "c1", title: "L" }));
    expect(res.status).toBe(403);
  });

  it("lipsa chapter_id/title -> 400", async () => {
    h.state.user = teacher;
    expect((await lessonsPOST(jsonReq({ title: "L" }))).status).toBe(400);
    expect((await lessonsPOST(jsonReq({ chapter_id: "c1" }))).status).toBe(400);
  });

  it("capitol inexistent (FK 23503) -> 400", async () => {
    h.state.user = teacher;
    h.state.results.lessons = { data: null, error: { code: "23503" } };
    const res = await lessonsPOST(jsonReq({ chapter_id: "nope", title: "L" }));
    expect(res.status).toBe(400);
  });
});

describe("GET /api/lessons/[id] — gating", () => {
  it("elev: lectie nepublicata -> 404", async () => {
    h.state.user = studentFree;
    h.state.results.lessons = { data: { id: "l1", chapter_id: "c1", published: false }, error: null };
    const res = await lessonByIdGET({} as never, ctx("l1"));
    expect(res.status).toBe(404);
  });

  it("elev fara abonament: capitol premium -> 402", async () => {
    h.state.user = studentFree;
    h.state.results.lessons = { data: { id: "l1", chapter_id: "c1", published: true }, error: null };
    h.state.results.chapters = { data: { is_free: false, published: true }, error: null };
    const res = await lessonByIdGET({} as never, ctx("l1"));
    expect(res.status).toBe(402);
    expect(await res.json()).toEqual({ error: "premium_required" });
  });

  it("elev cu abonament activ: capitol premium -> 200", async () => {
    h.state.user = studentActive;
    h.state.results.lessons = { data: { id: "l1", chapter_id: "c1", published: true }, error: null };
    h.state.results.chapters = { data: { is_free: false, published: true }, error: null };
    const res = await lessonByIdGET({} as never, ctx("l1"));
    expect(res.status).toBe(200);
  });

  it("elev fara abonament: capitol free -> 200", async () => {
    h.state.user = studentFree;
    h.state.results.lessons = { data: { id: "l1", chapter_id: "c1", published: true }, error: null };
    h.state.results.chapters = { data: { is_free: true, published: true }, error: null };
    const res = await lessonByIdGET({} as never, ctx("l1"));
    expect(res.status).toBe(200);
  });

  it("profesor: vede orice, chiar nepublicat -> 200", async () => {
    h.state.user = teacher;
    h.state.results.lessons = { data: { id: "l1", chapter_id: "c1", published: false }, error: null };
    const res = await lessonByIdGET({} as never, ctx("l1"));
    expect(res.status).toBe(200);
  });
});

describe("GET /api/chapters/[id]/lessons — gating + filtrare", () => {
  it("elev fara abonament: capitol premium -> 402", async () => {
    h.state.user = studentFree;
    h.state.results.chapters = { data: { id: "c1", is_free: false, published: true }, error: null };
    const res = await chapterLessonsGET({} as never, ctx("c1"));
    expect(res.status).toBe(402);
  });

  it("elev, capitol free: 200 + filtreaza lectiile pe published", async () => {
    h.state.user = studentFree;
    h.state.results.chapters = { data: { id: "c1", is_free: true, published: true }, error: null };
    h.state.results.lessons = { data: [], error: null };
    const res = await chapterLessonsGET({} as never, ctx("c1"));
    expect(res.status).toBe(200);
    expect(eqCalls("lessons")).toContainEqual(["eq", "published", true]);
  });

  it("profesor: 200 fara filtrare pe published", async () => {
    h.state.user = teacher;
    h.state.results.chapters = { data: { id: "c1", is_free: false, published: false }, error: null };
    h.state.results.lessons = { data: [], error: null };
    const res = await chapterLessonsGET({} as never, ctx("c1"));
    expect(res.status).toBe(200);
    expect(eqCalls("lessons")).not.toContainEqual(["eq", "published", true]);
  });
});
