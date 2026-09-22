---
feature: "Feature 1 — Espace admin"
subproject: "build-sans-base"
goal: "Rendre le build indépendant de la base et retirer le seed, l'espace admin devenant la source du contenu"
status: "draft"
complexity: "L"
tdd_scope: "none"
depends_on: ["13-formulaire-projet-design.md"]
date: "2026-09-22"
---

# Build sans base

## Scope

Le site public cesse de cuire du contenu au build : chaque lecture de la base passe sous une frontière `<Suspense>` et se calcule à la requête, où le cache `'use cache'` déjà posé sur les requêtes continue de jouer. Le pipeline de déploiement perd sa Postgres éphémère, ses migrations de CI et son seed, et l'image Docker ne reçoit plus de `DATABASE_URL` au build. Le seed disparaît du dépôt ; une base de dev se remet en état par dump et restore, les deux recettes servant aussi au transfert unique vers la production.

Exclut le transfert du contenu de la base de dev vers la production, qui est un geste unique de release décrit dans `docs/PRODUCTION.md` et non du code. Exclut la suppression du Schedule Dokploy `manual-seed`, geste manuel de la même release. Exclut la remesure des Core Web Vitals, qui ne se fait qu'en production.

### État livré

À la fin de ce sub-project, on peut : arrêter Postgres, lancer `just build`, et le voir passer ; lire `deploy.yml` sans y trouver ni service Postgres, ni `migrate deploy`, ni `db seed`, ni `DATABASE_URL` ; constater que `prisma/seed.ts` et `prisma/seed-data/` n'existent plus, que `pnpm prisma db seed` n'est plus configuré et que `just setup` ne seed rien ; produire un dump de la base de dev par `just db-dump` et le rejouer par `just db-restore` sur une base vidée ; puis, sur une base peuplée, ouvrir `/fr/projets` et un `/fr/projets/[slug]` jamais visité, voir le contenu arriver, rouvrir la même page et la voir servie du cache, enregistrer un projet depuis l'admin et voir la page publique refléter le changement.

## Dependencies

- `13-formulaire-projet-design.md` (statut: implemented) : avec lui, tout le contenu public (entreprises, tags, projets) est éditable depuis l'admin, ce qui retire au seed sa raison d'être. Ce sub-project n'a de sens qu'après.

## Files touched

- **À modifier** : `src/app/[locale]/(public)/projets/page.tsx` (la liste passe sous `<Suspense>`, différée par `io()`)
- **À modifier** : `src/app/[locale]/(public)/projets/[slug]/page.tsx` (retrait de `generateStaticParams`, la promesse `params` descend dans un composant sous `<Suspense>`)
- **À modifier** : `src/app/[locale]/(public)/a-propos/page.tsx` (les trois composants async qui lisent la base passent sous `<Suspense>`, différés par `io()`)
- **À modifier** : `src/app/[locale]/(public)/mentions-legales/page.tsx` et `src/app/[locale]/(public)/confidentialite/page.tsx` (même traitement sur leur composant de contenu)
- **À modifier** : `src/components/layout/Footer.tsx` (`FooterCopyrightAsync` différé par `io()` sous `<Suspense>`, avec un repli sans SIRET)
- **À modifier** : `src/app/sitemap.ts` et `src/app/llms.txt/route.ts` (`await connection()` avant la requête : pas de rendu React, donc pas d'`io()`)
- **À modifier** : `next.config.ts` (`partialPrefetching: true` ; `htmlLimitedBots` étendu aux crawlers HTML-only que le prerender protégeait)
- **À modifier** : `src/instrumentation.ts` (retrait du bloc `NEXT_PHASE` qui invalidait le cache du seed de CI au démarrage, sans objet une fois qu'aucune donnée n'est cuite au build)
- **À modifier** : `.github/workflows/deploy.yml` (retrait du service `postgres`, de la variable `DATABASE_URL`, de l'étape `migrate deploy` + `db seed`, et du build-arg `DATABASE_URL`), `.github/workflows/ci.yml` (retrait de l'étape `just db-seed` qui précède `just build` et de son commentaire ; le service `postgres`, `migrate deploy` et `just test` restent, les tests d'intégration en ont besoin)
- **À modifier** : `Dockerfile` (retrait de l'`ARG`/`ENV DATABASE_URL` du stage `builder` et de son commentaire, retrait du bundling esbuild du seed, commentaire du stage `deploy-prisma` corrigé : `migrate deploy` seul au démarrage)
- **À modifier** : `prisma.config.ts` (retrait de `migrations.seed`, `prisma db seed` n'existe plus)
- **À supprimer** : `prisma/seed.ts`, `prisma/utils.ts`, `prisma/seed-data/companies.ts`, `prisma/seed-data/projects.ts`, `prisma/seed-data/tags.ts`, `prisma/seed-data/case-studies/` (22 markdown dont le contenu est en base)
- **À supprimer** : `src/server/queries/legal.integration.test.ts`. Ce test était le contrat seed × requêtes (spec `conformite-legale/01` : « obtenir `siret = 88041912200036` + `address.street = 11 rue Gouvy` ») : trois de ses sept cas ne vérifiaient que le contenu du seed, deux le retour `null` de Prisma, et les trois conditions projet restantes (`PUBLISHER_SLUG`, `orderBy displayOrder`, `kind: HOSTING`) tiennent en une ligne chacune, sont visibles d'un coup d'œil sur `/mentions-legales` et `/confidentialite`, et leur forme de retour est gardée par le typecheck des quatre consommateurs. Les textes légaux de `content/legal/` ne sont pas concernés, ils ne passaient pas par le seed
- **À modifier** : `Justfile` (`db-seed` remplacé par `db-dump` et `db-restore FILE`, `setup` ne seed plus, commentaires de `db-reset` et `db-test-reset` corrigés)
- **À modifier** : `.gitignore` (`dumps/`, où `just db-dump` écrit)
- **À créer** : `docs/adrs/022-rendu-public-sans-donnee-au-build.md`
- **À modifier** : `docs/PRODUCTION.md` (§ Accès Dashboard Dokploy : « Schedules » n'a plus `manual-seed` à citer ; § Déploiement : plus de Postgres de CI ; § Checklist Release : la ligne Sentry sur `NEXT_PHASE` part, une rubrique « Transfert du contenu » décrit le `pg_dump` / restore et la suppression du Schedule ; § Checklist Pré-MEP : « Smoke test du livrable » ne parle plus de base au build ; § Checklist Post-MEP : la ligne « Seed BDD initial » et l'avertissement sur le Schedule deviennent le constat de leur disparition, datés)
- **À modifier** : `docs/ARCHITECTURE.md` (§ Patterns Utilisés, le pattern de data-fetching qui décrit le prerender contre la base de CI)
- **À modifier** : `.claude/rules/nextjs/routing.md` (la règle sur `generateStaticParams` posé pour `/projets/[slug]` devient son contraire), `.claude/rules/nextjs/rendering-caching.md` (la règle « `'use cache'` XOR `<Suspense>` » accueille le motif `io()` puis fonction cachée ; l'avertissement sur `connection()` renvoie vers `io()`), `.claude/rules/nextjs/data-fetching.md` (plus de Postgres éphémère en CI), `.claude/rules/nextjs/metadata-seo.md` (le levier pour les crawlers HTML-only n'est plus `generateStaticParams` mais `htmlLimitedBots` ciblé)
- **À modifier** : `docs/superpowers/specs/espace-admin/README.md` (§ À traiter avant la mise en production : les lignes sur le Schedule et le seed pointent vers ce sub-project et la release)
- **À modifier** : `.claude/skills/infra-ops/SKILL.md` (`just db-seed` sort d'`allowed-tools` et du tableau, `db-dump` et `db-restore` y entrent, le commentaire de `db-reset` suit), `.claude/skills/setup-ops/SKILL.md` (`just setup` = install + db, sans seed), `.claude/skills/verify/SKILL.md` (« un tag seedé » devient « un tag de la base de dev »). Toujours via `Skill[skill-creator]`, jamais en éditant le `.md` directement
- **À modifier** : `.claude/rules/prisma/schema-migrations.md` (la règle « exécuter `pnpm prisma db seed` explicitement » devient « aucun seed configuré dans ce projet »)
- **À modifier** : `docs/VERSIONS.md` (`@next/env` n'est plus chargé par `prisma/seed.ts` ; le bloc `prisma.config.ts` reproduit n'a plus de clé `seed` ; `allowJs` ne couvre plus « le seed bundlé »), `docs/knowledges/prisma.md` (la seule phrase propre au projet, « en production le seed est pré-bundlé », part ; la fiche continue de décrire le seed comme fonctionnalité de Prisma), `docs/knowledges/nodejs.md` (`tsx` n'est plus illustré par `prisma/seed.ts`)

## Architecture approach

**Aucune lecture de la base n'est atteinte pendant `next build`.** Avec `cacheComponents: true`, ce qui force une requête au build est le `'use cache'` : Next exécute la fonction pour cuire son résultat dans la coquille statique. Le remède est `io()`, ajouté en Next 16.3.0 : « awaiting this promise stops prerendering so the code that follows is excluded from the prerender output. In every other context it resolves immediately ». Chaque composant qui lit la base s'ouvre par `await io()`, sous une frontière `<Suspense>`, puis appelle la requête qui garde son `'use cache'`, son `cacheLife` et son `cacheTag`. Au build, le composant est exclu et son `fallback` part dans la coquille. À la requête, `io()` résout aussitôt et la requête se met en cache comme aujourd'hui. `updateTag("projects")` depuis les Server Actions continue d'invalider (`.claude/rules/nextjs/rendering-caching.md`).

**`io()` et non `connection()` dans les pages.** `connection()` reste suspendu jusqu'à une vraie navigation et bloque le prefetch ; la doc de Next demande de lui préférer `io()`, dont le code aval « can be wrapped in "use cache" and prefetched ». La rule `rendering-caching.md` du projet signale aussi un bug ouvert de `connection()` combiné à plusieurs `<Suspense>` sur une page dense (`vercel/next.js#86577`), que `io()` ne partage pas. `connection()` ne sert que dans `sitemap.ts` et `llms.txt/route.ts`, qui n'ont pas d'arbre React.

**`/projets/[slug]` perd son `generateStaticParams`.** Avec Cache Components, cette fonction doit rendre au moins un paramètre, un tableau vide casse le build, et la doc déconseille le paramètre fictif. Sans elle, « param values are unknown during prerendering, making params runtime data » : la page ne fait plus `await params` en tête, elle passe la promesse à un composant sous `<Suspense>`, sur le modèle de la doc des routes dynamiques. Le `loading.tsx` du segment reste. À la première visite d'un slug, la coquille part, le contenu stream, puis « pages rendered with runtime params are saved to disk after a successful first request » : la seconde visite est servie du disque.

**`partialPrefetching: true` accompagne le retrait.** C'est le réglage que la doc apparie à `cacheComponents` pour l'ISR sans `generateStaticParams` : la coquille d'un slug inconnu est servie à l'instant et « upgraded in the background with the now-known params », y compris quand un `<Link>` vers ce slug entre dans le viewport. Présent dans la configuration de Next 16.3.3.

**`htmlLimitedBots` reprend le rôle que tenait le prerender pour les métadonnées.** La rule `routing.md` explique pourquoi `generateStaticParams` était posé : figer `title`, `og:*` et `canonical` dans le `<head>` pour tous les user-agents, y compris les crawlers HTML-only absents de la liste par défaut de Next (Telegram, Bluesky, Mastodon), qui recevraient sinon les métadonnées streamées après `</head>`. Sans prerender, ces trois agents sont ajoutés à `htmlLimitedBots`, qui leur sert un rendu bloquant. La rule `metadata-seo.md` interdit `htmlLimitedBots: /.*/` pour des bugs connus avec Cache Components sur 16.2.x-16.3.0 : l'expression reste ciblée, et reprend la liste par défaut de Next puisque l'option la remplace au lieu de l'étendre. Vérifié par `/verify` : un `curl` avec chacun de ces user-agents doit trouver `og:title` avant `</head>`.

**Le `Footer` est la surface la plus large.** `FooterCopyrightAsync` lit `getPublisher()` pour le SIRET, sur toutes les pages publiques. Il passe sous `<Suspense>` avec `io()`, et son repli affiche l'année et le nom sans SIRET, pour qu'aucune page ne retrouve une dépendance à la base par ce chemin.

**L'invalidation au démarrage disparaît.** `src/instrumentation.ts` revalide `projects`, `tags`, `legal-entity` et `legal-content` quand `NEXT_PHASE` vaut `phase-production-server`, « pour forcer le fill avec les vraies données prod au premier hit après deploy ». Elle compensait le cache cuit avec le seed de CI. Plus rien n'est cuit, le bloc part, et la ligne de la Checklist Release qui le contrôlait avec.

**Le seed disparaît, dump et restore le remplacent.** La base de dev est déjà peuplée depuis l'admin, et la production le sera par transfert : un seed qui décrit du contenu serait une troisième source que personne ne maintiendrait. `prisma/seed.ts`, ses données et ses 22 case studies markdown sont supprimés, `prisma.config.ts` perd `migrations.seed`, donc `prisma db seed` n'existe plus et aucun environnement ne peut le lancer par réflexe, et le Dockerfile perd le bundling esbuild qui servait à l'exécuter en production. Rien n'y survit : le test d'intégration des requêtes légales, seul lecteur de `legal.ts`, part avec lui (voir Fichiers touchés). Les textes légaux de `content/legal/` n'ont jamais été dans le seed ; les faits légaux en base (éditeur, hébergeur, traitements, entités des clients) sont lus à la requête par les pages publiques et voyagent avec le dump. Remettre une base de dev en état passe par `just db-dump` et `just db-restore <fichier>` : le même geste que le transfert vers la production, répété d'abord à blanc. Le dump exclut le schéma `auth`, dont les sessions n'ont rien à faire dans une autre base.

**La base de production ne reçoit plus rien que par l'admin.** Le contenu de dev y est transféré une fois, par `pg_dump` et restore, avec le `aws s3 sync` des buckets que `docs/PRODUCTION.md` décrit déjà pour les assets. Après ce geste, les deux bases vivent séparément : dev est un bac à sable réinitialisable, prod n'est écrite que par l'admin. La procédure vit dans `docs/PRODUCTION.md`, pas dans ce code.

**La CI de tests garde sa Postgres, pas son seed.** `ci.yml` monte une base pour les tests d'intégration, qui créent leurs propres lignes : le service et `migrate deploy` restent. Mais son `just build` est précédé d'un `just db-seed`, posé parce que `generateStaticParams` renvoyait `[]` sur base vide ; cette étape et son commentaire partent avec la recette, le build ne lisant plus la base.

**Le client Prisma s'instancie sans se connecter.** Au build, `SKIP_ENV_VALIDATION=true` laisse `DATABASE_URL` indéfinie et `src/lib/prisma.ts` construit tout de même son client au chargement du module. `PrismaPg` et `PrismaClient` ne se connectent qu'à la première requête, qu'aucun chemin n'atteint plus au build. Le test de l'état livré, `just build` avec Postgres arrêté, le prouve.

Rules applicables : `.claude/rules/nextjs/rendering-caching.md`, `.claude/rules/nextjs/routing.md`, `.claude/rules/nextjs/data-fetching.md`, `.claude/rules/nextjs/metadata-seo.md`, `.claude/rules/nextjs/production-deployment.md`, `.claude/rules/docker/dockerfile.md`, `.claude/rules/github-actions/workflows.md`, `.claude/rules/prisma/client-setup.md`.

## Acceptance criteria

### Scénario 1 : Build sans base
**GIVEN** Postgres arrêté et aucune base joignable
**WHEN** on lance `just build`
**THEN** le build passe
**AND** les routes publiques apparaissent en Partial Prerender dans son récapitulatif

### Scénario 2 : Pipeline sans base
**GIVEN** `deploy.yml` et le `Dockerfile` livrés
**WHEN** on les lit
**THEN** aucun service Postgres, aucune migration, aucun seed, aucun `DATABASE_URL` n'y figure
**AND** l'image se construit avec les seuls build-args `NEXT_PUBLIC_*` et le secret Sentry

### Scénario 3 : Première visite d'un slug inconnu
**GIVEN** un projet publié dont la page n'a jamais été visitée depuis le démarrage du serveur
**WHEN** on ouvre `/fr/projets/<slug>`
**THEN** la page s'affiche avec son contenu
**AND** les logs Prisma montrent la requête une fois, puis plus jamais pour la seconde visite

### Scénario 4 : Invalidation depuis l'admin
**GIVEN** `/fr/projets` servie du cache
**WHEN** on modifie le titre d'un projet publié depuis `/admin/projets/[id]` et qu'on enregistre
**THEN** `/fr/projets` reflète le nouveau titre à la visite suivante

### Scénario 5 : Métadonnées pour un crawler HTML-only
**GIVEN** un `/fr/projets/<slug>` non prérendu
**WHEN** on le demande avec le user-agent de Telegram, de Bluesky puis de Mastodon
**THEN** la réponse porte `og:title` et `canonical` avant `</head>`

### Scénario 6 : Pied de page sans base au build
**GIVEN** le build sans base du scénario 1
**WHEN** on ouvre n'importe quelle page publique sur une base peuplée
**THEN** le pied de page affiche le SIRET
**AND** la coquille statique ne le contenait pas

### Scénario 7 : Dump et restore de la base de dev
**GIVEN** une base de dev peuplée
**WHEN** on lance `just db-dump`, puis `just db-reset`, puis `just db-restore <fichier produit>`
**THEN** entreprises, tags, projets et données légales sont de retour, comptages identiques
**AND** le schéma `auth` n'est pas dans le dump
**AND** `pnpm prisma db seed` répond qu'aucun seed n'est configuré

### Scénario 8 : Sitemap et llms.txt à la demande
**GIVEN** le build sans base du scénario 1
**WHEN** on demande `/sitemap.xml` et `/llms.txt` sur une base peuplée
**THEN** ils listent les projets publiés

## Edge cases

- **`generateMetadata` de `[slug]` lit la base** : sans `generateStaticParams`, elle ne s'exécute qu'à la requête, jamais au build. Elle continue d'appeler `findPublishedBySlug` et `notFound()` sans changement
- **`opengraph-image.tsx` de `[slug]`** : route déjà dynamique (`ƒ` au récapitulatif de build), elle ne s'exécute qu'à la requête, rien à changer
- **Premier démarrage après un déploiement** : le cache mémoire est vide, la première visite de chaque page calcule. C'est le comportement documenté d'une instance unique, aucune donnée périmée n'est servie entre-temps puisque rien n'a été cuit
- **Redémarrage du conteneur** : même effet, cache mémoire perdu, pages recalculées à leur première visite. Acceptable pour un site à faible trafic, et le cache disque de Next conserve les pages de slugs déjà rendues
- **`HierarchyRequestError` au reveal côté client** : bug ouvert de `connection()` avec plusieurs `<Suspense>` sur une page dense (`.claude/rules/nextjs/rendering-caching.md`). `io()` n'est pas `connection()`, mais `/a-propos` porte trois frontières : `/verify` relève la console du navigateur sur cette page
- **Streaming derrière Traefik** : sans streaming de bout en bout, la coquille et le contenu arrivent ensemble et Partial Prerendering perd son gain de premier octet, sans casser. Vérifiable seulement en production par `curl -N`, à consigner dans la Checklist Release
- **`htmlLimitedBots` remplace la liste par défaut** : oublier d'y reprendre les agents que Next couvre déjà (LinkedIn, Twitter, Facebook, Slack, Discord, WhatsApp, Bingbot, DuckDuckBot, applebot, yandex) leur retirerait le rendu bloquant. L'expression reprend la liste de Next et ajoute les trois manquants
- **`legal.integration.test.ts` importe les données légales** depuis `prisma/seed-data/legal` : sans sa suppression, celle du dossier casse la suite d'intégration. Rien d'autre hors seed n'importe le dossier
- **`pg_restore` sur une base non vide** : il n'écrase pas, il empile. Toujours `just db-reset` avant `just db-restore`, et `--data-only` puisque les migrations Prisma ont déjà posé le schéma
- **Le Schedule Dokploy survit au code** : rien dans le dépôt ne le supprime. Tant qu'il existe, un clic « Run manually » échoue puisque `prisma db seed` n'est plus configuré, mais il doit être supprimé pour ne pas laisser un bouton mort
- **Base de production en retard sur le seed** : les projets personnels y sont peut-être encore rattachés à l'entreprise factice d'avant le sub-project `11`, les livrables au `min(1)` d'avant le `13`. Le transfert dev → prod remplace la base, ces écarts disparaissent avec

## Architectural decisions

### Décision : Métadonnées des pages de projet pour les crawlers HTML-only

**Options envisagées :**
- **A. Accepter l'exposition** : sans prerender, Telegram, Bluesky et Mastodon reçoivent les métadonnées streamées après `</head>` et peuvent manquer l'aperçu. Rien à configurer, un comportement dégradé sur trois agents
- **B. Étendre `htmlLimitedBots`** : ajouter ces trois agents à l'expression, en reprenant la liste par défaut de Next. Rendu bloquant pour eux seuls, streaming conservé pour tout le monde d'autre. Un réglage à maintenir, et la rule `metadata-seo.md` a documenté des bugs avec l'expression globale `/.*/` sur 16.2.x-16.3.0
- **C. Garder `generateStaticParams` avec un paramètre fictif** : satisfait la validation du build sans base, mais la doc de Next le déconseille, et il ne prérend rien : les métadonnées des vrais slugs seraient streamées de toute façon

**Choix : B**

**Rationale :**
- C ne résout pas le problème qu'il prétend résoudre : sans slug réel au build, aucune page réelle n'est prérendue, l'exposition est la même qu'en A
- L'expression ciblée n'est pas l'expression globale que la rule proscrit : les bugs cités portent sur le rendu bloquant appliqué à tous les visiteurs, pas à trois crawlers
- Le contrôle est mécanique : trois `curl` avec ces user-agents, dans `/verify` puis dans la Checklist Release

### Décision : Sort du seed

**Options envisagées :**
- **A. Seed réduit à l'amorçage** : garder `prisma db seed` avec l'entité légale et la société du propriétaire seulement, en création seule. Une base vide reste amorçable par Prisma, mais le mécanisme reste branché à la CI et à l'image, et il faut décider ce qui est « amorçage » à chaque nouveau modèle
- **B. Plus de seed, dump et restore** : `prisma db seed` n'existe plus, `just db-dump` et `just db-restore` remettent une base locale en état, la production se remplit une fois par transfert puis par l'admin. Aucun environnement ne peut écraser la production par un seed, puisqu'il n'y en a plus, et aucune donnée de contenu ne vit plus dans le dépôt

**Choix : B**

**Rationale :**
- L'espace admin est la source du contenu depuis le sub-project `13` ; un seed qui décrit du contenu est un mensonge que personne ne maintiendra
- Les données légales suivront dans un CRUD du CRM ; d'ici là elles voyagent avec le dump, comme le reste, et les textes légaux restent en dur dans `content/legal/`
- Un dump est ce que le transfert vers la production exige de toute façon : une seule recette sert la dev et la release
- La fenêtre de danger, un seed `upsert` lancé sur une base éditée, se ferme par construction et non par consigne
