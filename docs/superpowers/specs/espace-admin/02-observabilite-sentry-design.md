---
feature: "Feature 1 — Espace admin"
subproject: "observabilite-sentry"
goal: "Instrumenter l'application avec Sentry pour capter les erreurs serveur et client avant que la fondation admin n'introduise des mutations"
status: "draft"
complexity: "L"
tdd_scope: "partial"
depends_on: []
date: "2026-08-30"
---

# Observabilité applicative avec Sentry

## Scope

Installer `@sentry/nextjs`, poser les quatre fichiers d'instrumentation, brancher les deux error boundaries existantes, connecter le logger Pino, étendre la CSP et uploader les source maps depuis la CI. Le périmètre couvre la **capture d'erreurs** et le **tracing côté serveur uniquement** : le tracing navigateur reste désactivé et le Session Replay n'est pas installé.

Sentry se consulte sur son dashboard cloud : aucun écran de restitution n'est construit ici. Le projet Sentry lui-même est créé dans l'organisation existante `tg-ws`, qui est déjà en région européenne.

### État livré

À la fin de ce sub-project, on peut : provoquer volontairement une erreur serveur et une erreur client sur l'application déployée, retrouver les deux dans le dashboard Sentry avec une stack trace démangée pointant sur le code source original, et y lire la durée d'exécution de la Server Action de contact.

## Dependencies

Aucune — ce sub-project est autoporté. Il précède la fondation admin pour que celle-ci s'écrive sous observation et que la CSP ne soit modifiée qu'une seule fois.

## Files touched

- **À modifier** : `src/instrumentation.ts` (le fichier **existe déjà** : il charge Pino au démarrage et invalide le cache de build en production. Sentry s'y ajoute, il ne le remplace pas)
- **À créer** : `src/instrumentation-client.ts` (initialisation navigateur)
- **À créer** : `sentry.server.config.ts` (runtime Node, intégration Pino)
- **À créer** : `sentry.edge.config.ts` (runtime Edge)
- **À créer** : `src/lib/sentry-scrub.ts` (fonction pure de filtrage des données personnelles)
- **À créer** : `src/lib/sentry-scrub.test.ts`
- **À modifier** : `package.json` (dépendance `@sentry/nextjs`)
- **À modifier** : `next.config.ts` (`withSentryConfig` en wrapper externe, extension de `connect-src`)
- **À modifier** : `src/app/[locale]/error.tsx` (remplacement du `void error` et du TODO par une capture)
- **À modifier** : `src/app/global-error.tsx` (même branchement, sans introduire de dépendance nouvelle)
- **À modifier** : `src/env.ts` (`NEXT_PUBLIC_SENTRY_DSN` côté client)
- **À modifier** : `.env.example` (documentation de la nouvelle variable)
- **À modifier** : `Dockerfile` (secret BuildKit pour `SENTRY_AUTH_TOKEN` sur l'étape de build)
- **À modifier** : `.github/workflows/deploy.yml` (secret `SENTRY_AUTH_TOKEN` passé à `docker/build-push-action`, **et** `NEXT_PUBLIC_SENTRY_DSN` ajouté aux `build-args` existants)
- **À modifier** : `.gitignore` (`.env.sentry-build-plugin`)
- **À modifier** : `docs/VERSIONS.md` (entrée Sentry, absente aujourd'hui)
- **À modifier** : `docs/PRODUCTION.md` (variables d'environnement, stack de monitoring, et remplacement de l'instrumentation manuelle à `Date.now()` prévue pour la durée de la Server Action de contact, désormais couverte par le tracing)
- **À modifier** : `docs/ARCHITECTURE.md` (section Observabilité, Sentry n'est plus « post-MVP »)
- **À modifier** : `docs/registre-traitements.md` (ajout d'un sous-traitant traitant des données d'erreur)

## Architecture approach

**Création du projet en CLI, instrumentation à la main.** Le CLI `sentry` est déjà installé et authentifié sur l'organisation `tg-ws`. Il crée le projet, tandis que les fichiers sont écrits manuellement. Le wizard `@sentry/wizard` est écarté pour deux raisons : c'est un TUI qui exige une saisie interactive, et il modifie `next.config.ts` sans connaître les wrappers `withBundleAnalyzer(withNextIntl(...))` déjà en place, ce qui imposerait de repasser derrière lui.

**Quatre fichiers d'instrumentation**, selon la convention actuelle du SDK décrite dans `.claude/rules/sentry/instrumentation.md` : `instrumentation.ts` porte `register()` qui importe la config selon `process.env.NEXT_RUNTIME`, et exporte `onRequestError` qui capte les erreurs des Server Components et du proxy.

**`src/instrumentation.ts` n'est pas un fichier neuf.** Il porte déjà deux comportements qu'il faut conserver : le chargement de Pino au démarrage, imposé par `.claude/rules/pino/logger.md`, et l'invalidation des étiquettes de cache lorsque `NEXT_PHASE` vaut `phase-production-server`, qui force le remplissage avec les vraies données au premier hit après déploiement. Sans elle, le site servirait les données du seed éphémère du build CI. Le contenu Sentry s'ajoute donc au fichier existant, et l'import de la configuration serveur précède celui du logger pour que l'intégration Pino soit active avant la première émission. Le client vit dans `instrumentation-client.ts`, jamais `sentry.client.config.ts` qui est l'ancienne convention.

**Le filtrage des données personnelles est une fonction pure exportée**, pas une closure anonyme dans `Sentry.init`. C'est la seule règle métier du sub-project : elle protège les engagements du registre des traitements, et une régression dessus doit faire échouer un test. Elle est appelée par `beforeSend` dans les trois configs.

**Intégration Pino native** plutôt qu'un transport maison, avec deux réglages distincts : `log.levels` limité à `['warn', 'error', 'fatal']` pour le contexte, et `error.levels` à `['error', 'fatal']` pour la création d'issues. Sans cette distinction, tous les niveaux partent, `debug` compris, et une même erreur remonte deux fois.

**Tracing activé côté serveur, désactivé côté navigateur.** `tracesSampleRate` est réglé dans `sentry.server.config.ts` et laissé à zéro dans `instrumentation-client.ts`. Cette asymétrie donne les durées des Server Actions, des route handlers et des queries Prisma sans ajouter un octet au bundle client, donc sans peser sur le LCP des pages publiques. Elle remplace l'instrumentation manuelle à `Date.now()` que `docs/PRODUCTION.md` prévoit pour la Server Action de contact.

**Pas de `tunnelRoute`.** Cette option relaie les événements par une route de l'application pour contourner les bloqueurs de publicité. Elle est écartée parce qu'elle entre en conflit direct avec le tracing qu'on vient d'activer : les requêtes vers la route de tunnel et vers les URLs d'ingestion produisent des spans qui polluent la mesure. S'y ajoutent une charge supplémentaire sur un VPS unique qui porte déjà l'application et PostgreSQL, une route à exclure du matcher de `src/proxy.ts`, et un gain que Sentry lui-même ne chiffre nulle part. L'option reste ajoutable plus tard à faible coût si une perte d'événements clients est constatée.

**CSP** : `connect-src` gagne `https://o4511826481774592.ingest.de.sentry.io`, host d'ingestion de l'organisation `tg-ws`. Le segment de région est `de` et non `eu`, une organisation européenne ingérant sur le datacenter de Francfort.

**Secret de build cloisonné.** `SENTRY_AUTH_TOKEN` transite par un secret BuildKit monté sur la seule commande de build, donc n'apparaît dans aucune couche de l'image publiée sur GHCR. `DATABASE_URL` conserve son passage par `build-args` : le migrer serait un changement de build sans rapport avec Sentry, à traiter séparément. Le Dockerfile porte donc deux mécanismes, ce qui est assumé et documenté.

**L'upload des source maps se fait pendant le build**, celui-ci étant en Webpack (`next build --webpack`, opt-out posé pour une issue WASM de Prisma 7). Le hook `useRunAfterProductionCompileHook`, propre à Turbopack, ne s'applique pas.

Rules applicables : `.claude/rules/sentry/instrumentation.md`, `.claude/rules/sentry/build-config.md`, `.claude/rules/nextjs/configuration.md`, `.claude/rules/pino/logger.md`, `.claude/rules/nextjs/production-deployment.md`, `.claude/rules/github-actions/workflows.md`, `.claude/rules/docker/dockerfile.md`. Contrainte d'architecture : ADR-017 impose le service cloud, jamais le self-hosted.

## Acceptance criteria

### Scénario 1 : Erreur serveur capturée
**GIVEN** l'application déployée avec l'instrumentation active
**WHEN** une exception non rattrapée est levée dans un Server Component
**THEN** une issue apparaît dans le projet Sentry
**AND** sa stack trace pointe sur le fichier source original et non sur du code minifié

### Scénario 2 : Erreur client capturée
**GIVEN** la CSP étendue avec le host d'ingestion
**WHEN** une exception est levée dans un Client Component et atteint l'error boundary
**THEN** une issue apparaît dans le projet Sentry
**AND** aucune violation de CSP n'est signalée dans la console du navigateur

### Scénario 3 : Filtrage des données personnelles
**GIVEN** un événement Sentry portant une adresse email dans son objet `user`
**WHEN** il traverse la fonction de filtrage
**THEN** l'email est absent de l'événement retourné
**AND** le reste de l'événement est inchangé

### Scénario 4 : Niveaux Pino respectés
**GIVEN** l'intégration Pino configurée avec `log.levels` à `['warn','error','fatal']` et `error.levels` à `['error','fatal']`
**WHEN** le code appelle `logger.debug()` puis `logger.warn()` puis `logger.error()`
**THEN** l'appel `debug` ne produit ni log Sentry ni issue
**AND** l'appel `warn` produit un log Sentry mais aucune issue
**AND** l'appel `error` produit un log Sentry et une issue

### Scénario 5 : Tracing serveur actif, navigateur muet
**GIVEN** `tracesSampleRate` réglé côté serveur et laissé à zéro côté navigateur
**WHEN** un visiteur soumet le formulaire de contact
**THEN** une transaction couvrant la Server Action apparaît dans Sentry avec sa durée
**AND** aucune requête de tracing n'est émise par le navigateur

### Scénario 6 : Token absent de l'image publiée
**GIVEN** l'image construite par la CI et poussée sur GHCR
**WHEN** on inspecte l'historique des couches de l'image
**THEN** `SENTRY_AUTH_TOKEN` n'y apparaît sous aucune forme

### Scénario 7 : Ordre des wrappers préservé
**GIVEN** `next.config.ts` modifié
**WHEN** on lit l'export par défaut
**THEN** `withSentryConfig` enveloppe `withBundleAnalyzer(withNextIntl(nextConfig))`
**AND** le build de production aboutit sans régression sur l'i18n ni sur l'analyse de bundle

## Tests à écrire

### Unit

- `src/lib/sentry-scrub.test.ts` :
  - un événement portant `user.email` ressort sans cette propriété
  - un événement portant `user.ip_address` ressort sans cette propriété
  - un événement sans objet `user` traverse la fonction sans erreur
  - les propriétés non sensibles de `user`, comme l'identifiant, sont conservées
  - la fonction retourne bien l'événement et jamais `undefined`, un retour `undefined` ferait perdre l'événement silencieusement

Aucun test n'est écrit sur la configuration du SDK, l'ordre des wrappers ou l'intégration Pino : ce sont des comportements de librairie, qu'un test ne protégerait pas d'une régression du code projet mais casserait à chaque montée de version.

## Edge cases

- **`global-error.tsx` doit rester affichable quand next-intl crashe** : ce fichier porte des messages FR/EN codés en dur, précisément pour survivre à une panne du runtime i18n. Le branchement Sentry n'y ajoute qu'un appel de capture, sans import susceptible d'échouer au même moment
- **`captureException` dans un Server Component avec `cacheComponents: true`** : l'issue getsentry/sentry-javascript#21333 décrit une rupture du prerendering dans cette configuration, qui est celle du projet. Corrigée par la PR #21351, mais la version de publication n'est pas confirmée : à vérifier sur la version installée avant mise en production
- **Ordre d'initialisation entre Pino et Sentry** : l'intégration doit être active avant que le logger n'émette, sans quoi les premiers logs échappent à la capture
- **Runtime Edge** : `pinoIntegration` exige Node.js. `sentry.edge.config.ts` ne la déclare donc pas
- **CSP silencieuse** : une directive `connect-src` incomplète ne produit aucune erreur visible côté serveur, seulement une absence d'événements clients, qui ressemble à un site sans bug. La vérification doit être explicite
- **Token OAuth du CLI et token de CI** : le token du CLI local expire et se rafraîchit automatiquement, il ne convient pas à la CI. Un org auth token distinct doit être créé pour l'upload des source maps
- **`src/env.ts` est fail-fast** : déclarer `NEXT_PUBLIC_SENTRY_DSN` comme requis casserait le démarrage de tout environnement qui ne le porte pas, à commencer par le dev local. La variable doit être optionnelle, et le SDK ne s'initialiser que si elle est présente. C'est aussi ce qui permet de ne pas polluer le quota avec les erreurs de développement
- **`NEXT_PUBLIC_SENTRY_DSN` est inliné dans le bundle au build**, comme les autres variables `NEXT_PUBLIC_` du projet. Elle doit donc figurer dans les `build-args` du workflow de déploiement, faute de quoi le SDK navigateur restera muet en production alors que tout fonctionne en local
- **Quota du plan gratuit** : 5 000 erreurs, 5 M de spans et 5 Go de logs par mois. Envoyer tous les niveaux Pino l'épuiserait sans bénéfice, d'où la restriction à `warn` et au-dessus. Le trafic du site laisse en revanche une marge confortable sur les spans, ce qui autorise un échantillonnage large côté serveur plutôt qu'une fraction des requêtes
- **Tracing et cache** : les pages servies depuis le Data Cache ne déclenchent pas de query Prisma. Une transaction courte n'y signifie donc pas une requête rapide mais un cache chaud, à garder en tête avant d'en tirer une conclusion sur les performances de la base

## Architectural decisions

### Décision : périmètre du SDK

**Options envisagées :**
- **A. Erreurs seules** : capture des exceptions serveur et client, plus les logs Pino filtrés. Ne dit rien des durées d'exécution.
- **B. Erreurs et tracing serveur** : ajoute les spans de performance sur les Server Actions, les route handlers et les queries Prisma, en laissant le tracing navigateur à zéro. Aucun octet supplémentaire dans le bundle client.
- **C. Erreurs, tracing complet et Session Replay** : ajoute le tracing navigateur et le rejeu visuel des sessions. Le Replay pèse 36 à 50 Ko gzip côté client.

**Choix : B**

**Rationale :**
- Le tracing n'est pas tout ou rien : il se règle séparément côté serveur et côté navigateur, ce qui permet de prendre la valeur sans le coût
- `docs/PRODUCTION.md` prévoit d'instrumenter la durée de la Server Action de contact à la main avec `Date.now()` et des logs Pino. Le tracing serveur rend ce travail inutile et le fait mieux
- Il y a déjà quelque chose à observer : la Server Action de contact et les queries projets tournent en production. L'espace admin ne fera qu'élargir ce périmètre
- Une query Prisma lente ne lève aucune erreur : sans tracing, elle reste invisible tout en dégradant l'usage de l'espace admin
- Le plan gratuit couvre 5 M de spans par mois, très au-delà du trafic de ce site
- Le tracing navigateur et le Session Replay sont écartés pour préserver le LCP des pages publiques, dont la cible est inférieure à 2,5 s. Le Replay sert par ailleurs à comprendre un utilisateur incapable de décrire son problème, or l'unique utilisateur de l'espace admin est celui qui l'écrit

### Décision : relais des événements par une route de tunnel

**Options envisagées :**
- **A. Sans `tunnelRoute`** : les événements partent directement du navigateur vers le host d'ingestion, déclaré dans `connect-src`. Les bloqueurs de publicité peuvent en filtrer une partie.
- **B. Avec `tunnelRoute`** : les événements transitent par une route de l'application, qui les réémet vers Sentry. Les bloqueurs ne les voient plus comme des requêtes tierces.

**Choix : A**

**Rationale :**
- L'option B entre en conflit avec le tracing serveur retenu ci-dessus : les requêtes vers la route de tunnel et vers les URLs d'ingestion créent des spans qui polluent la mesure avec du bruit d'instrumentation interne
- Sentry ne publie aucun chiffre sur la proportion d'événements réellement perdus, le gain est donc impossible à dimensionner
- Le relais fait porter au conteneur applicatif, sur un VPS unique qui héberge déjà PostgreSQL, une charge proportionnelle au trafic public
- L'option impose une route supplémentaire à exclure du matcher de `src/proxy.ts`, et une CVE de type SSRF l'a affectée par le passé (GHSA-2rmr-xw8m-22q9, corrigée en 7.77.0)
- Les erreurs concernées sont celles des pages publiques, alors que le besoin qui motive ce sub-project porte sur les mutations de l'espace admin, hors d'atteinte des bloqueurs
- La décision est réversible à faible coût : une option de configuration et une ligne de matcher suffiront si une perte d'événements clients est un jour constatée

> La limitation documentée selon laquelle `tunnelRoute` ne fonctionne pas avec une instance Sentry auto-hébergée ne s'applique pas ici : c'est l'application qui est auto-hébergée, Sentry restant en cloud conformément à l'ADR-017.

### Décision : transmission du token de build

**Options envisagées :**
- **A. Secret BuildKit pour Sentry uniquement** : `SENTRY_AUTH_TOKEN` monté sur la commande de build, `DATABASE_URL` inchangé en `build-args`. Deux mécanismes coexistent dans le Dockerfile.
- **B. `build-args` pour Sentry aussi** : homogène avec l'existant, mais le token devient lisible via l'historique de l'image publiée sur un registre.

**Choix : A**

**Rationale :**
- Un `build-arg` reste inspectable dans les couches de l'image, et celle-ci est poussée sur GHCR
- Reproduire une faiblesse existante par souci de cohérence revient à la propager
- Migrer `DATABASE_URL` au passage élargirait le scope à un changement de build étranger à Sentry, avec un risque de régression du déploiement pour une raison sans rapport avec l'objet du sub-project
- L'hétérogénéité temporaire est documentée, et la migration de `DATABASE_URL` reste ouverte comme travail séparé
