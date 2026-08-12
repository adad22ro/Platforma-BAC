import { describe, it, expect } from "vitest";
import { reviewConcept, aggregateVerdict, ratingFor, type ConceptState } from "@/lib/fsrs";
import { Rating, State } from "ts-fsrs";

const NOW = new Date("2026-08-12T09:00:00Z");

// Randul intors de reviewConcept e de tip Insert (campurile cu default sunt
// optionale); starea citita din DB e de tip Row (toate prezente). Helperul face
// conversia o data, ca lantul de recenzii sa fie tipat corect in teste.
function caStare(row: ReturnType<typeof reviewConcept>): ConceptState {
  return {
    user_id: row.user_id,
    tag_id: row.tag_id,
    due: row.due,
    stability: row.stability ?? 0,
    difficulty: row.difficulty ?? 0,
    elapsed_days: row.elapsed_days ?? 0,
    scheduled_days: row.scheduled_days ?? 0,
    learning_steps: row.learning_steps ?? 0,
    reps: row.reps ?? 0,
    lapses: row.lapses ?? 0,
    state: row.state ?? 0,
    last_review: row.last_review ?? null,
    updated_at: row.updated_at ?? NOW.toISOString(),
  };
}

describe("ratingFor", () => {
  it("foloseste doar Again si Good", () => {
    // Hard/Easy presupun ca elevul isi evalueaza singur efortul (ca in Anki, unde
    // apesi tu butonul). Noi avem un singur semnal obiectiv: a nimerit sau nu.
    expect(ratingFor(true)).toBe(Rating.Good);
    expect(ratingFor(false)).toBe(Rating.Again);
  });
});

describe("aggregateVerdict", () => {
  it("un concept se considera stiut doar daca TOATE intrebarile lui au fost corecte", () => {
    expect(aggregateVerdict([true, true, true])).toBe(true);
    // 4 din 5 inseamna tot un gol. Costul unei recapitulari in plus e mult mai mic
    // decat al unei lacune ramase nedescoperite pana la examen.
    expect(aggregateVerdict([true, true, true, true, false])).toBe(false);
    expect(aggregateVerdict([false])).toBe(false);
  });

  it("fara raspunsuri nu se considera stiut", () => {
    expect(aggregateVerdict([])).toBe(false);
  });
});

describe("reviewConcept", () => {
  it("porneste de la zero pentru un concept nou, fara sa ceara date de antrenament", () => {
    // FSRS vine cu parametri deja antrenati: functioneaza din primul elev.
    const row = reviewConcept({
      user_id: "u1",
      tag_id: "t1",
      correct: true,
      previous: null,
      now: NOW,
    });

    expect(row.user_id).toBe("u1");
    expect(row.reps).toBe(1);
    expect(row.stability).toBeGreaterThan(0);
    expect(new Date(row.due).getTime()).toBeGreaterThan(NOW.getTime());
  });

  it("raspunsul corect programeaza mai departe decat cel gresit", () => {
    const bun = reviewConcept({ user_id: "u1", tag_id: "t1", correct: true, previous: null, now: NOW });
    const prost = reviewConcept({ user_id: "u1", tag_id: "t1", correct: false, previous: null, now: NOW });

    expect(new Date(bun.due).getTime()).toBeGreaterThan(new Date(prost.due).getTime());
  });

  it("greseala pe un concept deja invatat il readuce la recapitulare si creste lapses", () => {
    // Doua raspunsuri corecte, la distanta, ca sa ajunga in starea Review.
    let row = reviewConcept({ user_id: "u1", tag_id: "t1", correct: true, previous: null, now: NOW });
    const peste_o_zi = new Date(NOW.getTime() + 24 * 3600 * 1000);
    row = reviewConcept({
      user_id: "u1",
      tag_id: "t1",
      correct: true,
      previous: caStare(row),
      now: peste_o_zi,
    });
    expect(row.state).toBe(State.Review);

    const peste_zece_zile = new Date(NOW.getTime() + 10 * 24 * 3600 * 1000);
    const dupa_greseala = reviewConcept({
      user_id: "u1",
      tag_id: "t1",
      correct: false,
      previous: caStare(row),
      now: peste_zece_zile,
    });

    expect(dupa_greseala.lapses).toBe(1);
    expect(dupa_greseala.state).toBe(State.Relearning);
  });

  it("intervalul creste la recapitulari corecte succesive", () => {
    let row = reviewConcept({ user_id: "u1", tag_id: "t1", correct: true, previous: null, now: NOW });
    let moment = NOW;
    const intervale: number[] = [];

    for (let i = 0; i < 4; i++) {
      moment = new Date(row.due);
      const anterior = moment.getTime();
      row = reviewConcept({
        user_id: "u1",
        tag_id: "t1",
        correct: true,
        previous: caStare(row),
        now: moment,
      });
      intervale.push(new Date(row.due).getTime() - anterior);
    }

    // Fiecare interval e cel putin cat cel dinainte: asta e toata ideea repetitiei
    // spatiate — ce stii bine revine tot mai rar.
    for (let i = 1; i < intervale.length; i++) {
      expect(intervale[i]).toBeGreaterThanOrEqual(intervale[i - 1]);
    }
  });

  it("pastreaza numele de coloane identice cu cele din biblioteca", () => {
    const row = reviewConcept({ user_id: "u1", tag_id: "t1", correct: true, previous: null, now: NOW });
    // Daca cineva redenumeste vreo coloana, mapatul devine un strat in plus care
    // poate gresi tacit. Testul e aici ca sa forteze discutia, nu ca sa treaca.
    for (const k of ["stability", "difficulty", "elapsed_days", "scheduled_days", "learning_steps", "reps", "lapses", "state", "last_review", "due"]) {
      expect(row).toHaveProperty(k);
    }
  });
});
