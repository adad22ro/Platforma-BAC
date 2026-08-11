import type { Metadata } from "next";
import { AppHeader } from "../_components/app-header";
import { MyTickets } from "./my-tickets";

export const metadata: Metadata = {
  title: "Întrebările mele — Platforma BAC",
};

// Aici ajunge elevul ca sa-si vada raspunsurile primite de la profesor
// (linkul din emailul de notificare duce tot aici).
export default function MyTicketsPage() {
  return (
    <div className="flex flex-1 flex-col bg-white text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
      <AppHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
        <h1 className="text-3xl font-bold tracking-tight">Întrebările mele</h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          Întrebările trimise cu butonul „Nu am înțeles” și răspunsurile
          profesorului.
        </p>
        <MyTickets />
      </main>
    </div>
  );
}
