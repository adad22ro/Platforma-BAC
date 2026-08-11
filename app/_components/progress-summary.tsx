"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { listCls } from "./ui";

// ATENTIE: ruta /api/progress nu exista inca (sarcina Andrei, Sapt. 7-8).
// Contractul e documentat in docs/api.md.
type ChapterProgress = {
  chapter_id: string;
  chapter_title: string;
  questions_total: number;
  best_score: number | null; // null = niciun test dat inca
  attempts: number;
  last_attempt_at: string | null;
};

type State =
  | { status: "loading" }
  | { status: "error" }
  | { status: "loaded"; progress: ChapterProgress[] };

export function ProgressSummary() {
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/progress");
        if (!res.ok) throw new Error(String(res.status));
        const { progress } = (await res.json()) as {
          progress: ChapterProgress[];
        };
        if (active) setState({ status: "loaded", progress });
      } catch {
        if (active) setState({ status: "error" });
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  if (state.status === "loading") {
    return (
      <section className="mt-10">
        <h2 className="text-xl font-semibold">Progresul tău</h2>
        <p className="mt-4 text-sm text-zinc-500">Se încarcă progresul…</p>
      </section>
    );
  }

  if (state.status === "error") {
    // Progresul e informativ: daca nu se incarca, nu blocam restul paginii.
    return (
      <section className="mt-10">
        <h2 className="text-xl font-semibold">Progresul tău</h2>
        <p className="mt-4 text-sm text-zinc-500">
          Progresul nu s-a putut încărca acum.
        </p>
      </section>
    );
  }

  // Aratam doar capitolele cu test disponibil.
  const rows = state.progress.filter((p) => p.questions_total > 0);

  if (rows.length === 0) {
    return null;
  }

  const attempted = rows.filter((p) => p.best_score !== null);
  const overall =
    attempted.length > 0
      ? Math.round(
          (attempted.reduce(
            (sum, p) => sum + (p.best_score ?? 0) / p.questions_total,
            0,
          ) /
            attempted.length) *
            100,
        )
      : null;

  return (
    <section className="mt-10">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-xl font-semibold">Progresul tău</h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {attempted.length}/{rows.length} capitole testate
          {overall !== null && ` · medie ${overall}%`}
        </p>
      </div>

      <ul className={`mt-4 ${listCls}`}>
        {rows.map((p) => {
          const percent =
            p.best_score === null
              ? null
              : Math.round((p.best_score / p.questions_total) * 100);
          return (
            <li
              key={p.chapter_id}
              className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-4"
            >
              <span className="min-w-40 flex-1 font-medium">
                {p.chapter_title}
              </span>

              <div className="flex min-w-40 flex-1 items-center gap-3">
                <div
                  className="h-2 flex-1 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800"
                  role="progressbar"
                  aria-valuenow={percent ?? 0}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`Scor ${p.chapter_title}`}
                >
                  <div
                    className={`h-full rounded-full ${
                      percent === null
                        ? ""
                        : percent >= 80
                          ? "bg-green-500"
                          : percent >= 50
                            ? "bg-amber-500"
                            : "bg-red-500"
                    }`}
                    style={{ width: `${percent ?? 0}%` }}
                  />
                </div>
                <span className="w-24 shrink-0 text-right text-sm text-zinc-600 tabular-nums dark:text-zinc-400">
                  {percent === null
                    ? "netestat"
                    : `${p.best_score}/${p.questions_total} · ${percent}%`}
                </span>
              </div>

              <Link
                href={`/teste/${p.chapter_id}`}
                className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
              >
                {p.attempts > 0 ? "Reia testul" : "Dă testul"}
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
