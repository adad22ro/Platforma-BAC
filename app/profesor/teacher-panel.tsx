"use client";

import { useCallback, useEffect, useState } from "react";
import type { Chapter, ChaptersState } from "./types";
import { TeacherChapters } from "./teacher-chapters";
import { TeacherLessons } from "./teacher-lessons";
import { TeacherQuestions } from "./teacher-questions";
import { TeacherTickets } from "./teacher-tickets";
import { TICHETE_UI_ACTIVE } from "../_components/feature-flags";

// Sursa unica a listei de capitole: formularul de lectie are nevoie de aceeasi
// lista ca sectiunea de capitole, iar un capitol nou trebuie sa apara imediat
// in selectorul de capitol al lectiei.
export function TeacherPanel() {
  const [list, setList] = useState<ChaptersState>({ status: "loading" });

  const loadChapters = useCallback(async () => {
    setList({ status: "loading" });
    try {
      const res = await fetch("/api/chapters");
      if (!res.ok) throw new Error(String(res.status));
      const { chapters } = (await res.json()) as { chapters: Chapter[] };
      setList({ status: "loaded", chapters });
    } catch {
      setList({ status: "error" });
    }
  }, []);

  useEffect(() => {
    // loadChapters e async: setState se intampla dupa await, nu sincron in efect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadChapters();
  }, [loadChapters]);

  return (
    <div className="space-y-10">
      <TeacherChapters list={list} onReload={loadChapters} />
      <TeacherLessons list={list} />
      <TeacherQuestions list={list} />
      {TICHETE_UI_ACTIVE && <TeacherTickets list={list} />}
    </div>
  );
}
