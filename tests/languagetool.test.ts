import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { verificaLimba } from "@/lib/languagetool";

// Ce conteaza aici nu e numaratoarea in sine, ci ca fiecare mod de esec intoarce
// `null` — adica „nu stim", nu „zero greseli". Un `{ortografie: 0}` intors din
// greseala la un serviciu cazut ar da punctajul maxim pe ortografie unui text plin
// de greseli, tacut.

const URL_TEST = "http://languagetool.local";

function raspuns(categorii: string[]) {
  return {
    ok: true,
    json: async () => ({
      matches: categorii.map((id) => ({ rule: { category: { id } } })),
    }),
  };
}

describe("verificaLimba", () => {
  const fetchInitial = globalThis.fetch;

  beforeEach(() => {
    process.env.LANGUAGETOOL_URL = URL_TEST;
  });

  afterEach(() => {
    globalThis.fetch = fetchInitial;
    delete process.env.LANGUAGETOOL_URL;
  });

  it("intoarce null daca serviciul nu e configurat", async () => {
    delete process.env.LANGUAGETOOL_URL;
    expect(await verificaLimba("un text")).toBeNull();
  });

  it("imparte greselile pe categoriile din barem", async () => {
    globalThis.fetch = vi.fn(async () =>
      raspuns(["TYPOS", "TYPOS", "PUNCTUATION", "GRAMMAR"])
    ) as unknown as typeof fetch;

    expect(await verificaLimba("un text")).toEqual({
      ortografie: 2,
      punctuatie: 1,
      altele: 1,
    });
  });

  it("numara TYPOGRAPHY ca punctuatie", async () => {
    globalThis.fetch = vi.fn(async () =>
      raspuns(["TYPOGRAPHY"])
    ) as unknown as typeof fetch;

    const r = await verificaLimba("un text");
    expect(r?.punctuatie).toBe(1);
  });

  it("intoarce null daca serviciul raspunde cu eroare", async () => {
    globalThis.fetch = vi.fn(async () => ({ ok: false })) as unknown as typeof fetch;
    expect(await verificaLimba("un text")).toBeNull();
  });

  it("intoarce null daca reteaua cade", async () => {
    globalThis.fetch = vi.fn(async () => {
      throw new Error("ECONNREFUSED");
    }) as unknown as typeof fetch;
    expect(await verificaLimba("un text")).toBeNull();
  });

  it("nu cheama serviciul pentru text gol", async () => {
    const spion = vi.fn();
    globalThis.fetch = spion as unknown as typeof fetch;
    expect(await verificaLimba("   ")).toEqual({
      ortografie: 0,
      punctuatie: 0,
      altele: 0,
    });
    expect(spion).not.toHaveBeenCalled();
  });
});
