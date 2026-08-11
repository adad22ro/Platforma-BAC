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

// Intrebare grila, asa cum vine din GET /api/chapters/[id]/questions.
// Ruta nu selecteaza deloc `is_correct`, nici pentru profesor — varianta
// corecta se afla doar prin GET /api/questions/[id].
export type Question = {
  id: string;
  chapter_id: string;
  text: string;
  answers: { id: string; text: string; order_index: number }[];
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
