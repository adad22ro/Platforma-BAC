"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { btn } from "../_components/ui";

// ATENTIE: ruta GET /api/tickets nu exista inca (sarcina Andrei, Sapt. 9-10).
// Acelasi endpoint ca la profesor, dar pentru elev intoarce doar tichetele lui.
// Contractul e in docs/api.md.
type Ticket = {
  id: string;
  message: string;
  status: "open" | "answered";
  created_at: string;
  chapter_id: string | null;
  chapter_title: string | null;
  lesson_id: string | null;
  lesson_title: string | null;
  question_id: string | null;
  question_text: string | null;
  answer: string | null;
  answered_at: string | null;
};

type State =
  | { status: "loading" }
  | { status: "error" }
  | { status: "loaded"; tickets: Ticket[] };

export function MyTickets() {
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/tickets");
        if (!res.ok) throw new Error(String(res.status));
        const { tickets } = (await res.json()) as { tickets: Ticket[] };
        if (active) setState({ status: "loaded", tickets });
      } catch {
        if (active) setState({ status: "error" });
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  if (state.status === "loading") {
    return <p className="mt-8 text-sm text-zinc-500">Se încarcă întrebările…</p>;
  }

  if (state.status === "error") {
    return (
      <p className="mt-8 text-sm text-red-600 dark:text-red-400">
        Nu am putut încărca întrebările. Reîmprospătează pagina.
      </p>
    );
  }

  if (state.tickets.length === 0) {
    return (
      <div className="mt-8 rounded-2xl border border-dashed border-zinc-300 p-8 text-center dark:border-zinc-700">
        <p className="font-semibold">N-ai trimis încă nicio întrebare</p>
        <p className="mx-auto mt-2 max-w-md text-sm text-zinc-600 dark:text-zinc-400">
          Când te blochezi la o lecție sau la un test, apasă „Nu am înțeles” —
          un profesor îți răspunde în cel mult 24 de ore.
        </p>
        <Link href="/dashboard" className={btn("primary", "md", "mt-5")}>
          Mergi la capitole
        </Link>
      </div>
    );
  }

  // Cu raspuns primele: alea sunt vestea buna pentru care a intrat pe pagina.
  // In rest, cele noi inaintea celor vechi.
  const tickets = state.tickets.slice().sort((a, b) => {
    if (a.status !== b.status) return a.status === "answered" ? -1 : 1;
    const aDate = a.answered_at ?? a.created_at;
    const bDate = b.answered_at ?? b.created_at;
    return bDate.localeCompare(aDate);
  });

  const fararaspuns = tickets.filter((t) => t.status === "open").length;

  return (
    <section className="mt-8">
      {fararaspuns > 0 && (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {fararaspuns === 1
            ? "O întrebare așteaptă răspuns."
            : `${fararaspuns} întrebări așteaptă răspuns.`}{" "}
          Primești un email când sunt gata.
        </p>
      )}

      <ul className="mt-4 space-y-4">
        {tickets.map((t) => (
          <li
            key={t.id}
            className="rounded-2xl border border-zinc-200 p-5 dark:border-zinc-800"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="text-xs text-zinc-500">
                {dataScurta(t.created_at)}
                {t.chapter_title && ` · ${t.chapter_title}`}
                {t.lesson_title && ` · ${t.lesson_title}`}
              </span>
              {t.status === "open" && (
                <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                  În așteptare
                </span>
              )}
            </div>

            <p className="mt-2 text-[15px] whitespace-pre-wrap text-zinc-800 dark:text-zinc-200">
              {t.message}
            </p>

            {t.question_text && (
              <p className="mt-2 rounded-lg bg-zinc-100 px-3 py-2 text-xs text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
                <span className="font-medium">Întrebarea din test: </span>
                {t.question_text}
              </p>
            )}

            {t.answer ? (
              <div className="mt-4 rounded-xl border border-green-200 bg-green-50 p-4 dark:border-green-900 dark:bg-green-950/40">
                <p className="text-xs font-medium text-green-800 dark:text-green-300">
                  Răspunsul profesorului
                  {t.answered_at && ` · ${dataScurta(t.answered_at)}`}
                </p>
                <p className="mt-1 text-[15px] leading-7 whitespace-pre-wrap text-green-900 dark:text-green-100">
                  {t.answer}
                </p>
              </div>
            ) : (
              <p className="mt-4 text-sm text-zinc-500">
                Încă fără răspuns. Termenul e de cel mult 24 de ore de la
                trimitere.
              </p>
            )}

            {/* Inapoi la locul intrebarii — lectia daca o stim, altfel capitolul. */}
            {t.lesson_id ? (
              <Link
                href={`/lectii/${t.lesson_id}`}
                className="mt-3 inline-block text-sm font-medium text-indigo-600 hover:text-indigo-500"
              >
                Deschide lecția →
              </Link>
            ) : (
              t.chapter_id && (
                <Link
                  href={`/teste/${t.chapter_id}`}
                  className="mt-3 inline-block text-sm font-medium text-indigo-600 hover:text-indigo-500"
                >
                  Deschide testul capitolului →
                </Link>
              )
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

function dataScurta(iso: string) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString("ro-RO", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      });
}
