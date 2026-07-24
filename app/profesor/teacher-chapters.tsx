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

type ChaptersState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "loaded"; chapters: Chapter[] };

type Submit =
  | { status: "idle" }
  | { status: "saving" }
  | { status: "ok"; title: string }
  | { status: "error"; message: string };

const inputCls =
  "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 dark:border-zinc-700 dark:bg-zinc-900";

export function TeacherChapters() {
  const [list, setList] = useState<ChaptersState>({ status: "loading" });

  // Campurile formularului
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isFree, setIsFree] = useState(false);
  const [published, setPublished] = useState(false);
  const [submit, setSubmit] = useState<Submit>({ status: "idle" });

  async function loadChapters() {
    setList({ status: "loading" });
    try {
      const res = await fetch("/api/chapters");
      if (!res.ok) throw new Error(String(res.status));
      const { chapters } = (await res.json()) as { chapters: Chapter[] };
      setList({ status: "loaded", chapters });
    } catch {
      setList({ status: "error" });
    }
  }

  useEffect(() => {
    // loadChapters e async: setState se intampla dupa await, nu sincron in efect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadChapters();
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) {
      setSubmit({ status: "error", message: "Titlul e obligatoriu." });
      return;
    }
    setSubmit({ status: "saving" });

    // Pozitia noului capitol: la coada listei existente.
    const orderIndex =
      list.status === "loaded" ? list.chapters.length : 0;

    try {
      const res = await fetch("/api/chapters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: trimmed,
          description: description.trim() || null,
          order_index: orderIndex,
          is_free: isFree,
          published,
        }),
      });

      if (res.status === 201) {
        setSubmit({ status: "ok", title: trimmed });
        setTitle("");
        setDescription("");
        setIsFree(false);
        setPublished(false);
        await loadChapters();
        return;
      }
      if (res.status === 403) {
        setSubmit({
          status: "error",
          message: "Nu ai drept de profesor pentru a crea capitole.",
        });
        return;
      }
      if (res.status === 400) {
        setSubmit({ status: "error", message: "Date invalide: titlul e obligatoriu." });
        return;
      }
      throw new Error(String(res.status));
    } catch {
      setSubmit({
        status: "error",
        message: "Nu am putut salva capitolul. Încearcă din nou.",
      });
    }
  }

  return (
    <div className="space-y-10">
      {/* Formular capitol nou */}
      <section>
        <h2 className="text-xl font-semibold">Capitol nou</h2>
        <form onSubmit={onSubmit} className="mt-4 space-y-4">
          <div>
            <label htmlFor="ch-title" className="block text-sm font-medium">
              Titlu <span className="text-red-500">*</span>
            </label>
            <input
              id="ch-title"
              className={`mt-1 ${inputCls}`}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="ex. Poezia interbelică"
              maxLength={200}
            />
          </div>

          <div>
            <label htmlFor="ch-desc" className="block text-sm font-medium">
              Descriere <span className="text-zinc-400">(opțional)</span>
            </label>
            <textarea
              id="ch-desc"
              className={`mt-1 min-h-20 ${inputCls}`}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Scurtă descriere a capitolului"
            />
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:gap-6">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-zinc-300"
                checked={isFree}
                onChange={(e) => setIsFree(e.target.checked)}
              />
              Capitol gratuit (accesibil fără abonament)
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-zinc-300"
                checked={published}
                onChange={(e) => setPublished(e.target.checked)}
              />
              Publică imediat (altfel rămâne draft)
            </label>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={submit.status === "saving"}
              className="inline-flex h-10 items-center justify-center rounded-full bg-indigo-600 px-5 text-sm font-medium text-white transition-colors hover:bg-indigo-500 disabled:opacity-50"
            >
              {submit.status === "saving" ? "Se salvează…" : "Creează capitolul"}
            </button>
            {submit.status === "ok" && (
              <span className="text-sm text-green-600 dark:text-green-400">
                Capitolul „{submit.title}” a fost creat.
              </span>
            )}
            {submit.status === "error" && (
              <span className="text-sm text-red-600 dark:text-red-400">
                {submit.message}
              </span>
            )}
          </div>
        </form>
      </section>

      {/* Lista capitolelor existente */}
      <section>
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Capitole existente</h2>
          <button
            type="button"
            onClick={loadChapters}
            className="text-sm text-indigo-600 hover:text-indigo-500"
          >
            ↻ Reîncarcă
          </button>
        </div>

        {list.status === "loading" && (
          <p className="mt-4 text-sm text-zinc-500">Se încarcă…</p>
        )}
        {list.status === "error" && (
          <p className="mt-4 text-sm text-red-600 dark:text-red-400">
            Nu am putut încărca capitolele.
          </p>
        )}
        {list.status === "loaded" &&
          (list.chapters.length === 0 ? (
            <p className="mt-4 text-sm text-zinc-500">Niciun capitol încă.</p>
          ) : (
            <ul className="mt-4 divide-y divide-zinc-200 overflow-hidden rounded-2xl border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
              {list.chapters.map((c) => (
                <li
                  key={c.id}
                  className="flex items-center gap-3 px-5 py-3 text-sm"
                >
                  <span className="text-zinc-400">#{c.order_index}</span>
                  <span className="flex-1 font-medium">{c.title}</span>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      c.is_free
                        ? "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300"
                        : "bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300"
                    }`}
                  >
                    {c.is_free ? "Gratuit" : "Premium"}
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      c.published
                        ? "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                        : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                    }`}
                  >
                    {c.published ? "Publicat" : "Draft"}
                  </span>
                </li>
              ))}
            </ul>
          ))}
      </section>
    </div>
  );
}
