"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { listCls } from "./ui";

// GET /api/progress intoarce o linie per (elev, capitol) — upsert la fiecare
// reincercare, deci `score` e ULTIMUL rezultat, nu cel mai bun. Titlurile nu vin
// de acolo: le luam din /api/chapters si le imperechem pe chapter_id.
type Progress = {
  chapter_id: string;
  score: number;
  total: number;
  attempts: number;
  completed_at: string | null;
};

type Chapter = { id: string; title: string; order_index: number };

type Row = { chapter: Chapter; progress: Progress | null };

type State =
  | { status: "loading" }
  | { status: "error" }
  | { status: "loaded"; rows: Row[] };

export function ProgressSummary() {
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [pRes, cRes] = await Promise.all([
          fetch("/api/progress"),
          fetch("/api/chapters"),
        ]);
        if (!pRes.ok || !cRes.ok) throw new Error("fetch");
        const { progress } = (await pRes.json()) as { progress: Progress[] };
        const { chapters } = (await cRes.json()) as { chapters: Chapter[] };

        const byChapter = new Map(progress.map((p) => [p.chapter_id, p]));
        const rows = chapters
          .slice()
          .sort((a, b) => a.order_index - b.order_index)
          .map((chapter) => ({
            chapter,
            progress: byChapter.get(chapter.id) ?? null,
          }));

        if (active) setState({ status: "loaded", rows });
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

  const { rows } = state;
  if (rows.length === 0) return null;

  const testate = rows.filter((r) => r.progress !== null);
  const medie =
    testate.length > 0
      ? Math.round(
          (testate.reduce(
            (sum, r) => sum + procent(r.progress!.score, r.progress!.total),
            0,
          ) /
            testate.length) *
            1,
        )
      : null;

  return (
    <section className="mt-10">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-xl font-semibold">Progresul tău</h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {testate.length}/{rows.length} capitole testate
          {medie !== null && ` · medie ${medie}%`}
        </p>
      </div>

      <ul className={`mt-4 ${listCls}`}>
        {rows.map(({ chapter, progress }) => {
          const p = progress ? procent(progress.score, progress.total) : null;
          return (
            <li
              key={chapter.id}
              className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-4"
            >
              <span className="min-w-40 flex-1 font-medium">
                {chapter.title}
              </span>

              <div className="flex min-w-40 flex-1 items-center gap-3">
                <div
                  className="h-2 flex-1 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800"
                  role="progressbar"
                  aria-valuenow={p ?? 0}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`Scor ${chapter.title}`}
                >
                  <div
                    className={`h-full rounded-full ${
                      p === null
                        ? ""
                        : p >= 80
                          ? "bg-green-500"
                          : p >= 50
                            ? "bg-amber-500"
                            : "bg-red-500"
                    }`}
                    style={{ width: `${p ?? 0}%` }}
                  />
                </div>
                <span className="w-24 shrink-0 text-right text-sm text-zinc-600 tabular-nums dark:text-zinc-400">
                  {progress
                    ? `${progress.score}/${progress.total} · ${p}%`
                    : "netestat"}
                </span>
              </div>

              <Link
                href={`/teste/${chapter.id}`}
                className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
              >
                {progress ? "Reia testul" : "Dă testul"}
              </Link>
            </li>
          );
        })}
      </ul>

      {testate.some((r) => (r.progress?.attempts ?? 0) > 1) && (
        <p className="mt-3 text-xs text-zinc-500">
          Se afișează ultimul rezultat de la fiecare capitol.
        </p>
      )}
    </section>
  );
}

function procent(score: number, total: number) {
  return total > 0 ? Math.round((score / total) * 100) : 0;
}
