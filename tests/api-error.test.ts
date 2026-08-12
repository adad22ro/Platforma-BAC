import { describe, it, expect } from "vitest";
import { apiError } from "@/lib/api-error";

describe("apiError", () => {
  it("deduce codul din statusul HTTP", async () => {
    const cases: [number, string][] = [
      [400, "bad_request"],
      [401, "unauthorized"],
      [402, "premium_required"],
      [403, "forbidden"],
      [404, "not_found"],
      [409, "conflict"],
      [429, "rate_limited"],
      [500, "server_error"],
    ];
    for (const [status, code] of cases) {
      const res = apiError(status);
      expect(res.status).toBe(status);
      expect(await res.json()).toEqual({ error: code });
    }
  });

  it("intoarce JSON, nu text simplu", async () => {
    const res = apiError(403, "Forbidden");
    expect(res.headers.get("content-type")).toContain("application/json");
    expect(await res.json()).toEqual({ error: "forbidden", message: "Forbidden" });
  });

  it("omite `message` daca nu e dat, in loc sa trimita null", async () => {
    expect(await apiError(404).json()).toEqual({ error: "not_found" });
  });

  it("pastreaza neschimbat corpul de la 402", async () => {
    // Contractul care exista deja inainte de normalizare. Formatul comun a fost
    // ales ca superset peste el tocmai ca sa nu fie schimbare cu ruptura.
    expect(await apiError(402).json()).toEqual({ error: "premium_required" });
  });

  it("un status necunoscut nu ramane fara cod", async () => {
    expect(await apiError(418).json()).toEqual({ error: "server_error" });
  });

  it("codul poate fi fortat, cand statusul nu il determina", async () => {
    const res = apiError(400, "prea multe tichete deschise", "rate_limited");
    expect(await res.json()).toEqual({
      error: "rate_limited",
      message: "prea multe tichete deschise",
    });
  });
});
