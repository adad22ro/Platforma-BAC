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

// current-user importa supabase-admin, care cere env real la import.
vi.mock("@/lib/supabase-admin", () => ({ supabaseAdmin: {} }));

// Helperii reali de gating (canAccessPremium) — vrem sa testam pagina impreuna cu ei,
// nu o reimplementare. Doar sursa userului (DB) e mock-uita.
vi.mock("@/lib/current-user", async (importActual) => {
  const actual = await importActual<typeof import("@/lib/current-user")>();
  return { ...actual, getCurrentAppUser: vi.fn(async () => h.appUser) };
});

// AppHeader contine <UserButton /> (componenta client Clerk) — irelevanta aici.
vi.mock("@/app/_components/app-header", () => ({
  AppHeader: () => null,
}));

import DashboardPage from "@/app/dashboard/page";

const student = (over: Partial<AppUser> = {}): AppUser => ({
  clerk_id: "s",
  role: "student",
  subscription_status: "free",
  subscription_end_date: null,
  ...over,
});

// Randeaza pagina (server component async) la HTML.
async function render(searchParams: { checkout?: string } = {}) {
  const el = await DashboardPage({ searchParams: Promise.resolve(searchParams) });
  return renderToStaticMarkup(el);
}

beforeEach(() => {
  vi.clearAllMocks();
  h.appUser = null;
  h.clerkUser = {
    firstName: "Ana",
    primaryEmailAddress: { emailAddress: "ana@example.com" },
  };
});

describe("/dashboard — abonament", () => {
  it("user gratuit: arata planul Gratuit + butonul de upgrade catre /upgrade", async () => {
    h.appUser = student({ subscription_status: "free" });
    const html = await render();

    expect(html).toContain("Gratuit");
    expect(html).toContain("Upgrade la Premium");
    expect(html).toContain('href="/upgrade"');
  });

  it("user premium: fara buton de upgrade", async () => {
    h.appUser = student({ subscription_status: "active" });
    const html = await render();

    expect(html).toContain("Premium");
    expect(html).not.toContain("Upgrade la Premium");
    expect(html).not.toContain('href="/upgrade"');
  });

  it("abonament expirat (end_date in trecut): tratat ca gratuit, cu upgrade", async () => {
    h.appUser = student({
      subscription_status: "active",
      subscription_end_date: new Date(Date.now() - 86_400_000).toISOString(),
    });
    const html = await render();

    expect(html).toContain("Upgrade la Premium");
  });
});

describe("/dashboard — intoarcerea de la Stripe", () => {
  it("checkout=success + abonament inca inactiv: anunta ca se activeaza (webhook intarziat)", async () => {
    // Cursa reala: Stripe redirectioneaza imediat, webhook-ul activeaza cateva secunde mai tarziu.
    h.appUser = student({ subscription_status: "free" });
    const html = await render({ checkout: "success" });

    expect(html).toContain("Plata a fost înregistrată");
    expect(html).toContain("se activează în câteva secunde");
  });

  it("checkout=success + abonament activ: confirma accesul", async () => {
    h.appUser = student({ subscription_status: "active" });
    const html = await render({ checkout: "success" });

    expect(html).toContain("Plata a fost înregistrată");
    expect(html).toContain("Abonamentul Premium este activ");
  });

  it("checkout=cancel: anunta ca nu s-a retinut nimic", async () => {
    h.appUser = student({ subscription_status: "free" });
    const html = await render({ checkout: "cancel" });

    expect(html).toContain("Plata a fost anulată");
    expect(html).toContain("Nu ți s-a reținut nimic");
  });

  it("fara parametru checkout: niciun banner", async () => {
    h.appUser = student();
    const html = await render();

    expect(html).not.toContain("Plata a fost");
  });
});

describe("/dashboard — cont neprovizionat inca", () => {
  it("fara rand in DB (webhook Clerk intarziat): mesaj de asteptare, nu eroare", async () => {
    h.appUser = null;
    const html = await render();

    expect(html).toContain("Îți pregătim contul");
    // fara abonament cunoscut => tratat ca gratuit
    expect(html).toContain("Upgrade la Premium");
  });
});
