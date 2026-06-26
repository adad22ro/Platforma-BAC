import type { ReactNode } from "react";

export function Card({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
          {title}
        </h2>
        {subtitle && <span className="text-xs text-zinc-400">{subtitle}</span>}
      </div>
      {children}
    </div>
  );
}

export function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-zinc-100 py-2 last:border-0">
      <span className="text-sm text-zinc-600">{label}</span>
      <span className="text-sm font-medium text-zinc-900">{value}</span>
    </div>
  );
}

export function Empty({ text }: { text: string }) {
  return <p className="py-4 text-sm text-zinc-400">{text}</p>;
}

function formatError(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object") {
    const e = error as Record<string, unknown>;
    // Erorile Supabase au .message / .code / .hint
    if (typeof e.message === "string") {
      const parts = [e.message];
      if (e.code) parts.push(`(cod: ${e.code})`);
      if (e.hint) parts.push(`\nhint: ${e.hint}`);
      return parts.join(" ");
    }
    try {
      return JSON.stringify(error, null, 2);
    } catch {
      return String(error);
    }
  }
  return String(error ?? "Eroare necunoscuta");
}

// Afiseaza eroarea unei sectiuni (foloseste si la debug). Nu darama pagina.
export function ErrorBox({ error }: { error: unknown }) {
  const message = formatError(error);
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-3">
      <p className="text-xs font-semibold text-red-700">Eroare</p>
      <pre className="mt-1 whitespace-pre-wrap break-words text-xs text-red-600">
        {message}
      </pre>
    </div>
  );
}
