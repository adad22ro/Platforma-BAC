"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { btn } from "../../_components/ui";
import { HelpButton } from "../../_components/help-button";
import { TICHETE_UI_ACTIVE } from "../../_components/feature-flags";

type Lesson = {
  id: string;
  chapter_id: string;
  title: string;
  content: string | null;
  video_url: string | null;
  order_index: number;
  published: boolean;
};

// Stările posibile ale unei lecții, mapate din răspunsul API:
//  200 -> loaded | 402 -> premium (paywall) | 404 -> notfound | rest -> error
type State =
  | { status: "loading" }
  | { status: "loaded"; lesson: Lesson }
  | { status: "premium" }
  | { status: "notfound" }
  | { status: "error" };

export function LessonView({ id }: { id: string }) {
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch(`/api/lessons/${id}`);
        if (res.status === 402) {
          if (active) setState({ status: "premium" });
          return;
        }
        if (res.status === 404) {
          if (active) setState({ status: "notfound" });
          return;
        }
        if (!res.ok) throw new Error(String(res.status));
        const { lesson } = (await res.json()) as { lesson: Lesson };
        if (active) setState({ status: "loaded", lesson });
      } catch {
        if (active) setState({ status: "error" });
      }
    })();
    return () => {
      active = false;
    };
  }, [id]);

  if (state.status === "loading") {
    return <p className="text-sm text-zinc-500">Se încarcă lecția…</p>;
  }

  if (state.status === "notfound") {
    return (
      <div className="rounded-2xl border border-zinc-200 p-8 text-center dark:border-zinc-800">
        <h1 className="text-xl font-semibold">Lecția nu a fost găsită</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Poate a fost mutată sau nu este încă publicată.
        </p>
        <BackToDashboard />
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="rounded-2xl border border-zinc-200 p-8 text-center dark:border-zinc-800">
        <h1 className="text-xl font-semibold">Ceva n-a mers</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Nu am putut încărca lecția. Reîmprospătează pagina și încearcă din nou.
        </p>
        <BackToDashboard />
      </div>
    );
  }

  if (state.status === "premium") {
    return (
      <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-8 text-center dark:border-indigo-900 dark:bg-indigo-950/40">
        <div className="text-3xl" aria-hidden>
          🔒
        </div>
        <h1 className="mt-3 text-xl font-semibold text-indigo-900 dark:text-indigo-200">
          Conținut Premium
        </h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-indigo-800/80 dark:text-indigo-300/80">
          Această lecție face parte dintr-un capitol Premium. Treci la Premium ca
          să deblochezi toate lecțiile și testele.
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

  const { lesson } = state;
  return (
    <article>
      <h1 className="text-3xl font-bold tracking-tight">{lesson.title}</h1>

      {lesson.video_url && (
        <a
          href={lesson.video_url}
          target="_blank"
          rel="noopener noreferrer"
          className={btn("outline", "md", "mt-5")}
        >
          ▶ Vezi materialul video
        </a>
      )}

      {lesson.content ? (
        <div className="mt-6 whitespace-pre-wrap text-[15px] leading-7 text-zinc-800 dark:text-zinc-200">
          {lesson.content}
        </div>
      ) : (
        <p className="mt-6 text-sm text-zinc-500">
          Lecția nu are încă text. Revino în curând.
        </p>
      )}

      {/* Contextul (ce lectie, din ce capitol) pleaca automat cu tichetul. */}
      {TICHETE_UI_ACTIVE && (
        <HelpButton
          context={{
            source: "lesson",
            lesson_id: lesson.id,
            lesson_title: lesson.title,
            chapter_id: lesson.chapter_id,
          }}
        />
      )}

      <BackToDashboard />
    </article>
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
