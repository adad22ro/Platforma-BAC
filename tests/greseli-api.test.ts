import { describe, it, expect, beforeEach, vi } from "vitest";
import type { AppUser } from "@/lib/current-user";

// Acelasi mock de query builder ca in questions-api.test.ts: rezultatele se dau per
// tabel/vedere ca lista, consumata in ordinea apelurilor.
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
    for (const m of ["select", "order", "eq", "in", "range", "insert", "update", "delete", "upsert", "is"]) {
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

import { GET as greseliGET } from "@/app/api/greseli/route";
import { GET as dificultateGET } from "@/app/api/questions/dificultate/route";

const teacher: AppUser = { id: "u-t", clerk_id: "t", role: "teacher", subscription_status: "free", subscription_end_date: null };
const student: AppUser = { id: "u-s", clerk_id: "s", role: "student", subscription_status: "free", subscription_end_date: null };

const req = (url = "http://localhost/api") => new Request(url) as never;

function setResults(results: Record<string, { data: unknown; error: unknown }[]>) {
  h.state.results = results;
}

beforeEach(() => {
  vi.clearAllMocks();
  h.state.user = null;
  h.state.results = {};
  h.fromCalls.length = 0;
});

describe("GET /api/greseli", () => {
  const wrong = [
    { question_id: "q1", chapter_id: "c1", chosen_answer_id: "a2", created_at: "2026-08-10T10:00:00Z" },
  ];

  it("401 fara sesiune", async () => {
    const res = await greseliGET(req());
    expect(res.status).toBe(401);
    expect(h.supabaseAdmin.from).not.toHaveBeenCalled();
  });

  it("filtreaza pe elevul din sesiune, nu pe cel din query string", async () => {
    h.state.user = student;
    setResults({ latest_answer_per_question: [{ data: [], error: null }] });

    await greseliGET(req("http://localhost/api/greseli?user_id=altcineva"));

    const eqCalls = h.fromCalls
      .find((c) => c.table === "latest_answer_per_question")
      ?.calls.filter(([n]) => n === "eq");
    expect(eqCalls).toContainEqual(["eq", "user_id", "u-s"]);
    expect(eqCalls?.some(([, col, val]) => col === "user_id" && val === "altcineva")).toBe(false);
  });

  it("cere doar raspunsurile gresite, din ULTIMA incercare", async () => {
    h.state.user = student;
    setResults({ latest_answer_per_question: [{ data: [], error: null }] });

    await greseliGET(req());

    const call = h.fromCalls.find((c) => c.table === "latest_answer_per_question");
    // Vederea da ultimul raspuns per intrebare; aici filtram doar cele gresite.
    // Impreuna: „ce stau prost ACUM", nu „ce am gresit vreodata".
    expect(call?.calls).toContainEqual(["eq", "is_correct", false]);
  });

  // Lista greselilor creste cu tot istoricul elevului, iar textele intrebarilor se
  // cer cu un `in (...)` construit din ea — deci se pagineaza inainte, nu dupa.
  it("pagineaza greselile inainte sa ceara textele", async () => {
    h.state.user = student;
    setResults({ latest_answer_per_question: [{ data: [], error: null }] });

    const res = await greseliGET(req("http://localhost/api/greseli?limit=10&offset=5"));

    const call = h.fromCalls.find((c) => c.table === "latest_answer_per_question");
    expect(call?.calls).toContainEqual(["range", 5, 15]);
    expect(await res.json()).toMatchObject({ meta: { limit: 10, offset: 5 } });
  });

  it("intoarce textul intrebarii si titlul capitolului", async () => {
    h.state.user = student;
    setResults({
      latest_answer_per_question: [{ data: wrong, error: null }],
      questions: [{ data: [{ id: "q1", text: "Ce e perspectiva narativa?", explanation: "pentru ca" }], error: null }],
      chapters: [{ data: [{ id: "c1", title: "Realismul" }], error: null }],
    });

    const res = await greseliGET(req());
    const json = await res.json();
    expect(json.mistakes).toHaveLength(1);
    expect(json.mistakes[0]).toMatchObject({
      question_id: "q1",
      question_text: "Ce e perspectiva narativa?",
      chapter_title: "Realismul",
      chosen_answer_id: "a2",
    });
  });

  it("sare peste intrebarile sterse intre timp", async () => {
    h.state.user = student;
    setResults({
      latest_answer_per_question: [{ data: wrong, error: null }],
      // Intrebarea nu mai exista: evenimentul supravietuieste (SET NULL), dar
      // n-avem ce afisa — mai bine lipseste decat sa apara un rand gol.
      questions: [{ data: [], error: null }],
      chapters: [{ data: [{ id: "c1", title: "Realismul" }], error: null }],
    });

    const res = await greseliGET(req());
    expect((await res.json()).mistakes).toEqual([]);
  });

  it("lista goala nu mai interogheaza intrebarile degeaba", async () => {
    h.state.user = student;
    setResults({ latest_answer_per_question: [{ data: [], error: null }] });

    const res = await greseliGET(req());
    expect((await res.json()).mistakes).toEqual([]);
    expect(h.fromCalls.some((c) => c.table === "questions")).toBe(false);
  });
});

describe("GET /api/questions/dificultate", () => {
  const questions = [
    { id: "q1", chapter_id: "c1", text: "Grea", published: true },
    { id: "q2", chapter_id: "c1", text: "Usoara", published: true },
    { id: "q3", chapter_id: "c1", text: "Neincercata", published: true },
  ];

  it("403 pentru elev", async () => {
    h.state.user = student;
    const res = await dificultateGET(req());
    expect(res.status).toBe(403);
    // Un elev n-are ce face cu asta: „82% au gresit" i-ar spune indirect ca varianta
    // pe care a ales-o el, ca majoritatea, e probabil gresita.
    expect(h.supabaseAdmin.from).not.toHaveBeenCalled();
  });

  it("ordoneaza descrescator dupa rata de greseala", async () => {
    h.state.user = teacher;
    setResults({
      questions: [{ data: questions, error: null }],
      question_difficulty: [
        {
          data: [
            { question_id: "q1", students: 10, wrong: 8, wrong_pct: 80 },
            { question_id: "q2", students: 10, wrong: 1, wrong_pct: 10 },
          ],
          error: null,
        },
      ],
    });

    const res = await dificultateGET(req());
    const json = await res.json();
    expect(json.questions.map((q: { question_id: string }) => q.question_id)).toEqual(["q1", "q2", "q3"]);
    expect(json.questions[0]).toMatchObject({ students: 10, wrong: 8, wrong_pct: 80 });
  });

  it("intrebarea neincercata are wrong_pct null, nu 0", async () => {
    h.state.user = teacher;
    setResults({
      questions: [{ data: [questions[2]], error: null }],
      question_difficulty: [{ data: [], error: null }],
    });

    const res = await dificultateGET(req());
    const json = await res.json();
    // „Niciun elev n-a incercat-o" si „niciun elev n-a gresit-o" sunt lucruri opuse.
    // Cu 0% ar arata la fel, iar profesorul ar crede ca intrebarea e usoara.
    expect(json.questions[0]).toMatchObject({ students: 0, wrong_pct: null });
  });

  it("intrebarile neincercate raman in lista", async () => {
    h.state.user = teacher;
    setResults({
      questions: [{ data: questions, error: null }],
      question_difficulty: [{ data: [], error: null }],
    });

    const res = await dificultateGET(req());
    // Pentru profesor, „n-a incercat-o nimeni" e o informatie, nu o absenta.
    expect((await res.json()).questions).toHaveLength(3);
  });
});
