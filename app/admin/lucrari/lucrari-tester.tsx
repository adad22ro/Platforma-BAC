"use client";

import { useState } from "react";

type Criteriu = {
  slug: string;
  denumire: string;
  puncte_max: number;
  strat: string;
};

type Nota = {
  id: string;
  criteriu_slug: string;
  denumire: string;
  din: number;
  puncte: number | null;
  stare: string;
  sursa: string;
  explicatie: string | null;
};

type Detaliu = {
  lucrare: { id: string; rubrica_slug: string; status: string; text: string };
  criterii: { criteriu_slug: string; denumire: string; din: number; note: Nota[] }[];
  total: { puncte: number; din: number; in_asteptare: number };
};

async function call(method: string, url: string, body?: unknown) {
  const res = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let parsed: unknown = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = text;
  }
  return { status: res.status, body: parsed };
}

const btn =
  "rounded border border-zinc-300 px-2.5 py-1 text-xs text-zinc-700 hover:bg-zinc-100 disabled:opacity-40";
const input = "rounded border border-zinc-300 px-2 py-1 text-sm";

// Un exemplu care trece criteriile deterministe: trei paragrafe, peste minimul de
// cuvinte, conectori, si o concluzie marcata. Punctul de plecare, ca sa nu trebuiasca
// sa scrii un eseu ca sa vezi daca merge fluxul.
const EXEMPLU = `Textul propus spre analiza sustine ca lectura formeaza gandirea critica a tinerilor.

In primul rand, cititul expune elevul la puncte de vedere diferite de ale sale. De asemenea, il obliga sa urmareasca un argument pe mai multe pagini, ceea ce niciun mesaj scurt nu cere. Pe de alta parte, efectul nu apare dupa o singura carte, ci dupa un obicei tinut luni intregi.

In concluzie, lectura constanta ramane cel mai ieftin exercitiu de gandire pe care il are la indemana un elev.`;

const CULOARE_SURSA: Record<string, string> = {
  auto: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  mentor: "bg-sky-50 text-sky-700 ring-sky-200",
  elev: "bg-amber-50 text-amber-700 ring-amber-200",
  ai: "bg-violet-50 text-violet-700 ring-violet-200",
};

function Eticheta({ text, tip }: { text: string; tip?: string }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs ring-1 ring-inset ${
        CULOARE_SURSA[text] ?? "bg-zinc-50 text-zinc-600 ring-zinc-200"
      }`}
      title={tip}
    >
      {text}
    </span>
  );
}

export function LucrariTester({ rubrici }: { rubrici: { slug: string; denumire: string; criterii: Criteriu[] }[] }) {
  const [rubrica, setRubrica] = useState(rubrici[0]?.slug ?? "");
  const [text, setText] = useState(EXEMPLU);
  const [lucrareId, setLucrareId] = useState("");
  const [detaliu, setDetaliu] = useState<Detaliu | null>(null);
  const [last, setLast] = useState<{ status: number; body: unknown } | null>(null);
  const [ocupat, setOcupat] = useState(false);
  const [note, setNote] = useState<Record<string, string>>({});

  async function incarca(id: string) {
    const r = await call("GET", `/api/lucrari/${id}`);
    setLast(r);
    if (r.status === 200) setDetaliu(r.body as Detaliu);
  }

  async function trimite() {
    setOcupat(true);
    const r = await call("POST", "/api/lucrari", { rubrica_slug: rubrica, text });
    setLast(r);
    setOcupat(false);
    if (r.status === 201) {
      // Incarcam detaliul direct, nu printr-un efect declansat de schimbarea
      // id-ului: efectul ar fi fost un ocol prin care ajungeam in acelasi loc, cu
      // o randare in plus si cu o regula de lint incalcata pe drum.
      const id = (r.body as { lucrare: { id: string } }).lucrare.id;
      setLucrareId(id);
      await incarca(id);
    }
  }

  async function daNota(slug: string, valoare: string) {
    const brut = valoare.trim();
    const puncte = brut === "" ? null : Number(brut);
    const r = await call("PUT", `/api/lucrari/${lucrareId}/note`, {
      criteriu_slug: slug,
      puncte,
      explicatie: "Notat din bancul de test",
    });
    setLast(r);
    if (r.status === 200) await incarca(lucrareId);
  }

  const criteriiRubrica = rubrici.find((r) => r.slug === rubrica)?.criterii ?? [];

  return (
    <div className="space-y-6">
      {/* 1. Trimiterea lucrarii */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-sm text-zinc-600">Rubrica</label>
          <select className={input} value={rubrica} onChange={(e) => setRubrica(e.target.value)}>
            {rubrici.map((r) => (
              <option key={r.slug} value={r.slug}>
                {r.denumire} ({r.slug})
              </option>
            ))}
          </select>
          <button className={btn} onClick={() => setText(EXEMPLU)}>
            Text exemplu
          </button>
          <button className={btn} onClick={trimite} disabled={ocupat || !rubrica}>
            {ocupat ? "Se trimite…" : "Trimite lucrarea"}
          </button>
        </div>

        <textarea
          className={`${input} h-44 w-full font-mono text-xs`}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Textul lucrarii…"
        />
        <p className="text-xs text-zinc-500">
          Paragrafele se despart cu un rând gol — de asta depinde criteriul
          {" "}&bdquo;părțile componente&rdquo;.
        </p>
      </div>

      {/* 2. Rezultatul */}
      {detaliu && (
        <div className="space-y-3 border-t border-zinc-200 pt-5">
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <span className="text-sm font-medium text-zinc-900">
              {detaliu.total.puncte} din {detaliu.total.din} puncte notate
            </span>
            {detaliu.total.in_asteptare > 0 && (
              <span className="text-sm text-amber-700">
                {detaliu.total.in_asteptare}p așteaptă un om
              </span>
            )}
            <span className="text-xs text-zinc-500">
              status: {detaliu.lucrare.status} · {detaliu.lucrare.id.slice(0, 8)}
            </span>
          </div>

          <ul className="divide-y divide-zinc-100 rounded-lg border border-zinc-200">
            {criteriiRubrica.map((c) => {
              const grup = detaliu.criterii.find((g) => g.criteriu_slug === c.slug);
              return (
                <li key={c.slug} className="px-3 py-2.5">
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                    <span className="text-sm font-medium text-zinc-900">{c.denumire}</span>
                    <span className="text-xs tabular-nums text-zinc-500">max {c.puncte_max}p</span>
                    <Eticheta text={c.strat} tip="stratul de corectare din barem" />

                    <span className="ml-auto flex items-center gap-1">
                      <input
                        className={`${input} w-16 text-right tabular-nums`}
                        placeholder="—"
                        value={note[c.slug] ?? ""}
                        onChange={(e) => setNote({ ...note, [c.slug]: e.target.value })}
                      />
                      <button className={btn} onClick={() => daNota(c.slug, note[c.slug] ?? "")}>
                        Notează
                      </button>
                    </span>
                  </div>

                  {grup && grup.note.length > 0 && (
                    <ul className="mt-1.5 space-y-1">
                      {grup.note.map((n) => (
                        <li key={n.id} className="flex flex-wrap items-baseline gap-2 text-xs">
                          <Eticheta text={n.sursa} />
                          <span className="tabular-nums text-zinc-700">
                            {n.puncte === null ? "nenotat" : `${n.puncte}p`}
                          </span>
                          {n.stare !== "acordat" && (
                            <span className="text-zinc-500">({n.stare})</span>
                          )}
                          {n.explicatie && <span className="text-zinc-500">{n.explicatie}</span>}
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>

          <p className="text-xs text-zinc-500">
            Lasă câmpul gol și apasă &bdquo;Notează&rdquo; ca să retragi o notă — devine
            {" "}&bdquo;nenotat&rdquo;, ceea ce NU e același lucru cu 0.
          </p>
        </div>
      )}

      {/* 3. Raspunsul brut, pentru cand ceva nu merge */}
      {last && (
        <div className="border-t border-zinc-200 pt-4">
          <div className="mb-1 text-xs text-zinc-500">Ultimul răspuns — status {last.status}</div>
          <pre className="max-h-56 overflow-auto rounded bg-zinc-50 p-3 text-xs text-zinc-700">
            {JSON.stringify(last.body, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
