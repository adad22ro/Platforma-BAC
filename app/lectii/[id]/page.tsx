import type { Metadata } from "next";
import { AppHeader } from "../../_components/app-header";
import { LessonView } from "./lesson-view";

export const metadata: Metadata = {
  title: "Lecție — Platforma BAC",
};

export default async function LessonPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="flex flex-1 flex-col bg-white text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
      <AppHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
        <LessonView id={id} />
      </main>
    </div>
  );
}
