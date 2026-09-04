# Observabilité applicative avec Sentry — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Capter les erreurs serveur et client de l'application dans Sentry, avec des stack traces démangées et les durées d'exécution des Server Actions.

**Architecture:** Quatre fichiers d'instrumentation selon la convention actuelle du SDK, un `withSentryConfig` posé en wrapper le plus externe de `next.config.ts`, et un filtrage des données personnelles isolé dans une fonction pure testée. Le tracing est activé côté serveur et laissé à zéro côté navigateur, ce qui donne les durées des Server Actions sans alourdir le bundle client.

**Tech Stack:** `@sentry/nextjs`, Next.js 16 App Router, Pino 10, Vitest, Docker BuildKit, GitHub Actions.

**Spec:** `docs/superpowers/specs/espace-admin/02-observabilite-sentry-design.md`

## Global Constraints

- Organisation Sentry : `tg-ws`, région européenne (`https://de.sentry.io`), org id `4511826481774592`. Le CLI `sentry` est déjà installé et authentifié.
- Projet à créer : `thibaud-geisler-portfolio`, plateforme `javascript-nextjs`. Ne pas toucher au projet existant `techno-scraper`.
- Host d'ingestion : `o4511826481774592.ingest.de.sentry.io`. Le segment de région est **`de`**, pas `eu`.
- `withSentryConfig` doit être le wrapper **le plus externe** : `withSentryConfig(withBundleAnalyzer(withNextIntl(nextConfig)), options)`.
- `NEXT_PUBLIC_SENTRY_DSN` est **optionnelle** dans `src/env.ts`, qui est fail-fast, et doit figurer dans les `build-args` du workflow puisqu'elle est inlinée dans le bundle au build.
- Les trois fichiers de configuration lisent le DSN **via `env`**, jamais `process.env` : c'est la règle de PRODUCTION.md § Gestion des Secrets, et la déclarer dans `src/env.ts` sans l'y lire laisserait la validation Zod inopérante. Aucune garde conditionnelle autour de `Sentry.init` : un DSN absent désactive le SDK de lui-même, c'est le comportement documenté, et l'envelopper dans un `if` n'ajouterait que du bruit.
- `SENTRY_AUTH_TOKEN` passe par un secret BuildKit, jamais par un `ARG`. `DATABASE_URL` conserve son `build-arg` actuel : sa migration est hors scope.
- Tracing : `tracesSampleRate` réglé dans `sentry.server.config.ts`, laissé à `0` dans `instrumentation-client.ts`. Pas de Session Replay, pas de `tunnelRoute`.
- Intégration Pino : `log.levels: ['warn','error','fatal']`, `error.levels: ['error','fatal']`.
- Ne pas utiliser `@sentry/wizard` : c'est un TUI interactif, et il réécrit `next.config.ts` sans connaître les wrappers en place.
- **`src/instrumentation.ts` existe déjà et ne doit pas être écrasé.** Il charge Pino au démarrage et invalide les étiquettes de cache après un déploiement de production. Écraser ces deux comportements ferait servir au site les données du seed CI éphémère jusqu'à la première revalidation, et priverait le logger de son bootstrap.
- Aucun commit intermédiaire. Le périmètre du commit final est validé par l'utilisateur.

**Références :** `docs/knowledges/sentry.md`, `.claude/rules/sentry/instrumentation.md`, `.claude/rules/sentry/build-config.md`, `.claude/rules/pino/logger.md`, `.claude/rules/nextjs/configuration.md`, `.claude/rules/vitest/setup.md`. Contrainte d'architecture : ADR-017 impose le cloud, jamais le self-hosted.

---

### Task 1 : Créer le projet Sentry et relever le DSN

**Files:** aucun fichier du dépôt.

**Interfaces:**
- Consomme : le CLI `sentry` déjà authentifié sur l'org `tg-ws`.
- Produit : le **DSN** du nouveau projet, consommé par les Tasks 3 et 6, et un **org auth token** consommé par la Task 6.

- [ ] **Step 1: Créer le projet**

```bash
sentry project create tg-ws/thibaud-geisler-portfolio:javascript-nextjs
```

- [ ] **Step 2: Vérifier la création**

```bash
sentry project list tg-ws
```

Attendu : deux projets, `techno-scraper` et `thibaud-geisler-portfolio`.

- [ ] **Step 3: Relever le DSN**

```bash
sentry project view tg-ws/thibaud-geisler-portfolio --json | grep -oE 'https://[a-f0-9]+@o[0-9]+\.ingest\.de\.sentry\.io/[0-9]+'
```

Le DSN est semi-public : il est inliné dans le bundle navigateur. Il n'a pas à être traité comme un secret, mais il n'a pas non plus à être commité en dur.

- [ ] **Step 4: Créer l'org auth token (action utilisateur)**

Dans Sentry : **Settings** de l'organisation → **Auth Tokens** → créer un token avec les portées d'écriture de releases et d'upload de source maps.

Ce token est distinct de celui du CLI local, qui est un token OAuth à durée de vie courte avec rafraîchissement automatique et ne convient pas à la CI.

- [ ] **Step 5: Enregistrer le secret GitHub (action utilisateur)**

Ajouter `SENTRY_AUTH_TOKEN` dans les secrets du dépôt GitHub, et `NEXT_PUBLIC_SENTRY_DSN` dans les **variables** du dépôt (pas les secrets : ce n'en est pas un, et le workflow lit les autres `NEXT_PUBLIC_*` depuis `vars`).

---

### Task 2 : Fonction de filtrage des données personnelles

**Files:**
- Create: `src/lib/sentry-scrub.ts`
- Test: `src/lib/sentry-scrub.test.ts`

**Interfaces:**
- Consomme : rien.
- Produit : `scrubSentryEvent(event: ErrorEvent): ErrorEvent`, appelée depuis `beforeSend` dans les trois fichiers de configuration de la Task 3.

> C'est la seule règle métier du sub-project : elle porte les engagements du registre des traitements. Tout le reste est de la configuration, que la règle no-lib-test exclut du périmètre de test.

- [ ] **Step 1: Écrire le test qui échoue**

```typescript
import { describe, expect, it } from 'vitest'

import { scrubSentryEvent } from './sentry-scrub'

describe('scrubSentryEvent', () => {
  it("retire l'email et l'adresse IP de l'objet user", () => {
    const event = { user: { id: 'u1', email: 'client@exemple.fr', ip_address: '203.0.113.7' } }

    const result = scrubSentryEvent(event)

    expect(result.user).toEqual({ id: 'u1' })
  })

  it('conserve les propriétés non sensibles de user', () => {
    const event = { user: { id: 'u1', username: 'thibaud' } }

    const result = scrubSentryEvent(event)

    expect(result.user).toEqual({ id: 'u1', username: 'thibaud' })
  })

  it('traverse un événement sans objet user sans lever', () => {
    const event = { message: 'boom' }

    const result = scrubSentryEvent(event)

    expect(result).toEqual({ message: 'boom' })
  })

  it("retourne toujours l'événement et jamais undefined", () => {
    const event = {}

    const result = scrubSentryEvent(event)

    expect(result).toBeDefined()
  })
})
```

Le dernier cas n'est pas cosmétique : `beforeSend` interprète un retour `undefined` comme un abandon, l'événement serait perdu sans aucun signal.

- [ ] **Step 2: Lancer le test pour vérifier qu'il échoue**

Run: `pnpm vitest run --project unit src/lib/sentry-scrub.test.ts`
Expected: FAIL, le module `./sentry-scrub` n'existe pas.

- [ ] **Step 3: Écrire l'implémentation minimale**

```typescript
import type { ErrorEvent } from '@sentry/nextjs'

export function scrubSentryEvent(event: ErrorEvent): ErrorEvent {
  if (!event.user) return event

  const { email, ip_address, ...safeUser } = event.user
  return { ...event, user: safeUser }
}
```

Le logger Pino filtre déjà les secrets (`*.password`, `*.token`, en-têtes d'autorisation). Cette fonction couvre ce que Pino ne traite pas : les données personnelles que Sentry attache de son propre chef à un événement.

- [ ] **Step 4: Lancer le test pour vérifier qu'il passe**

Run: `pnpm vitest run --project unit src/lib/sentry-scrub.test.ts`
Expected: PASS, quatre cas verts.

---

### Task 3 : Installer le SDK et poser l'instrumentation

**Files:**
- Modify: `package.json`
- Modify: `src/instrumentation.ts` (fichier existant)
- Create: `src/instrumentation-client.ts`
- Create: `sentry.server.config.ts`
- Create: `sentry.edge.config.ts`
- Modify: `src/env.ts`
- Modify: `.env.example`

**Interfaces:**
- Consomme : `scrubSentryEvent` de la Task 2, le DSN de la Task 1.
- Produit : l'export `onRequestError` requis par Next.js, et l'initialisation du SDK sur les trois runtimes.

- [ ] **Step 1: Installer le SDK**

```bash
pnpm add @sentry/nextjs
```

- [ ] **Step 2: Déclarer la variable d'environnement**

Dans `src/env.ts`, ajouter à la section `client` et à `runtimeEnv` :

```typescript
  client: {
    NEXT_PUBLIC_SENTRY_DSN: z.url().optional(),
  },
  runtimeEnv: {
    NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
  },
```

`optional()` est impératif : `src/env.ts` est fail-fast, et rendre cette variable requise casserait le démarrage partout où elle est absente, à commencer par le développement local.

- [ ] **Step 3: Documenter la variable dans `.env.example`**

```bash
# Sentry (monitoring d'erreurs — optionnel, laisser vide pour désactiver en local)
NEXT_PUBLIC_SENTRY_DSN=       # DSN du projet Sentry (Settings → Client Keys)
```

- [ ] **Step 4: Écrire `sentry.server.config.ts`**

```typescript
import * as Sentry from '@sentry/nextjs'

import { env } from '@/env'
import { scrubSentryEvent } from '@/lib/sentry-scrub'

Sentry.init({
  dsn: env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 1,
  integrations: [
    Sentry.pinoIntegration({
      log: { levels: ['warn', 'error', 'fatal'] },
      error: { levels: ['error', 'fatal'] },
    }),
  ],
  beforeSend: scrubSentryEvent,
})
```

`tracesSampleRate: 1` échantillonne toutes les transactions serveur. Le plan gratuit couvre 5 M de spans par mois, très au-delà du trafic de ce site, donc rien ne justifie d'en jeter une partie.

`log.levels` doit rester explicite : sans lui, tous les niveaux partent, `debug` compris.

- [ ] **Step 5: Écrire `sentry.edge.config.ts`**

```typescript
import * as Sentry from '@sentry/nextjs'

import { env } from '@/env'
import { scrubSentryEvent } from '@/lib/sentry-scrub'

Sentry.init({
  dsn: env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 1,
  beforeSend: scrubSentryEvent,
})
```

Pas d'intégration Pino ici : elle exige le runtime Node.js et n'est pas disponible sur Edge.

- [ ] **Step 6: Compléter `src/instrumentation.ts`, sans l'écraser**

⚠️ **Ce fichier existe déjà.** Il porte deux comportements à conserver : le chargement de Pino au démarrage, et l'invalidation des étiquettes de cache après un déploiement de production. Le remplacer par le squelette Sentry des tutoriels ferait servir au site les données du seed CI éphémère jusqu'à la première revalidation, et c'est un défaut silencieux : le site répond normalement, avec le mauvais contenu.

État attendu après modification :

```typescript
import * as Sentry from '@sentry/nextjs'

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Sentry avant le logger : l'intégration Pino doit être active avant la première émission.
    await import('../sentry.server.config')
    await import('./lib/logger')

    // Invalide le cache build (rempli au build CI avec données seed ephemeral)
    // pour forcer le fill avec les vraies données prod au premier hit après deploy.
    if (process.env.NEXT_PHASE === 'phase-production-server') {
      const { revalidateTag } = await import('next/cache')
      revalidateTag('projects', 'max')
      revalidateTag('tags', 'max')
      revalidateTag('legal-entity', 'max')
      revalidateTag('legal-content', 'max')
    }
  }

  if (process.env.NEXT_RUNTIME === 'edge') await import('../sentry.edge.config')
}

export const onRequestError = Sentry.captureRequestError
```

Trois ajouts seulement : l'import de la configuration serveur, la branche Edge, et l'export `onRequestError`. Tout le reste est préexistant.

L'ordre des deux `await import` n'est pas indifférent : `.claude/rules/sentry/instrumentation.md` demande que l'intégration soit active avant que le logger n'émette, faute de quoi les premiers logs échappent à la capture.

`onRequestError` est ce qui capture les erreurs des Server Components et du proxy. Sans cet export, ces erreurs ne remontent pas.

- [ ] **Step 7: Écrire `src/instrumentation-client.ts`**

```typescript
import * as Sentry from '@sentry/nextjs'

import { env } from '@/env'
import { scrubSentryEvent } from '@/lib/sentry-scrub'

Sentry.init({
  dsn: env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0,
  beforeSend: scrubSentryEvent,
})
```

`tracesSampleRate: 0` est délibéré : le tracing navigateur alourdirait le bundle sans servir le besoin, alors que le LCP des pages publiques a une cible de 2,5 s.

- [ ] **Step 8: Vérifier que le typecheck passe**

Run: `pnpm typecheck`
Expected: aucune erreur.

---

### Task 4 : Configurer le build et la CSP

**Files:**
- Modify: `next.config.ts`

**Interfaces:**
- Consomme : rien des tâches précédentes.
- Produit : un `next.config.ts` dont l'export par défaut est enveloppé par `withSentryConfig`, et une CSP qui autorise l'ingestion.

- [ ] **Step 1: Étendre `connect-src`**

Dans le tableau `cspDirectives`, remplacer la ligne `connect-src` par :

```typescript
  ['connect-src', "'self' https://*.calendly.com https://o4511826481774592.ingest.de.sentry.io"],
```

Sans cette directive, le navigateur bloque les envois et rien ne remonte. Le symptôme est une absence d'erreurs clientes, qui ressemble à un site en bonne santé.

- [ ] **Step 2: Envelopper l'export avec `withSentryConfig`**

```typescript
import { withSentryConfig } from '@sentry/nextjs'

export default withSentryConfig(
  withBundleAnalyzer(withNextIntl(nextConfig)),
  {
    org: 'tg-ws',
    project: 'thibaud-geisler-portfolio',
    authToken: process.env.SENTRY_AUTH_TOKEN,
    silent: !process.env.CI,
    widenClientFileUpload: true,
    _experimental: { useRunAfterProductionCompileHook: true },
  },
)
```

L'ordre n'est pas négociable : `withSentryConfig` doit être le plus externe pour que les source maps reflètent les transformations opérées par les autres plugins.

`_experimental.useRunAfterProductionCompileHook` ne l'est pas davantage : le build de production est en Turbopack, où l'upload passe **toujours** par le hook Next `runAfterProductionCompile` (Next >= 15.4.1). Sans ce drapeau, le build réussit et aucune source map n'est envoyée. Les stack traces restent minifiées et le scénario 1 de la spec échoue, sans le moindre message d'erreur pour le signaler.

- [ ] **Step 3: Vérifier que le build local passe**

Run: `pnpm build`
Expected: build réussi. Sans `SENTRY_AUTH_TOKEN` en local, l'upload des source maps est simplement ignoré, ce qui est le comportement attendu.

---

### Task 5 : Brancher les error boundaries

**Files:**
- Modify: `src/app/[locale]/error.tsx`
- Modify: `src/app/global-error.tsx`

**Interfaces:**
- Consomme : le SDK initialisé par la Task 3.
- Produit : la remontée des erreurs rendues côté client.

- [ ] **Step 1: Brancher `src/app/[locale]/error.tsx`**

Remplacer le commentaire `// TODO post-MVP : envoyer error à Sentry` et la ligne `void error` par :

```typescript
import { useEffect } from 'react'
import * as Sentry from '@sentry/nextjs'

// dans le composant :
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])
```

`useEffect` plutôt qu'un appel direct dans le corps du composant : celui-ci peut être ré-exécuté au rendu, ce qui produirait des doublons.

- [ ] **Step 2: Brancher `src/app/global-error.tsx`**

Ajouter le même `useEffect` et le même import.

Ne rien changer d'autre dans ce fichier. Ses messages FR/EN sont codés en dur délibérément, comme l'explique son commentaire : il doit rester affichable quand next-intl lui-même a crashé. L'import de Sentry est la seule dépendance acceptable ici.

- [ ] **Step 3: Vérifier le typecheck et le lint**

Run: `pnpm typecheck && pnpm lint`
Expected: aucune erreur.

- [ ] **Step 4: Vérifier la compatibilité avec `cacheComponents`**

Run: `pnpm build`
Expected: build réussi, sans erreur de prerendering.

L'issue getsentry/sentry-javascript#21333 décrit une rupture du prerendering quand `captureException` est appelé dans un Server Component avec `cacheComponents: true`, qui est la configuration du projet. Elle est corrigée par la PR #21351 mais la version de publication n'est pas confirmée. Les deux fichiers touchés ici étant des Client Components, le risque est faible, mais ce build est ce qui le vérifie. En cas d'échec, isoler l'appel derrière un `useEffect` est déjà fait ; sinon, remonter la version du SDK.

---

### Task 6 : Chaîne de build et secret

**Files:**
- Modify: `Dockerfile:60`
- Modify: `.github/workflows/deploy.yml`
- Modify: `.gitignore`

**Interfaces:**
- Consomme : le token et la variable enregistrés à la Task 1.
- Produit : une image dont les source maps sont uploadées, sans que le token n'apparaisse dans ses couches.

- [ ] **Step 1: Monter le secret sur la commande de build**

Dans le `Dockerfile`, remplacer `RUN pnpm exec next build` par :

```dockerfile
RUN --mount=type=secret,id=sentry_auth_token \
    SENTRY_AUTH_TOKEN="$(cat /run/secrets/sentry_auth_token 2>/dev/null || true)" \
    pnpm exec next build
```

Le `|| true` garde le build fonctionnel quand le secret n'est pas fourni, typiquement lors d'un build local : l'upload des source maps est alors simplement ignoré.

Ajouter aussi le DSN au bloc des variables publiques du stage `builder`, à côté des `ARG NEXT_PUBLIC_*` qui s'y trouvent déjà :

```dockerfile
ARG NEXT_PUBLIC_SENTRY_DSN
ENV NEXT_PUBLIC_SENTRY_DSN=$NEXT_PUBLIC_SENTRY_DSN
```

Sans ce couple, le `build-arg` du workflow n'atteint jamais la compilation : la variable est inlinée dans le bundle navigateur au moment du build, elle vaudrait donc `undefined` en production alors que tout fonctionne en local. Le `Dockerfile` porte déjà ce commentaire pour les autres `NEXT_PUBLIC_*`, la ligne d'à côté fait foi.

- [ ] **Step 2: Passer le secret et la variable dans le workflow**

Dans `.github/workflows/deploy.yml`, à l'étape `docker/build-push-action@v7`, ajouter à `build-args` :

```yaml
            NEXT_PUBLIC_SENTRY_DSN=${{ vars.NEXT_PUBLIC_SENTRY_DSN }}
```

et ajouter le bloc :

```yaml
          secrets: |
            sentry_auth_token=${{ secrets.SENTRY_AUTH_TOKEN }}
```

Le DSN va dans `build-args` et non dans `secrets` : c'est une variable `NEXT_PUBLIC_`, inlinée dans le bundle au build. L'omettre produirait un SDK navigateur muet en production alors que tout fonctionne en local.

- [ ] **Step 3: Ignorer le fichier de configuration du plugin**

Ajouter à `.gitignore` :

```
.env.sentry-build-plugin
```

Ce fichier n'est généré que par le wizard, qu'on n'utilise pas, mais l'ignorer coûte une ligne et évite une fuite de token si quelqu'un le lance un jour.

- [ ] **Step 4: Vérifier que le token n'est pas dans l'image**

Après le premier déploiement, sur l'image publiée :

```bash
docker history --no-trunc <image> | grep -i sentry_auth_token
```

Expected: aucun résultat.

---

### Task 7 : Vérifier de bout en bout en production

**Files:** aucun fichier du dépôt.

**Interfaces:**
- Consomme : le déploiement issu des Tasks 3 à 6.
- Produit : la preuve que la chaîne fonctionne. C'est le livrable central.

> Une intégration qui compile n'est pas une intégration qui remonte. Chacune des trois vérifications ci-dessous couvre un chemin distinct, et l'échec de l'une n'empêche pas les autres de réussir.

- [ ] **Step 1: Déclencher le déploiement**

Pousser sur la branche de déploiement et attendre que le workflow aboutisse. Vérifier dans ses logs que l'upload des source maps s'est produit.

- [ ] **Step 2: Provoquer une erreur serveur**

Depuis l'application déployée, provoquer une exception non rattrapée dans un Server Component ou une route handler.

Expected: une issue apparaît dans le projet Sentry, avec une stack trace pointant sur le fichier source original et non sur du code minifié.

Si l'issue apparaît mais que la stack trace est minifiée, le problème est l'upload des source maps, pas la capture.

- [ ] **Step 3: Provoquer une erreur client**

Déclencher une exception atteignant l'error boundary côté navigateur, console ouverte.

Expected: une issue apparaît, et **aucune violation de CSP** n'est signalée dans la console. Une violation signalerait que `connect-src` de la Task 4 est incomplet.

- [ ] **Step 4: Vérifier le tracing serveur**

Soumettre le formulaire de contact, puis :

```bash
sentry trace list tg-ws/thibaud-geisler-portfolio --limit 5 --period 1h
```

Expected: au moins une transaction couvrant la Server Action, avec sa durée. Comparer à la cible de 3 s hors SMTP fixée par `docs/PRODUCTION.md`.

- [ ] **Step 5: Vérifier que l'invalidation post-déploiement fonctionne toujours**

Après le déploiement, consulter `/fr/projets` et vérifier que les projets affichés sont ceux de la base de production, et non ceux du seed du build CI.

Expected: le contenu réel. S'il s'agit des données de seed, le bloc `NEXT_PHASE` de `src/instrumentation.ts` a été perdu en ajoutant Sentry. C'est le défaut le plus silencieux de ce sub-project : le site répond normalement, avec le mauvais contenu.

- [ ] **Step 6: Vérifier l'absence de tracing navigateur**

Dans l'onglet réseau, pendant une navigation sur une page publique.

Expected: aucune requête d'envoi de transaction émise par le navigateur, seules les erreurs pouvant en produire.

- [ ] **Step 7: Vérifier le filtrage des données personnelles**

Ouvrir une issue captée aux étapes précédentes et inspecter son contexte utilisateur.

Expected: ni adresse email, ni adresse IP en clair.

- [ ] **Step 8: Vérifier les niveaux Pino**

Déclencher successivement un `logger.debug()`, un `logger.warn()` et un `logger.error()` depuis du code serveur, puis consulter les logs Sentry :

```bash
sentry log list tg-ws/thibaud-geisler-portfolio --limit 10
```

Expected, conformément à `log.levels` et `error.levels` :

| Appel | Log Sentry | Issue |
|---|---|---|
| `logger.debug()` | non | non |
| `logger.warn()` | oui | non |
| `logger.error()` | oui | oui |

Si `debug` apparaît, `log.levels` n'a pas été pris en compte et le quota de 5 Go s'épuisera pour rien. Si `warn` crée une issue, c'est `error.levels` qui est trop large et chaque avertissement deviendra une alerte.

---

### Task 8 : Mettre la documentation à jour

**Files:**
- Modify: `docs/VERSIONS.md`
- Modify: `docs/PRODUCTION.md`
- Modify: `docs/ARCHITECTURE.md`
- Modify: `docs/registre-traitements.md`

**Interfaces:**
- Consomme : la configuration réelle et vérifiée des Tasks 1 à 7.
- Produit : quatre documents alignés sur l'état constaté.

- [ ] **Step 1: Ajouter Sentry à `docs/VERSIONS.md`**

Ajouter une entrée dans le tableau de vue d'ensemble et une section détaillée, sur le modèle de l'entrée Better Auth de l'annexe post-MVP. Y consigner la version installée de `@sentry/nextjs`, la compatibilité avec Next.js 16 et React 19, et le point suivant : le build de production étant en Turbopack, les incidents Sentry liés à ce bundler concernent le projet et doivent être revalidés contre la version du SDK installée.

- [ ] **Step 2: Mettre à jour `docs/PRODUCTION.md`**

Trois modifications :

- Ajouter `NEXT_PUBLIC_SENTRY_DSN` aux Variables Communes et `SENTRY_AUTH_TOKEN` aux secrets, en précisant que ce dernier est un secret de **build** géré dans GitHub, et non une variable d'environnement Dokploy.
- Dans la Stack Monitoring, **ajouter** la ligne Sentry. Elle en a été retirée le 2026-09-03 : le tableau ne liste plus que les outils réellement en service, un outil non déployé n'y figure pas. L'ajouter au moment où il tourne, sans mention « post-MVP ».
- La durée de la Server Action de contact est **déjà** mesurée et documentée : `duration_ms` sur l'event `email:sent`, cité en § Observabilité › Métriques Clés et en § Performance › Benchmarks. Sentry ne la remplace pas, il l'observe autrement. Indiquer que la transaction Sentry devient une seconde source, sans réécrire ces deux lignes.

- [ ] **Step 3: Mettre à jour `docs/ARCHITECTURE.md`**

Dans la section Observabilité, Sentry n'est plus « post-MVP » mais en place. Préciser le périmètre retenu : erreurs et tracing serveur, sans tracing navigateur ni Session Replay.

- [ ] **Step 4: Mettre à jour `docs/registre-traitements.md`**

Ajouter Sentry comme sous-traitant traitant des données d'erreur, en mentionnant la région européenne de l'organisation et le filtrage appliqué avant envoi (ni email, ni adresse IP).

- [ ] **Step 5: Vérifier la cohérence des anti-patterns de logging**

Dans `docs/PRODUCTION.md`, la liste des secrets à ne jamais logger mentionne `SMTP_PASS`, `DATABASE_URL` et `IP_HASH_SALT` (état du 2026-09-03). Y ajouter `SENTRY_AUTH_TOKEN`.

- [ ] **Step 6: Demander la validation avant commit**

Ne pas committer sans accord explicite de l'utilisateur sur le périmètre et le message. Message proposé :

```
feat(observabilite): instrumentation Sentry avec tracing serveur
```
