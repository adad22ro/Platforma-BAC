// Clientul LanguageTool — ortografie si punctuatie pentru stratul 1.
//
// De ce LanguageTool si nu un model: cost zero per corectare, raspunsul e
// explicabil (fiecare greseala are regula si pozitie) si NU inventeaza. Un corector
// gramatical care halucineaza ar da note gresite fara ca cineva sa observe.
//
// Rulam instanta NOASTRA, nu API-ul public: textele elevilor nu pleaca la nimeni,
// si nu exista limita de cereri. `LANGUAGETOOL_URL` arata spre ea.
//
// DACA VARIABILA LIPSESTE, functia intoarce `null` si criteriile de ortografie raman
// „indisponibil" — nu 0. Diferenta e tot ce conteaza aici: un 0 nemeritat, dat tacit
// fiindca serviciul nu e pornit, il face pe elev sa creada ca a gresit ceva ce n-a
// fost masurat.

export type NumarGreseli = {
  ortografie: number
  punctuatie: number
  // Tot ce nu e nici ortografie, nici punctuatie (acord, stil). Nu se foloseste la
  // notare — baremul nu are criteriu pentru asta — dar e util in explicatie.
  altele: number
}

// Categoriile LanguageTool care conteaza pentru barem. `TYPOS` = greseli de scriere,
// `PUNCTUATION` + `TYPOGRAPHY` = punctuatie si semne.
const CATEGORII_ORTOGRAFIE = new Set(['TYPOS', 'MISSPELLING'])
const CATEGORII_PUNCTUATIE = new Set(['PUNCTUATION', 'TYPOGRAPHY'])

type RaspunsLT = {
  matches?: Array<{
    rule?: { category?: { id?: string } }
  }>
}

// Cat asteptam dupa LanguageTool. Corectarea nu are voie sa atarne de el: daca
// instanta e lenta sau cazuta, criteriul ramane nenotat si elevul isi primeste
// restul punctelor imediat.
const TIMEOUT_MS = 5000

export async function verificaLimba(text: string): Promise<NumarGreseli | null> {
  const url = process.env.LANGUAGETOOL_URL
  if (!url) return null
  if (!text.trim()) return { ortografie: 0, punctuatie: 0, altele: 0 }

  try {
    const raspuns = await fetch(`${url.replace(/\/$/, '')}/v2/check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ text, language: 'ro-RO' }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })

    if (!raspuns.ok) return null

    const date = (await raspuns.json()) as RaspunsLT
    const numar: NumarGreseli = { ortografie: 0, punctuatie: 0, altele: 0 }

    for (const m of date.matches ?? []) {
      const categorie = m.rule?.category?.id ?? ''
      if (CATEGORII_ORTOGRAFIE.has(categorie)) numar.ortografie++
      else if (CATEGORII_PUNCTUATIE.has(categorie)) numar.punctuatie++
      else numar.altele++
    }

    return numar
  } catch {
    // Retea cazuta, timeout, JSON stricat. Toate inseamna acelasi lucru pentru
    // corectare: nu stim, deci nu notam. Nu logam ca eroare critica — lipsa
    // serviciului e o stare asteptata, nu un incident.
    return null
  }
}
