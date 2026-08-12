import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { AppUser } from "@/lib/current-user";

const h = vi.hoisted(() => ({
  appUser: null as AppUser | null,
  clerkUser: null as unknown,
}));

vi.mock("@clerk/nextjs/server", () => ({
  currentUser: vi.fn(async () => h.clerkUser),
  auth: vi.fn(async () => ({ userId: null })),
}));
vi.mock("@/lib/supabase-admin", () => ({ supabaseAdmin: {} }));

// <UserProfile /> e o componenta client Clerk — irelevanta pentru datele testate aici.
vi.mock("@clerk/nextjs", () => ({ UserProfile: () => null }));
vi.mock("@/app/_components/app-header", () => ({ AppHeader: () => null }));

vi.mock("@/lib/current-user", async (importActual) => {
  const actual = await importActual<typeof import("@/lib/current-user")>();
  return { ...actual, getCurrentAppUser: vi.fn(async () => h.appUser) };
});

import ProfilPage from "@/app/profil/page";

const student = (over: Partial<AppUser> = {}): AppUser => ({
  id: "u-s",
  clerk_id: "s",
  role: "student",
  subscription_status: "free",
  subscription_end_date: null,
  ...over,
});

async function render() {
  return renderToStaticMarkup(await ProfilPage());
}

beforeEach(() => {
  vi.clearAllMocks();
  h.appUser = null;
  h.clerkUser = {
    firstName: "Ana",
    lastName: "Pop",
    primaryEmailAddress: { emailAddress: "ana@example.com" },
  };
});

describe("/profil", () => {
  it("afiseaza numele complet, emailul si rolul", async () => {
    h.appUser = student();
    const html = await render();
    expect(html).toContain("Ana Pop");
    expect(html).toContain("ana@example.com");
    expect(html).toContain("Elev");
  });

  it("rol teacher => Profesor", async () => {
    h.appUser = student({ role: "teacher" });
    expect(await render()).toContain("Profesor");
  });

  it("gratuit: buton de upgrade", async () => {
    h.appUser = student();
    const html = await render();
    expect(html).toContain("Upgrade la Premium");
    expect(html).toContain('href="/upgrade"');
  });

  it("profesor fara abonament: fara buton de upgrade, acces prin rol", async () => {
    h.appUser = student({ role: "teacher", subscription_status: "free" });
    const html = await render();
    expect(html).not.toContain("Upgrade la Premium");
    expect(html).not.toContain('href="/upgrade"');
    expect(html).toContain("acces complet la conținut, fără abonament");
  });

  it("premium activ: fara upgrade, arata data de valabilitate", async () => {
    const end = new Date(Date.now() + 30 * 86_400_000).toISOString();
    h.appUser = student({ subscription_status: "active", subscription_end_date: end });
    const html = await render();
    expect(html).toContain("Premium");
    expect(html).not.toContain("Upgrade la Premium");
    expect(html).toContain("Valabil până la");
  });

  it("anulat: eticheta 'anulat' + buton de reactivare", async () => {
    h.appUser = student({ subscription_status: "cancelled" });
    const html = await render();
    expect(html).toContain("anulat");
    expect(html).toContain("Reactivează Premium");
  });

  it("cont neprovizionat inca: mesaj de asteptare", async () => {
    h.appUser = null;
    expect(await render()).toContain("Îți pregătim contul");
  });
});
