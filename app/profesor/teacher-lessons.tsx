"use client";

import { useCallback, useEffect, useState } from "react";
import { inputCls, type ChaptersState, type Lesson, type Submit } from "./types";
import { btn, listCls } from "../_components/ui";

type LessonsState =
  | { status: "idle" } // niciun capitol selectat
  | { status: "loading" }
  | { status: "error" }
  | { status: "loaded"; lessons: Lesson[] };

// Formular „Lecție nouă" + lista lectiilor din capitolul selectat.
// Capitolul ales conduce si lista de sub formular, ca profesorul sa vada
// ordinea existenta inainte de a adauga.
export function TeacherLessons({ list }: { list: ChaptersState }) {
  const [chapterId, setChapterId] = useState("");
  const [lessons, setLessons] = useState<LessonsState>({ status: "idle" });

  // Campurile formularului
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [published, setPublished] = useState(false);
  const [preview, setPreview] = useState(false);
  const [submit, setSubmit] = useState<Submit>({ status: "idle" });

  const loadLessons = useCallback(async (id: string) => {
    if (!id) {
      setLessons({ status: "idle" });
      return;
    }
    setLessons({ status: "loading" });
    try {
      const res = await fetch(`/api/chapters/${id}/lessons`);
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as { lessons: Lesson[] };
      setLessons({ status: "loaded", lessons: data.lessons });
    } catch {
      setLessons({ status: "error" });
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadLessons(chapterId);
  }, [chapterId, loadLessons]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!chapterId) {
      setSubmit({ status: "error", message: "Alege întâi capitolul." });
      return;
    }
    const trimmed = title.trim();
    if (!trimmed) {
      setSubmit({ status: "error", message: "Titlul e obligatoriu." });
      return;
    }
    setSubmit({ status: "saving" });

    // Pozitia noii lectii: la coada lectiilor existente din capitol.
    const orderIndex = lessons.status === "loaded" ? lessons.lessons.length : 0;

    try {
      const res = await fetch("/api/lessons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chapter_id: chapterId,
          title: trimmed,
          content: content.trim() || null,
          video_url: videoUrl.trim() || null,
          order_index: orderIndex,
          published,
        }),
      });

      if (res.status === 201) {
        setSubmit({ status: "ok", title: trimmed });
        setTitle("");
        setContent("");
        setVideoUrl("");
        setPublished(false);
        setPreview(false);
        await loadLessons(chapterId);
        return;
      }
      if (res.status === 403) {
        setSubmit({
          status: "error",
          message: "Nu ai drept de profesor pentru a crea lecții.",
        });
        return;
      }
      if (res.status === 400) {
        setSubmit({
          status: "error",
          message: "Date invalide: verifică titlul și capitolul ales.",
        });
        return;
      }
      throw new Error(String(res.status));
    } catch {
      setSubmit({
        status: "error",
        message: "Nu am putut salva lecția. Încearcă din nou.",
      });
    }
  }

  return (
    <div className="space-y-6">
      <section>
        <h2 className="text-xl font-semibold">Lecție nouă</h2>

        {list.status === "loaded" && list.chapters.length === 0 ? (
          <p className="mt-4 text-sm text-zinc-500">
            Creează întâi un capitol — lecțiile aparțin unui capitol.
          </p>
        ) : (
          <form onSubmit={onSubmit} className="mt-4 space-y-4">
            <div>
              <label htmlFor="ls-chapter" className="block text-sm font-medium">
                Capitol <span className="text-red-500">*</span>
              </label>
              <select
                id="ls-chapter"
                className={`mt-1 ${inputCls}`}
                value={chapterId}
                onChange={(e) => setChapterId(e.target.value)}
                disabled={list.status !== "loaded"}
              >
                <option value="">
                  {list.status === "loading"
                    ? "Se încarcă capitolele…"
                    : list.status === "error"
                      ? "Capitolele nu s-au putut încărca"
                      : "— alege capitolul —"}
                </option>
                {list.status === "loaded" &&
                  list.chapters.map((c) => (
                    <option key={c.id} value={c.id}>
                      #{c.order_index} · {c.title}
                      {c.published ? "" : " (draft)"}
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label htmlFor="ls-title" className="block text-sm font-medium">
                Titlu <span className="text-red-500">*</span>
              </label>
              <input
                id="ls-title"
                className={`mt-1 ${inputCls}`}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="ex. Tudor Arghezi — Testament"
                maxLength={200}
              />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="ls-content" className="block text-sm font-medium">
                  Conținut <span className="text-zinc-400">(opțional)</span>
                </label>
                <button
                  type="button"
                  onClick={() => setPreview((p) => !p)}
                  className="text-sm text-indigo-600 hover:text-indigo-500"
                >
                  {preview ? "Editează" : "Previzualizează"}
                </button>
              </div>
              {preview ? (
                // Aceeasi randare ca in pagina de lectie: text simplu, cu
                // pastrarea randurilor goale (whitespace-pre-wrap).
                <div className="mt-1 min-h-64 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-[15px] leading-7 whitespace-pre-wrap text-zinc-800 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200">
                  {content.trim() || (
                    <span className="text-sm text-zinc-500">
                      Nimic de previzualizat încă.
                    </span>
                  )}
                </div>
              ) : (
                <textarea
                  id="ls-content"
                  className={`mt-1 min-h-64 font-mono ${inputCls}`}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder={"Textul lecției.\n\nRândurile goale se păstrează la afișare."}
                />
              )}
              <p className="mt-1 text-xs text-zinc-500">
                Text simplu — se afișează exact cum îl scrii, cu rândurile păstrate.
              </p>
            </div>

            <div>
              <label htmlFor="ls-video" className="block text-sm font-medium">
                Link video <span className="text-zinc-400">(opțional)</span>
              </label>
              <input
                id="ls-video"
                type="url"
                className={`mt-1 ${inputCls}`}
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="https://…"
              />
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-zinc-300"
                checked={published}
                onChange={(e) => setPublished(e.target.checked)}
              />
              Publică imediat (altfel rămâne draft)
            </label>

            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={submit.status === "saving"}
                className={btn()}
              >
                {submit.status === "saving" ? "Se salvează…" : "Creează lecția"}
              </button>
              {submit.status === "ok" && (
                <span className="text-sm text-green-600 dark:text-green-400">
                  Lecția „{submit.title}” a fost creată.
                </span>
              )}
              {submit.status === "error" && (
                <span className="text-sm text-red-600 dark:text-red-400">
                  {submit.message}
                </span>
              )}
            </div>
          </form>
        )}
      </section>

      {/* Lectiile capitolului selectat */}
      {chapterId && (
        <section>
          <h3 className="text-sm font-semibold text-zinc-600 dark:text-zinc-400">
            Lecțiile capitolului
          </h3>

          {lessons.status === "loading" && (
            <p className="mt-3 text-sm text-zinc-500">Se încarcă…</p>
          )}
          {lessons.status === "error" && (
            <p className="mt-3 text-sm text-red-600 dark:text-red-400">
              Nu am putut încărca lecțiile.
            </p>
          )}
          {lessons.status === "loaded" &&
            (lessons.lessons.length === 0 ? (
              <p className="mt-3 text-sm text-zinc-500">
                Capitolul nu are încă lecții.
              </p>
            ) : (
              <ul className={`mt-3 ${listCls}`}>
                {lessons.lessons.map((l) => (
                  <li
                    key={l.id}
                    className="flex items-center gap-3 px-5 py-3 text-sm"
                  >
                    <span className="text-zinc-400">#{l.order_index}</span>
                    <span className="flex-1 font-medium">{l.title}</span>
                    {l.video_url && (
                      <span className="text-xs text-zinc-500">▶ video</span>
                    )}
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        l.published
                          ? "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                          : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                      }`}
                    >
                      {l.published ? "Publicat" : "Draft"}
                    </span>
                  </li>
                ))}
              </ul>
            ))}
        </section>
      )}
    </div>
  );
}
