// Ruleaza o data la pornirea serverului Next.js, inainte sa serveasca cereri.
// Il folosim ca sa validam variabilele de mediu la boot (fail-fast, mesaj clar),
// nu abia cand o ruta le foloseste. Vezi lib/env.ts.
export async function register() {
  // Validam doar in runtime-ul Node (nu Edge, care nu are toate secretele server).
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { validateEnv } = await import("./lib/env");
    validateEnv();
  }
}
