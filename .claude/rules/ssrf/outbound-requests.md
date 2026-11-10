---
paths:
  - "src/server/**/*.ts"
  - "src/app/api/**/*.ts"
---

# SSRF : requêtes sortantes vers une URL fournie

## À faire
- Faire passer toute requête HTTP sortante vers une URL saisie par un utilisateur ou posée par un agent (`websiteUrl` de l'admin, ou de l'outil MCP `crm_update`) par **`safeFetch`** (`src/server/company-logo/safe-fetch.ts`). La garde résout le DNS, refuse les adresses privées ou réservées (`address-guard.ts`), revalide chaque redirection (5 au plus) et lie la connexion à l'adresse vérifiée, sans seconde résolution (rebinding)
- Toujours poser **`maxBytes`** : la lecture s'arrête en flux au plafond. `truncate: true` seulement pour lire l'en-tête d'une page HTML ; une image tronquée est inutilisable, elle rend `response_too_large`
- Partager un **`deadline`** (`AbortSignal.timeout(...)`) entre les requêtes d'une même opération (page puis ressources) : le délai de 10 s par requête repart à zéro à chaque redirection et ne borne pas l'ensemble
- Traiter le retour comme une union de résultats, sans `try/catch`, par un `switch` exhaustif (`assertNever`). `address_blocked` et `site_too_slow` arrêtent l'opération ; `site_unreachable` et `response_too_large` laissent leur chance à la ressource suivante

## À éviter
- Appeler `fetch`, `http.get` ou une lib HTTP sur une telle URL, ou la contrôler à la main avant de la lire (résolution DNS, test d'IP) : le contrôle et la connexion résoudraient deux fois, ce que `guardedLookup` évite

## Gotchas
- La garde n'accepte que `http:` et `https:` sur le port par défaut, sans identifiants : un port explicite rend `site_unreachable`, pas `address_blocked`
- Résoudre une URL relative (icône d'une page) contre `resource.url`, l'URL finale après redirections, pas contre l'URL saisie

## Exemples
```typescript
// ✅ safeFetch borné, résultat discriminé
const page = await safeFetch(url, { maxBytes: PAGE_MAX_BYTES, truncate: true, deadline })
if (!page.ok) return page

// ❌ fetch direct sur une URL fournie : aucune garde SSRF, aucun plafond de taille
const res = await fetch(url)
```

Décision et raisons : [ADR-023](../../../docs/adrs/023-source-logos-entreprise.md).
