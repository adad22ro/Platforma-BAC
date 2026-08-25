import { describe, it, expect, beforeEach, vi } from "vitest";

const h = vi.hoisted(() => ({
  userId: null as string | null,
  dbResult: { data: null as unknown, error: null as unknown },
}));

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(async () => ({ userId: h.userId })),
}));
vi.mock("@/lib/supabase-admin", () => ({
  supabaseAdmin: {
    from: () => ({
      select: () => ({
        eq: () => ({ single: () => Promise.resolve(h.dbResult) }),
      }),
    }),
  },
}));

import {
  getCurrentAppUser,
  isTeacher,
  poateCorecta,
  rolInFir,
  canAccessPremium,
} from "@/lib/current-user";
import type { AppUser } from "@/lib/current-user";

const teacher: AppUser = { id: "u-t", clerk_id: "t", role: "teacher", subscription_status: "free", subscription_end_date: null };
const mentor: AppUser = { id: "u-m", clerk_id: "m", role: "mentor", subscription_status: "free", subscription_end_date: null };
const studentFree: AppUser = { id: "u-s", clerk_id: "s", role: "student", subscription_status: "free", subscription_end_date: null };
const studentActive: AppUser = { id: "u-s", clerk_id: "s", role: "student", subscription_status: "active", subscription_end_date: null };
const studentCancelled: AppUser = { id: "u-s", clerk_id: "s", role: "student", subscription_status: "cancelled", subscription_end_date: null };

const future = new Date(Date.now() + 86_400_000).toISOString();
const past = new Date(Date.now() - 86_400_000).toISOString();

beforeEach(() => {
  vi.clearAllMocks();
  h.userId = null;
  h.dbResult = { data: null, error: null };
});

describe("isTeacher", () => {
  it("true doar pentru rol teacher", () => {
    expect(isTeacher(teacher)).toBe(true);
    expect(isTeacher(studentFree)).toBe(false);
    expect(isTeacher(null)).toBe(false);
  });
});

describe("canAccessPremium", () => {
  it("true doar cu abonament activ", () => {
    expect(canAccessPremium(studentActive)).toBe(true);
    expect(canAccessPremium(studentFree)).toBe(false);
    expect(canAccessPremium(studentCancelled)).toBe(false);
    expect(canAccessPremium(null)).toBe(false);
  });

  it("aparare in adancime pe subscription_end_date", () => {
    // activ + data in viitor => acces; activ + data trecuta => blocat (webhook pierdut)
    expect(canAccessPremium({ ...studentActive, subscription_end_date: future })).toBe(true);
    expect(canAccessPremium({ ...studentActive, subscription_end_date: past })).toBe(false);
    // activ + fara data => permitem (nu blocam un platitor din cauza datei lipsa)
    expect(canAccessPremium({ ...studentActive, subscription_end_date: null })).toBe(true);
  });
});

describe("getCurrentAppUser", () => {
  it("null daca nu exista sesiune", async () => {
    h.userId = null;
    expect(await getCurrentAppUser()).toBeNull();
  });

  it("null daca nu exista rand in DB (sau eroare)", async () => {
    h.userId = "user_1";
    h.dbResult = { data: null, error: { code: "PGRST116" } };
    expect(await getCurrentAppUser()).toBeNull();
  });

  it("intoarce userul cand exista rand", async () => {
    h.userId = "user_1";
    h.dbResult = { data: studentActive, error: null };
    expect(await getCurrentAppUser()).toEqual(studentActive);
  });
});

describe("rolul de mentor", () => {
  it("mentorul NU are drept de scris continut", () => {
    // Separarea de fond: profesorul scrie materie, mentorul corecteaza. Daca asta
    // pica, un mentor poate crea capitole si lectii.
    expect(isTeacher(mentor)).toBe(false);
    expect(isTeacher(teacher)).toBe(true);
  });

  it("si profesorul, si mentorul pot corecta", () => {
    expect(poateCorecta(teacher)).toBe(true);
    expect(poateCorecta(mentor)).toBe(true);
  });

  it("elevul nu poate corecta", () => {
    expect(poateCorecta(studentFree)).toBe(false);
    expect(poateCorecta(null)).toBe(false);
  });

  it("firul de tichet arata rolul real, nu doar teacher/student", () => {
    // Elevul are dreptul sa stie cu cine vorbeste.
    expect(rolInFir(mentor)).toBe("mentor");
    expect(rolInFir(teacher)).toBe("teacher");
    expect(rolInFir(studentFree)).toBe("student");
    expect(rolInFir(null)).toBe("student");
  });
});
