"use client";

import { useEffect, useMemo, useState } from "react";
import { btn, badgeCls, inputCls } from "../_components/ui";
import type { ChaptersState, Submit } from "./types";

// ATENTIE: ruta GET /api/tickets nu exista inca (sarcina Andrei, Sapt. 9-10).
// Contractul e documentat in docs/api.md.

type Ticket = {
  id: string;
  message: string;
  status: "open" | "answered";
  created_at: string;
  student_name: string | null;
  student_email: string;
  // Contextul trimis de buton, re-rezolvat pe server (ID-urile sunt sursa de adevar).
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

// Tichetele fara capitol (context pierdut / lectie stearsa) nu se pierd din
// lista: intra intr-o grupa proprie, la coada.
const FARA_CAPITOL = "__fara_capitol__";

const NICIUNUL: Ticket[] = [];

export function TeacherTickets({ list }: { list: ChaptersState }) {
  const [state, setState] = useState<State>({ status: "loading" });
  const [doarDeschise, setDoarDeschise] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);

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

  // `NICIUNUL` e o constanta de modul, nu `[]` inline: altfel identitatea
  // array-ului s-ar schimba la fiecare randare si useMemo de mai jos ar recalcula.
  const tickets = state.status === "loaded" ? state.tickets : NICIUNUL;

  // Grupare pe capitol, in ordinea capitolelor din curs (nu alfabetic): asa
  // vede profesorul unde se aduna blocajele pe parcursul materiei.
  const grupe = useMemo(() => {
    const vizibile = doarDeschise
      ? tickets.filter((t) => t.status === "open")
      : tickets;

    const byChapter = new Map<string, Ticket[]>();
    for (const t of vizibile) {
      const key = t.chapter_id ?? FARA_CAPITOL;
      const bucket = byChapter.get(key);
      if (bucket) bucket.push(t);
      else byChapter.set(key, [t]);
    }

    const ordine =
      list.status === "loaded"
        ? list.chapters
            .slice()
            .sort((a, b) => a.order_index - b.order_index)
            .map((c) => ({ id: c.id, title: c.title }))
        : [];

    const rezultat: { id: string; title: string; tickets: Ticket[] }[] = [];
    for (const c of ordine) {
      const t = byChapter.get(c.id);
      if (t) {
        rezultat.push({ ...c, tickets: sorteazaNoiIntai(t) });
        byChapter.delete(c.id);
      }
    }
    // Ce a ramas: capitole necunoscute in lista (draft/sterse) + fara capitol.
    for (const [id, t] of byChapter) {
      rezultat.push({
        id,
        title:
          id === FARA_CAPITOL
            ? "Fără capitol"
            : (t[0].chapter_title ?? "Capitol necunoscut"),
        tickets: sorteazaNoiIntai(t),
      });
    }
    return rezultat;
  }, [tickets, doarDeschise, list]);

  const deschise = tickets.filter((t) => t.status === "open").length;

  return (
    <section>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-xl font-semibold">Tichete</h2>
        {state.status === "loaded" && (
          <label className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-zinc-300"
              checked={doarDeschise}
              onChange={(e) => setDoarDeschise(e.target.checked)}
            />
            Doar cele fără răspuns ({deschise})
          </label>
        )}
      </div>

      {state.status === "loading" && (
        <p className="mt-4 text-sm text-zinc-500">Se încarcă tichetele…</p>
      )}

      {state.status === "error" && (
        <p className="mt-4 text-sm text-red-600 dark:text-red-400">
          Nu am putut încărca tichetele. Reîmprospătează pagina.
        </p>
      )}

      {state.status === "loaded" && grupe.length === 0 && (
        <p className="mt-4 text-sm text-zinc-500">
          {doarDeschise
            ? "Niciun tichet fără răspuns. "
            : "Niciun tichet încă. "}
          Întrebările elevilor apar aici, grupate pe capitol.
        </p>
      )}

      <div className="mt-4 space-y-6">
        {grupe.map((grupa) => (
          <div key={grupa.id}>
            <h3 className="flex items-center gap-2 text-sm font-semibold text-zinc-600 dark:text-zinc-400">
              {grupa.title}
              <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                {grupa.tickets.length}
              </span>
            </h3>

            <ul className="mt-2 space-y-2">
              {grupa.tickets.map((t) => {
                const desfasurat = openId === t.id;
                return (
                  <li
                    key={t.id}
                    className="overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800"
                  >
                    <button
                      type="button"
                      onClick={() => setOpenId(desfasurat ? null : t.id)}
                      aria-expanded={desfasurat}
                      className="flex w-full items-start gap-3 px-5 py-4 text-left transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900"
                    >
                      <span
                        className={`mt-0.5 text-zinc-400 transition-transform ${desfasurat ? "rotate-90" : ""}`}
                        aria-hidden
                      >
                        ▸
                      </span>
                      <span className="flex-1">
                        <span className="block text-sm font-medium">
                          {rezumat(t.message)}
                        </span>
                        <span className="mt-0.5 block text-xs text-zinc-500">
                          {t.student_name ?? t.student_email} ·{" "}
                          {dataScurta(t.created_at)}
                          {t.lesson_title && ` · ${t.lesson_title}`}
                          {t.question_text && " · întrebare de test"}
                        </span>
                      </span>
                      <span
                        className={`${badgeCls} ${
                          t.status === "open"
                            ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                            : "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300"
                        }`}
                      >
                        {t.status === "open" ? "Fără răspuns" : "Răspuns"}
                      </span>
                    </button>

                    {desfasurat && (
                      <div className="border-t border-zinc-100 bg-zinc-50/50 px-5 py-4 dark:border-zinc-800/60 dark:bg-zinc-900/30">
                        <p className="text-sm whitespace-pre-wrap text-zinc-800 dark:text-zinc-200">
                          {t.message}
                        </p>

                        {/* Contextul automat trimis de butonul „Nu am înțeles". */}
                        {(t.lesson_title || t.question_text) && (
                          <dl className="mt-3 space-y-1 rounded-lg bg-white px-3 py-2 text-xs text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
                            {t.lesson_title && (
                              <div>
                                <dt className="inline font-medium">Lecția: </dt>
                                <dd className="inline">{t.lesson_title}</dd>
                              </div>
                            )}
                            {t.question_text && (
                              <div>
                                <dt className="inline font-medium">
                                  Întrebarea:{" "}
                                </dt>
                                <dd className="inline">{t.question_text}</dd>
                              </div>
                            )}
                          </dl>
                        )}

                        {t.answer ? (
                          <div className="mt-3 rounded-lg border border-green-200 bg-green-50 px-3 py-2 dark:border-green-900 dark:bg-green-950/40">
                            <p className="text-xs font-medium text-green-800 dark:text-green-300">
                              Răspunsul tău
                              {t.answered_at && ` · ${dataScurta(t.answered_at)}`}
                            </p>
                            <p className="mt-1 text-sm whitespace-pre-wrap text-green-900 dark:text-green-200">
                              {t.answer}
                            </p>
                          </div>
                        ) : (
                          <AnswerForm
                            ticket={t}
                            onAnswered={(answer, answered_at) =>
                              setState((s) =>
                                s.status === "loaded"
                                  ? {
                                      ...s,
                                      tickets: s.tickets.map((x) =>
                                        x.id === t.id
                                          ? {
                                              ...x,
                                              answer,
                                              answered_at,
                                              status: "answered",
                                            }
                                          : x,
                                      ),
                                    }
                                  : s,
                              )
                            }
                          />
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

// Formularul de raspuns al profesorului. Tichetul raspuns se actualizeaza in
// starea listei (nu refetch): filtrul „doar fara raspuns" il scoate imediat din
// lista, ceea ce e exact comportamentul asteptat dupa ce ai terminat de raspuns.
const MAX_ANSWER = 2000;

function AnswerForm({
  ticket,
  onAnswered,
}: {
  ticket: Ticket;
  onAnswered: (answer: string, answeredAt: string) => void;
}) {
  const [deschis, setDeschis] = useState(false);
  const [answer, setAnswer] = useState("");
  const [submit, setSubmit] = useState<Submit>({ status: "idle" });

  if (!deschis) {
    return (
      <button
        type="button"
        onClick={() => setDeschis(true)}
        className={btn("outline", "sm", "mt-3 hover:bg-white")}
      >
        Răspunde
      </button>
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = answer.trim();
    if (!trimmed) {
      setSubmit({ status: "error", message: "Scrie răspunsul întâi." });
      return;
    }
    setSubmit({ status: "saving" });
    try {
      const res = await fetch(`/api/tickets/${ticket.id}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answer: trimmed }),
      });

      if (res.ok) {
        const data = (await res.json()) as {
          ticket?: { answered_at?: string };
        };
        onAnswered(trimmed, data.ticket?.answered_at ?? new Date().toISOString());
        return;
      }
      if (res.status === 403) {
        setSubmit({
          status: "error",
          message: "Nu ai drept de profesor pentru a răspunde.",
        });
        return;
      }
      if (res.status === 409) {
        setSubmit({
          status: "error",
          message: "Tichetul a primit deja un răspuns. Reîmprospătează pagina.",
        });
        return;
      }
      throw new Error(String(res.status));
    } catch {
      setSubmit({
        status: "error",
        message: "Nu am putut trimite răspunsul. Încearcă din nou.",
      });
    }
  }

  const saving = submit.status === "saving";

  return (
    <form onSubmit={onSubmit} className="mt-3">
      <label
        htmlFor={`answer-${ticket.id}`}
        className="block text-sm font-medium"
      >
        Răspunsul tău
      </label>
      <textarea
        id={`answer-${ticket.id}`}
        className={`mt-1 min-h-28 ${inputCls}`}
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        maxLength={MAX_ANSWER}
        disabled={saving}
        placeholder="Explică pe scurt, în termenii lecției."
        autoFocus
      />
      <p className="mt-1 text-xs text-zinc-500">
        {answer.length}/{MAX_ANSWER} · elevul primește un email cu răspunsul.
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button type="submit" disabled={saving} className={btn("primary", "sm")}>
          {saving ? "Se trimite…" : "Trimite răspunsul"}
        </button>
        <button
          type="button"
          onClick={() => setDeschis(false)}
          disabled={saving}
          className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
        >
          Renunță
        </button>
        {submit.status === "error" && (
          <span className="text-sm text-red-600 dark:text-red-400">
            {submit.message}
          </span>
        )}
      </div>
    </form>
  );
}

function sorteazaNoiIntai(tickets: Ticket[]) {
  return tickets
    .slice()
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

function rezumat(message: string) {
  const oLinie = message.replace(/\s+/g, " ").trim();
  return oLinie.length > 110 ? `${oLinie.slice(0, 110)}…` : oLinie;
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
