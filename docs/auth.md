# Autentificare și roluri

> Actualizat la: 2026-06-26
> Serviciu: Clerk

## Cum funcționează

Clerk gestionează tot ce ține de identitatea utilizatorului: înregistrare, login, sesiuni, parole, OAuth. Noi nu stocăm parole — Clerk se ocupă de securitate.

## Roluri planificate

| Rol | Cum e marcat | Ce poate face |
|---|---|---|
| `elev` | rol implicit la înregistrare | accesează lecții, teste, trimite tichete |
| `profesor` | setat manual în Clerk dashboard | accesează panelul de admin |
| `parinte` | *(Faza 2)* | vizualizează progresul elevului |

## Protejarea rutelor

Rutele protejate vor fi documentate aici după implementare.

---

*De completat în Săptămânile 3-4.*
