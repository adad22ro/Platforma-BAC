"use client";

import { useCallback, useEffect, useState } from "react";
import { btn, inputCls, listCls } from "../_components/ui";
import type { ChaptersState, Question, Submit } from "./types";

// ATENTIE: rutele /api/questions si /api/chapters/[id]/questions?all=1 nu exista
// inca (sarcina Andrei, Sapt. 7-8). Contractul e in docs/api.md.

type QuestionsState =
  | { status: "idle" } // niciun capitol selectat
  | { status: "loading" }
  | { status: "error" }
  | { status: "loaded"; questions: Question[] };

const MIN_OPTIONS = 2;
const MAX_OPTIONS = 6;

// Formular „Intrebare test" + lista intrebarilor din capitolul selectat.
export function TeacherQuestions({ list }: { list: ChaptersState }) {
  const [chapterId, setChapterId] = useState("");
  const [questions, setQuestions] = useState<QuestionsState>({ status: "idle" });

  // Campurile formularului
  const [text, setText] = useState("");
  const [options, setOptions] = useState<string[]>(["", "", "", ""]);
  const [correct, setCorrect] = useState(0);
  const [explanation, setExplanation] = useState("");
  const [published, setPublished] = useState(false);
  const [submit, setSubmit] = useState<Submit>({ status: "idle" });

  const loadQuestions = useCallback(async (id: string) => {
    if (!id) {
      setQuestions({ status: "idle" });
      return;
    }
    setQuestions({ status: "loading" });
    try {
      // `all=1` cere si intrebarile draft — vizibile doar profesorului.
      const res = await fetch(`/api/chapters/${id}/questions?all=1`);
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as { questions: Question[] };
      setQuestions({ status: "loaded", questions: data.questions });
    } catch {
      setQuestions({ status: "error" });
    }
  }, []);

  useEffect(() => {
    // loadQuestions e async: setState se intampla dupa await, nu sincron in efect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadQuestions(chapterId);
  }, [chapterId, loadQuestions]);

  function setOption(index: number, value: string) {
    setOptions((o) => o.map((v, i) => (i === index ? value : v)));
  }

  function addOption() {
    setOptions((o) => (o.length < MAX_OPTIONS ? [...o, ""] : o));
  }

  function removeOption(index: number) {
    setOptions((o) => (o.length > MIN_OPTIONS ? o.filter((_, i) => i !== index) : o));
    // Daca stergem varianta corecta (sau una dinaintea ei), mutam marcajul.
    setCorrect((c) => (index < c ? c - 1 : index === c ? 0 : c));
  }

  function resetForm() {
    setText("");
    setOptions(["", "", "", ""]);
    setCorrect(0);
    setExplanation("");
    setPublished(false);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!chapterId) {
      setSubmit({ status: "error", message: "Alege întâi capitolul." });
      return;
    }
    const trimmedText = text.trim();
    if (!trimmedText) {
      setSubmit({ status: "error", message: "Textul întrebării e obligatoriu." });
      return;
    }
    const trimmedOptions = options.map((o) => o.trim());
    if (trimmedOptions.some((o) => !o)) {
      setSubmit({ status: "error", message: "Completează toate variantele." });
      return;
    }
    setSubmit({ status: "saving" });

    // Pozitia noii intrebari: la coada celor existente din capitol.
    const orderIndex =
      questions.status === "loaded" ? questions.questions.length : 0;

    try {
      const res = await fetch("/api/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chapter_id: chapterId,
          text: trimmedText,
          options: trimmedOptions,
          correct_option: correct,
          explanation: explanation.trim() || null,
          order_index: orderIndex,
          published,
        }),
      });

      if (res.status === 201) {
        setSubmit({ status: "ok", title: trimmedText });
        resetForm();
        await loadQuestions(chapterId);
        return;
      }
      if (res.status === 403) {
        setSubmit({
          status: "error",
          message: "Nu ai drept de profesor pentru a crea întrebări.",
        });
        return;
      }
      if (res.status === 400) {
        setSubmit({
          status: "error",
          message: "Date invalide: verifică textul, variantele și capitolul ales.",
        });
        return;
      }
      throw new Error(String(res.status));
    } catch {
      setSubmit({
        status: "error",
        message: "Nu am putut salva întrebarea. Încearcă din nou.",
      });
    }
  }

  return (
    <div className="space-y-6">
      <section>
        <h2 className="text-xl font-semibold">Întrebare test</h2>

        {list.status === "loaded" && list.chapters.length === 0 ? (
          <p className="mt-4 text-sm text-zinc-500">
            Creează întâi un capitol — întrebările aparțin unui capitol.
          </p>
        ) : (
          <form onSubmit={onSubmit} className="mt-4 space-y-4">
            <div>
              <label htmlFor="qs-chapter" className="block text-sm font-medium">
                Capitol <span className="text-red-500">*</span>
              </label>
              <select
                id="qs-chapter"
                className={`mt-1 ${inputCls}`}
                value={chapterId}
                onChange={(e) => setChapterId(e.target.value)}
                disabled={list.status !== "loaded"}
              >
                <option value="">
                  {list.status === "loading"
                    ? "Se încarcă capitolele…"
                    : list.status === "error"
                      ? "Capitolele nu s-au putut încărca"
                      : "— alege capitolul —"}
                </option>
                {list.status === "loaded" &&
                  list.chapters.map((c) => (
                    <option key={c.id} value={c.id}>
                      #{c.order_index} · {c.title}
                      {c.published ? "" : " (draft)"}
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label htmlFor="qs-text" className="block text-sm font-medium">
                Întrebarea <span className="text-red-500">*</span>
              </label>
              <textarea
                id="qs-text"
                className={`mt-1 min-h-20 ${inputCls}`}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="ex. Ce curent literar este ilustrat de „Testament”?"
              />
            </div>

            <fieldset>
              <legend className="text-sm font-medium">
                Variante <span className="text-red-500">*</span>
                <span className="ml-2 font-normal text-zinc-500">
                  bifează varianta corectă
                </span>
              </legend>
              <div className="mt-2 space-y-2">
                {options.map((option, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="qs-correct"
                      className="h-4 w-4 shrink-0"
                      checked={correct === i}
                      onChange={() => setCorrect(i)}
                      aria-label={`Varianta ${i + 1} este corectă`}
                    />
                    <input
                      className={inputCls}
                      value={option}
                      onChange={(e) => setOption(i, e.target.value)}
                      placeholder={`Varianta ${i + 1}`}
                      maxLength={300}
                    />
                    <button
                      type="button"
                      onClick={() => removeOption(i)}
                      disabled={options.length <= MIN_OPTIONS}
                      className="shrink-0 rounded-lg px-2 py-1 text-sm text-zinc-500 transition-colors hover:bg-zinc-100 disabled:opacity-30 dark:hover:bg-zinc-800"
                      aria-label={`Șterge varianta ${i + 1}`}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
              {options.length < MAX_OPTIONS && (
                <button
                  type="button"
                  onClick={addOption}
                  className="mt-2 text-sm text-indigo-600 hover:text-indigo-500"
                >
                  + Adaugă variantă
                </button>
              )}
            </fieldset>

            <div>
              <label htmlFor="qs-expl" className="block text-sm font-medium">
                Explicație <span className="text-zinc-400">(opțional)</span>
              </label>
              <textarea
                id="qs-expl"
                className={`mt-1 min-h-20 ${inputCls}`}
                value={explanation}
                onChange={(e) => setExplanation(e.target.value)}
                placeholder="Se arată elevului după corectare."
              />
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-zinc-300"
                checked={published}
                onChange={(e) => setPublished(e.target.checked)}
              />
              Publică imediat (altfel rămâne draft)
            </label>

            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={submit.status === "saving"}
                className={btn()}
              >
                {submit.status === "saving"
                  ? "Se salvează…"
                  : "Adaugă întrebarea"}
              </button>
              {submit.status === "ok" && (
                <span className="text-sm text-green-600 dark:text-green-400">
                  Întrebarea a fost adăugată.
                </span>
              )}
              {submit.status === "error" && (
                <span className="text-sm text-red-600 dark:text-red-400">
                  {submit.message}
                </span>
              )}
            </div>
          </form>
        )}
      </section>

      {/* Intrebarile capitolului selectat */}
      {chapterId && (
        <section>
          <h3 className="text-sm font-semibold text-zinc-600 dark:text-zinc-400">
            Întrebările capitolului
          </h3>

          {questions.status === "loading" && (
            <p className="mt-3 text-sm text-zinc-500">Se încarcă…</p>
          )}
          {questions.status === "error" && (
            <p className="mt-3 text-sm text-red-600 dark:text-red-400">
              Nu am putut încărca întrebările.
            </p>
          )}
          {questions.status === "loaded" &&
            (questions.questions.length === 0 ? (
              <p className="mt-3 text-sm text-zinc-500">
                Capitolul nu are încă întrebări.
              </p>
            ) : (
              <ul className={`mt-3 ${listCls}`}>
                {questions.questions.map((q) => (
                  <li key={q.id} className="px-5 py-3 text-sm">
                    <div className="flex items-center gap-3">
                      <span className="text-zinc-400">#{q.order_index}</span>
                      <span className="flex-1 font-medium">{q.text}</span>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          q.published
                            ? "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                            : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                        }`}
                      >
                        {q.published ? "Publicat" : "Draft"}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-zinc-500">
                      Corect: {q.options[q.correct_option] ?? "—"} ·{" "}
                      {q.options.length} variante
                    </p>
                  </li>
                ))}
              </ul>
            ))}
        </section>
      )}
    </div>
  );
}
