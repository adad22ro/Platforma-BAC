# Baza de date

> Actualizat la: 2026-06-26
> Serviciu: Supabase (PostgreSQL)

## Tabele (de completat pe măsură ce sunt create)

Tabelele vor fi documentate aici imediat după ce sunt create în Supabase.

### Format standard pentru fiecare tabel

```
### nume_tabel
Scop: ce stochează acest tabel și de ce există

| Coloană | Tip | Descriere |
|---|---|---|
| id | uuid | Identificator unic |
| ... | ... | ... |

Relații: cu ce alte tabele e legat și cum
```

---

## Conexiunea la Supabase

Fișier: `lib/supabase.ts`

Exportă un client `supabase` creat cu URL-ul și cheia publică (`anon`) din variabilele de mediu. Se importă în orice fișier care are nevoie să citească sau să scrie date:

```ts
import { supabase } from '@/lib/supabase'
```

Cheia `anon` e sigură pentru browser — are acces limitat, controlat prin regulile RLS (Row Level Security) definite în Supabase. Cheia `service_role` (acces total, fără restricții RLS) se folosește doar în cod de server și niciodată în browser.

---

*Niciun tabel creat încă — se actualizează în Săptămânile 3-4.*
