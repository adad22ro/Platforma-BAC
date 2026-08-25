import { describe, it, expect } from "vitest";
import {
  numaraCuvinte,
  conectoriGasiti,
  aplicaCriteriu,
  corecteazaStrat1,
  type ContextCorectare,
} from "@/lib/corectare-strat1";
import { rubricaDupaSlug, type Criteriu } from "@/lib/barem";

function criteriu(over: Partial<Criteriu>): Criteriu {
  return {
    slug: "test",
    denumire: "Criteriu de test",
    puncte_max: 1,
    strat: "auto",
    verificator: "acordat_implicit",
    praguri: [],
    ...over,
  };
}

const ctx = (text: string, textSuport?: string): ContextCorectare => ({
  text,
  textSuport,
});

describe("numaraCuvinte", () => {
  it("numara doar secventele care contin litere", () => {
    expect(numaraCuvinte("Un text de cinci cuvinte")).toBe(5);
    expect(numaraCuvinte("  spatii   multiple  ")).toBe(2);
  });

  it("nu se lasa umflat cu cifre si semne", () => {
    // Altfel un elev ar putea trece de pragul de 150 scriind numere.
    expect(numaraCuvinte("cuvant 1 2 3 4 5 — , .")).toBe(1);
  });

  it("numara corect textul cu diacritice", () => {
    expect(numaraCuvinte("Această frază are cinci cuvinte")).toBe(5);
  });
});

describe("conectoriGasiti", () => {
  it("gaseste conectorii scrisi cu diacritice", () => {
    expect(conectoriGasiti("În primul rând, este important.")).toContain(
      "in primul rand"
    );
  });

  it("ii gaseste si fara diacritice", () => {
    // Elevii scriu si asa; un conector n-are voie sa dispara din cauza asta.
    expect(conectoriGasiti("In primul rand, asadar.")).toEqual(
      expect.arrayContaining(["in primul rand", "asadar"])
    );
  });

  it("nu inventeaza conectori", () => {
    expect(conectoriGasiti("Un text oarecare fara legaturi.")).toEqual([]);
  });
});

describe("numar_cuvinte", () => {
  const c = criteriu({
    slug: "min-150",
    puncte_max: 1,
    verificator: "numar_cuvinte",
    parametri: { minim: 150 },
  });

  it("da punctul peste prag", () => {
    const r = aplicaCriteriu(c, ctx("cuvant ".repeat(150)));
    expect(r.puncte).toBe(1);
    expect(r.stare).toBe("acordat");
  });

  it("nu da punctul sub prag, si spune cate cuvinte are", () => {
    const r = aplicaCriteriu(c, ctx("cuvant ".repeat(149)));
    expect(r.puncte).toBe(0);
    expect(r.explicatie).toContain("149");
    expect(r.explicatie).toContain("150");
  });
});

describe("parti_componente", () => {
  const c = criteriu({ verificator: "parti_componente" });

  it("da punctul la trei paragrafe", () => {
    expect(aplicaCriteriu(c, ctx("Intro.\n\nCuprins.\n\nIncheiere.")).puncte).toBe(1);
  });

  it("nu da punctul la doua", () => {
    const r = aplicaCriteriu(c, ctx("Intro.\n\nCuprins."));
    expect(r.puncte).toBe(0);
    expect(r.explicatie).toContain("introducere, cuprins, incheiere");
  });
});

describe("concluzie", () => {
  const c = criteriu({ verificator: "concluzie" });

  it("recunoaste concluzia din ultimul paragraf", () => {
    const r = aplicaCriteriu(c, ctx("Cuprins.\n\nÎn concluzie, sustin opinia."));
    expect(r.puncte).toBe(1);
  });

  it("nu se lasa pacalit de un marcator aflat la inceput", () => {
    // „Asadar" in primul paragraf nu e concluzie — baremul cere incheiere.
    const r = aplicaCriteriu(c, ctx("Asadar incep.\n\nUn cuprins oarecare."));
    expect(r.puncte).toBe(0);
  });
});

describe("citat", () => {
  const c = criteriu({ verificator: "citat" });
  const suport = "Bătrânul privea în zare, cu mâinile în buzunare.";

  it("valideaza citatul care chiar apare in textul-suport", () => {
    const r = aplicaCriteriu(c, ctx('Autorul scrie „privea în zare".', suport));
    expect(r.puncte).toBe(1);
  });

  it("respinge ghilimelele cu text inventat", () => {
    const r = aplicaCriteriu(c, ctx('Autorul scrie „zbura peste mare".', suport));
    expect(r.puncte).toBe(0);
    expect(r.explicatie).toContain("nu apare in textul-suport");
  });

  it("fara textul-suport acorda punctul, dar spune ca n-a putut verifica", () => {
    const r = aplicaCriteriu(c, ctx('Autorul scrie „ceva".'));
    expect(r.puncte).toBe(1);
    expect(r.explicatie).toContain("Nu am avut textul-suport");
  });

  it("nu da punctul fara niciun citat", () => {
    expect(aplicaCriteriu(c, ctx("Un text fara citate.", suport)).puncte).toBe(0);
  });
});

describe("raspuns_in_enunt", () => {
  const c = criteriu({ verificator: "raspuns_in_enunt" });

  it("da punctul pentru un enunt complet", () => {
    const r = aplicaCriteriu(c, ctx("Sensul cuvantului este acela de tristete."));
    expect(r.puncte).toBe(1);
  });

  it("nu da punctul pentru raspuns eliptic", () => {
    const r = aplicaCriteriu(c, ctx("tristete"));
    expect(r.puncte).toBe(0);
  });

  it("aminteste ca punctul se da si cu raspuns gresit la continut", () => {
    // Exact nuanta din barem pe care putini elevi o stiu.
    const r = aplicaCriteriu(c, ctx("Sensul cuvantului este acela de bucurie."));
    expect(r.explicatie).toContain("chiar daca raspunsul e gresit");
  });
});

describe("languagetool — cat timp unealta lipseste", () => {
  const c = criteriu({ verificator: "languagetool", puncte_max: 2 });

  it("nu da 0, ci marcheaza criteriul ca indisponibil", () => {
    // Regula centrala a stratului 1: un 0 nemeritat, dat tacit fiindca unealta
    // lipseste, e mai rau decat un criteriu lasat nenotat.
    const r = aplicaCriteriu(c, ctx("Un text oarecare."));
    expect(r.stare).toBe("indisponibil");
    expect(r.puncte).toBeNull();
  });
});

describe("corecteazaStrat1 — pe rubricile reale", () => {
  it("noteaza doar criteriile de pe stratul auto", () => {
    const r = rubricaDupaSlug("s1b-text-argumentativ")!;
    const rez = corecteazaStrat1(r, ctx("Un text scurt."));
    expect(rez.criterii.every((c) => c.slug.startsWith("s1b-"))).toBe(true);
    // Rubrica are 20 de puncte, dar doar 6 sunt pe stratul auto.
    expect(rez.criterii).toHaveLength(6);
  });

  it("separa punctele acordate de cele nenotate", () => {
    const r = rubricaDupaSlug("s1b-text-argumentativ")!;
    const rez = corecteazaStrat1(r, ctx("Un text scurt."));
    // Doua criterii de languagetool, cate 1p, raman nenotate.
    expect(rez.puncteNenotate).toBe(2);
    // Iar `dinCatePosibile` le exclude, ca elevul sa nu creada ca le-a pierdut:
    // concluzie 1 + conectori 2 + asezare 1 + minim cuvinte 1 = 5.
    expect(rez.dinCatePosibile).toBe(5);
  });

  it("da punctajul asteptat pe un text argumentativ corect", () => {
    const r = rubricaDupaSlug("s1b-text-argumentativ")!;
    const text =
      "În primul rând, lectura dezvoltă vocabularul.\n\n" +
      "Pe de altă parte, ea educă empatia, deoarece cititorul trăiește alte vieți.\n\n" +
      "În concluzie, cititul rămâne esențial. " +
      "cuvant ".repeat(150);
    const rez = corecteazaStrat1(r, ctx(text));
    // Toate cele cinci puncte notabile se iau: concluzie, conectori, asezare,
    // numar de cuvinte.
    expect(rez.puncte).toBe(5);
    expect(rez.puncte).toBe(rez.dinCatePosibile);
    expect(rez.puncteNenotate).toBe(2);
  });

  it("da 0 pe criteriile ratate, fara sa atinga cele indisponibile", () => {
    const r = rubricaDupaSlug("s1b-text-argumentativ")!;
    const rez = corecteazaStrat1(r, ctx("Prea scurt."));
    const conectori = rez.criterii.find((c) => c.slug === "s1b-conectori");
    expect(conectori?.puncte).toBe(0);
    expect(rez.puncteNenotate).toBe(2);
  });
});
