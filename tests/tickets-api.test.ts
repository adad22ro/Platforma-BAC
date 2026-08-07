import { describe, it, expect, beforeEach, vi } from "vitest";
import type { AppUser } from "@/lib/current-user";

// Acelasi mock de query builder ca in questions-api.test.ts: rezultate per tabel,
// consumate in ordinea apelurilor, cu inregistrarea apelurilor ca sa verificam
// filtrarea (esential aici — un elev nu trebuie sa vada tichetele altcuiva).
const h = vi.hoisted(() => {
  const state = {
    user: null as AppUser | null,
    results: {} as Record<string, { data: unknown; error: unknown }[]>,
  };
  const fromCalls: { table: string; calls: unknown[][] }[] = [];

  function next(table: string) {
    const queue = state.results[table];
    if (!queue?.length) return { data: null, error: null };
    return queue.length === 1 ? queue[0] : queue.shift()!;
  }

  function from(table: string) {
    const result = next(table);
    const record = { table, calls: [] as unknown[][] };
    fromCalls.push(record);
    const b: Record<string, unknown> = {};
    const chain =
      (name: string) =>
      (...args: unknown[]) => {
        record.calls.push([name, ...args]);
        return b;
      };
    for (const m of ["select", "order", "eq", "in", "insert", "update", "delete", "upsert"]) {
      b[m] = chain(m);
    }
    b.single = () => Promise.resolve(result);
    b.maybeSingle = () => Promise.resolve(result);
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
vi.mock("@/lib/current-user", async (importActual) => {
  const actual = await importActual<typeof import("@/lib/current-user")>();
  return { ...actual, getCurrentAppUser: h.getCurrentAppUser };
});

import { GET as ticketsGET, POST as ticketsPOST } from "@/app/api/tickets/route";
import { GET as ticketGET } from "@/app/api/tickets/[id]/route";
import { POST as answerPOST } from "@/app/api/tickets/[id]/answer/route";

const teacher: AppUser = { id: "u-t", clerk_id: "t", role: "teacher", subscription_status: "free", subscription_end_date: null };
const student: AppUser = { id: "u-s", clerk_id: "s", role: "student", subscription_status: "free", subscription_end_date: null };
const studentActive: AppUser = { id: "u-s2", clerk_id: "s2", role: "student", subscription_status: "active", subscription_end_date: null };

const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

function jsonReq(body: unknown, url = "http://localhost/api/tickets") {
  return new Request(url, {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  }) as never;
}

const getReq = (url = "http://localhost/api/tickets") => new Request(url) as never;

const freeChapter = { data: { id: "c1", is_free: true, published: true }, error: null };
const premiumChapter = { data: { id: "c1", is_free: false, published: true }, error: null };

beforeEach(() => {
  vi.clearAllMocks();
  h.state.user = null;
  h.state.results = {};
  h.fromCalls.length = 0;
});

describe("GET /api/tickets", () => {
  it("401 fara sesiune", async () => {
    expect((await ticketsGET(getReq())).status).toBe(401);
  });

  it("elevul primeste doar tichetele proprii", async () => {
    h.state.user = student;
    h.state.results = { tickets: [{ data: [], error: null }] };

    await ticketsGET(getReq());
    const call = h.fromCalls.find((c) => c.table === "tickets");
    expect(call?.calls).toContainEqual(["eq", "user_id", "u-s"]);
  });

  it("elevul nu poate cere tichetele altcuiva prin query string", async () => {
    h.state.user = student;
    h.state.results = { tickets: [{ data: [], error: null }] };

    await ticketsGET(getReq("http://localhost/api/tickets?user_id=u-altcineva"));
    const eqUserCalls = h.fromCalls
      .find((c) => c.table === "tickets")
      ?.calls.filter(([name, col]) => name === "eq" && col === "user_id");
    // Un singur filtru pe user_id, si acela cu id-ul din sesiune.
    expect(eqUserCalls).toEqual([["eq", "user_id", "u-s"]]);
  });

  it("profesorul vede toate tichetele, filtrabile pe status si capitol", async () => {
    h.state.user = teacher;
    h.state.results = { tickets: [{ data: [], error: null }] };

    await ticketsGET(getReq("http://localhost/api/tickets?status=open&chapter_id=c1"));
    const calls = h.fromCalls.find((c) => c.table === "tickets")?.calls ?? [];
    expect(calls.some(([name, col]) => name === "eq" && col === "user_id")).toBe(false);
    expect(calls).toContainEqual(["eq", "status", "open"]);
    expect(calls).toContainEqual(["eq", "chapter_id", "c1"]);
  });
});

describe("POST /api/tickets", () => {
  it("401 fara sesiune", async () => {
    expect((await ticketsPOST(jsonReq({ message: "ceva" }))).status).toBe(401);
  });

  it("400 fara mesaj sau cu mesaj gol", async () => {
    h.state.user = student;
    expect((await ticketsPOST(jsonReq({}))).status).toBe(400);
    expect((await ticketsPOST(jsonReq({ message: "   " }))).status).toBe(400);
  });

  it("400 la mesaj peste limita", async () => {
    h.state.user = student;
    const res = await ticketsPOST(jsonReq({ message: "x".repeat(2001) }));
    expect(res.status).toBe(400);
  });

  it("creeaza tichet fara context", async () => {
    h.state.user = student;
    h.state.results = { tickets: [{ data: { id: "t1", status: "open" }, error: null }] };

    const res = await ticketsPOST(jsonReq({ message: "Nu am inteles" }));
    expect(res.status).toBe(201);

    const insert = h.fromCalls
      .find((c) => c.table === "tickets")
      ?.calls.find(([n]) => n === "insert");
    expect(insert?.[1]).toMatchObject({ user_id: "u-s", message: "Nu am inteles", status: "open" });
  });

  it("deriva capitolul din lectie, nu din ce spune clientul", async () => {
    h.state.user = student;
    h.state.results = {
      lessons: [{ data: { id: "l1", chapter_id: "c1" }, error: null }],
      chapters: [freeChapter],
      tickets: [{ data: { id: "t1" }, error: null }],
    };

    await ticketsPOST(jsonReq({ message: "intrebare", lesson_id: "l1", chapter_id: "c-minciuna" }));

    const insert = h.fromCalls
      .find((c) => c.table === "tickets")
      ?.calls.find(([n]) => n === "insert");
    expect(insert?.[1]).toMatchObject({ lesson_id: "l1", chapter_id: "c1" });
  });

  it("400 daca lectia din context nu exista", async () => {
    h.state.user = student;
    h.state.results = { lessons: [{ data: null, error: { message: "not found" } }] };

    const res = await ticketsPOST(jsonReq({ message: "intrebare", lesson_id: "inexistent" }));
    expect(res.status).toBe(400);
    expect(h.fromCalls.some((c) => c.table === "tickets")).toBe(false);
  });

  it("402 daca elevul nu are acces la capitolul din context", async () => {
    h.state.user = student;
    h.state.results = { chapters: [premiumChapter] };

    const res = await ticketsPOST(jsonReq({ message: "intrebare", chapter_id: "c1" }));
    expect(res.status).toBe(402);
    // Nu se creeaza tichet despre continut inaccesibil.
    expect(h.fromCalls.some((c) => c.table === "tickets")).toBe(false);
  });

  it("elevul cu abonament activ poate intreba despre capitol premium", async () => {
    h.state.user = studentActive;
    h.state.results = {
      chapters: [premiumChapter],
      tickets: [{ data: { id: "t1" }, error: null }],
    };

    expect((await ticketsPOST(jsonReq({ message: "intrebare", chapter_id: "c1" }))).status).toBe(201);
  });
});

describe("GET /api/tickets/[id]", () => {
  const ticket = { data: { id: "t1", user_id: "u-s", message: "x" }, error: null };

  it("autorul isi vede tichetul", async () => {
    h.state.user = student;
    h.state.results = { tickets: [ticket] };
    expect((await ticketGET({} as never, ctx("t1"))).status).toBe(200);
  });

  it("404 pentru tichetul altcuiva (nu 403 — nu confirmam ca exista)", async () => {
    h.state.user = { ...student, id: "u-altcineva" };
    h.state.results = { tickets: [ticket] };
    const res = await ticketGET({} as never, ctx("t1"));
    expect(res.status).toBe(404);
    expect(await res.text()).not.toContain("t1");
  });

  it("profesorul vede orice tichet", async () => {
    h.state.user = teacher;
    h.state.results = { tickets: [ticket] };
    expect((await ticketGET({} as never, ctx("t1"))).status).toBe(200);
  });
});

describe("POST /api/tickets/[id]/answer", () => {
  it("403 pentru elev", async () => {
    h.state.user = student;
    const res = await answerPOST(jsonReq({ answer: "raspuns" }), ctx("t1"));
    expect(res.status).toBe(403);
    expect(h.supabaseAdmin.from).not.toHaveBeenCalled();
  });

  it("400 fara raspuns", async () => {
    h.state.user = teacher;
    expect((await answerPOST(jsonReq({}), ctx("t1"))).status).toBe(400);
    expect((await answerPOST(jsonReq({ answer: "  " }), ctx("t1"))).status).toBe(400);
  });

  it("profesorul raspunde: status answered + cine si cand", async () => {
    h.state.user = teacher;
    h.state.results = { tickets: [{ data: { id: "t1", status: "answered" }, error: null }] };

    const res = await answerPOST(jsonReq({ answer: "Uite cum se rezolva" }), ctx("t1"));
    expect(res.status).toBe(200);

    const update = h.fromCalls
      .find((c) => c.table === "tickets")
      ?.calls.find(([n]) => n === "update");
    expect(update?.[1]).toMatchObject({
      answer: "Uite cum se rezolva",
      answered_by: "u-t",
      status: "answered",
    });
    expect((update?.[1] as { answered_at?: string })?.answered_at).toBeTruthy();
  });

  it("404 daca tichetul nu exista", async () => {
    h.state.user = teacher;
    h.state.results = { tickets: [{ data: null, error: null }] };
    expect((await answerPOST(jsonReq({ answer: "x" }), ctx("t1"))).status).toBe(404);
  });
});
