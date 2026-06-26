# Plăți și abonamente

> Actualizat la: 2026-06-26
> Serviciu: Stripe

## Cum funcționează

Stripe gestionează plățile și abonamentele recurente. Noi nu stocăm date de card — Stripe se ocupă de securitate PCI.

## Flux abonament (planificat)

```
1. Elevul apasă "Abonează-te" → redirecționat la Stripe Checkout
2. Completează datele de card pe pagina Stripe (nu pe site-ul nostru)
3. Stripe confirmă plata → trimite un webhook către aplicația noastră
4. Aplicația primește webhook-ul → marchează elevul ca abonat în Supabase
5. Elevul are acces la tot conținutul
```

## Webhook-uri Stripe folosite

| Eveniment | Ce face aplicația |
|---|---|
| `checkout.session.completed` | Activează abonamentul în DB |
| `customer.subscription.deleted` | Dezactivează abonamentul în DB |

## Prețuri

- Abonament lunar: 60-90 RON (preț final de testat cu utilizatori reali)
- Nivel gratuit: acces la 2-3 capitole introductive (fără Stripe)

---

*De completat în Săptămânile 3-4.*
