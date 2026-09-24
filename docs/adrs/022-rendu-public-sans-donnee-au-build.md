---
title: "ADR-022 — Rendu public sans donnée au build"
status: "accepted"
description: "Décision actée : le build ne lit plus la base, chaque lecture Prisma du site public est différée à la requête sous <Suspense>, le seed est supprimé"
date: "2026-09-23"
keywords: ["architecture", "adr", "nextjs", "cache", "prisma", "build", "ci-cd", "seed"]
scope: ["docs", "architecture"]
technologies: ["Next.js", "Prisma", "Docker", "GitHub Actions"]
---

# 🎯 Contexte

Le site public prérendait ses pages avec leur contenu : chaque route lisait Prisma au build, ce qui imposait une base peuplée pendant la construction de l'image. Une Postgres éphémère tournait en CI (`deploy.yml`), migrée et seedée avant le `docker build`, dans le seul but que le prerender ait quelque chose à lire. Le sub-project `13` de l'epic espace-admin a fait de l'espace admin la source du contenu : la base de production n'est plus alimentée par ce seed, mais par les Server Actions admin.

---

# 🧩 Problème

Comment construire l'image Docker sans base joignable au build, et que devient le seed dès lors que le contenu vient de l'espace admin.

---

# 🛠️ Options Envisagées

## Option A : garder le prerender, seed d'amorçage minimal

**Description :** Conserver `generateStaticParams` et les queries `'use cache'` au prerender, réduire le seed à un jeu de données minimal servant uniquement à ce que le build ait quelque chose à prérendre.

**Avantages :**
- Premier hit instantané sur les pages listées au build
- Change peu de code existant

**Inconvénients :**
- Le mécanisme reste branché à la CI : Postgres éphémère, migration, seed, à chaque build
- Décider ce qui constitue un « amorçage minimal » se rejoue à chaque nouveau modèle, sans critère stable
- Le build continue de prérendre un contenu qui n'est ni celui de la production ni un contenu réel

**Coût estimé :** Faible à court terme, dette permanente à chaque évolution du schéma

## Option B : différer toute lecture de la base à la requête

**Description :** Chaque lecture Prisma du site public s'ouvre par `await io()` sous `<Suspense>`, ce qui l'exclut du prerender ; la query elle-même reste `'use cache'` et se met en cache à la première requête. Le seed est supprimé, remplacé par un dump et son restore (`just db-dump` / `just db-restore`) pour remettre une base locale en état.

**Avantages :**
- Le build Docker ne dépend plus d'aucune base, dans un sandbox BuildKit ou ailleurs
- Le seed et son entretien disparaissent
- `partialPrefetching` + `htmlLimitedBots` étendu compensent la perte du prerender pour les crawlers qui ont besoin d'un `<head>` figé

**Inconvénients :**
- La première visite de chaque page après un démarrage calcule au lieu d'être servie instantanément
- Un redémarrage vide le cache mémoire

**Coût estimé :** Moyen, réécriture de chaque query et page publique concernée

## Option C : builder sur le VPS où la base est joignable

**Description :** Laisser Dokploy reconstruire l'image directement sur le VPS (provider `build:` au lieu de `image:` dans `compose.yaml`), où Postgres est sur le même réseau Docker.

**Avantages :**
- Base réellement joignable au build, pas de mécanisme d'amorçage à maintenir

**Inconvénients :**
- Documenté comme impraticable par `PRODUCTION.md` : le sandbox BuildKit de Dokploy isole le réseau, la base y reste inaccessible malgré la proximité
- Renonce à tout ce que `deploy.yml` apporte : déploiement sur tag, image versionnée sur GHCR, scan Trivy, ressources du VPS préservées pendant le build

**Coût estimé :** Élevé, et de toute façon bloqué techniquement

---

# 🎉 Décision

**Option B actée : toute lecture de la base du site public est différée à la requête.**

Chaque Server Component qui lit Prisma s'ouvre par `await io()` sous `<Suspense>`, ce qui l'exclut du prerender ; la query interne reste `'use cache'` et se met en cache à la première requête qui la déclenche. `next.config.ts` gagne `partialPrefetching: true` et un `htmlLimitedBots` étendu aux crawlers HTML-only (`TelegramBot`, `Bluesky`, `Mastodon`) pour compenser la perte des métadonnées figées au prerender. Le seed et ses données de démonstration sont supprimés.

Trois phrases de la doc Next.js 16.3.6 portent ce motif :
- `io()` : « awaiting this promise stops prerendering so the code that follows is excluded from the prerender output »
- routes dynamiques sans `generateStaticParams` : « param values are unknown during prerendering, making params runtime data »
- self-hosting : « Cache Components works by default with Next.js and is not a CDN-only feature. This includes deployment as a Node.js server (through `next start`) and when used with a Docker container »

---

# 🔄 Conséquences

## Positives

- Le build Docker ne dépend plus d'aucune base : `just build` passe avec Postgres arrêté, et `deploy.yml` perd sa Postgres éphémère, ses migrations et son seed
- Le seed et ses données de démonstration disparaissent, avec eux `prisma/seed.ts` et `migrations.seed` de `prisma.config.ts`
- `ci.yml` garde sa base pour les tests d'intégration, qui portent leurs propres fixtures et n'ont jamais dépendu du seed

## Négatives

- La première visite de chaque page après un démarrage calcule au lieu d'être servie du disque ; un redémarrage vide le cache mémoire et refait payer ce premier calcul
- Les Core Web Vitals mesurés avant cette décision ne sont plus représentatifs, à remesurer en production
- Le gain de premier octet du streaming dépend de ce que Traefik ne bufferise pas la réponse
- **Soft 404 sur les slugs de projet** : sans `generateStaticParams`, la coquille statique de `/projets/[slug]` part avant que la base ne réponde, le statut HTTP se fige à 200 et `notFound()` ne peut plus le changer une fois le stream commencé. La doc Next prescrit le remède (page `loading.js`, § Status Codes) : « If you need a 404 status, for compliance or analytics, ensure the resource exists before the response body is streamed [...] You can run this check in `proxy` to rewrite missing slugs to a not-found route, or produce a 404 response. Keep proxy checks fast, and avoid fetching full content there. » `src/proxy.ts` porte donc un check d'existence minimal (un seul champ sélectionné, non caché) sur `/<locale>/projets/<slug>`, qui réécrit vers une route inexistante quand le projet n'existe pas ou n'est pas publié, et laisse passer la requête en cas de panne base plutôt que de fabriquer un faux 404
- **Les pages légales passent elles aussi au soft 404, sans protection équivalente** : elles appelaient `notFound()` avant toute frontière, donc posaient un vrai 404 ; leur composant de contenu passant sous `<Suspense>`, leur statut se fige lui aussi à 200. Le cas se produit si l'éditeur ou l'hébergeur manque en base, ce qu'ouvre la disparition du seed tant que l'admin ne les a pas saisis. Le choix de ne pas les couvrir est délibéré : un slug de projet est une entrée arbitraire qu'un visiteur ou un crawler peut deviner et énumérer, alors que l'éditeur et l'hébergeur sont des enregistrements uniques tenus par l'admin, absents seulement si la configuration de production est cassée dans son ensemble. Étendre le check à ces pages demanderait de remonter dans le proxy la condition métier propre à chacune, ce que l'interdiction générale de `.claude/rules/nextjs/proxy.md` vise précisément à empêcher
- **Le check du proxy s'exécute aussi sur les requêtes de préchargement** : les `<Link>` qui entrent dans le viewport déclenchent des requêtes HTTP ordinaires vers la même URL, que le proxy traite comme les autres. Next masque volontairement les en-têtes qui permettraient de les distinguer (`rsc`, `next-router-prefetch`), « to prevent accidentally handling an RSC request differently than the HTML request as both need to align » (doc `proxy.js`, § RSC requests and rewrites) : on ne peut donc pas les exclure du check. Une page listant plusieurs projets fait ainsi une requête d'existence par carte préchargée, non mise en cache, en plus de celles des navigations réelles

---

# 📝 Notes complémentaires

Le check d'existence du proxy reste soumis à l'interdiction générale d'appel base de `.claude/rules/nextjs/proxy.md` : l'exception qui l'autorise est étroitement circonscrite au seul motif d'URL des pages projet, avec un `select` minimal et un repli qui laisse passer en cas de panne. Surcoût mesuré : 7 à 18 ms sur une page projet valide.

Le pattern complet (`io()` + `'use cache'` + `<Suspense>`) est documenté dans `.claude/rules/nextjs/rendering-caching.md` et `.claude/rules/nextjs/data-fetching.md`.
