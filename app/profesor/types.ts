export type Chapter = {
  id: string;
  title: string;
  description: string | null;
  order_index: number;
  is_free: boolean;
  published: boolean;
};

export type Lesson = {
  id: string;
  chapter_id: string;
  title: string;
  content: string | null;
  video_url: string | null;
  order_index: number;
  published: boolean;
};

export type ChaptersState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "loaded"; chapters: Chapter[] };

// Starea unui formular de creare (capitol sau lectie).
export type Submit =
  | { status: "idle" }
  | { status: "saving" }
  | { status: "ok"; title: string }
  | { status: "error"; message: string };

export const inputCls =
  "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 dark:border-zinc-700 dark:bg-zinc-900";
