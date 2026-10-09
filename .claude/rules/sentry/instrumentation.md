---
paths:
  - "src/instrumentation*.ts"
  - "sentry.*.config.ts"
  - "src/app/**/*error.tsx"
---

# Sentry — Instrumentation (ADR-017)

## À faire
- Déclarer un seul point d'entrée `instrumentation.ts` exportant `register()`, qui importe la config serveur ou edge selon `process.env.NEXT_RUNTIME`
- Exporter `onRequestError` depuis `instrumentation.ts` en appelant `Sentry.captureRequestError` : c'est ce qui capture les erreurs des Server Components, du proxy et du middleware (SDK >= 8.28.0). Une assignation directe suffit s'il n'y a rien d'autre à faire ; composer un wrapper est légitime pour y ajouter un log applicatif (ex: `logger.error` pour une procédure d'incident), à condition d'untracker ce logger de `pinoIntegration` (voir Gotchas) pour ne pas dupliquer l'issue
- Nommer le fichier client `instrumentation-client.ts` : `sentry.client.config.ts` est l'ancienne convention, encore tolérée mais obsolète
- Utiliser `Sentry.pinoIntegration()` pour brancher le logger existant, jamais un transport maison (SDK >= 10.18.0, Pino `>=8.0.0 <11`)
- Restreindre explicitement `log.levels` dans l'intégration Pino : le défaut envoie tous les niveaux, `debug` compris, et épuise le quota de logs
- Choisir par `error.levels` les niveaux Pino qui créent **en plus** une issue : le défaut `[]` n'en crée aucune, le projet déclare `error` et `fatal`. Ce choix ouvre un risque de doublon quand un `logger.error()` explicite suit un `Sentry.captureRequestError`/`captureException` déjà posé pour la même erreur : `pinoIntegration` intercepte tout `logger.error()` du process par défaut (`diagnostics_channel`, pas seulement une instance précise). Untracker un child logger dédié à cet appel (`Sentry.pinoIntegration.untrackLogger(logger.child({}))`) évite le doublon sans désactiver la capture Pino du reste de l'app
- Provoquer une vraie erreur serveur après l'installation et vérifier qu'elle arrive dans Sentry : une intégration qui compile n'est pas une intégration qui remonte. Sur ce projet, `GET /admin/api/sentry-test` connecté à l'espace admin, dont l'issue doit pointer sur le fichier de la route. Une erreur née dans une dépendance (SDK S3…) n'a que des frames de cette dépendance et ne prouve rien sur les source maps
- Capturer les erreurs de rendu côté React par `useReportError(error)` (`src/hooks/use-report-error.ts`) dans chaque `error.tsx` et dans `global-error.tsx`

## À éviter
- Auto-héberger Sentry : 4 cœurs, 16 Go de RAM et 16 Go de swap au minimum, hors de portée du VPS (`docs/adrs/017-observabilite-cloud.md`)
- Suivre un guide qui crée `sentry.client.config.ts` : la majorité des tutoriels en ligne sont sur l'ancienne convention
- Traiter `sentry.server.config.ts` et `sentry.edge.config.ts` comme des points d'entrée directs : ils sont importés par `register()`
- Appeler `pinoIntegration()` sur le runtime Edge : le SDK y fournit un shim vide, ni erreur ni capture
- Activer Session Replay sans besoin identifié : 36 à 50 Ko gzip s'ajoutent au bundle client, contre moins de 20 Ko pour le cœur du SDK

## Gotchas
- `captureException` dans un Server Component cassait le prerendering sous `cacheComponents: true` (issue getsentry/sentry-javascript#21333), corrigé par la PR #21351, publiée en 10.57.0
- `withServerActionInstrumentation` ne capture ni `redirect()` ni `notFound()` (issue #10466, fermée en 2024), ni `unauthorized()` et `forbidden()` depuis 11.5.0. La garde `getCurrentUser()` reste hors de `createActionLogger` pour une autre raison, le masquage en `unknown_error` (cf. `nextjs/server-actions-security.md`)
- **Perte silencieuse d'events serveur sous Turbopack**, le bundler du build de production depuis le 3 septembre 2026 : #18871 a été fermée sans reproduction ni correctif, donc la traiter comme possible et provoquer une erreur serveur réelle à chaque montée du SDK ou de Next. #21713 (`Sentry.init` non exécuté dans le proxy en build Turbopack) est corrigée côté Next (vercel/next.js#95357)
- **Le tracing des Server Actions est incomplet sous Turbopack** : elles n'émettent aucun span OpenTelemetry, seul `withServerActionInstrumentation` (posé par `createActionLogger`) nomme leur transaction, et l'image de production n'en a reçu aucun span (relevé en SDK 11.1.0, `docs/VERSIONS.md` § Sentry). Ne pas en conclure qu'une action est lente ou absente d'après ses spans
- **`instrumentation-client.ts` est chargé par le navigateur sur toutes les pages** : ne pas y importer `@/env`, qui embarque Zod (60 Kio) et son test `new Function`, refusé par la CSP (bonnes pratiques Lighthouse à 96, relevé du 2026-09-25). Y lire `process.env["NEXT_PUBLIC_SENTRY_DSN"]`, inliné au build
- La région de l'organisation Sentry (États-Unis ou Europe) est **irréversible** : elle se choisit à la création, avant tout code

## Exemples
```typescript
// ✅ Point d'entrée unique, import conditionnel par runtime
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') await import('./sentry.server.config')
  if (process.env.NEXT_RUNTIME === 'edge') await import('./sentry.edge.config')
}

export const onRequestError = Sentry.captureRequestError

// ✅ Wrapper légitime : log applicatif ajouté, logger dédié untracké pour éviter le doublon
export const onRequestError: Instrumentation.onRequestError = (error, request, context) => {
  Sentry.captureRequestError(error, request, context)
  incidentLogger.error({ err: error, path: request.path }) // incidentLogger = logger.child({}), untracké
}
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
})

// ❌ log.levels au défaut : tous les niveaux partent, debug compris
Sentry.init({ integrations: [Sentry.pinoIntegration()] })
```
