---
paths:
  - "src/instrumentation.ts"
  - "src/instrumentation-client.ts"
  - "sentry.*.config.ts"
  - "src/sentry.*.config.ts"
  - "src/app/**/error.tsx"
  - "src/app/global-error.tsx"
---

# Sentry — Instrumentation (ADR-017)

## À faire
- Déclarer un seul point d'entrée `instrumentation.ts` exportant `register()`, qui importe la config serveur ou edge selon `process.env.NEXT_RUNTIME`
- Exporter `onRequestError = Sentry.captureRequestError` depuis `instrumentation.ts` : c'est ce qui capture les erreurs des Server Components, du proxy et du middleware (SDK >= 8.28.0)
- Nommer le fichier client `instrumentation-client.ts` : `sentry.client.config.ts` est l'ancienne convention, encore tolérée mais obsolète
- Filtrer les données personnelles dans `beforeSend`, qui doit retourner un event valide ou `null` — jamais `undefined`
- Utiliser `Sentry.pinoIntegration()` pour brancher le logger existant, jamais un transport maison (SDK >= 10.18.0, Pino `>=8.0.0 <11`)
- Restreindre explicitement `log.levels` dans l'intégration Pino : le défaut envoie tous les niveaux, `debug` compris, et épuise le quota de logs
- Déclarer `error.levels` explicitement pour choisir quels niveaux Pino créent **en plus** une issue, sinon une même erreur remonte deux fois
- Provoquer une vraie erreur serveur après l'installation et vérifier qu'elle arrive dans Sentry : une intégration qui compile n'est pas une intégration qui remonte
- Brancher les `// TODO post-MVP : envoyer error à Sentry` déjà présents dans `error.tsx` et `global-error.tsx`

## À éviter
- Auto-héberger Sentry : 4 cœurs, 16 Go de RAM et 16 Go de swap au minimum, hors de portée du VPS (`docs/adrs/017-observabilite-cloud.md`)
- Suivre un guide qui crée `sentry.client.config.ts` : la majorité des tutoriels en ligne sont sur l'ancienne convention
- Traiter `sentry.server.config.ts` et `sentry.edge.config.ts` comme des points d'entrée directs : ils sont importés par `register()`
- Utiliser `sendDefaultPii` : déprécié depuis 10.54.0 au profit de `dataCollection`, supprimé en v11. Si les deux coexistent, `dataCollection` gagne
- Appeler `pinoIntegration()` sur le runtime Edge : elle exige Node.js
- Activer Session Replay sans besoin identifié : 36 à 50 Ko gzip s'ajoutent au bundle client, contre moins de 20 Ko pour le cœur du SDK
- Ajouter une capture de PII sans mettre à jour `docs/registre-traitements.md`

## Gotchas
- **`captureException` dans un Server Component casse le prerendering quand `cacheComponents: true`** — c'est la configuration du projet. Issue getsentry/sentry-javascript#21333, corrigée par la PR #21351, version de publication non confirmée : à tester avant mise en production
- `withServerActionInstrumentation` intercepte `NEXT_REDIRECT` et `NEXT_NOT_FOUND`, qui sont des exceptions de contrôle de flux et non des erreurs (issue #10466). Pertinent dès qu'une Server Action utilise `redirect()` ou `notFound()`
- Les incidents de perte silencieuse d'events serveur (#18871, #21713) ne concernent que Turbopack, qui est **le bundler du build de production depuis le 3 septembre 2026** (opt-out `--webpack` retiré) : les traiter comme actifs, vérifier la version du SDK face à ces fixes et provoquer une erreur serveur réelle pour valider la remontée
- Depuis le SDK v10, l'IP n'est plus inférée côté navigateur quand la collecte de PII est désactivée
- La région de l'organisation Sentry (États-Unis ou Europe) est **irréversible** : elle se choisit à la création, avant tout code

## Exemples
```typescript
// ✅ Point d'entrée unique, import conditionnel par runtime
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') await import('./sentry.server.config')
  if (process.env.NEXT_RUNTIME === 'edge') await import('./sentry.edge.config')
}

export const onRequestError = Sentry.captureRequestError
```

```typescript
// ✅ Pino : ce qui devient un log, et ce qui devient en plus une issue
Sentry.init({
  integrations: [
    Sentry.pinoIntegration({
      log: { levels: ['warn', 'error', 'fatal'] },
      error: { levels: ['error', 'fatal'] },
    }),
  ],
  beforeSend(event) {
    if (event.user) delete event.user.email
    return event                      // null pour abandonner, jamais undefined
  },
})

// ❌ log.levels au défaut : tous les niveaux partent, debug compris
Sentry.init({ integrations: [Sentry.pinoIntegration()] })
```
