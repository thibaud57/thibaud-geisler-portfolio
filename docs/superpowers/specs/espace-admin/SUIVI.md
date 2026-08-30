# Suivi de la décomposition — espace admin

> ⚠️ **Fichier temporaire, à supprimer une fois les 13 sub-projects implémentés.** Il ne porte aucune décision d'architecture : celles-ci vivent dans les ADR et dans les specs. Il sert uniquement à savoir où on en est et où reprendre.

## Avancement

| # | slug | Cx | TDD | État | depends_on |
|---|---|---|---|---|---|
| 01 | `infra-stockage-objet-sauvegardes` | M | none | spec + plan | — |
| 02 | `observabilite-sentry` | L | partial | spec + plan | — |
| 03 | `multi-schema-prisma` | S | none | spec + plan | — |
| 04 | `auth-better-auth-google` | M | partial | spec + plan | 03 |
| 05 | `protection-routes-admin` | M | partial | spec + plan | 04 |
| 06 | `shell-admin` | M | none | spec + plan | 05 |
| 07 | `crud-tags` | M | full | spec + plan | 06 |
| 08 | `crud-entreprises` | M | full | spec + plan | 07 |
| 09 | `stockage-assets-r2` | L | partial | spec + plan | 01 |
| 10 | `gestion-assets-admin` | L | full | spec + plan | 06, 09 |
| 11 | `crud-projets-actions` | L | full | spec + plan | 07, 08 |
| 12 | `ecran-liste-projets` | M | none | spec + plan | 06, 11 |
| 13 | `formulaire-projet` | L | none | spec + plan | 08, 10, 12 |

**Décomposition terminée** : les 13 sub-projects ont leur spec et leur plan. Aucun n'est implémenté.
**Lancer une implémentation** : `/implement-subproject espace-admin <NN>`, dans l'ordre du tableau.

> Le `01` et le `03` sont les plus petits et les moins dépendants. Les implémenter en premier confrontera la méthode au réel avant d'engager les gros sub-projects.

## Périmètre retenu

Auth, shell et CRUD de contenu portfolio, soit la priorité 1 du récap de conception. Les sections Freelance, Dev, Documents et Analytics sont déléguées à leurs features post-MVP respectives (3, 6, 7 et 2).

Deux sub-projects ont été ajoutés en cours de décomposition : `01` parce que rien n'était provisionné côté stockage objet ni sauvegardes, et `02` parce que Sentry touche `next.config.ts` et la CSP que la fondation admin allait rouvrir de toute façon.

## Décisions prises pendant la décomposition

Elles ne figurent dans aucun ADR et ne sont détaillées que dans les specs concernés.

- **Pattern d'édition** : page dédiée pour les entités riches (Projet, une quinzaine de champs et du markdown bilingue), modale pour les entités légères (Tag, Entreprise). À appliquer ensuite aux Leads, Contacts et Factures
- **Entreprises** : entrée de nav sous Portfolio **et** même composant de formulaire ouvrable depuis le select du formulaire projet. Un composant, deux points de montage. C'est le pattern qui se répliquera pour Lead vers Entreprise dans le CRM
- **Sidebar** : section Portfolio seule (Projets, Tags, Entreprises, Assets). Pas d'entrées désactivées pour les sections à venir
- **Stockage objet** : trois buckets Cloudflare R2 en juridiction `eu` — `portfolio-backups`, `portfolio-assets` et `portfolio-assets-dev` — chacun servi par un token restreint à lui seul. Le développement écrit dans son propre bucket, comme il tourne déjà sur `portfolio_dev` et non sur la base de production. Le free tier portant sur le compte, cette séparation ne coûte rien. Sauvegardes par le mécanisme natif Dokploy, 30 jours de rétention, en remplacement du script `/opt/backup.sh` documenté mais jamais appliqué
- **Observabilité** : Sentry sur l'organisation existante `tg-ws`, déjà en région européenne. Erreurs et tracing serveur uniquement, sans tracing navigateur, sans Session Replay et sans `tunnelRoute`
- **Nommage des tables** : chaque schema suit la convention de son propriétaire, conformément à « un seul propriétaire par schema » (ADR-018). Les tables Better Auth restent en minuscules, les modèles Prisma étant nommés en PascalCase et rattachés via `@@map`
- **Schema `auth`** : créé par le sub-project qui pose ses tables, pas avant
- **Formulaires admin** : `useActionState` sur une Server Action validée par Zod, sans librairie de formulaire, comme le formulaire de contact. `docs/DESIGN.md` a été mis à jour en ce sens
- **Messages de validation** : en français directement dans les schémas admin. Le site public utilise des codes parce qu'il est bilingue, l'admin n'en a pas besoin
- **Invalidation du cache** : `updateTag(tag)` dans les Server Actions, jamais `revalidateTag`. Le premier fait attendre la requête suivante le temps de recharger, le second sert d'abord du contenu périmé. Les critères d'acceptation vérifiant l'effet sur la page publique dès la mutation, seule la première sémantique les rend observables. `updateTag` n'est utilisable que depuis une Server Action, ce qui est le contexte ; ailleurs, comme dans `src/instrumentation.ts`, `revalidateTag(tag, 'max')` reste la forme correcte

## Pièges relevés en chemin

- `@better-auth/cli generate` **écrase** `prisma/schema.prisma` et a produit un schéma incompatible Prisma 7 : les modèles se transcrivent à la main
- `@sentry/wizard` réécrit `next.config.ts` sans connaître les wrappers `withBundleAnalyzer(withNextIntl(...))` déjà en place
- Le build de production est en `next build --webpack` (opt-out posé pour une issue WASM de Prisma 7), ce qui met le projet hors de portée des incidents Sentry liés à Turbopack
- Le SDK AWS ≥ 3.729.0 calcule un checksum CRC32 que R2 ne supporte pas : `requestChecksumCalculation: 'WHEN_REQUIRED'` est obligatoire
- `src/env.ts` est fail-fast : toute variable ajoutée sans être renseignée casse le démarrage
- `multiSchema` est GA depuis Prisma 6.13, mais `@@schema` devient alors obligatoire sur les enums autant que sur les modèles
- `typedRoutes: true` transforme un lien mort en **échec de compilation**, ce qui impose de créer des pages d'attente avant d'écrire le moindre lien. Le piège vaut aussi pour les **routes dynamiques** : `/admin/projets/[id]` est liée depuis la colonne d'actions de la liste, donc bien moins visible qu'un bouton, et le sub-project `12` doit la créer au même titre que `/admin/projets/nouveau`
- **Deux rclone à ne pas confondre** : celui qui est embarqué dans Dokploy et transfère les sauvegardes, qu'on ne configure jamais, et celui qu'il faudrait installer sur le VPS, que le sub-project `01` supprime justement. Aucun remote `r2:` n'existe donc à aucun moment : la migration des assets du sub-project `09` passe par un conteneur `amazon/aws-cli`, déjà l'outil employé au `01` pour vérifier le cloisonnement des tokens
- **`src/instrumentation.ts` existe déjà** et porte deux comportements à ne pas perdre : le chargement de Pino au démarrage, et l'invalidation des étiquettes de cache quand `NEXT_PHASE` vaut `phase-production-server`. Cette seconde force le remplissage avec les vraies données au premier hit après déploiement, le build CI ayant rempli le cache avec un seed éphémère. Le squelette Sentry des tutoriels remplace ce fichier au lieu de le compléter, et le défaut est silencieux : le site répond normalement, avec le mauvais contenu
- **Une Server Action n'est pas protégée par le layout** : c'est un endpoint HTTP joignable par quiconque connaît son identifiant, sans jamais charger l'écran qui la monte. Chaque mutation de l'espace admin ouvre donc par `await getCurrentUser()`, **hors du `try`**, sans quoi le `catch` avalerait l'interruption `unauthorized()` et la présenterait comme une erreur technique. Les deux rules le demandent, en « à faire » comme en « à éviter »
- **`revalidateTag(tag)` à un seul argument est déprécié en Next 16**, et son remplaçant n'est pas le même selon le contexte. La documentation écrit : « Migrate to `updateTag` in Server Actions, or `profile="max"` ». Choisir `'max'` par réflexe change le comportement observable, puisqu'il sert du contenu périmé au premier visiteur : un critère d'acceptation qui vérifie la page publique juste après la mutation échouerait alors sans qu'aucun code ne soit fautif
- **Zod 4 a fusionné `message`, `invalid_type_error` et `required_error`** en une clé `error` unique. Elle concerne les erreurs de type, donc le second paramètre de `z.enum()` ; le message positionnel des checks (`.min(1, '...')`) est inchangé
- **Le type MIME se valide côté serveur** au même titre que la taille. Un type vide est toléré, tous les navigateurs ne le renseignant pas, mais un type qui contredit l'extension trahit un fichier renommé
- **`ASSETS_PATH` est déclarée dans `src/env.ts`** en plus d'être lue via `process.env`, contrairement à ce que la mention « exception documentée » laisse croire. Les deux déclarations disparaissent ensemble au sub-project `09`

- **Tokens cloisonnés et copie entre buckets** : aucun token ne voyant deux buckets, une copie de `portfolio-assets` vers `portfolio-assets-dev` ne peut pas se faire de serveur à serveur. Elle se fait en deux temps, descente puis remontée, avec les deux jeux de clés

## Faits externes revérifiés

Passe de vérification en ligne, tous les faits datés reconfirmés à leur source :

| Fait | Statut |
|---|---|
| `revalidateTag(tag)` à un argument déprécié Next 16, migrer vers `updateTag` en Server Action | confirmé, doc Next 16.3.3 |
| Zod 4 : le paramètre d'erreur est `error`, pas `message` | confirmé, doc Zod |
| `bodySizeLimit` à 1 Mo par défaut, marge multipart de 10 à 20 Ko | confirmé verbatim, doc Next |
| AWS SDK ≥ 3.729.0 : CRC32 par défaut incompatible R2, `WHEN_REQUIRED` pour le désactiver | confirmé, mais Cloudflare annonce l'incident résolu de son côté |
| Prisma : `multiSchema` GA en 6.13.0, `previewFeatures` à retirer | confirmé |
| shadcn-ui#9228, `CommandItem` toujours en état sélectionné en `radix-nova` | confirmé, **ouverte**, PR #9254 en attente |
| sentry-javascript#21333, `captureException` casse le prerendering avec `cacheComponents` | confirmé, **fermée** par la PR #21351, version de publication toujours non confirmée |
| better-auth#6277, la CLI produit un schéma incompatible Prisma 7 | confirmé, **fermée** par la PR #6459, version non précisée |
| Free tier R2 : 10 Go-mois, 1 M Class A, 10 M Class B, egress gratuit, Standard uniquement | confirmé verbatim |
| `pinoIntegration` : SDK ≥ 10.18.0, runtime Node.js seulement | confirmé |
| `sendDefaultPii` déprécié en 10.54.0, supprimé en v11, `dataCollection` prioritaire | confirmé |

Un seul point reste **non confirmé** : le comportement transactionnel des hooks `after` de Better Auth, que la documentation ne décrit pas. Sans effet sur la décision, le hook `before` étant le seul à pouvoir empêcher une création.

## Documents produits hors specs

- `docs/knowledges/cloudflare-r2.md`
- `docs/knowledges/sentry.md`
- `docs/knowledges/dokploy.md` — section « Sauvegardes et destinations S3 »
- `.claude/rules/sentry/instrumentation.md`
- `.claude/rules/sentry/build-config.md`
