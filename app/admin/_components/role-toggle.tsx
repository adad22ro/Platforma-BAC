"use client";

import { useState } from "react";

// Selector de rol pentru un user, din panoul /admin.
// Apeleaza /api/admin/set-role (protejat prin allowlist ADMIN_EMAILS).
//
// A fost buton de comutare cat existau doua roluri. Cu aparitia mentorului,
// „urmatorul rol" nu mai are sens — trei valori nu se pot roti dintr-un buton fara
// sa devina ghicitoare pentru cine apasa.
const ROLURI = [
  { valoare: "student", eticheta: "student", explicatie: "invata" },
  { valoare: "teacher", eticheta: "profesor", explicatie: "scrie continut si corecteaza" },
  { valoare: "mentor", eticheta: "mentor", explicatie: "corecteaza si raspunde la tichete" },
] as const;

export function RoleToggle({
  clerkId,
  role,
}: {
  clerkId: string | null;
  role: string | null;
}) {
  const [current, setCurrent] = useState(role ?? "student");
  const [loading, setLoading] = useState(false);
  const [eroare, setEroare] = useState(false);

  async function change(nou: string) {
    if (!clerkId || nou === current) return;
    setLoading(true);
    setEroare(false);
    try {
      const res = await fetch("/api/admin/set-role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clerk_id: clerkId, role: nou }),
      });
      // Fara feedback la esec, adminul ar crede ca a schimbat rolul cand de fapt
      // nu s-a intamplat nimic — iar drepturile sunt exact lucrul la care asta
      // conteaza.
      if (res.ok) setCurrent(nou);
      else setEroare(true);
    } catch {
      setEroare(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <span className="inline-flex items-center gap-2">
      <select
        value={current}
        onChange={(e) => change(e.target.value)}
        disabled={loading || !clerkId}
        className="rounded border border-zinc-300 px-2 py-0.5 text-xs text-zinc-600 disabled:opacity-40"
        title={ROLURI.find((r) => r.valoare === current)?.explicatie}
      >
        {ROLURI.map((r) => (
          <option key={r.valoare} value={r.valoare}>
            {r.eticheta}
          </option>
        ))}
      </select>
      {loading && <span className="text-xs text-zinc-400">…</span>}
      {eroare && (
        <span className="text-xs text-red-600" title="Rolul n-a fost schimbat">
          eroare
        </span>
      )}
    </span>
  );
}
