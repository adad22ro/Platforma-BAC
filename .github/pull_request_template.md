<!-- Titlu PR: scurt și la obiect (ex: "feat: pagină listă capitole"). -->

## Ce face

<!-- 1-3 fraze: ce schimbă acest PR și de ce. -->

## Cum s-a testat

<!-- Manual? Teste noi? Rulat local? Screenshot pentru UI. -->

## Checklist

- [ ] Branch separat (NU commit direct pe `main`)
- [ ] `npm run lint`, `npm run typecheck`, `npm test` trec local (le rulează și hook-ul pre-push + CI)
- [ ] Am actualizat `DEVLOG.md` (la final de sesiune) și `TASKS.md` (bifă/status) dacă e cazul
- [ ] Dacă am rezolvat o eroare nouă → intrare în `ERRORS.md`
- [ ] Dacă am adăugat o variabilă de mediu → actualizat `lib/env.ts` + `.env.example`
- [ ] Dacă am schimbat schema DB → migrare nouă în `supabase/migrations/` + `npm run db:types`

## Note pentru reviewer

<!-- Ceva de urmărit anume? Decizii deschise? Lasă gol dacă nu. -->
