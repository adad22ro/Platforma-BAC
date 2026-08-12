"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { btn, listCls } from "./ui";

// Formele returnate de API (vezi app/api/chapters + app/api/chapters/[id]/lessons).
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
  order_index: number;
  published: boolean;
  locked: boolean;
};

// Starea lecțiilor per capitol: nefetchat / în curs / eroare / gata.
type LessonsState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error" }
  | { status: "loaded"; lessons: Lesson[] };

// Starea listei de capitole (fetch la mount).
type ChaptersState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "loaded"; chapters: Chapter[] };

export function ChaptersBrowser() {
  const [chaptersState, setChaptersState] = useState<ChaptersState>({
    status: "loading",
  });
  const [openId, setOpenId] = useState<string | null>(null);
  // Cache-uim lecțiile deja aduse ca să nu refetch-uim la fiecare toggle.
  const [lessonsByChapter, setLessonsByChapter] = useState<
    Record<string, LessonsState>
  >({});

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/chapters");
        if (!res.ok) throw new Error(String(res.status));
        const { chapters } = (await res.json()) as { chapters: Chapter[] };
        if (active) setChaptersState({ status: "loaded", chapters });
      } catch {
        if (active) setChaptersState({ status: "error" });
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  async function toggle(chapterId: string) {
    if (openId === chapterId) {
      setOpenId(null);
      return;
    }
    setOpenId(chapterId);

    const current = lessonsByChapter[chapterId];
    if (current && current.status !== "error") return; // deja adus sau în curs

    setLessonsByChapter((s) => ({ ...s, [chapterId]: { status: "loading" } }));
    try {
      const res = await fetch(`/api/chapters/${chapterId}/lessons`);
      if (!res.ok) throw new Error(String(res.status));
      const { lessons } = (await res.json()) as { lessons: Lesson[] };
      setLessonsByChapter((s) => ({
        ...s,
        [chapterId]: { status: "loaded", lessons },
      }));
    } catch {
      setLessonsByChapter((s) => ({ ...s, [chapterId]: { status: "error" } }));
    }
  }

  if (chaptersState.status === "loading") {
    return (
      <section className="mt-8">
        <h2 className="text-xl font-semibold">Capitole</h2>
        <p className="mt-4 text-sm text-zinc-500">Se încarcă capitolele…</p>
      </section>
    );
  }

  if (chaptersState.status === "error") {
    return (
      <section className="mt-8">
        <h2 className="text-xl font-semibold">Capitole</h2>
        <p className="mt-4 text-sm text-red-600 dark:text-red-400">
          Nu am putut încărca capitolele. Reîmprospătează pagina.
        </p>
      </section>
    );
  }

  const chapters = chaptersState.chapters;

  if (chapters.length === 0) {
    return (
      <section className="mt-8 rounded-2xl border border-dashed border-zinc-300 p-8 text-center dark:border-zinc-700">
        <h2 className="font-semibold">Lecțiile tale</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-zinc-600 dark:text-zinc-400">
          Momentan nu există capitole publicate. Revino în curând.
        </p>
      </section>
    );
  }

  return (
    <section className="mt-8">
      <h2 className="text-xl font-semibold">Capitole</h2>
      <ul className={`mt-4 ${listCls}`}>
        {chapters.map((chapter) => {
          const isOpen = openId === chapter.id;
          const state = lessonsByChapter[chapter.id];
          return (
            <li key={chapter.id}>
              <button
                type="button"
                onClick={() => toggle(chapter.id)}
                aria-expanded={isOpen}
                className="flex w-full items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900"
              >
                <span
                  className={`text-zinc-400 transition-transform ${isOpen ? "rotate-90" : ""}`}
                  aria-hidden
                >
                  ▸
                </span>
                <span className="flex-1">
                  <span className="font-medium">{chapter.title}</span>
                  {chapter.description && (
                    <span className="mt-0.5 block text-sm text-zinc-500 dark:text-zinc-400">
                      {chapter.description}
                    </span>
                  )}
                </span>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    chapter.is_free
                      ? "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300"
                      : "bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300"
                  }`}
                >
                  {chapter.is_free ? "Gratuit" : "Premium"}
                </span>
              </button>

              {isOpen && (
                <div className="border-t border-zinc-100 bg-zinc-50/50 px-5 py-3 dark:border-zinc-800/60 dark:bg-zinc-900/30">
                  {(!state || state.status === "loading") && (
                    <p className="py-2 text-sm text-zinc-500">Se încarcă…</p>
                  )}
                  {state?.status === "error" && (
                    <p className="py-2 text-sm text-red-600 dark:text-red-400">
                      Nu am putut încărca lecțiile.{" "}
                      <button
                        type="button"
                        onClick={() => toggle(chapter.id)}
                        className="underline"
                      >
                        Reîncearcă
                      </button>
                    </p>
                  )}
                  {state?.status === "loaded" &&
                    (state.lessons.length === 0 ? (
                      <p className="py-2 text-sm text-zinc-500">
                        Capitolul nu are încă lecții.
                      </p>
                    ) : (
                      <ul className="py-1">
                        {state.lessons.map((lesson) => (
                          <li key={lesson.id}>
                            <Link
                              href={`/lectii/${lesson.id}`}
                              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-white dark:hover:bg-zinc-800"
                            >
                              <span className="flex-1">{lesson.title}</span>
                              {lesson.locked && (
                                <span
                                  className="text-zinc-400"
                                  title="Conținut Premium"
                                  aria-label="Blocat — necesită Premium"
                                >
                                  🔒
                                </span>
                              )}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    ))}

                  {/* Testul capitolului — gating-ul (Premium) e aplicat de API,
                      deci linkul se afiseaza si pentru capitolele blocate. */}
                  <Link
                    href={`/teste/${chapter.id}`}
                    className={btn("outline", "sm", "mt-2 hover:bg-white dark:hover:bg-zinc-800")}
                  >
                    ✎ Dă testul capitolului
                  </Link>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
