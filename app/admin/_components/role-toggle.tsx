"use client";

import { useState } from "react";

// Buton mic care comuta rolul unui user (student <-> teacher) din panoul /admin.
// Apeleaza /api/admin/set-role (protejat prin allowlist ADMIN_EMAILS).
export function RoleToggle({
  clerkId,
  role,
}: {
  clerkId: string | null;
  role: string | null;
}) {
  const [current, setCurrent] = useState(role ?? "student");
  const [loading, setLoading] = useState(false);
  const next = current === "teacher" ? "student" : "teacher";

  async function change() {
    if (!clerkId) return;
    setLoading(true);
    try {
      const res = await fetch("/api/admin/set-role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clerk_id: clerkId, role: next }),
      });
      if (res.ok) setCurrent(next);
    } finally {
      setLoading(false);
    }
  }

  return (
    <span className="inline-flex items-center gap-2">
      <span className="text-zinc-500">{current}</span>
      <button
        onClick={change}
        disabled={loading || !clerkId}
        className="rounded border border-zinc-300 px-2 py-0.5 text-xs text-zinc-600 hover:bg-zinc-50 disabled:opacity-40"
        title={`Schimba in ${next}`}
      >
        {loading ? "…" : `→ ${next}`}
      </button>
    </span>
  );
}
