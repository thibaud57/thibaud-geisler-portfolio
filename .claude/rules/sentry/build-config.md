---
paths:
  - "next.config.ts"
  - "Dockerfile"
  - ".github/workflows/*.yml"
  - ".env*"
---

# Sentry — Build, source maps et CSP

## À faire
- Appliquer `withSentryConfig` en **dernier**, donc en wrapper le plus externe : `withSentryConfig(withBundleAnalyzer(withNextIntl(config)), options)`. La doc l'impose pour que les source maps reflètent les transformations des autres plugins
- Passer `SENTRY_AUTH_TOKEN` au seul stage de build, via un secret BuildKit monté à la commande, jamais un `ARG` qui persiste dans une couche d'image
- Étendre `connect-src` de la CSP avec le host d'ingestion, sinon rien ne remonte du navigateur et le silence ressemble à une absence d'erreurs
- Lire le host d'ingestion dans Project Settings puis SDK Setup puis Client Keys : il contient l'identifiant d'organisation et n'est pas devinable
- Exclure la route de tunnel du matcher de `src/proxy.ts` si `tunnelRoute` est activé
- Relire `next.config.ts` après le passage du wizard : il modifie le fichier sans connaître les wrappers déjà en place

## À éviter
- Déclarer `SENTRY_AUTH_TOKEN` dans les variables d'environnement Dokploy : c'est un secret de build, pas de runtime
- Committer `.env.sentry-build-plugin`, généré par le wizard et porteur du token
- Désactiver `sourcemaps.deleteSourcemapsAfterUpload` : des source maps servies publiquement exposent le code source
- Confondre `connect-src` et `report-uri` : le premier autorise l'envoi des events, le second fait de Sentry un collecteur de violations CSP. Deux mécanismes indépendants, le second est optionnel
- Laisser `silent` à sa valeur par défaut en local : le build devient verbeux sans bénéfice, préférer `silent: !process.env.CI`

## Gotchas
- Le build de production est en **Turbopack** depuis le retrait de l'opt-out `--webpack` (3 septembre 2026, voir `docs/VERSIONS.md` § Prisma ORM). Conséquence pour Sentry : en Turbopack l'upload des source maps est **toujours post-build**, via le hook Next `runAfterProductionCompile` que le SDK active par l'option `_experimental.useRunAfterProductionCompileHook` de `withSentryConfig` (Next >= 15.4.1). Les options du plugin webpack (`unstable_sentryWebpackPluginOptions`) ne s'appliquent pas dans ce mode
- La CSP actuelle est stricte (`connect-src 'self' https://*.calendly.com`) : elle bloque Sentry tant qu'elle n'est pas étendue
- L'organisation du projet est `tg-ws`, en région européenne (Francfort). Son host d'ingestion est `o4511826481774592.ingest.de.sentry.io` : le segment de région est **`de`**, pas `eu`. Vérifiable via `sentry org view tg-ws --json`, champ `links.regionUrl`
- `tunnelRoute` a fait l'objet d'une CVE de type SSRF sur les versions 7.26.0 à 7.76.x (GHSA-2rmr-xw8m-22q9), corrigée en 7.77.0. Sans objet aujourd'hui, mais la route élargit la surface d'attaque et doit valider sa cible
- Le wizard `@sentry/wizard` est un TUI interactif : il exige une saisie et une connexion au compte, il ne peut pas tourner en CI

## Exemples
```typescript
// ✅ Sentry en wrapper le plus externe
export default withSentryConfig(
  withBundleAnalyzer(withNextIntl(nextConfig)),
  { org, project, authToken: process.env.SENTRY_AUTH_TOKEN, silent: !process.env.CI },
)

// ❌ Sentry à l'intérieur : les source maps ne reflètent pas les transformations suivantes
export default withBundleAnalyzer(withSentryConfig(withNextIntl(nextConfig), { ... }))
```

```dockerfile
# ✅ Le token vit dans le stage de build, pas dans l'image
RUN --mount=type=secret,id=sentry_auth_token \
    SENTRY_AUTH_TOKEN="$(cat /run/secrets/sentry_auth_token)" pnpm build

# ❌ ARG : la valeur reste inspectable dans l'historique de l'image
ARG SENTRY_AUTH_TOKEN
```
