---
title: "Sentry — Monitoring d'erreurs applicatives"
version: "10.72.0"
description: "Référence technique pour @sentry/nextjs : instrumentation App Router, source maps, CSP, PII et cohabitation avec Pino."
date: "2026-09-03"
keywords: ["sentry", "monitoring", "erreurs", "observabilite", "nextjs", "rgpd"]
scope: ["docs"]
technologies: ["Next.js", "React", "Pino", "Docker", "GitHub Actions"]
---

# Description

`Sentry` capte les exceptions applicatives du portfolio, côté navigateur comme côté serveur, et les regroupe en issues avec leur stack trace démangée. Il complète Pino sans le remplacer : Pino écrit des logs structurés que Dokploy affiche, Sentry alerte sur ce qui casse.

[ADR-017](../adrs/017-observabilite-cloud.md) impose **le service cloud, jamais le self-hosted** : l'installation auto-hébergée réclame 4 cœurs, 16 Go de RAM et 16 Go de swap au minimum, hors de portée du VPS.

Le plan gratuit *Developer* couvre largement l'usage : « 5k errors », « 5M spans », « 50 replays », « 5GB » de logs, « 30-day lookback » de rétention, et « One user » — ce dernier point étant sans conséquence pour un projet single-user.

---

# Concepts Clés

## Fichiers d'instrumentation en App Router

### Description

La convention a changé deux fois depuis le SDK v7, ce qui rend la plupart des tutoriels en ligne faux. En version courante, le point d'entrée unique est `instrumentation.ts`, qui importe conditionnellement la config selon le runtime, et le client vit dans `instrumentation-client.ts`.

Le fichier `sentry.client.config.ts` que documentent les anciens guides est obsolète : il se renomme `instrumentation-client.ts`.

### Exemple

```typescript
// instrumentation.ts
import * as Sentry from '@sentry/nextjs'

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') await import('./sentry.server.config')
  if (process.env.NEXT_RUNTIME === 'edge') await import('./sentry.edge.config')
}

export const onRequestError = Sentry.captureRequestError
```

### Points Importants

- Quatre fichiers au total : `instrumentation.ts`, `instrumentation-client.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`
- `onRequestError` capture les erreurs des Server Components, du middleware et des proxys. Il exige le SDK ≥ 8.28.0 et Next.js 15+
- Les fichiers `sentry.server.config.ts` et `sentry.edge.config.ts` ne sont plus des points d'entrée directs : ils sont importés par `register()`
- Le projet a déjà `error.tsx` et `global-error.tsx` porteurs d'un `// TODO post-MVP : envoyer error à Sentry`, ce sont les points de branchement côté React

---

## Composition de `next.config.ts`

### Description

`withSentryConfig` doit être le **dernier** wrapper appliqué, donc le plus externe. La doc le formule ainsi : « Make sure adding Sentry options is the last code to run before exporting ». La raison est que les source maps doivent refléter les transformations opérées par les autres plugins.

Le projet enchaîne déjà deux wrappers, l'ordre final est donc contraint.

### Exemple

```typescript
export default withSentryConfig(
  withBundleAnalyzer(withNextIntl(nextConfig)),
  {
    org: '<org-slug>',
    project: '<project-slug>',
    authToken: process.env.SENTRY_AUTH_TOKEN,
    silent: !process.env.CI,
    widenClientFileUpload: true,
  },
)
```

### Points Importants

- Ordre imposé : `withSentryConfig(withBundleAnalyzer(withNextIntl(config)), options)`
- `silent: !process.env.CI` garde le build local lisible tout en conservant les logs d'upload en CI
- `sourcemaps.deleteSourcemapsAfterUpload` vaut `true` par défaut, ce qui évite d'embarquer les source maps dans l'image finale

---

## Source maps et build Docker

### Description

Sans source maps uploadées, les stack traces sont illisibles : du code minifié. L'upload se déclenche au build et réclame un `SENTRY_AUTH_TOKEN`, qui est un secret de build, pas un secret de runtime.

Le moment de l'upload dépend du bundler : Webpack pousse pendant le build, Turbopack après, via `useRunAfterProductionCompileHook`.

### Exemple

```dockerfile
# Le token n'existe que dans le stage de build, jamais dans l'image finale
RUN --mount=type=secret,id=sentry_auth_token \
    SENTRY_AUTH_TOKEN="$(cat /run/secrets/sentry_auth_token)" pnpm build
```

### Points Importants

- `SENTRY_AUTH_TOKEN` est un secret de **build** : il ne doit pas se retrouver dans les variables d'environnement Dokploy du conteneur, seulement dans le workflow GitHub Actions
- Le passage par un secret BuildKit plutôt qu'un `ARG` évite qu'il persiste dans une couche de l'image. Ce pattern est une pratique Docker générique, Sentry ne documente pas le cas multi-stage
- La doc officielle se limite à « Make sure to also add it to your CI »
- Le projet buildant en Turbopack (l'opt-out `--webpack` a été retiré le 3 septembre 2026), l'upload se fait **après** la compilation : `_experimental.useRunAfterProductionCompileHook` est le mode à activer, et il exige Next >= 15.4.1
- Laisser `deleteSourcemapsAfterUpload` actif : des source maps servies publiquement exposeraient le code source

---

## Content Security Policy

### Description

Deux mécanismes distincts, souvent confondus. Le premier est obligatoire pour que Sentry fonctionne, le second est une fonctionnalité produit optionnelle.

1. **`connect-src`** autorise le SDK à poster les événements depuis le navigateur. Sans lui, la CSP bloque tout et rien ne remonte.
2. **`report-uri` / `report-to`** fait de Sentry le collecteur des violations de CSP. C'est un usage à part, sans rapport avec la capture d'exceptions.

Le spec CSP du projet a déjà réservé ce second point comme post-MVP.

### Exemple

```
connect-src 'self' https://o<org-id>.ingest.<region>.sentry.io
report-uri  https://o<org-id>.ingest.<region>.sentry.io/api/<project-id>/security/?sentry_key=<public-key>
```

### Points Importants

- Le host exact se lit dans Project Settings → SDK Setup → Client Keys (DSN), il n'est pas devinable
- **L'organisation du projet est `tg-ws`, en région européenne (`https://de.sentry.io`, Francfort).** Son host d'ingestion est `o4511826481774592.ingest.de.sentry.io`. Le segment de région est `de`, pas `eu` : une organisation européenne ingère sur `.ingest.de.sentry.io`
- La région d'une organisation se lit avec `sentry org view <slug> --json`, champ `links.regionUrl`
- La CSP actuelle du projet est stricte (`connect-src 'self' https://*.calendly.com`) : elle bloquera Sentry tant que la directive n'est pas étendue
- Avec `tunnelRoute`, `connect-src 'self'` suffit pour cette partie, les événements transitant par l'application

---

## Tunnel route

### Description

Les bloqueurs de publicité filtrent les requêtes vers les domaines d'ingestion connus, dont Sentry, ce qui fait disparaître une partie des erreurs côté navigateur. `tunnelRoute` crée une route same-origin dans l'application qui relaie les événements.

### Exemple

```typescript
withSentryConfig(config, { tunnelRoute: '/sentry-tunnel' })
```

### Points Importants

- Résout la perte d'événements due aux bloqueurs, au prix d'un passage par le serveur applicatif
- La route de tunnel doit être exclue de tout middleware ou proxy qui l'intercepterait : le projet a un `src/proxy.ts` dont le matcher devra en tenir compte
- Une CVE de type SSRF a affecté `tunnelRoute` sur les versions 7.26.0 à 7.76.x ([GHSA-2rmr-xw8m-22q9](https://github.com/advisories/GHSA-2rmr-xw8m-22q9)), corrigée en 7.77.0. Sans objet sur la version courante, mais le rappel vaut : cette route élargit la surface d'attaque et doit valider que sa cible est bien Sentry

---

## Données personnelles et RGPD

### Description

Sentry capte par défaut de quoi identifier un utilisateur, ce qui touche directement le registre des traitements du projet. Deux leviers : l'option de collecte globale, et un filtre appliqué avant chaque envoi.

`sendDefaultPii` est déprécié depuis la 10.54.0 au profit de `dataCollection`, avec suppression annoncée en v11. Si les deux sont présentes, `dataCollection` l'emporte.

### Exemple

```typescript
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  beforeSend(event) {
    if (event.user) delete event.user.email
    return event
  },
})
```

### Points Importants

- **La région de l'organisation est irréversible** : le choix entre les États-Unis et l'Europe (`de.sentry.io`, datacenter de Francfort) se fait à la création de l'organisation et ne peut plus changer. À trancher avant de créer le projet
- Depuis le SDK v10, l'IP n'est plus inférée côté navigateur quand la collecte de PII est désactivée
- `beforeSend` doit retourner un événement valide ou `null` pour l'abandonner, jamais `undefined`
- Le projet hache déjà les IP dans les logs Pino (`ip_hash` salé) : la même exigence vaut ici, et l'ajout de Sentry impose de mettre à jour [registre-traitements.md](../registre-traitements.md)

---

## Cohabitation avec Pino

### Description

Le projet loggue déjà en JSON structuré via Pino. Sentry propose une intégration native depuis le SDK 10.18.0, qui évite d'écrire un transport maison et surtout de capturer deux fois la même erreur.

Deux réglages indépendants : ce qui part en Sentry Logs, et ce qui déclenche en plus une issue.

### Exemple

```typescript
Sentry.init({
  integrations: [
    Sentry.pinoIntegration({
      log: { levels: ['warn', 'error', 'fatal'] },
      error: { levels: ['error', 'fatal'] },
    }),
  ],
})
```

### Points Importants

- `log.levels` sélectionne ce qui devient un Sentry Log. Par défaut, tous les niveaux, ce qui consomme le quota de 5 Go pour rien
- `error.levels` sélectionne ce qui devient en plus une issue. Par défaut `[]`, donc désactivé
- Sans distinguer les deux, une erreur Pino remonte à la fois en Log et en Issue
- Plage supportée : Pino `>=8.0.0 <11`. Le projet est en Pino 10
- L'intégration exige le runtime Node.js, elle ne fonctionne pas en Edge
- Depuis le SDK 10.71.0, `enableLogs: true` n'est plus nécessaire

---

## Bundler et incidents connus

### Description

Next.js 16 fait de Turbopack le bundler par défaut, et Sentry y a eu plusieurs incidents de **perte silencieuse d'événements serveur** : `onRequestError` est appelé, l'API répond 200, et rien n'arrive dans Sentry.

Le portfolio y est exposé : l'opt-out Webpack qui l'en protégeait (`next build --webpack`, posé pour une issue WASM de Prisma 7) a été retiré du [Dockerfile](../../Dockerfile) le 3 septembre 2026, l'erreur n'étant plus reproductible. Dev, CI et image de production tournent désormais tous sous Turbopack : c'est un gain de cohérence, mais l'intégration Sentry devra être validée dans ce contexte, pas dans celui d'un build Webpack.

Conséquence sur les source maps : en Turbopack, l'upload est **toujours post-build**, par le hook Next `runAfterProductionCompile` que le SDK active via `_experimental.useRunAfterProductionCompileHook` (Next >= 15.4.1). Les options du plugin Webpack ne s'appliquent pas.

### Points Importants

- [#18871](https://github.com/getsentry/sentry-javascript/issues/18871) : événements serveur perdus sous Turbopack, cause suspectée dans `suppressTracing()` qui manipule le contexte asynchrone OpenTelemetry. **Fermée**, version du fix non confirmée. Le build étant en Turbopack, vérifier la version du SDK installée face à ce fix
- [#21713](https://github.com/getsentry/sentry-javascript/issues/21713) : middleware et `proxy.ts` non instrumentés sous Turbopack en production. Même remarque, et le projet a bien un `proxy.ts`
- [#21333](https://github.com/getsentry/sentry-javascript/issues/21333) : `captureException` dans un Server Component casse le prerendering avec `cacheComponents: true`. **Indépendant du bundler, et le projet a `cacheComponents: true`** : c'est celui qui le concerne vraiment. Corrigée par la PR #21351, version de publication non confirmée
- [#10466](https://github.com/getsentry/sentry-javascript/issues/10466) : `withServerActionInstrumentation` intercepte `NEXT_REDIRECT` et `NEXT_NOT_FOUND`, qui sont des exceptions de contrôle de flux et non des erreurs. À surveiller dès que les Server Actions admin utiliseront `redirect()` ou `notFound()`
- **L'opt-out Webpack est retiré** depuis le 3 septembre 2026 : les incidents Turbopack ci-dessus sont à traiter comme actifs, pas comme théoriques
- **Conséquence pratique** : ne pas considérer l'intégration comme acquise parce qu'elle compile. Provoquer une erreur serveur réelle et vérifier qu'elle apparaît dans Sentry

---

# Commandes Clés

## Installation et build

### Description

Le wizard fait l'essentiel de la mise en place : création des fichiers d'instrumentation, modification de `next.config.ts`, connexion au compte. Il est interactif et doit être lancé à la main.

### Syntaxe

```bash
npx @sentry/wizard@latest -i nextjs     # interactif : demande org, projet, options

pnpm build                              # local, CI et Dockerfile : Turbopack (défaut Next 16)
next build --webpack                    # opt-out ponctuel, plus utilisé par le projet
```

### Points Importants

- Le wizard est un TUI : il réclame une saisie et une connexion au compte, il ne peut pas tourner en non-interactif
- Il génère un `.env.sentry-build-plugin` contenant le token : à gitignorer impérativement
- Il modifie `next.config.ts` sans connaître les wrappers existants, l'ordre de composition est à revérifier après passage

---

# Bonnes Pratiques

## ✅ Recommandations

- **Vérifier une erreur réelle de bout en bout** après l'installation, côté serveur en particulier : une intégration qui compile n'est pas une intégration qui remonte
- Trancher la région de l'organisation avant de créer le projet, ce choix ne se rattrape pas
- Séparer `log.levels` et `error.levels` dans l'intégration Pino, pour ne pas transformer chaque log en issue
- Garder `SENTRY_AUTH_TOKEN` au stage de build uniquement, via un secret BuildKit
- Filtrer les données personnelles dans `beforeSend` et répercuter l'ajout dans le registre des traitements
- Étendre la CSP en même temps que l'installation, sinon rien ne remonte du navigateur et le silence ressemble à une absence d'erreurs
- Relire le `next.config.ts` après le passage du wizard : il ignore les wrappers déjà en place

## ❌ Anti-Patterns

- **Ne pas auto-héberger Sentry** : 4 cœurs et 16 Go de RAM plus autant de swap au minimum, incompatible avec le VPS ([ADR-017](../adrs/017-observabilite-cloud.md))
- Ne pas suivre les guides qui parlent de `sentry.client.config.ts` : la convention est `instrumentation-client.ts`
- Ne pas placer `withSentryConfig` à l'intérieur d'un autre wrapper, les source maps ne refléteraient pas les transformations suivantes
- Ne pas commiter `.env.sentry-build-plugin`
- Ne pas laisser `log.levels` à sa valeur par défaut : tous les niveaux partent, y compris `debug`, et le quota de logs s'épuise
- Ne pas laisser la route de tunnel traverser le proxy sans l'exclure du matcher
- Ne pas activer Session Replay sans raison : entre 36 et 50 Ko gzip s'ajoutent au bundle client, contre moins de 20 Ko pour le cœur du SDK

---

# 🔗 Ressources

## Documentation Officielle

- [Sentry pour Next.js](https://docs.sentry.io/platforms/javascript/guides/nextjs/)
- [Installation manuelle](https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/)
- [Options de build](https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/build/)
- [Upload des source maps](https://docs.sentry.io/platforms/javascript/guides/nextjs/sourcemaps/uploading)
- [Intégration Pino](https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/integrations/pino/)
- [Rapport de violations CSP](https://docs.sentry.io/platforms/javascript/guides/nextjs/security-policy-reporting/)
- [Migration v9 vers v10](https://docs.sentry.io/platforms/javascript/migration/v9-to-v10/)
- [Région européenne](https://sentry.zendesk.com/hc/en-us/articles/25074658211227-About-Sentry-s-EU-Region)
- [Tarifs](https://sentry.io/pricing/)

## Ressources Complémentaires

- [Support Turbopack dans le SDK Next.js](https://blog.sentry.io/turbopack-support-next-js-sdk/)
- [Releases du SDK](https://github.com/getsentry/sentry-javascript/releases)
- [Configurer la CSP pour Sentry](https://www.sentry.help/en/articles/13965155-how-do-i-configure-my-content-security-policy-csp-to-allow-sentry)
