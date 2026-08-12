// Comutatoare pentru functionalitati care exista in cod dar nu sunt gata de
// productie. Preferabil unui `git revert`: codul ramane la vedere, iar
// reactivarea e o singura linie.

/**
 * Interfata de tichete (butonul „Nu am inteles", sectiunea Tichete din
 * `/profesor`, pagina `/intrebari`).
 *
 * **Dezactivata pe 2026-08-12.** UI-ul e scris pe contractul vechi de tichete
 * — pereche intrebare/raspuns — iar backendul a trecut intre timp pe fir de
 * mesaje. Concret, ce se intampla daca e pornita:
 *   - `/intrebari` citeste `answer` / `answered_at`, campuri care nu mai
 *     exista → toate tichetele apar „In asteptare", inclusiv cele cu raspuns;
 *   - butonul „Trimite raspunsul" din `/profesor` loveste
 *     `POST /api/tickets/[id]/answer` → 404;
 *   - „Nu am inteles" trimite fara `lesson_id`, acum obligatoriu → 400.
 *
 * Niciuna nu crapa vizibil, deci elevul ar vedea date gresite fara sa stie.
 * De pus pe `true` dupa reconectarea la `POST /api/tickets/[id]/messages` —
 * vezi randurile 🟡 din Sapt. 9-10 in `TASKS.md`.
 *
 * Tipul e `boolean` explicit, nu literalul `false`, ca TypeScript sa nu
 * marcheze ramurile ca imposibile si sa nu para cod mort.
 */
export const TICHETE_UI_ACTIVE: boolean = false;
