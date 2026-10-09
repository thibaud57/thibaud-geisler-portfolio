---
paths:
  - "src/instrumentation-client.ts"
  - "sentry.*.config.ts"
  - "src/lib/sentry-scrub.ts"
---

# Sentry — Collecte et données personnelles

## À faire
- Passer `dataCollection: SENTRY_DATA_COLLECTION` (`src/lib/sentry-scrub.ts`) à chaque `Sentry.init`, serveur, edge et navigateur : depuis le SDK 11, l'option absente collecte identité, IP, cookies, en-têtes, corps de requête, données des requêtes Prisma et variables locales
- Fermer les catégories dans cette constante partagée, jamais dans un objet par `Sentry.init` : trois copies divergent à la première modification. `satisfies` n'en vérifie pas l'exhaustivité : confronter ses clés à la liste de la doc `dataCollection` à chaque montée du SDK. Seul `frameContextLines` reste au défaut, des lignes de code source sans donnée personnelle
- Dériver le type depuis la signature de `init` (`NonNullable<Parameters<typeof init>[0]["dataCollection"]>`) : `DataCollection` n'est exporté que par `@sentry/core`, que pnpm strict rend inaccessible
- Filtrer les données personnelles dans `beforeSend`, qui doit retourner un event valide ou `null`, jamais `undefined`. Il reste nécessaire avec `dataCollection` : le texte des messages d'erreur (ex: un rejet SMTP qui cite l'adresse) n'est couvert par aucune catégorie
- Filtrer aussi dans `beforeSendLog` dès que `pinoIntegration` est active : `log.levels` alimente le produit *Logs*, un canal distinct des issues que `beforeSend` ne voit jamais, et qui transporte l'objet Pino entier, `err` sérialisé compris. Filtrer un seul des deux canaux laisse la donnée fuiter par l'autre
- Relire la config résolue après chaque montée du SDK, par `Sentry.getClient()?.getDataCollectionOptions()` dans un process neuf

## À éviter
- Appeler `Sentry.init` sans `dataCollection`
- Utiliser `sendDefaultPii` : supprimé en v11 au profit de `dataCollection`
- Ouvrir une catégorie de `dataCollection` ou ajouter une capture de PII sans mettre à jour `docs/registre-traitements.md`

## Gotchas
- **Sentry 11 inverse le défaut** : `sendDefaultPii` absent valait « pas de PII » en v10, `dataCollection` absent vaut « tout collecter » en v11. Seules les valeurs dont le nom figure dans la denylist du SDK (`token`, `auth`, `password`…) restent masquées
- Le SDK Next serveur ne s'initialise qu'une fois par process : un second `Sentry.init` y garde la config du premier, ce qui fausse toute vérification qui en enchaîne deux. Navigateur et edge remplacent au contraire le client, avec un warning depuis 11.5.0
- Côté navigateur, `userInfo: false` fait passer `sdk.settings.infer_ip` de `auto` à `never` dans l'événement envoyé
- `enableLogs` est supprimé en v11 : le canal *Logs* s'active dès qu'une intégration de logging est déclarée, sans option à poser

## Exemples
```typescript
// ✅ Une constante partagée, passée à chaque init
const DATA_COLLECTION = {
  userInfo: false,
  cookies: false,
  httpHeaders: false,
  httpBodies: [],
  urlQueryParams: false,
  databaseQueryData: false,
  stackFrameVariables: false,
  // … une clé par catégorie de la doc, satisfies ne signale pas un oubli
} satisfies NonNullable<Parameters<typeof init>[0]["dataCollection"]>

Sentry.init({ dsn, dataCollection: DATA_COLLECTION, beforeSend: scrubEvent })

// ❌ SDK 11 sans dataCollection : cookies, corps de requête, IP et variables locales partent
Sentry.init({ dsn, beforeSend: scrubEvent })
```
