import { describe, it, expect, beforeEach, vi } from "vitest";
import type { AppUser } from "@/lib/current-user";

// Mock pentru query builder-ul Supabase, in stilul din content-api.test.ts, dar cu
// .in / .maybeSingle / .upsert (folosite de rutele de test grila). Rezultatele se dau
// per tabel ca lista, consumata in ordinea apelurilor (o ruta atinge acelasi tabel
// de mai multe ori: questions -> answers -> student_progress).
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

import { POST as questionsPOST, validateAnswers } from "@/app/api/questions/route";
import { PUT as answersPUT } from "@/app/api/questions/[id]/answers/route";
import { GET as chapterQuestionsGET } from "@/app/api/chapters/[id]/questions/route";
import { POST as submitPOST } from "@/app/api/chapters/[id]/submit/route";

const teacher: AppUser = { id: "u-t", clerk_id: "t", role: "teacher", subscription_status: "free", subscription_end_date: null };
const studentFree: AppUser = { id: "u-s", clerk_id: "s", role: "student", subscription_status: "free", subscription_end_date: null };
const studentActive: AppUser = { id: "u-s", clerk_id: "s", role: "student", subscription_status: "active", subscription_end_date: null };

const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

function jsonReq(body: unknown) {
  return new Request("http://localhost/api", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  }) as never;
}

function setResults(results: Record<string, { data: unknown; error: unknown }[]>) {
  h.state.results = results;
}

const freeChapter = { data: { id: "c1", is_free: true, published: true }, error: null };
const premiumChapter = { data: { id: "c1", is_free: false, published: true }, error: null };
const draftChapter = { data: { id: "c1", is_free: true, published: false }, error: null };

beforeEach(() => {
  vi.clearAllMocks();
  h.state.user = null;
  h.state.results = {};
  h.fromCalls.length = 0;
});

describe("validateAnswers", () => {
  const ok = [
    { text: "a", is_correct: true },
    { text: "b", is_correct: false },
  ];

  it("cere minim doua variante", () => {
    expect(validateAnswers([{ text: "a", is_correct: true }])).toHaveProperty("error");
    expect(validateAnswers([])).toHaveProperty("error");
    expect(validateAnswers("nu e array")).toHaveProperty("error");
  });

  it("cere exact un raspuns corect", () => {
    expect(validateAnswers([{ text: "a" }, { text: "b" }])).toHaveProperty("error");
    expect(
      validateAnswers([
        { text: "a", is_correct: true },
        { text: "b", is_correct: true },
      ])
    ).toHaveProperty("error");
    expect(validateAnswers(ok)).not.toHaveProperty("error");
  });

  it("cere text pe fiecare varianta", () => {
    expect(validateAnswers([{ is_correct: true }, { text: "b" }])).toHaveProperty("error");
  });
});

describe("POST /api/questions", () => {
  const body = {
    chapter_id: "c1",
    text: "Intrebare?",
    answers: [
      { text: "corect", is_correct: true },
      { text: "gresit", is_correct: false },
    ],
  };

  it("403 pentru elev", async () => {
    h.state.user = studentFree;
    const res = await questionsPOST(jsonReq(body));
    expect(res.status).toBe(403);
    expect(h.supabaseAdmin.from).not.toHaveBeenCalled();
  });

  it("400 fara chapter_id sau text", async () => {
    h.state.user = teacher;
    expect((await questionsPOST(jsonReq({ ...body, text: undefined }))).status).toBe(400);
    expect((await questionsPOST(jsonReq({ ...body, chapter_id: undefined }))).status).toBe(400);
  });

  it("400 daca variantele nu au exact un raspuns corect", async () => {
    h.state.user = teacher;
    const res = await questionsPOST(
      jsonReq({ ...body, answers: [{ text: "a" }, { text: "b" }] })
    );
    expect(res.status).toBe(400);
    // Validarea se face inainte de orice scriere in DB.
    expect(h.supabaseAdmin.from).not.toHaveBeenCalled();
  });

  it("201 creeaza intrebarea si variantele", async () => {
    h.state.user = teacher;
    setResults({
      questions: [{ data: { id: "q1", chapter_id: "c1", text: "Intrebare?" }, error: null }],
      answers: [{ data: [{ id: "a1" }, { id: "a2" }], error: null }],
    });

    const res = await questionsPOST(jsonReq(body));
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.question.id).toBe("q1");
    expect(json.question.answers).toHaveLength(2);
  });

  it("sterge intrebarea daca inserarea variantelor esueaza (fara intrebari orfane)", async () => {
    h.state.user = teacher;
    setResults({
      questions: [{ data: { id: "q1" }, error: null }],
      answers: [{ data: null, error: { code: "23505", message: "boom" } }],
    });

    const res = await questionsPOST(jsonReq(body));
    expect(res.status).toBe(500);
    const deleted = h.fromCalls.some(
      (c) => c.table === "questions" && c.calls.some(([name]) => name === "delete")
    );
    expect(deleted).toBe(true);
  });
});

describe("GET /api/chapters/[id]/questions", () => {
  const questions = [{ id: "q1", chapter_id: "c1", text: "Intrebare?", order_index: 0, published: true }];

  it("nu trimite niciodata is_correct catre client", async () => {
    h.state.user = studentFree;
    setResults({
      chapters: [freeChapter],
      questions: [{ data: questions, error: null }],
      answers: [{ data: [{ id: "a1", question_id: "q1", text: "corect", order_index: 0 }], error: null }],
    });

    const res = await chapterQuestionsGET({} as never, ctx("c1"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(JSON.stringify(json)).not.toContain("is_correct");

    // Selectul pe answers nu cere coloana is_correct.
    const answersCall = h.fromCalls.find((c) => c.table === "answers");
    const select = answersCall?.calls.find(([name]) => name === "select");
    expect(String(select?.[1])).not.toContain("is_correct");
  });

  it("elevul free primeste 402 pe capitol premium", async () => {
    h.state.user = studentFree;
    setResults({ chapters: [premiumChapter] });
    const res = await chapterQuestionsGET({} as never, ctx("c1"));
    expect(res.status).toBe(402);
    expect(await res.json()).toEqual({ error: "premium_required" });
  });

  it("elevul cu abonament activ trece de capitolul premium", async () => {
    h.state.user = studentActive;
    setResults({
      chapters: [premiumChapter],
      questions: [{ data: questions, error: null }],
      answers: [{ data: [], error: null }],
    });
    expect((await chapterQuestionsGET({} as never, ctx("c1"))).status).toBe(200);
  });

  it("capitolul draft e 404 pentru elev, vizibil pentru profesor", async () => {
    h.state.user = studentFree;
    setResults({ chapters: [draftChapter] });
    expect((await chapterQuestionsGET({} as never, ctx("c1"))).status).toBe(404);

    h.fromCalls.length = 0;
    h.state.user = teacher;
    setResults({
      chapters: [draftChapter],
      questions: [{ data: questions, error: null }],
      answers: [{ data: [], error: null }],
    });
    expect((await chapterQuestionsGET({} as never, ctx("c1"))).status).toBe(200);
  });

  it("elevul vede doar intrebarile publicate", async () => {
    h.state.user = studentFree;
    setResults({
      chapters: [freeChapter],
      questions: [{ data: questions, error: null }],
      answers: [{ data: [], error: null }],
    });
    await chapterQuestionsGET({} as never, ctx("c1"));

    const qCall = h.fromCalls.find((c) => c.table === "questions");
    expect(qCall?.calls).toContainEqual(["eq", "published", true]);
  });
});

describe("POST /api/chapters/[id]/submit", () => {
  const questions = [
    { id: "q1", explanation: "pentru ca da", order_index: 0 },
    { id: "q2", explanation: null, order_index: 1 },
  ];
  const correct = [
    { id: "a1", question_id: "q1" },
    { id: "a3", question_id: "q2" },
  ];

  function setTestData(chapter = freeChapter) {
    setResults({
      chapters: [chapter],
      questions: [{ data: questions, error: null }],
      answers: [{ data: correct, error: null }],
      student_progress: [
        { data: { attempts: 2 }, error: null },
        { data: null, error: null },
      ],
    });
  }

  it("calculeaza scorul pe server si salveaza progresul", async () => {
    h.state.user = studentFree;
    setTestData();

    const res = await submitPOST(
      jsonReq({
        answers: [
          { question_id: "q1", answer_id: "a1" }, // corect
          { question_id: "q2", answer_id: "a4" }, // gresit
        ],
      }),
      ctx("c1")
    );

    const json = await res.json();
    expect(json.score).toBe(1);
    expect(json.total).toBe(2);
    expect(json.saved).toBe(true);
    expect(json.results[0]).toMatchObject({ question_id: "q1", correct: true, explanation: "pentru ca da" });
    expect(json.results[1]).toMatchObject({ question_id: "q2", correct: false });

    // attempts se incrementeaza peste incercarea existenta (2 -> 3).
    const upsert = h.fromCalls
      .find((c) => c.table === "student_progress" && c.calls.some(([n]) => n === "upsert"))
      ?.calls.find(([n]) => n === "upsert");
    expect(upsert?.[1]).toMatchObject({ user_id: "u-s", chapter_id: "c1", score: 1, total: 2, attempts: 3 });
  });

  it("ignora un scor trimis de client", async () => {
    h.state.user = studentFree;
    setTestData();

    const res = await submitPOST(jsonReq({ score: 99, total: 99, answers: [] }), ctx("c1"));
    const json = await res.json();
    expect(json.score).toBe(0);
    expect(json.total).toBe(2);
  });

  it("intrebare fara raspuns corect in DB nu se puncteaza", async () => {
    h.state.user = studentFree;
    setResults({
      chapters: [freeChapter],
      questions: [{ data: [questions[0]], error: null }],
      answers: [{ data: [], error: null }],
      student_progress: [
        { data: null, error: null },
        { data: null, error: null },
      ],
    });

    const res = await submitPOST(jsonReq({ answers: [{ question_id: "q1", answer_id: "a1" }] }), ctx("c1"));
    const json = await res.json();
    expect(json.score).toBe(0);
    expect(json.results[0].correct).toBe(false);
  });

  it("402 pe capitol premium fara abonament, fara sa corecteze nimic", async () => {
    h.state.user = studentFree;
    setResults({ chapters: [premiumChapter] });
    const res = await submitPOST(jsonReq({ answers: [] }), ctx("c1"));
    expect(res.status).toBe(402);
    expect(h.fromCalls.some((c) => c.table === "student_progress")).toBe(false);
  });

  it("401 fara sesiune", async () => {
    h.state.user = null;
    const res = await submitPOST(jsonReq({ answers: [] }), ctx("c1"));
    expect(res.status).toBe(401);
  });

  it("400 daca lipseste array-ul de raspunsuri", async () => {
    h.state.user = studentFree;
    setResults({ chapters: [freeChapter] });
    const res = await submitPOST(jsonReq({}), ctx("c1"));
    expect(res.status).toBe(400);
  });

  it("profesorul primeste scorul dar nu i se inregistreaza progres", async () => {
    h.state.user = teacher;
    setTestData(draftChapter);

    const res = await submitPOST(
      jsonReq({ answers: [{ question_id: "q1", answer_id: "a1" }] }),
      ctx("c1")
    );
    const json = await res.json();
    expect(json.score).toBe(1);
    expect(json.saved).toBe(false);
    expect(h.fromCalls.some((c) => c.table === "student_progress")).toBe(false);
    // Nici evenimente: altfel statisticile de dificultate ar contine raspunsurile
    // celui care a scris intrebarile.
    expect(h.fromCalls.some((c) => c.table === "answer_events")).toBe(false);
  });

  // Helper: argumentul cu care s-a apelat insert pe answer_events.
  function insertedEvents() {
    const call = h.fromCalls
      .find((c) => c.table === "answer_events")
      ?.calls.find(([n]) => n === "insert");
    return call?.[1] as
      | {
          user_id: string;
          chapter_id: string;
          question_id: string;
          chosen_answer_id: string | null;
          is_correct: boolean;
          attempt_id: string;
        }[]
      | undefined;
  }

  it("scrie un eveniment per intrebare, cu ce a bifat elevul", async () => {
    h.state.user = studentFree;
    setTestData();

    await submitPOST(
      jsonReq({
        answers: [
          { question_id: "q1", answer_id: "a1" }, // corect
          { question_id: "q2", answer_id: "a4" }, // gresit
        ],
      }),
      ctx("c1")
    );

    const events = insertedEvents();
    expect(events).toHaveLength(2);
    expect(events?.[0]).toMatchObject({
      user_id: "u-s",
      chapter_id: "c1",
      question_id: "q1",
      chosen_answer_id: "a1",
      is_correct: true,
    });
    expect(events?.[1]).toMatchObject({
      question_id: "q2",
      chosen_answer_id: "a4",
      is_correct: false,
    });
  });

  it("intrebarea lasata fara raspuns se scrie cu chosen_answer_id null", async () => {
    h.state.user = studentFree;
    setTestData();

    await submitPOST(jsonReq({ answers: [{ question_id: "q1", answer_id: "a1" }] }), ctx("c1"));

    const events = insertedEvents();
    expect(events?.[1]).toMatchObject({ question_id: "q2", chosen_answer_id: null, is_correct: false });
  });

  it("toate raspunsurile unei trimiteri primesc acelasi attempt_id", async () => {
    h.state.user = studentFree;
    setTestData();

    await submitPOST(
      jsonReq({
        answers: [
          { question_id: "q1", answer_id: "a1" },
          { question_id: "q2", answer_id: "a3" },
        ],
      }),
      ctx("c1")
    );

    const events = insertedEvents();
    const ids = new Set(events?.map((e) => e.attempt_id));
    expect(ids.size).toBe(1);
    expect([...ids][0]).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("evenimentele se scriu inainte de progres", async () => {
    h.state.user = studentFree;
    setTestData();

    await submitPOST(jsonReq({ answers: [{ question_id: "q1", answer_id: "a1" }] }), ctx("c1"));

    // Inainte de ORICE atingere a agregatului, nu doar de upsert: daca pica ceva
    // la mijloc, preferam evenimentele fara agregat (agregatul se reconstruieste
    // din ele) decat invers.
    const tables = h.fromCalls.map((c) => c.table);
    expect(tables.indexOf("answer_events")).toBeLessThan(tables.indexOf("student_progress"));
  });

  it("daca scrierea evenimentelor esueaza, elevul isi vede totusi scorul", async () => {
    h.state.user = studentFree;
    setResults({
      chapters: [freeChapter],
      questions: [{ data: questions, error: null }],
      answers: [{ data: correct, error: null }],
      answer_events: [{ data: null, error: { code: "42501", message: "permission denied" } }],
      student_progress: [
        { data: { attempts: 1 }, error: null },
        { data: null, error: null },
      ],
    });

    const res = await submitPOST(
      jsonReq({ answers: [{ question_id: "q1", answer_id: "a1" }] }),
      ctx("c1")
    );

    const json = await res.json();
    expect(json.score).toBe(1);
    // Progresul s-a salvat; doar istoricul acestei incercari s-a pierdut.
    expect(json.saved).toBe(true);
    expect(h.logError).toHaveBeenCalledWith(
      "progress",
      "answer_events insert error",
      expect.objectContaining({ code: "42501" })
    );
  });
});

describe("PUT /api/questions/[id]/answers", () => {
  const good = [
    { text: "corect", is_correct: true },
    { text: "gresit", is_correct: false },
  ];
  const previous = [
    { id: "a-vechi", question_id: "q1", text: "vechi", is_correct: true, order_index: 0, created_at: "2026-01-01" },
  ];

  function putReq(body: unknown) {
    return new Request("http://localhost/api", {
      method: "PUT",
      body: JSON.stringify(body),
      headers: { "content-type": "application/json" },
    }) as never;
  }

  it("403 pentru elev", async () => {
    h.state.user = studentFree;
    const res = await answersPUT(putReq({ answers: good }), ctx("q1"));
    expect(res.status).toBe(403);
    expect(h.supabaseAdmin.from).not.toHaveBeenCalled();
  });

  it("400 daca setul nou nu are exact un raspuns corect", async () => {
    h.state.user = teacher;
    const res = await answersPUT(putReq({ answers: [{ text: "a" }, { text: "b" }] }), ctx("q1"));
    expect(res.status).toBe(400);
    // Validarea se face inainte sa se atinga DB-ul — nu stergem nimic degeaba.
    expect(h.supabaseAdmin.from).not.toHaveBeenCalled();
  });

  it("404 daca intrebarea nu exista", async () => {
    h.state.user = teacher;
    setResults({ questions: [{ data: null, error: null }] });
    const res = await answersPUT(putReq({ answers: good }), ctx("q1"));
    expect(res.status).toBe(404);
    expect(h.fromCalls.some((c) => c.table === "answers")).toBe(false);
  });

  it("inlocuieste setul: sterge vechiul, insereaza noul", async () => {
    h.state.user = teacher;
    setResults({
      questions: [{ data: { id: "q1" }, error: null }],
      answers: [
        { data: previous, error: null },
        { data: null, error: null },
        { data: [{ id: "a1" }, { id: "a2" }], error: null },
      ],
    });

    const res = await answersPUT(putReq({ answers: good }), ctx("q1"));
    expect(res.status).toBe(200);
    expect((await res.json()).answers).toHaveLength(2);

    const answerCalls = h.fromCalls.filter((c) => c.table === "answers");
    expect(answerCalls.some((c) => c.calls.some(([n]) => n === "delete"))).toBe(true);
    expect(answerCalls.some((c) => c.calls.some(([n]) => n === "insert"))).toBe(true);
  });

  it("restaureaza setul vechi daca inserarea celui nou esueaza", async () => {
    h.state.user = teacher;
    setResults({
      questions: [{ data: { id: "q1" }, error: null }],
      answers: [
        { data: previous, error: null },
        { data: null, error: null },
        { data: null, error: { code: "23505", message: "boom" } },
        { data: previous, error: null },
      ],
    });

    const res = await answersPUT(putReq({ answers: good }), ctx("q1"));
    expect(res.status).toBe(500);

    // Ultimul insert pe answers trebuie sa fie setul vechi pus la loc.
    const inserts = h.fromCalls
      .filter((c) => c.table === "answers")
      .flatMap((c) => c.calls.filter(([n]) => n === "insert"));
    expect(inserts.at(-1)?.[1]).toEqual(previous);
  });
});
