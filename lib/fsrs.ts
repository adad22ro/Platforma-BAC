import { fsrs, createEmptyCard, Rating, type Card } from 'ts-fsrs'
import type { Database } from '@/types/database'

// Stratul de repetitie spatiata. Izolat aici, fara acces la DB, ca sa poata fi
// testat singur si ca rutele sa nu ajunga sa duplice regulile de mai jos.
//
// FSRS programeaza CONCEPTE, nu intrebari: un elev care raspunde corect la
// intrebarea #47 despre perspectiva narativa n-a demonstrat ca stie intrebarea
// (n-o va mai vedea niciodata), ci conceptul. De aceea starea e per eticheta.
//
// DE CE nu antrenam parametrii: FSRS vine cu 17 parametri deja antrenati pe un set
// urias de recenzii reale si functioneaza corect din prima zi. Recomandarea
// oficiala e sa NU optimizezi sub ~1000 de recenzii — cu prea putine date ies
// parametri suprapotriviti, mai prosti decat cei impliciti. Cand ajungem la volum,
// optimizarea are sens GLOBAL (parametri pentru populatia noastra de elevi), nu per
// elev: un elev de BAC nu apuca sa faca 1000 de recenzii, toti la un loc, da.

export type ConceptState = Database['public']['Tables']['concept_states']['Row']

const scheduler = fsrs()

// Traducerea din „a raspuns corect?" in nota FSRS.
//
// Folosim doar Again/Good, nu si Hard/Easy, deliberat: acelea presupun ca elevul
// isi evalueaza singur efortul (ca in Anki, unde apesi tu butonul). Noi avem un
// singur semnal obiectiv — a nimerit sau nu. Inventarea unei granulatii pe care
// n-o masuram ar face graficul mai bogat si datele mai proaste.
export function ratingFor(correct: boolean) {
  return correct ? Rating.Good : Rating.Again
}

// Un concept atins de mai multe intrebari intr-o singura trimitere primeste O
// SINGURA recenzie, nu cate una per intrebare — altfel un test cu 5 intrebari pe
// acelasi concept ar umfla artificial stabilitatea de cinci ori.
//
// Verdictul agregat e conservator: daca a gresit macar una, conceptul se considera
// neinsusit. Un elev care nimereste 4 din 5 intrebari despre perspectiva narativa
// inca are un gol acolo, iar costul unei recapitulari in plus e mult mai mic decat
// al unei lacune ramase nedescoperite pana la examen.
export function aggregateVerdict(results: boolean[]): boolean {
  return results.length > 0 && results.every(Boolean)
}

// Randul din DB -> „card" FSRS. Numele de coloane sunt identice cu cele din
// biblioteca tocmai ca sa nu existe un strat de mapare care sa poata gresi.
function toCard(s: ConceptState | null, now: Date): Card {
  if (!s) return createEmptyCard(now)
  return {
    due: new Date(s.due),
    stability: s.stability,
    difficulty: s.difficulty,
    elapsed_days: s.elapsed_days,
    scheduled_days: s.scheduled_days,
    learning_steps: s.learning_steps,
    reps: s.reps,
    lapses: s.lapses,
    state: s.state,
    last_review: s.last_review ? new Date(s.last_review) : undefined,
  } as Card
}

// Aplica o recenzie si intoarce randul de scris in DB (upsert pe (user_id, tag_id)).
export function reviewConcept(args: {
  user_id: string
  tag_id: string
  correct: boolean
  previous: ConceptState | null
  now?: Date
}): Database['public']['Tables']['concept_states']['Insert'] {
  const now = args.now ?? new Date()
  const card = toCard(args.previous, now)
  const { card: next } = scheduler.next(card, now, ratingFor(args.correct))

  return {
    user_id: args.user_id,
    tag_id: args.tag_id,
    due: next.due.toISOString(),
    stability: next.stability,
    difficulty: next.difficulty,
    elapsed_days: next.elapsed_days,
    scheduled_days: next.scheduled_days,
    learning_steps: next.learning_steps,
    reps: next.reps,
    lapses: next.lapses,
    state: next.state,
    last_review: next.last_review ? new Date(next.last_review).toISOString() : now.toISOString(),
    updated_at: now.toISOString(),
  }
}
