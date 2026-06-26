// Raport de debug consolidat — aduna stare + erori din Clerk, Supabase, Stripe, Vercel.
// Rulare: npm run debug   (incarca automat .env.local)
//
// Scop: cand apare o eroare, acest script ofera o imagine completa intr-un singur loc,
// ca diagnoza sa fie rapida (inclusiv pentru asistentul AI care depaneaza).

import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";

const line = (s = "") => console.log(s);
const header = (s) => {
  line();
  line(`=== ${s} ===`);
};

// ─── Supabase ───────────────────────────────────────────────
async function supabase() {
  header("SUPABASE");
  try {
    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    const { data, count, error } = await sb
      .from("users")
      .select("email, role, subscription_status, created_at", { count: "exact" })
      .order("created_at", { ascending: false })
      .limit(5);
    if (error) throw error;
    line(`Tabel users: ${count} randuri`);
    for (const r of data ?? []) {
      line(`  ${r.email ?? "—"}  [${r.role ?? "?"} / ${r.subscription_status ?? "?"}]`);
    }

    // Loguri de erori ale aplicatiei (daca tabelul exista)
    const logs = await sb
      .from("error_logs")
      .select("source, message, created_at")
      .order("created_at", { ascending: false })
      .limit(5);
    if (!logs.error) {
      line(`Loguri erori: ${logs.data?.length ?? 0} recente`);
      for (const l of logs.data ?? []) {
        line(`  [${l.source}] ${l.message}  (${new Date(l.created_at).toLocaleString("ro-RO")})`);
      }
    }
  } catch (e) {
    line(`EROARE: ${e.message ?? e}`);
  }
}

// ─── Clerk (REST) ───────────────────────────────────────────
async function clerk() {
  header("CLERK");
  try {
    const res = await fetch(
      "https://api.clerk.com/v1/users?limit=5&order_by=-created_at",
      { headers: { Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}` } }
    );
    if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
    const users = await res.json();
    line(`Ultimii ${users.length} utilizatori:`);
    for (const u of users) {
      const email = u.email_addresses?.[0]?.email_address ?? u.id;
      line(`  ${email}  (${new Date(u.created_at).toLocaleString("ro-RO")})`);
    }
  } catch (e) {
    line(`EROARE: ${e.message ?? e}`);
  }
}

// ─── Stripe ─────────────────────────────────────────────────
async function stripe() {
  header("STRIPE");
  try {
    const s = new Stripe(process.env.STRIPE_SECRET_KEY);
    const events = await s.events.list({ limit: 10 });
    line(`Ultimele ${events.data.length} evenimente:`);
    for (const e of events.data) {
      const flag = /fail|error|dispute/i.test(e.type) ? " ⚠" : "";
      line(`  ${e.type}${flag}  (${new Date(e.created * 1000).toLocaleString("ro-RO")})`);
    }
  } catch (e) {
    line(`EROARE: ${e.message ?? e}`);
  }
}

// ─── Vercel ─────────────────────────────────────────────────
async function vercel() {
  header("VERCEL");
  const token = process.env.VERCEL_API_TOKEN;
  if (!token) {
    line("VERCEL_API_TOKEN lipseste — sar peste.");
    return;
  }
  const team = process.env.VERCEL_TEAM_ID ? `&teamId=${process.env.VERCEL_TEAM_ID}` : "";
  const app = process.env.VERCEL_PROJECT_NAME ?? "platforma-bac";
  try {
    const res = await fetch(
      `https://api.vercel.com/v6/deployments?app=${app}&limit=6${team}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
    const { deployments = [] } = await res.json();
    line(`Ultimele ${deployments.length} deploy-uri:`);
    let firstError = null;
    for (const d of deployments) {
      const state = d.state ?? d.readyState;
      if (state === "ERROR" && !firstError) firstError = d;
      line(`  [${state}] ${d.meta?.githubCommitMessage ?? d.url}`);
    }
    // Daca exista un deploy cu eroare, arata logurile lui.
    if (firstError) {
      header("VERCEL — LOGURI DEPLOY ESUAT");
      const ev = await fetch(
        `https://api.vercel.com/v3/deployments/${firstError.uid}/events?limit=100${team}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (ev.ok) {
        const json = await ev.json();
        const events = Array.isArray(json) ? json : json.events ?? [];
        for (const e of events) {
          const text = (e.payload?.text ?? e.text ?? "").trim();
          if (text) line(`  ${text}`);
        }
      }
    }
  } catch (e) {
    line(`EROARE: ${e.message ?? e}`);
  }
}

line("RAPORT DEBUG — " + new Date().toLocaleString("ro-RO"));
await supabase();
await clerk();
await stripe();
await vercel();
line();
