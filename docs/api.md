# Rute API

> Actualizat la: 2026-06-26

## Cum sunt organizate

Rutele API se află în `/app/api/`. Fiecare rută va fi documentată aici după ce e creată.

### Format standard

```
### METHOD /api/nume-ruta
Scop: ce face această rută

Request:
- Headers: ce headers sunt necesare (ex: autentificare)
- Body: { camp: tip — descriere }

Response:
- 200: { ... } — descriere succes
- 400: { error: "..." } — când apare
- 401: neautorizat — când apare

Cine o apelează: (ex: componenta X, webhook Stripe)
```

---

*Nicio rută API creată încă — se actualizează pe parcurs.*
