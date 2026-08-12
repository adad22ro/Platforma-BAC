import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentAppUser, isTeacher } from "@/lib/current-user";
import { AppHeader } from "../_components/app-header";
import { TeacherPanel } from "./teacher-panel";

export const metadata: Metadata = {
  title: "Panel profesor — Platforma BAC",
};

// Zona profesorului: gestionarea conținutului (capitole, lecții).
// Gated pe rolul `teacher` din DB — elevii sunt trimisi pe /dashboard.
export default async function TeacherPage() {
  const user = await getCurrentAppUser();
  if (!isTeacher(user)) redirect("/dashboard");

  return (
    <div className="flex flex-1 flex-col bg-white text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
      <AppHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
        <h1 className="text-3xl font-bold tracking-tight">Panel profesor</h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          Creează și organizează capitolele și lecțiile platformei.
        </p>
        <div className="mt-8">
          <TeacherPanel />
        </div>
      </main>
    </div>
  );
}
