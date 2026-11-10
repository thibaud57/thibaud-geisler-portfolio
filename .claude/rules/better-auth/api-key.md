---
paths:
  - "src/lib/auth.ts"
  - "src/server/mcp/**/*.ts"
  - "src/server/**/*api-key*.ts"
  - "prisma/schema.prisma"
---

# Better Auth : clés d'API

## À faire
- Installer `@better-auth/api-key` à la même version que `better-auth` (version exacte : `docs/VERSIONS.md`) et les monter ensemble
- Régler le rate limit du plugin (`rateLimit` de `apiKey()` ou `rateLimit*` par clé) à un volume compatible avec un agent
- Émettre une clé par usage (poste, `agent-os`), ses `permissions` limitées à ses domaines (`{ <domaine>: ['read', 'write'] }`), créée depuis l'espace admin après la garde de session (ADR-025)
- Créer la clé par `auth.api.createApiKey({ body: { userId, ... } })` **sans** `headers` dès qu'elle porte des `permissions` ou un réglage de rate limit
- Afficher la valeur de la clé une seule fois, au retour de `createApiKey` : seul son hash est stocké, `start` (6 premiers caractères) sert à la reconnaître
- Vérifier la clé une seule fois par requête, par `auth.api.verifyApiKey({ body: { key } })` sans `permissions`, en extrayant soi-même le bearer de `Authorization`, puis comparer le domaine demandé aux `permissions` de la clé rendue (401 et 403 restent distincts)
- Lire le résultat de `verifyApiKey` par `valid` et `error.code` : il ne lève pas
- Transcrire le modèle à la main dans `prisma/schema.prisma` sous le nom `Apikey`, avec `@@map("apikey")` et `@@schema("auth")`, puis migrer par `just db-migrate <nom>`

## À éviter
- Activer `enableSessionForAPIKeys` : une clé d'agent ouvrirait la session du propriétaire sur tous les endpoints Better Auth
- `disableKeyHashing`
- Passer `headers` à `createApiKey` ou `updateApiKey` avec une propriété server-only (`permissions`, `enabled`, `rateLimit*`, `remaining`, `refill*`) : l'appel est traité comme client et lève `SERVER_ONLY_PROPERTY`
- Appeler `verifyApiKey` plusieurs fois pour une même requête : chaque appel consomme le rate limit

## Gotchas
- Rate limit actif par défaut à 10 requêtes par 24 h (code 1.7.18) et copié dans chaque clé à sa création. Ce n'est pas une fenêtre fixe : le compteur cumule les requêtes acceptées, ne repart à zéro qu'après une fenêtre entière sans requête acceptée, puis refuse jusqu'à une fenêtre après la dernière acceptée (`evaluateRateLimit`). Chaque requête HTTP compte, initialisation MCP et notifications comprises
- Nommer le modèle Prisma `Apikey`, jamais `ApiKey` : l'adaptateur appelle `prisma.apikey` (`db[model]` avec le nom `apikey`) et lève « Model apikey does not exist ». Better Auth contrôle le schéma au démarrage par défaut (`advanced.database.validateSchema`) et logge un `SchemaMismatchError`
- `verifyApiKey` rend `INVALID_API_KEY` aussi bien pour une clé inconnue que pour une erreur interne (base en panne) : ni le code ni la ligne `error` « Failed to validate API key » du logger de Better Auth, écrite à chaque refus, ne distinguent les deux : une base en panne se lit sur `/api/health`
- Des permissions insuffisantes passées à `verifyApiKey` reviennent en `KEY_NOT_FOUND`, sans code dédié : d'où la vérification sans `permissions` et la comparaison faite par la route
- `expiresIn` est en secondes et borné par défaut entre 1 et 365 jours (`keyExpiration`) ; une clé sans expiration omet le champ
- `referenceId` remplace `userId` dans le schéma et les réponses depuis la 1.7
- Le plugin lit par défaut l'en-tête `x-api-key`, pas `Authorization`

## Exemples
```typescript
// ✅ Création server-only : session vérifiée avant, pas de headers dans l'appel
const user = await getCurrentUser()
const { key } = await auth.api.createApiKey({
  body: { userId: user.id, name: 'Poste', permissions: { sales: ['read'] } },
})

// ❌ headers + permissions : traité comme client, SERVER_ONLY_PROPERTY
await auth.api.createApiKey({ headers: await headers(), body: { name: 'Poste', permissions: { sales: ['read'] } } })
```
