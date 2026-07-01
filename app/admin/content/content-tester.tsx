"use client";

import { useEffect, useState } from "react";

type Chapter = {
  id: string;
  title: string;
  description: string | null;
  order_index: number;
  is_free: boolean;
  published: boolean;
};

type Lesson = {
  id: string;
  chapter_id: string;
  title: string;
  content: string | null;
  video_url: string | null;
  order_index: number;
  published: boolean;
};

// Helper: apeleaza API-ul si intoarce { status, body } pentru afisare in panoul de raspuns.
async function call(method: string, url: string, body?: unknown) {
  const res = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  let parsed: unknown = null;
  const text = await res.text();
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = text;
  }
  return { status: res.status, body: parsed };
}

const btn =
  "rounded border border-zinc-300 px-2 py-0.5 text-xs text-zinc-700 hover:bg-zinc-100 disabled:opacity-40";
const input =
  "rounded border border-zinc-300 px-2 py-1 text-sm";

export function ContentTester() {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [lessonsBy, setLessonsBy] = useState<Record<string, Lesson[] | { error: unknown }>>({});
  const [last, setLast] = useState<{ status: number; body: unknown } | null>(null);
  const [newChapter, setNewChapter] = useState("");
  const [newLesson, setNewLesson] = useState<Record<string, string>>({});

  async function loadChapters() {
    const r = await call("GET", "/api/chapters");
    setLast(r);
    if (r.status === 200 && r.body && typeof r.body === "object") {
      setChapters((r.body as { chapters: Chapter[] }).chapters ?? []);
    }
  }

  useEffect(() => {
    // loadChapters e async: setState se intampla dupa await, nu sincron in efect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadChapters();
  }, []);

  async function createChapter() {
    if (!newChapter.trim()) return;
    const r = await call("POST", "/api/chapters", {
      title: newChapter.trim(),
      order_index: chapters.length,
    });
    setLast(r);
    setNewChapter("");
    await loadChapters();
  }

  async function patchChapter(id: string, fields: Partial<Chapter>) {
    setLast(await call("PATCH", `/api/chapters/${id}`, fields));
    await loadChapters();
  }

  async function deleteChapter(id: string) {
    setLast(await call("DELETE", `/api/chapters/${id}`));
    await loadChapters();
  }

  async function loadLessons(chapterId: string) {
    const r = await call("GET", `/api/chapters/${chapterId}/lessons`);
    setLast(r);
    const b = r.body as { lessons?: Lesson[] };
    setLessonsBy((s) => ({
      ...s,
      [chapterId]: r.status === 200 ? b.lessons ?? [] : { error: r.body },
    }));
  }

  async function createLesson(chapterId: string) {
    const title = (newLesson[chapterId] ?? "").trim();
    if (!title) return;
    const r = await call("POST", "/api/lessons", { chapter_id: chapterId, title });
    setLast(r);
    setNewLesson((s) => ({ ...s, [chapterId]: "" }));
    await loadLessons(chapterId);
  }

  async function deleteLesson(chapterId: string, id: string) {
    setLast(await call("DELETE", `/api/lessons/${id}`));
    await loadLessons(chapterId);
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
        Scrierea (creare/editare/ștergere) cere rol <b>teacher</b>. Dacă primești{" "}
        <code>403</code>, promovează-te la teacher din panoul <a href="/admin" className="underline">/admin</a>.
      </div>

      {/* Creare capitol */}
      <div className="flex items-center gap-2">
        <input
          className={input}
          placeholder="Titlu capitol nou"
          value={newChapter}
          onChange={(e) => setNewChapter(e.target.value)}
        />
        <button className={btn} onClick={createChapter}>
          + Capitol
        </button>
        <button className={btn} onClick={loadChapters}>
          ↻ Reîncarcă
        </button>
      </div>

      {/* Lista capitole */}
      <div className="space-y-3">
        {chapters.map((c) => (
          <div key={c.id} className="rounded-lg border border-zinc-200 bg-white p-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium text-zinc-900">{c.title}</span>
              <span className="text-xs text-zinc-500">
                #{c.order_index} · {c.is_free ? "free" : "premium"} ·{" "}
                {c.published ? "publicat" : "draft"}
              </span>
              <div className="ml-auto flex gap-1">
                <button className={btn} onClick={() => patchChapter(c.id, { published: !c.published })}>
                  {c.published ? "→ draft" : "→ publică"}
                </button>
                <button className={btn} onClick={() => patchChapter(c.id, { is_free: !c.is_free })}>
                  {c.is_free ? "→ premium" : "→ free"}
                </button>
                <button className={btn} onClick={() => loadLessons(c.id)}>
                  lecții
                </button>
                <button className={btn} onClick={() => deleteChapter(c.id)}>
                  șterge
                </button>
              </div>
            </div>

            {/* Lectii (dupa "lecții") */}
            {lessonsBy[c.id] && (
              <div className="mt-2 border-t border-zinc-100 pt-2">
                {Array.isArray(lessonsBy[c.id]) ? (
                  <ul className="space-y-1">
                    {(lessonsBy[c.id] as Lesson[]).map((l) => (
                      <li key={l.id} className="flex items-center gap-2 text-sm">
                        <span>{l.title}</span>
                        <span className="text-xs text-zinc-400">
                          {l.published ? "publicat" : "draft"}
                        </span>
                        <button
                          className={`${btn} ml-auto`}
                          onClick={() => deleteLesson(c.id, l.id)}
                        >
                          șterge
                        </button>
                      </li>
                    ))}
                    {(lessonsBy[c.id] as Lesson[]).length === 0 && (
                      <li className="text-xs text-zinc-400">(nicio lecție)</li>
                    )}
                  </ul>
                ) : (
                  <p className="text-xs text-red-600">
                    {JSON.stringify((lessonsBy[c.id] as { error: unknown }).error)}
                  </p>
                )}
                <div className="mt-2 flex items-center gap-2">
                  <input
                    className={input}
                    placeholder="Titlu lecție nouă"
                    value={newLesson[c.id] ?? ""}
                    onChange={(e) =>
                      setNewLesson((s) => ({ ...s, [c.id]: e.target.value }))
                    }
                  />
                  <button className={btn} onClick={() => createLesson(c.id)}>
                    + Lecție
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
        {chapters.length === 0 && (
          <p className="text-sm text-zinc-400">Niciun capitol (sau nu ești logat).</p>
        )}
      </div>

      {/* Raspuns brut ultimul apel */}
      {last && (
        <div className="rounded-lg border border-zinc-200 bg-zinc-900 p-3">
          <p className="mb-1 text-xs font-semibold text-zinc-400">
            Ultimul răspuns — status {last.status}
          </p>
          <pre className="overflow-x-auto text-xs text-zinc-100">
            {JSON.stringify(last.body, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
