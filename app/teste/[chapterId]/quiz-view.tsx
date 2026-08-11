"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { btn } from "../../_components/ui";
import { HelpButton } from "../../_components/help-button";

// Formele vin din GET /api/chapters/[id]/questions si POST .../submit
// (vezi docs/api.md). Variantele sunt randuri in tabelul `answers`, cu id
// propriu — lucram cu answer_id peste tot, nu cu indici de pozitie.

type Answer = {
  id: string;
  text: string;
  order_index: number;
};

type Question = {
  id: string;
  chapter_id: string;
  text: string;
  answers: Answer[];
  order_index: number;
};

// Corectarea vine de la server: `is_correct` nu e nici macar selectat in ruta
// de citire, deci clientul afla raspunsul corect abia dupa trimitere.
type Result = {
  question_id: string;
  chosen_answer_id: string | null;
  correct_answer_id: string | null;
  correct: boolean;
  explanation: string | null;
};

type Graded = {
  score: number;
  total: number;
  // false = scorul e valid, dar progresul nu s-a inregistrat (profesor sau
  // eroare de scriere). Rezultatul se arata oricum.
  saved: boolean;
  results: Result[];
};

// 200 -> loaded | 402 -> premium (paywall) | 404 -> notfound | rest -> error
type State =
  | { status: "loading" }
  | { status: "loaded"; chapterTitle: string | null; questions: Question[] }
  | { status: "premium" }
  | { status: "notfound" }
  | { status: "error" };

type SubmitState =
  | { status: "idle" }
  | { status: "sending" }
  | { status: "graded"; graded: Graded }
  | { status: "error" };

export function QuizView({ chapterId }: { chapterId: string }) {
  const [state, setState] = useState<State>({ status: "loading" });
  // question_id -> answer_id bifat
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submit, setSubmit] = useState<SubmitState>({ status: "idle" });

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch(`/api/chapters/${chapterId}/questions`);
        if (res.status === 402) {
          if (active) setState({ status: "premium" });
          return;
        }
        if (res.status === 404) {
          if (active) setState({ status: "notfound" });
          return;
        }
        if (!res.ok) throw new Error(String(res.status));
        const { questions } = (await res.json()) as { questions: Question[] };

        // Ruta de intrebari nu intoarce si capitolul; titlul (pentru antet si
        // pentru contextul tichetului) il luam din lista de capitole.
        let chapterTitle: string | null = null;
        try {
          const chRes = await fetch("/api/chapters");
          if (chRes.ok) {
            const { chapters } = (await chRes.json()) as {
              chapters: { id: string; title: string }[];
            };
            chapterTitle = chapters.find((c) => c.id === chapterId)?.title ?? null;
          }
        } catch {
          // Titlul e decorativ — testul se poate da si fara el.
        }

        if (active) setState({ status: "loaded", chapterTitle, questions });
      } catch {
        if (active) setState({ status: "error" });
      }
    })();
    return () => {
      active = false;
    };
  }, [chapterId]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (state.status !== "loaded") return;
    setSubmit({ status: "sending" });
    try {
      const res = await fetch(`/api/chapters/${chapterId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // Trimitem doar ce a bifat elevul; intrebarile fara raspuns lipsesc
          // din lista si sunt punctate gresit pe server.
          answers: state.questions
            .filter((q) => answers[q.id])
            .map((q) => ({ question_id: q.id, answer_id: answers[q.id] })),
        }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const graded = (await res.json()) as Graded;
      setSubmit({ status: "graded", graded });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setSubmit({ status: "error" });
    }
  }

  function retry() {
    setAnswers({});
    setSubmit({ status: "idle" });
  }

  if (state.status === "loading") {
    return <p className="text-sm text-zinc-500">Se încarcă testul…</p>;
  }

  if (state.status === "notfound") {
    return (
      <Notice title="Testul nu a fost găsit">
        Capitolul nu există sau nu are încă întrebări publicate.
      </Notice>
    );
  }

  if (state.status === "error") {
    return (
      <Notice title="Ceva n-a mers">
        Nu am putut încărca testul. Reîmprospătează pagina și încearcă din nou.
      </Notice>
    );
  }

  if (state.status === "premium") {
    return (
      <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-8 text-center dark:border-indigo-900 dark:bg-indigo-950/40">
        <div className="text-3xl" aria-hidden>
          🔒
        </div>
        <h1 className="mt-3 text-xl font-semibold text-indigo-900 dark:text-indigo-200">
          Test Premium
        </h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-indigo-800/80 dark:text-indigo-300/80">
          Testul acestui capitol e disponibil cu abonamentul Premium, împreună
          cu toate lecțiile.
        </p>
        <Link
          href="/upgrade"
          className={btn("primary", "md", "mt-5")}
        >
          Treci la Premium
        </Link>
        <BackToDashboard />
      </div>
    );
  }

  const { questions, chapterTitle } = state;

  if (questions.length === 0) {
    return (
      <Notice title="Capitolul nu are încă test">
        Întrebările sunt în lucru. Revino în curând.
      </Notice>
    );
  }

  const graded = submit.status === "graded" ? submit.graded : null;
  // Rezultatul per intrebare, ca sa nu cautam in lista la fiecare randare.
  const resultById = new Map(graded?.results.map((r) => [r.question_id, r]));
  const answeredCount = questions.filter((q) => q.id in answers).length;

  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight">
        {chapterTitle ? `Test — ${chapterTitle}` : "Test grilă"}
      </h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        {questions.length}{" "}
        {questions.length === 1 ? "întrebare" : "întrebări"} · un singur răspuns
        corect per întrebare.
      </p>

      {graded && <ScoreCard graded={graded} onRetry={retry} />}

      <form onSubmit={onSubmit} className="mt-8 space-y-6">
        {questions.map((q, qi) => {
          const result = resultById.get(q.id);
          return (
            <fieldset
              key={q.id}
              className={`rounded-2xl border p-5 ${
                result
                  ? result.correct
                    ? "border-green-300 bg-green-50/60 dark:border-green-900 dark:bg-green-950/30"
                    : "border-red-300 bg-red-50/60 dark:border-red-900 dark:bg-red-950/30"
                  : "border-zinc-200 dark:border-zinc-800"
              }`}
            >
              <legend className="px-1 text-sm font-medium text-zinc-500">
                Întrebarea {qi + 1}
              </legend>
              <p className="font-medium">{q.text}</p>

              <div className="mt-4 space-y-2">
                {q.answers.map((option) => {
                  const checked = answers[q.id] === option.id;
                  const isCorrect = result?.correct_answer_id === option.id;
                  const isWrongPick =
                    result?.chosen_answer_id === option.id && !isCorrect;
                  return (
                    <label
                      key={option.id}
                      className={`flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2 text-sm transition-colors ${
                        isCorrect
                          ? "border-green-400 bg-green-100/70 dark:border-green-800 dark:bg-green-900/40"
                          : isWrongPick
                            ? "border-red-400 bg-red-100/70 dark:border-red-800 dark:bg-red-900/40"
                            : checked
                              ? "border-indigo-400 bg-indigo-50 dark:border-indigo-700 dark:bg-indigo-950/40"
                              : "border-transparent hover:bg-zinc-50 dark:hover:bg-zinc-900"
                      }`}
                    >
                      <input
                        type="radio"
                        name={`q-${q.id}`}
                        className="mt-0.5 h-4 w-4"
                        checked={checked}
                        disabled={Boolean(graded)}
                        onChange={() =>
                          setAnswers((a) => ({ ...a, [q.id]: option.id }))
                        }
                      />
                      <span className="flex-1">{option.text}</span>
                      {isCorrect && (
                        <span
                          className="text-green-700 dark:text-green-400"
                          aria-label="Răspuns corect"
                        >
                          ✓
                        </span>
                      )}
                      {isWrongPick && (
                        <span
                          className="text-red-700 dark:text-red-400"
                          aria-label="Răspunsul tău, greșit"
                        >
                          ✕
                        </span>
                      )}
                    </label>
                  );
                })}
              </div>

              {result?.explanation && (
                <p className="mt-3 rounded-lg bg-white/70 px-3 py-2 text-sm text-zinc-700 dark:bg-zinc-900/60 dark:text-zinc-300">
                  {result.explanation}
                </p>
              )}

              {/* Doar la intrebarile gresite: acolo e blocajul real, si tichetul
                  pleaca cu intrebarea exacta atasata. */}
              {result && !result.correct && (
                <HelpButton
                  label="Nu am înțeles întrebarea asta"
                  context={{
                    source: "quiz",
                    chapter_id: chapterId,
                    chapter_title: chapterTitle ?? undefined,
                    question_id: q.id,
                    question_text: q.text,
                  }}
                />
              )}
            </fieldset>
          );
        })}

        {!graded && (
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={
                submit.status === "sending" || answeredCount < questions.length
              }
              className={btn()}
            >
              {submit.status === "sending" ? "Se corectează…" : "Trimite testul"}
            </button>
            <span className="text-sm text-zinc-500">
              {answeredCount}/{questions.length} răspunse
            </span>
            {submit.status === "error" && (
              <span className="text-sm text-red-600 dark:text-red-400">
                Nu am putut trimite testul. Încearcă din nou.
              </span>
            )}
          </div>
        )}
      </form>

      {/* Intrebare despre capitol in ansamblu — disponibila si inainte de
          corectare, cand elevul se blocheaza pe materie, nu pe o intrebare. */}
      <HelpButton
        label="Nu am înțeles capitolul"
        context={{
          source: "quiz",
          chapter_id: chapterId,
          chapter_title: chapterTitle ?? undefined,
        }}
      />

      <BackToDashboard />
    </div>
  );
}

function ScoreCard({
  graded,
  onRetry,
}: {
  graded: Graded;
  onRetry: () => void;
}) {
  const percent = graded.total > 0 ? Math.round((graded.score / graded.total) * 100) : 0;
  const tone =
    percent >= 80
      ? "border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/40"
      : percent >= 50
        ? "border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/40"
        : "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/40";

  return (
    <div className={`mt-8 rounded-2xl border p-6 ${tone}`}>
      <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
        Rezultatul tău
      </p>
      <p className="mt-1 text-3xl font-bold">
        {graded.score}/{graded.total}{" "}
        <span className="text-xl font-semibold text-zinc-500">({percent}%)</span>
      </p>
      <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">
        {percent >= 80
          ? "Foarte bine — capitolul e bine fixat."
          : percent >= 50
            ? "E un început bun. Recitește lecțiile de la întrebările greșite."
            : "Mai reia capitolul și încearcă testul din nou."}
      </p>

      {/* saved=false: profesor (nu i se tine progres) sau eroare de scriere.
          Scorul e valid oricum, deci il aratam si spunem doar ce lipseste. */}
      {!graded.saved && (
        <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-400">
          Rezultatul nu a fost înregistrat în progresul tău.
        </p>
      )}
      <button
        type="button"
        onClick={onRetry}
        className={btn("outline", "md", "mt-4 hover:bg-white")}
      >
        Reia testul
      </button>
    </div>
  );
}

function Notice({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 p-8 text-center dark:border-zinc-800">
      <h1 className="text-xl font-semibold">{title}</h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{children}</p>
      <BackToDashboard />
    </div>
  );
}

function BackToDashboard() {
  return (
    <div className="mt-8">
      <Link
        href="/dashboard"
        className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
      >
        ← Înapoi la capitole
      </Link>
    </div>
  );
}
