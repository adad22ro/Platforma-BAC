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

// Intrebare grila. Spre deosebire de forma trimisa elevului, aici vine si
// raspunsul corect (indexul in `options`) — profesorul are voie sa-l vada.
export type Question = {
  id: string;
  chapter_id: string;
  text: string;
  options: string[];
  correct_option: number;
  explanation: string | null;
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

// `inputCls` a fost mutat in app/_components/ui.ts, langa restul primitivelor
// de stil. Reexportat aici doar ca sa nu rupem importurile existente.
export { inputCls } from "../_components/ui";
