"use client";

import { useEffect, useState } from "react";

// Porneste Stripe Checkout si redirectioneaza userul la pagina de plata.
// Folosit in doua locuri:
//  - dupa inregistrare cu ?plan=premium (forceRedirectUrl din pagina de sign-up)
//  - de butonul "Upgrade" din contul elevului
export default function UpgradePage() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch("/api/checkout", { method: "POST" });
        if (!res.ok) throw new Error(await res.text());
        const { url } = await res.json();
        if (!url) throw new Error("Raspuns invalid de la server (lipseste url).");
        if (!cancelled) window.location.href = url;
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Eroare necunoscuta.");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      {error ? (
        <>
          <p className="text-red-600">Nu am putut porni plata: {error}</p>
          <button
            onClick={() => window.location.reload()}
            className="rounded bg-black px-4 py-2 text-white"
          >
            Incearca din nou
          </button>
        </>
      ) : (
        <p className="text-gray-600">Te redirectionam catre pagina de plata…</p>
      )}
    </div>
  );
}
