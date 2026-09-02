import { describe, it, expect } from "vitest";
import {
  incarcaBarem,
  valideazaBarem,
  rubricaDupaSlug,
  puncteAutomatizabile,
  type Barem,
  type Rubrica,
} from "@/lib/barem";

// Testele astea au doua roluri diferite, si merita separate mental:
//
//   1. Verifica fisierul REAL `data/barem.json`. Astea sunt plasa de siguranta
//      pentru transcriere: daca cineva corecteaza un prag si greseste suma, CI-ul
//      spune exact unde. Baremul produce note, deci o greseala tacuta e scumpa.
//
//   2. Verifica validatorul insusi, pe date fabricate. Fara ele, un validator care
//      nu detecteaza nimic ar face grupa 1 sa treaca degeaba.

// Rubrica minimala valida, de pornire pentru cazurile negative.
function rubricaOk(): Rubrica {
  return {
    slug: "test-rubrica",
    subiect: "I.A",
    denumire: "Rubrica de test",
    profil: null,
    puncte_total: 2,
    minim_cuvinte: null,
    criterii: [
      {
        slug: "test-continut",
        denumire: "Continut",
        puncte_max: 1,
        strat: "ai",
        verificator: null,
        praguri: [],
      },
      {
        slug: "test-cuvinte",
        denumire: "Numar minim de cuvinte",
        puncte_max: 1,
        strat: "auto",
        verificator: "numar_cuvinte",
        parametri: { minim: 150 },
        praguri: [
          { puncte: 1, conditie: "cel putin 150 de cuvinte" },
          { puncte: 0, conditie: "sub 150 de cuvinte" },
        ],
      },
    ],
  };
}

function baremCu(r: Rubrica): Barem {
  return { versiune_document: "test", sursa: "test", rubrici: [r] };
}

describe("data/barem.json — fisierul real", () => {
  it("trece validarea fara nicio problema", () => {
    const probleme = valideazaBarem(incarcaBarem());
    expect(probleme).toEqual([]);
  });

  it("are rubricile de la toate cele trei subiecte", () => {
    const b = incarcaBarem();
    const subiecte = new Set(b.rubrici.map((r) => r.subiect));
    expect(subiecte).toEqual(new Set(["I.A", "I.B", "II", "III"]));
  });

  it("pastreaza punctajele oficiale pe subiecte", () => {
    // Cifrele vin din docs/bac-barem-analiza.md. Daca se schimba aici fara sa se
    // schimbe si in barem, una dintre cele doua e gresita.
    expect(rubricaDupaSlug("s1b-text-argumentativ")?.puncte_total).toBe(20);
    expect(rubricaDupaSlug("s2-interpretare")?.puncte_total).toBe(10);
    expect(rubricaDupaSlug("s3-redactare")?.puncte_total).toBe(12);
    expect(rubricaDupaSlug("s3-continut-incadrare")?.puncte_total).toBe(18);
    expect(rubricaDupaSlug("s3-continut-personaj")?.puncte_total).toBe(18);
  });

  it("pastreaza limitele de cuvinte din barem (50 / 150 / 400)", () => {
    expect(rubricaDupaSlug("s2-interpretare")?.minim_cuvinte).toBe(50);
    expect(rubricaDupaSlug("s1b-text-argumentativ")?.minim_cuvinte).toBe(150);
    expect(rubricaDupaSlug("s3-redactare")?.minim_cuvinte).toBe(400);
  });

  it("codifica pragul de ortografie de la Subiectul III: 0-1 = 2p, 2 = 1p, 3+ = 0p", () => {
    const orto = rubricaDupaSlug("s3-redactare")?.criterii.find(
      (c) => c.slug === "s3-ortografie"
    );
    expect(orto?.praguri.map((p) => p.puncte)).toEqual([2, 1, 0]);
  });

  it("da 17 puncte automatizabile pe rubricile modelate", () => {
    // Numarul e fixat deliberat: daca se schimba, cineva a mutat un criteriu intre
    // straturi si trebuie sa fie o decizie constienta, nu un efect secundar.
    //
    // De ce 17 si nu ~20, cat estimeaza analiza (§6): rubrica `s1a-cerinta` e
    // modelata O SINGURA data, desi Subiectul I.A are cinci cerinte identice ca
    // structura. Instantiate toate cinci, cele 2 puncte automatizabile ale ei devin
    // 10, si totalul trece de 20. Estimarea din document numara examenul intreg;
    // aici numaram rubricile distincte.
    const total = incarcaBarem().rubrici.reduce(
      (s, r) => s + puncteAutomatizabile(r),
      0
    );
    expect(total).toBe(17);
  });

  it("nu tine pe stratul auto criterii cu praguri calitative", () => {
    // Regula: `auto` inseamna verificabil fara nicio interpretare. „Stil si
    // vocabular adecvate" nu e. Criteriile astea au fost mutate pe `ai` dupa ce
    // prima transcriere le pusese gresit pe `auto`.
    const auto = incarcaBarem()
      .rubrici.flatMap((r) => r.criterii)
      .filter((c) => c.strat === "auto");
    expect(auto.map((c) => c.slug)).not.toContain("s3-limba-literara");
    expect(auto.map((c) => c.slug)).not.toContain("s2-limba-literara");
  });

  it("fiecare criteriu de limba are categorie si prag numeric", () => {
    // Fara `max_greseli`, pragul „0-1 greseli" ar trebui parsat din text — fragil
    // exact acolo unde nu ne permitem: la note.
    const limba = incarcaBarem()
      .rubrici.flatMap((r) => r.criterii)
      .filter((c) => c.verificator === "languagetool");
    expect(limba.length).toBeGreaterThan(0);
    for (const c of limba) {
      expect(typeof c.parametri?.categorie).toBe("string");
      for (const p of c.praguri.filter((p) => p.puncte > 0)) {
        expect(typeof p.max_greseli).toBe("number");
      }
    }
  });

  it("nu are criterii pe stratul auto fara verificator", () => {
    const orfane = incarcaBarem()
      .rubrici.flatMap((r) => r.criterii)
      .filter((c) => c.strat === "auto" && !c.verificator);
    expect(orfane).toEqual([]);
  });
});

describe("valideazaBarem — prinde greselile de transcriere", () => {
  it("accepta o rubrica corecta", () => {
    expect(valideazaBarem(baremCu(rubricaOk()))).toEqual([]);
  });

  it("semnaleaza cand criteriile nu insumeaza punctajul declarat", () => {
    const r = rubricaOk();
    r.puncte_total = 5;
    const probleme = valideazaBarem(baremCu(r));
    expect(probleme).toHaveLength(1);
    expect(probleme[0]).toContain("insumeaza 2 puncte, dar rubrica declara 5");
  });

  it("semnaleaza un criteriu auto fara verificator", () => {
    const r = rubricaOk();
    r.criterii[1].verificator = null;
    const probleme = valideazaBarem(baremCu(r));
    expect(probleme.some((p) => p.includes('nu are verificator'))).toBe(true);
  });

  it("semnaleaza un verificator pus pe un criteriu care nu e automat", () => {
    const r = rubricaOk();
    r.criterii[0].verificator = "languagetool";
    const probleme = valideazaBarem(baremCu(r));
    expect(probleme.some((p) => p.includes('nu e pe stratul "auto"'))).toBe(true);
  });

  it("semnaleaza numar_cuvinte fara parametrul minim", () => {
    const r = rubricaOk();
    delete r.criterii[1].parametri;
    const probleme = valideazaBarem(baremCu(r));
    expect(probleme.some((p) => p.includes("parametri.minim"))).toBe(true);
  });

  it("semnaleaza un prag mai mare decat puncte_max", () => {
    const r = rubricaOk();
    r.criterii[1].praguri[0].puncte = 9;
    const probleme = valideazaBarem(baremCu(r));
    expect(probleme.some((p) => p.includes("depaseste puncte_max"))).toBe(true);
  });

  it("semnaleaza praguri in ordine gresita", () => {
    const r = rubricaOk();
    r.criterii[1].praguri = [
      { puncte: 0, conditie: "sub 150 de cuvinte" },
      { puncte: 1, conditie: "cel putin 150 de cuvinte" },
    ];
    const probleme = valideazaBarem(baremCu(r));
    expect(probleme.some((p) => p.includes("descrescatoare"))).toBe(true);
  });

  it("semnaleaza sluguri de criterii duplicate intre rubrici", () => {
    const r1 = rubricaOk();
    const r2 = { ...rubricaOk(), slug: "alta-rubrica" };
    const probleme = valideazaBarem({
      versiune_document: "test",
      sursa: "test",
      rubrici: [r1, r2],
    });
    expect(probleme.some((p) => p.includes("slug duplicat"))).toBe(true);
  });

  it("semnaleaza praguri de greseli care nu cresc pe masura ce punctajul scade", () => {
    // Cazul periculos: corectarea ia primul prag in care incape numarul de
    // greseli, deci un `max_greseli` care nu creste face pragul de jos inaccesibil.
    // Elevul ar primi tacit alt punctaj decat spune baremul.
    const r = rubricaOk();
    r.puncte_total = 3;
    r.criterii[1] = {
      slug: "test-orto",
      denumire: "Ortografia",
      puncte_max: 2,
      strat: "auto",
      verificator: "languagetool",
      parametri: { categorie: "ortografie" },
      praguri: [
        { puncte: 2, conditie: "0-1 greseli", max_greseli: 2 },
        { puncte: 1, conditie: "2 greseli", max_greseli: 1 },
        { puncte: 0, conditie: "3 sau mai multe" },
      ],
    };
    const probleme = valideazaBarem(baremCu(r));
    expect(probleme.some((p) => p.includes("toleranta trebuie sa creasca"))).toBe(true);
  });

  it("accepta praguri de greseli corect ordonate", () => {
    const r = rubricaOk();
    r.puncte_total = 3;
    r.criterii[1] = {
      slug: "test-orto",
      denumire: "Ortografia",
      puncte_max: 2,
      strat: "auto",
      verificator: "languagetool",
      parametri: { categorie: "ortografie" },
      praguri: [
        { puncte: 2, conditie: "0-1 greseli", max_greseli: 1 },
        { puncte: 1, conditie: "2 greseli", max_greseli: 2 },
        { puncte: 0, conditie: "3 sau mai multe" },
      ],
    };
    expect(valideazaBarem(baremCu(r))).toEqual([]);
  });

  it("semnaleaza un barem gol", () => {
    const probleme = valideazaBarem({
      versiune_document: "test",
      sursa: "test",
      rubrici: [],
    });
    expect(probleme).toEqual(["Baremul nu contine nicio rubrica."]);
  });
});
