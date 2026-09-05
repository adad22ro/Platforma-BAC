import { describe, it, expect, beforeEach, vi } from "vitest";
import type { AppUser } from "@/lib/current-user";

type MesajEmail = { catre: string; subiect: string; html: string; text: string };
type TrimiteEmail = (m: MesajEmail) => Promise<{ trimis: boolean; id?: string }>;

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
    for (const m of ["select", "order", "eq", "neq", "in", "limit", "is", "or", "range", "insert", "update", "delete", "upsert"]) {
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
    trimiteEmail: vi.fn<TrimiteEmail>(async () => ({ trimis: true, id: "em_1" })),
  };
});

vi.mock("@/lib/supabase-admin", () => ({ supabaseAdmin: h.supabaseAdmin }));
vi.mock("@/lib/log-error", () => ({ logError: h.logError }));
vi.mock("@/lib/email", async (importActual) => {
  const actual = await importActual<typeof import("@/lib/email")>();
  return { ...actual, trimiteEmail: h.trimiteEmail };
});
vi.mock("@/lib/current-user", async (importActual) => {
  const actual = await importActual<typeof import("@/lib/current-user")>();
  return { ...actual, getCurrentAppUser: h.getCurrentAppUser };
});

import { GET as ticketsGET, POST as ticketsPOST } from "@/app/api/tickets/route";
import { GET as ticketGET, PATCH as ticketPATCH } from "@/app/api/tickets/[id]/route";
import { POST as messagePOST } from "@/app/api/tickets/[id]/messages/route";

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

const lesson = { data: { id: "l1", chapter_id: "c1", title: "Lectia 1.2" }, error: null };
const freeChapter = { data: { id: "c1", is_free: true, published: true }, error: null };
const premiumChapter = { data: { id: "c1", is_free: false, published: true }, error: null };

// Contextul complet pentru o creare reusita de tichet.
function creationResults(chapter = freeChapter, progress: unknown = { score: 3, total: 6, attempts: 2 }) {
  return {
    lessons: [lesson],
    chapters: [chapter],
    student_progress: [{ data: progress, error: null }],
    tickets: [{ data: { id: "t1", status: "open" }, error: null }],
    ticket_messages: [{ data: { id: "m1" }, error: null }],
  };
}

const insertOn = (table: string) =>
  h.fromCalls.find((c) => c.table === table && c.calls.some(([n]) => n === "insert"))
    ?.calls.find(([n]) => n === "insert")?.[1] as Record<string, unknown> | undefined;

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
    expect(eqUserCalls).toEqual([["eq", "user_id", "u-s"]]);
  });

  it("profesorul vede toate tichetele, filtrabile pe status, capitol si lectie", async () => {
    h.state.user = teacher;
    h.state.results = { tickets: [{ data: [], error: null }] };

    await ticketsGET(getReq("http://localhost/api/tickets?status=open&chapter_id=c1&lesson_id=l1"));
    const calls = h.fromCalls.find((c) => c.table === "tickets")?.calls ?? [];
    expect(calls.some(([name, col]) => name === "eq" && col === "user_id")).toBe(false);
    expect(calls).toContainEqual(["eq", "status", "open"]);
    expect(calls).toContainEqual(["eq", "chapter_id", "c1"]);
    expect(calls).toContainEqual(["eq", "lesson_id", "l1"]);
  });

  // Paginare — lista de tichete a unui corector creste cu fiecare intrebare pusa
  // vreodata pe platforma, deci nu poate fi intoarsa intreaga.
  it("aplica limita implicita si intoarce meta", async () => {
    h.state.user = student;
    h.state.results = { tickets: [{ data: [], error: null }] };
    const res = await ticketsGET(getReq());
    const calls = h.fromCalls.find((c) => c.table === "tickets")?.calls ?? [];
    expect(calls).toContainEqual(["range", 0, 50]);
    expect(await res.json()).toMatchObject({ meta: { limit: 50, offset: 0, has_more: false } });
  });

  it("respecta ?limit= si ?offset=, plafonate", async () => {
    h.state.user = student;
    h.state.results = { tickets: [{ data: [], error: null }] };
    await ticketsGET(getReq("http://localhost/api/tickets?limit=10&offset=20"));
    expect(h.fromCalls.find((c) => c.table === "tickets")?.calls).toContainEqual(["range", 20, 30]);

    h.fromCalls.length = 0;
    await ticketsGET(getReq("http://localhost/api/tickets?limit=9999"));
    expect(h.fromCalls.find((c) => c.table === "tickets")?.calls).toContainEqual(["range", 0, 100]);
  });

  // Filtrarea in memorie era corecta doar cat timp raspunsul continea TOATE
  // tichetele. Pe o pagina de 50, un `pool` derivat din ea ar fi fost "ce s-a
  // nimerit in primele 50 dupa ultima activitate" — o lista falsa, nu o coada.
  it("pool si alemele se cer din DB, nu se filtreaza in JS peste pagina", async () => {
    h.state.user = teacher;
    h.state.results = { tickets: [{ data: [], error: null }] };
    const res = await ticketsGET(getReq());

    const cereri = h.fromCalls.filter((c) => c.table === "tickets");
    expect(cereri.length).toBe(3);

    const toate = cereri.flatMap((c) => c.calls);
    // "Ale mele" — rezervate pentru mine, valabile sau preluate.
    expect(toate).toContainEqual(["eq", "mentor_rezervat_id", teacher.id]);
    // Pool — nepreluate, neinchise.
    expect(toate).toContainEqual(["is", "preluat_la", null]);
    expect(toate).toContainEqual(["neq", "status", "closed"]);
    // FIFO: cel mai vechi primul. Cum "intarziat" inseamna exact "mai vechi de 24h",
    // ordonarea asta pune intarziatele in cap fara o a doua cheie de sortare.
    expect(toate).toContainEqual(["order", "created_at", { ascending: true }]);

    expect(await res.json()).toMatchObject({
      meta: expect.any(Object),
      alemele_meta: expect.any(Object),
      pool_meta: expect.any(Object),
    });
  });

  it("elevul nu primeste listele de corector", async () => {
    h.state.user = student;
    h.state.results = { tickets: [{ data: [], error: null }] };
    const body = await (await ticketsGET(getReq())).json();
    expect(body).not.toHaveProperty("pool");
    expect(body).not.toHaveProperty("alemele");
    expect(h.fromCalls.filter((c) => c.table === "tickets").length).toBe(1);
  });

  it("coada e ordonata dupa ultima activitate", async () => {
    h.state.user = teacher;
    h.state.results = { tickets: [{ data: [], error: null }] };
    await ticketsGET(getReq());
    const calls = h.fromCalls.find((c) => c.table === "tickets")?.calls ?? [];
    expect(calls).toContainEqual(["order", "last_message_at", { ascending: false }]);
  });
});

describe("POST /api/tickets", () => {
  const body = { message: "Nu am inteles", lesson_id: "l1" };

  it("401 fara sesiune", async () => {
    expect((await ticketsPOST(jsonReq(body))).status).toBe(401);
  });

  it("400 fara lesson_id — tichetele exista doar in contextul unei lectii", async () => {
    h.state.user = student;
    const res = await ticketsPOST(jsonReq({ message: "ceva" }));
    expect(res.status).toBe(400);
    expect(await res.text()).toContain("lesson_id");
  });

  it("400 fara mesaj, cu mesaj gol sau peste limita", async () => {
    h.state.user = student;
    expect((await ticketsPOST(jsonReq({ lesson_id: "l1" }))).status).toBe(400);
    expect((await ticketsPOST(jsonReq({ ...body, message: "   " }))).status).toBe(400);
    expect((await ticketsPOST(jsonReq({ ...body, message: "x".repeat(2001) }))).status).toBe(400);
  });

  it("capteaza contextul de lectie: titlu din DB, selectie si pozitie de la client", async () => {
    h.state.user = student;
    h.state.results = creationResults();

    const res = await ticketsPOST(
      jsonReq({ ...body, selection: "fraza neinteleasa", scroll_percent: 62.4 })
    );
    expect(res.status).toBe(201);

    expect(insertOn("tickets")).toMatchObject({
      user_id: "u-s",
      lesson_id: "l1",
      chapter_id: "c1",
      lesson_title: "Lectia 1.2",
      selection: "fraza neinteleasa",
      scroll_percent: 62,
    });
  });

  it("ingheata progresul la testul capitolului in momentul intrebarii", async () => {
    h.state.user = student;
    h.state.results = creationResults();

    await ticketsPOST(jsonReq(body));
    expect(insertOn("tickets")).toMatchObject({
      progress_score: 3,
      progress_total: 6,
      progress_attempts: 2,
    });
  });

  it("fara progres inregistrat, campurile raman null (nu 0)", async () => {
    h.state.user = student;
    h.state.results = creationResults(freeChapter, null);

    await ticketsPOST(jsonReq(body));
    expect(insertOn("tickets")).toMatchObject({
      progress_score: null,
      progress_total: null,
      progress_attempts: null,
    });
  });

  it("ignora un scroll_percent invalid", async () => {
    h.state.user = student;
    h.state.results = creationResults();
    await ticketsPOST(jsonReq({ ...body, scroll_percent: 500 }));
    expect(insertOn("tickets")).toMatchObject({ scroll_percent: null });
  });

  it("capitolul vine din lectie, nu din ce declara clientul", async () => {
    h.state.user = student;
    h.state.results = creationResults();

    await ticketsPOST(jsonReq({ ...body, chapter_id: "c-minciuna" }));
    expect(insertOn("tickets")).toMatchObject({ chapter_id: "c1" });
  });

  it("mesajul initial devine primul mesaj din fir", async () => {
    h.state.user = student;
    h.state.results = creationResults();

    await ticketsPOST(jsonReq(body));
    expect(insertOn("ticket_messages")).toMatchObject({
      ticket_id: "t1",
      author_id: "u-s",
      author_role: "student",
      body: "Nu am inteles",
    });
  });

  it("400 daca lectia nu exista", async () => {
    h.state.user = student;
    h.state.results = { lessons: [{ data: null, error: { message: "not found" } }] };

    const res = await ticketsPOST(jsonReq(body));
    expect(res.status).toBe(400);
    expect(h.fromCalls.some((c) => c.table === "tickets")).toBe(false);
  });

  it("402 daca elevul nu are acces la capitolul lectiei", async () => {
    h.state.user = student;
    h.state.results = { lessons: [lesson], chapters: [premiumChapter] };

    const res = await ticketsPOST(jsonReq(body));
    expect(res.status).toBe(402);
    expect(h.fromCalls.some((c) => c.table === "tickets")).toBe(false);
  });

  it("elevul cu abonament activ poate intreba despre lectie premium", async () => {
    h.state.user = studentActive;
    h.state.results = creationResults(premiumChapter);
    expect((await ticketsPOST(jsonReq(body))).status).toBe(201);
  });

  it("sterge tichetul daca primul mesaj nu se poate scrie (fara tichete fara fir)", async () => {
    h.state.user = student;
    h.state.results = {
      ...creationResults(),
      ticket_messages: [{ data: null, error: { code: "23505", message: "boom" } }],
    };

    const res = await ticketsPOST(jsonReq(body));
    expect(res.status).toBe(500);
    const deleted = h.fromCalls.some(
      (c) => c.table === "tickets" && c.calls.some(([n]) => n === "delete")
    );
    expect(deleted).toBe(true);
  });
});

describe("GET /api/tickets/[id]", () => {
  const ticket = { data: { id: "t1", user_id: "u-s", message: "x" }, error: null };
  const messages = { data: [{ id: "m1", body: "Nu am inteles" }], error: null };

  it("autorul isi vede tichetul cu firul de mesaje", async () => {
    h.state.user = student;
    h.state.results = { tickets: [ticket], ticket_messages: [messages] };

    const res = await ticketGET({} as never, ctx("t1"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ticket.messages).toHaveLength(1);
  });

  it("404 pentru tichetul altcuiva (nu 403 — nu confirmam ca exista)", async () => {
    h.state.user = { ...student, id: "u-altcineva" };
    h.state.results = { tickets: [ticket] };

    const res = await ticketGET({} as never, ctx("t1"));
    expect(res.status).toBe(404);
    expect(await res.text()).not.toContain("t1");
    // Nu se ating mesajele unui tichet strain.
    expect(h.fromCalls.some((c) => c.table === "ticket_messages")).toBe(false);
  });

  it("profesorul vede orice tichet", async () => {
    h.state.user = teacher;
    h.state.results = { tickets: [ticket], ticket_messages: [messages] };
    expect((await ticketGET({} as never, ctx("t1"))).status).toBe(200);
  });
});

describe("POST /api/tickets/[id]/messages", () => {
  const ticket = { data: { id: "t1", user_id: "u-s", status: "open" }, error: null };

  function threadResults() {
    return {
      tickets: [ticket],
      ticket_messages: [{ data: { id: "m2" }, error: null }],
    };
  }

  it("401 fara sesiune", async () => {
    expect((await messagePOST(jsonReq({ body: "x" }), ctx("t1"))).status).toBe(401);
  });

  it("400 fara continut sau peste limita", async () => {
    h.state.user = teacher;
    expect((await messagePOST(jsonReq({}), ctx("t1"))).status).toBe(400);
    expect((await messagePOST(jsonReq({ body: "  " }), ctx("t1"))).status).toBe(400);
    expect((await messagePOST(jsonReq({ body: "x".repeat(5001) }), ctx("t1"))).status).toBe(400);
  });

  it("raspunsul profesorului trece tichetul in answered", async () => {
    h.state.user = teacher;
    h.state.results = threadResults();

    const res = await messagePOST(jsonReq({ body: "Uite cum se rezolva" }), ctx("t1"));
    expect(res.status).toBe(201);
    expect(insertOn("ticket_messages")).toMatchObject({
      author_id: "u-t",
      author_role: "teacher",
      body: "Uite cum se rezolva",
    });

    const update = h.fromCalls
      .find((c) => c.table === "tickets" && c.calls.some(([n]) => n === "update"))
      ?.calls.find(([n]) => n === "update");
    expect(update?.[1]).toMatchObject({ status: "answered" });
  });

  it("revenirea elevului redeschide tichetul", async () => {
    h.state.user = student;
    h.state.results = {
      tickets: [{ data: { id: "t1", user_id: "u-s", status: "answered" }, error: null }],
      ticket_messages: [{ data: { id: "m3" }, error: null }],
    };

    await messagePOST(jsonReq({ body: "tot nu am inteles" }), ctx("t1"));
    expect(insertOn("ticket_messages")).toMatchObject({ author_role: "student" });

    const update = h.fromCalls
      .find((c) => c.table === "tickets" && c.calls.some(([n]) => n === "update"))
      ?.calls.find(([n]) => n === "update");
    expect(update?.[1]).toMatchObject({ status: "open" });
  });

  it("404 daca tichetul nu exista", async () => {
    h.state.user = teacher;
    h.state.results = { tickets: [{ data: null, error: null }] };
    expect((await messagePOST(jsonReq({ body: "x" }), ctx("t1"))).status).toBe(404);
  });

  // Notificarea pleaca DOAR cand raspunde un corector. Un elev care revine in fir
  // si-ar trimite email siesi.
  it("raspunsul corectorului notifica elevul pe email", async () => {
    h.state.user = teacher;
    h.state.results = {
      tickets: [{ data: { id: "t1", user_id: "u-s", status: "open", lesson_title: "Balada" }, error: null }],
      ticket_messages: [{ data: { id: "m2" }, error: null }],
      users: [{ data: { email: "elev@example.com", full_name: "Ion Popescu" }, error: null }],
    };

    await messagePOST(jsonReq({ body: "Uite cum se rezolva" }), ctx("t1"));

    expect(h.trimiteEmail).toHaveBeenCalledOnce();
    const arg = h.trimiteEmail.mock.calls[0]![0];
    expect(arg.catre).toBe("elev@example.com");
    expect(arg.subiect).toContain("Balada");
    // Se foloseste prenumele, nu numele intreg.
    expect(arg.text).toContain("Salut, Ion!");
    expect(arg.html).toContain("/intrebari?tichet=t1");
  });

  it("revenirea elevului NU trimite email", async () => {
    h.state.user = student;
    h.state.results = threadResults();
    await messagePOST(jsonReq({ body: "tot nu am inteles" }), ctx("t1"));
    expect(h.trimiteEmail).not.toHaveBeenCalled();
  });

  // Emailul e un efect secundar: daca pica, mesajul ramane scris si ruta da tot 201.
  it("esecul emailului nu strica raspunsul deja salvat", async () => {
    h.state.user = teacher;
    h.trimiteEmail.mockRejectedValueOnce(new Error("resend down"));
    h.state.results = {
      tickets: [{ data: { id: "t1", user_id: "u-s", status: "open", lesson_title: null }, error: null }],
      ticket_messages: [{ data: { id: "m2" }, error: null }],
      users: [{ data: { email: "elev@example.com", full_name: null }, error: null }],
    };

    const res = await messagePOST(jsonReq({ body: "raspuns" }), ctx("t1"));
    expect(res.status).toBe(201);
  });

  it("un elev strain nu poate scrie in fir (404, nu 403)", async () => {
    h.state.user = { ...student, id: "u-altcineva" };
    h.state.results = threadResults();

    const res = await messagePOST(jsonReq({ body: "ma bag si eu" }), ctx("t1"));
    expect(res.status).toBe(404);
    expect(h.fromCalls.some((c) => c.table === "ticket_messages")).toBe(false);
  });
});

describe("PATCH /api/tickets/[id]", () => {
  const ticket = { data: { id: "t1", user_id: "u-s" }, error: null };

  function patchReq(body: unknown) {
    return new Request("http://localhost/api/tickets/t1", {
      method: "PATCH",
      body: JSON.stringify(body),
      headers: { "content-type": "application/json" },
    }) as never;
  }

  it("401 fara sesiune", async () => {
    expect((await ticketPATCH(patchReq({ status: "closed" }), ctx("t1"))).status).toBe(401);
  });

  it("nu se poate seta manual `answered` — starea aia vine din fir", async () => {
    h.state.user = teacher;
    const res = await ticketPATCH(patchReq({ status: "answered" }), ctx("t1"));
    expect(res.status).toBe(400);
    expect(h.supabaseAdmin.from).not.toHaveBeenCalled();
  });

  it("400 la status necunoscut", async () => {
    h.state.user = teacher;
    expect((await ticketPATCH(patchReq({ status: "banana" }), ctx("t1"))).status).toBe(400);
    expect((await ticketPATCH(patchReq({}), ctx("t1"))).status).toBe(400);
  });

  it("autorul isi poate inchide tichetul", async () => {
    h.state.user = student;
    h.state.results = { tickets: [ticket, { data: { id: "t1", status: "closed" }, error: null }] };

    const res = await ticketPATCH(patchReq({ status: "closed" }), ctx("t1"));
    expect(res.status).toBe(200);

    const update = h.fromCalls
      .find((c) => c.table === "tickets" && c.calls.some(([n]) => n === "update"))
      ?.calls.find(([n]) => n === "update");
    expect(update?.[1]).toMatchObject({ status: "closed" });
  });

  it("profesorul poate redeschide", async () => {
    h.state.user = teacher;
    h.state.results = { tickets: [ticket, { data: { id: "t1", status: "open" }, error: null }] };

    const res = await ticketPATCH(patchReq({ status: "open" }), ctx("t1"));
    expect(res.status).toBe(200);
  });

  it("404 pentru tichetul altcuiva", async () => {
    h.state.user = { ...student, id: "u-altcineva" };
    h.state.results = { tickets: [ticket] };

    const res = await ticketPATCH(patchReq({ status: "closed" }), ctx("t1"));
    expect(res.status).toBe(404);
    const updated = h.fromCalls.some((c) => c.calls.some(([n]) => n === "update"));
    expect(updated).toBe(false);
  });

  it("404 daca tichetul nu exista", async () => {
    h.state.user = teacher;
    h.state.results = { tickets: [{ data: null, error: null }] };
    expect((await ticketPATCH(patchReq({ status: "closed" }), ctx("t1"))).status).toBe(404);
  });
});
