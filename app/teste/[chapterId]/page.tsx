import type { Metadata } from "next";
import { AppHeader } from "../../_components/app-header";
import { QuizView } from "./quiz-view";

export const metadata: Metadata = {
  title: "Test — Platforma BAC",
};

export default async function QuizPage({
  params,
}: {
  params: Promise<{ chapterId: string }>;
}) {
  const { chapterId } = await params;

  return (
    <div className="flex flex-1 flex-col bg-white text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
      <AppHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
        <QuizView chapterId={chapterId} />
      </main>
    </div>
  );
}
