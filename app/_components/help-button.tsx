"use client";

import { useState } from "react";
import Link from "next/link";
import { btn, inputCls } from "./ui";

// ATENTIE: ruta POST /api/tickets nu exista inca (sarcina Andrei, Sapt. 9-10).
// Contractul e documentat in docs/api.md.

// Contextul se completeaza automat din pagina — elevul nu trebuie sa explice
// unde s-a blocat. `source` spune profesorului din ce ecran a venit intrebarea.
export type TicketContext = {
  source: "lesson" | "quiz";
  chapter_id?: string;
  chapter_title?: string;
  lesson_id?: string;
  lesson_title?: string;
  // La test: intrebarea la care s-a blocat (daca butonul e langa o intrebare).
  question_id?: string;
  question_text?: string;
};

type State =
  | { status: "closed" }
  | { status: "open" }
  | { status: "sending" }
  | { status: "sent" }
  | { status: "error"; message: string };

const MAX_LEN = 1000;

export function HelpButton({
  context,
  label = "Nu am înțeles",
}: {
  context: TicketContext;
  label?: string;
}) {
  const [state, setState] = useState<State>({ status: "closed" });
  const [message, setMessage] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = message.trim();
    if (!trimmed) {
      setState({
        status: "error",
        message: "Scrie pe scurt ce nu ai înțeles.",
      });
      return;
    }
    setState({ status: "sending" });
    try {
      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed, context }),
      });

      if (res.status === 201) {
        setState({ status: "sent" });
        setMessage("");
        return;
      }
      if (res.status === 401) {
        setState({
          status: "error",
          message: "Trebuie să fii autentificat ca să trimiți o întrebare.",
        });
        return;
      }
      if (res.status === 429) {
        setState({
          status: "error",
          message:
            "Ai trimis deja mai multe întrebări. Așteaptă răspunsul la ele întâi.",
        });
        return;
      }
      throw new Error(String(res.status));
    } catch {
      setState({
        status: "error",
        message: "Nu am putut trimite întrebarea. Încearcă din nou.",
      });
    }
  }

  if (state.status === "sent") {
    return (
      <div className="mt-6 rounded-2xl border border-green-200 bg-green-50 p-5 dark:border-green-900 dark:bg-green-950/40">
        <p className="font-semibold text-green-800 dark:text-green-300">
          Întrebarea a fost trimisă.
        </p>
        <p className="mt-1 text-sm text-green-700 dark:text-green-400">
          Un profesor îți răspunde în cel mult 24 de ore. Găsești răspunsul în
          pagina &bdquo;Întrebările mele&rdquo;.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-4">
          <button
            type="button"
            onClick={() => setState({ status: "open" })}
            className="text-sm font-medium text-green-800 underline dark:text-green-300"
          >
            Mai am o întrebare
          </button>
          <Link
            href="/intrebari"
            className="text-sm font-medium text-green-800 underline dark:text-green-300"
          >
            Vezi întrebările mele
          </Link>
        </div>
      </div>
    );
  }

  if (state.status === "closed") {
    return (
      <button
        type="button"
        onClick={() => setState({ status: "open" })}
        className={btn("outline", "sm", "mt-6")}
      >
        🙋 {label}
      </button>
    );
  }

  const sending = state.status === "sending";

  return (
    <form
      onSubmit={onSubmit}
      className="mt-6 rounded-2xl border border-zinc-200 p-5 dark:border-zinc-800"
    >
      <h2 className="font-semibold">{label}</h2>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        Scrie ce anume nu e clar. Trimitem automat și{" "}
        {context.source === "quiz" ? "întrebarea" : "lecția"} la care ești, deci
        nu trebuie s-o descrii.
      </p>

      <ContextSummary context={context} />

      <label htmlFor="ticket-message" className="mt-4 block text-sm font-medium">
        Întrebarea ta
      </label>
      <textarea
        id="ticket-message"
        className={`mt-1 min-h-32 ${inputCls}`}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        maxLength={MAX_LEN}
        disabled={sending}
        placeholder="ex. Nu înțeleg de ce răspunsul corect e b) — credeam că…"
        autoFocus
      />
      <p className="mt-1 text-xs text-zinc-500">
        {message.length}/{MAX_LEN}
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button type="submit" disabled={sending} className={btn()}>
          {sending ? "Se trimite…" : "Trimite întrebarea"}
        </button>
        <button
          type="button"
          onClick={() => setState({ status: "closed" })}
          disabled={sending}
          className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
        >
          Renunță
        </button>
        {state.status === "error" && (
          <span className="text-sm text-red-600 dark:text-red-400">
            {state.message}
          </span>
        )}
      </div>
    </form>
  );
}

// Aratam elevului exact ce context pleaca odata cu intrebarea — fara surprize.
function ContextSummary({ context }: { context: TicketContext }) {
  const parts = [
    context.chapter_title,
    context.lesson_title,
    context.question_text,
  ].filter(Boolean);

  if (parts.length === 0) return null;

  return (
    <p className="mt-3 rounded-lg bg-zinc-100 px-3 py-2 text-xs text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
      <span className="font-medium">Se trimite împreună cu:</span>{" "}
      {parts.join(" · ")}
    </p>
  );
}
