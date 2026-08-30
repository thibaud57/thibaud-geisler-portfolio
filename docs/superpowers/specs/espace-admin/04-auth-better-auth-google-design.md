---
feature: "Feature 1 — Espace admin"
subproject: "auth-better-auth-google"
goal: "Installer l'authentification Better Auth avec Google comme unique provider et un seul compte autorisé"
status: "draft"
complexity: "M"
tdd_scope: "partial"
depends_on: ["03-multi-schema-prisma-design.md"]
date: "2026-08-30"
---

# Authentification Better Auth avec Google OAuth

## Scope

Installer et configurer Better Auth avec Google comme unique provider, créer le schema `auth` et ses quatre tables, poser le hook de whitelist qui n'autorise qu'un seul compte, déclarer les cinq variables d'environnement et exposer le route handler catch-all.

Exclut toute protection de route et tout écran : le proxy, `getCurrentUser()`, le layout protégé et la page de connexion appartiennent au sub-project `05`. À l'issue de ce sub-project, l'authentification fonctionne mais rien n'est encore protégé.

### État livré

À la fin de ce sub-project, on peut : mener le flux OAuth Google jusqu'au bout avec le compte autorisé et constater qu'une ligne apparaît dans `auth.user` ainsi qu'une session valide, puis recommencer avec un autre compte Google et constater qu'aucune ligne n'est créée.

## Dependencies

- `03-multi-schema-prisma-design.md` (statut: draft) — le multi-schema doit être actif pour pouvoir déclarer des tables hors de `public`. Ce sub-project ajoute `"auth"` au tableau `schemas` que le `03` a introduit.

## Files touched

- **À modifier** : `package.json` (dépendance `better-auth`)
- **À modifier** : `prisma/schema.prisma` (ajout de `"auth"` au tableau `schemas`, plus les quatre modèles annotés `@@schema("auth")`)
- **À créer** : `prisma/migrations/<horodatage>_better_auth/migration.sql`
- **À créer** : `src/lib/auth.ts` (configuration serveur)
- **À créer** : `src/lib/auth-client.ts` (client navigateur)
- **À créer** : `src/lib/admin-whitelist.ts` (fonction pure d'autorisation)
- **À créer** : `src/lib/admin-whitelist.test.ts`
- **À créer** : `src/app/api/auth/[...all]/route.ts`
- **À modifier** : `src/env.ts` (cinq variables serveur)
- **À modifier** : `.env.example`
- **À modifier** : `src/lib/prisma-test-setup.ts` (extension du reset aux tables d'authentification, avec noms qualifiés)
- **À modifier** : `docs/PRODUCTION.md` (anti-patterns de logging)

## Architecture approach

**Les modèles Prisma sont écrits à la main, sans la CLI.** `@better-auth/cli generate` écrase le `schema.prisma` principal, et l'issue better-auth#6277 a rapporté qu'elle produit un schéma incompatible Prisma 7 : `url = env("DATABASE_URL")` obsolète et `provider = "prisma-client-js"` au lieu de `"prisma-client"`. L'issue est fermée par une PR, mais la version qui la publie n'est pas confirmée. Le risque est disproportionné : un passage de la CLI effacerait les 22 annotations posées au sub-project `03`. Les quatre modèles sont donc transcrits manuellement depuis la documentation du schéma Better Auth, puis annotés `@@schema("auth")`.

**Les noms de tables par défaut de Better Auth sont conservés** : `user`, `session`, `account` et `verification`, tels que l'ADR-018 les écrit déjà. Aucun `modelName` n'est configuré.

Le guide officiel Prisma résout d'ailleurs la tension entre les deux conventions sans configuration : les **modèles** se nomment `User`, `Session`, `Account` et `Verification` en PascalCase, et un `@@map` les rattache aux tables en minuscules. Le `schema.prisma` reste donc homogène à la lecture, `model User` voisinant `model Project`, pendant que la base respecte la convention de la librairie. La règle qui gouverne le nommage dans cette base est celle de l'ADR-018 lui-même, « un seul propriétaire par schema » : chaque propriétaire apporte la convention de son écosystème. `public` et `freelance` appartiennent à ce dépôt, donc à la convention Prisma en PascalCase ; `auth` appartient à Better Auth ; `dev` et `rag_public` appartiendront à des services Python, où le snake_case est la norme — ce que l'ADR anticipe en écrivant `documents, chunks, embeddings`. Aligner `auth` en PascalCase ne rendrait donc pas la base homogène, puisqu'elle ne peut pas l'être, mais introduirait une exception dans une règle par ailleurs sans exception.

**La whitelist est une fonction pure, séparée du hook.** `src/lib/admin-whitelist.ts` expose une fonction qui décide si un email est autorisé ; `src/lib/auth.ts` l'appelle depuis `databaseHooks.user.create.before`. Cette séparation rend la règle testable sans monter Better Auth, et c'est la seule règle métier du sub-project : une régression ouvrirait l'espace admin à n'importe quel compte Google.

**Google est l'unique provider.** Aucun provider Credentials n'est activé, pas même en secours. L'ADR-002 est explicite : « garder un second provider reviendrait à conserver la surface d'attaque que l'on cherche à éliminer ». En cas de perte d'accès au compte Google, le recours documenté est un accès SSH Dokploy avec requête SQL directe.

**`nextCookies()` est le dernier plugin déclaré.** L'ordre n'est pas indifférent : placé ailleurs, les en-têtes `Set-Cookie` des Server Actions ne sont plus gérés. C'est une exigence de `.claude/rules/nextjs/auth.md`.

**Le reset de test est étendu et qualifié.** `resetDatabase()` tronque aujourd'hui neuf tables sans préciser leur schema, ce qui fonctionnait tant que tout vivait dans `public`. Avec des tables dans `auth`, les noms doivent être qualifiés et les quatre nouvelles tables ajoutées, faute de quoi les sessions et comptes créés par un test fuiteraient sur le suivant.

Rules applicables : `.claude/rules/nextjs/auth.md`, `.claude/rules/prisma/schema-migrations.md`, `.claude/rules/prisma/client-setup.md`, `.claude/rules/nextjs/api-routes.md`, `.claude/rules/zod/schemas.md`, `.claude/rules/vitest/setup.md`.

Contraintes d'architecture : ADR-002 pour le choix du provider et le mécanisme de whitelist, ADR-018 pour le schema `auth` dédié.

## Acceptance criteria

### Scénario 1 : Compte autorisé accepté
**GIVEN** `ADMIN_EMAIL` renseignée et le flux OAuth Google configuré
**WHEN** on se connecte avec le compte Google correspondant à cette adresse
**THEN** une ligne apparaît dans `auth.user`
**AND** une session valide est créée dans `auth.session`

### Scénario 2 : Tout autre compte rejeté
**GIVEN** la même configuration
**WHEN** on mène le flux OAuth jusqu'au bout avec un compte Google différent
**THEN** aucune ligne n'est créée dans `auth.user`
**AND** aucune session n'est ouverte

### Scénario 3 : Règle de whitelist isolée et testable
**GIVEN** la fonction d'autorisation
**WHEN** on lui soumet l'email autorisé puis un email quelconque
**THEN** elle accepte le premier et refuse le second
**AND** la comparaison est insensible à la casse, une adresse email n'étant pas sensible à la casse dans sa partie domaine

### Scénario 4 : Tables dans le bon schema
**GIVEN** la migration appliquée sur une base recréée
**WHEN** on inspecte la base
**THEN** `user`, `session`, `account` et `verification` existent dans le schema `auth`
**AND** les neuf tables métier sont toujours dans `public`

### Scénario 5 : Isolation des tests
**GIVEN** un test d'intégration ayant créé un utilisateur et une session
**WHEN** `resetDatabase()` s'exécute
**THEN** les tables d'authentification sont vidées au même titre que les tables métier

### Scénario 6 : Aucun secret exposé au navigateur
**GIVEN** les cinq variables déclarées
**WHEN** on inspecte `src/env.ts`
**THEN** aucune ne porte le préfixe `NEXT_PUBLIC_`
**AND** le bundle client ne contient ni `BETTER_AUTH_SECRET` ni `GOOGLE_CLIENT_SECRET`

## Tests à écrire

### Unit

- `src/lib/admin-whitelist.test.ts` :
  - l'email exactement égal à `ADMIN_EMAIL` est autorisé
  - un email différent est refusé
  - la comparaison ignore la casse
  - les espaces en début et fin d'adresse ne font pas échouer la comparaison
  - une valeur vide est refusée, un email absent ne devant jamais passer par défaut

Aucun test n'est écrit sur la configuration de Better Auth, l'ordre des plugins ou le route handler : ce sont des comportements de librairie, qu'un test ne protégerait pas d'une régression du projet mais casserait à chaque montée de version. Le flux OAuth complet se vérifie manuellement, les scénarios 1 et 2 supposant une interaction avec Google.

## Edge cases

- **La CLI Better Auth écrase le schéma** : ne pas la lancer, même « juste pour voir ». Si l'on veut consulter sa sortie, le faire dans un dépôt jetable
- **SQL brut et tables en minuscules** : le `TRUNCATE` de `prisma-test-setup.ts` devra qualifier et entourer de guillemets les nouvelles tables (`"auth"."user"`), comme il le fait déjà pour les tables en PascalCase. PostgreSQL replie les identifiants non quotés en minuscules, ce qui fonctionnerait ici par coïncidence, mais mélanger les deux styles dans une même instruction est une source de confusion inutile
- **Casse de l'email** : Google renvoie l'adresse telle qu'enregistrée. Comparer sans normaliser laisserait passer un refus injustifié
- **Choisir `before` et non `after`** : seul un hook `before` peut empêcher la création, puisqu'il s'exécute avant elle. Un hook `after` ne verrait le compte qu'une fois créé et devrait le supprimer après coup, ce qui ouvrirait une fenêtre pendant laquelle un compte non autorisé existe. La documentation Better Auth décrit la forme des deux hooks mais ne précise pas leur comportement transactionnel : raison de plus pour s'appuyer sur celui dont la sémantique est explicite
- **`BETTER_AUTH_URL` diffère selon l'environnement** : `http://localhost:3000` en développement, le domaine de production ailleurs. Une valeur erronée casse le retour du flux OAuth avec une erreur de redirect URI peu explicite
- **Redirect URIs Google** : chaque environnement doit être déclaré dans la console Google Cloud. Un oubli ne se manifeste qu'au moment de la connexion
- **Aucune route n'est protégée à l'issue de ce sub-project** : l'authentification fonctionne mais `/admin` n'existe pas encore. Ce n'est pas un défaut, c'est le périmètre
- **Fuite entre tests** : sans extension de `resetDatabase()`, un utilisateur créé par un test resterait visible du suivant, et l'échec apparaîtrait dans un test sans rapport avec la cause

## Architectural decisions

### Décision : génération des modèles Prisma

**Options envisagées :**
- **A. Écrire les quatre modèles à la main** dans le `schema.prisma` existant, d'après la documentation du schéma Better Auth, puis les annoter `@@schema("auth")`. Demande de transcrire des champs avec exactitude.
- **B. Utiliser `@better-auth/cli generate`** puis corriger sa sortie. Plus rapide en apparence, mais la CLI écrase le fichier principal et a produit un schéma incompatible Prisma 7 selon l'issue better-auth#6277.

**Choix : A**

**Rationale :**
- La CLI écrase `prisma/schema.prisma`, où vivent les 22 annotations posées au sub-project `03` : une exécution malheureuse annule le travail précédent
- Elle ne connaît pas le multi-schema : les `@@schema("auth")` seraient à ajouter à la main de toute façon
- Le gain de temps est faible, quatre modèles se transcrivant rapidement, alors que le risque porte sur l'ensemble du schéma
- C'est le même raisonnement que pour le wizard Sentry écarté au sub-project `02` : un outil qui réécrit un fichier soigneusement configuré coûte plus qu'il ne rapporte

### Décision : convention de nommage des tables d'authentification

**Options envisagées :**
- **A. Conserver les noms de Better Auth** : `user`, `session`, `account`, `verification`. Aucune configuration, et la documentation de la librairie correspond exactement à la base.
- **B. Aligner en PascalCase** via `modelName` : `User`, `Session`, `Account`, `Verification`, pour un `schema.prisma` visuellement homogène.

**Choix : A**

**Rationale :**
- **L'ADR-018 écrit déjà ces tables en minuscules** dans son schéma cible. Les renommer contredirait une décision actée sans passer par une révision d'ADR
- **L'homogénéité totale est hors d'atteinte**, quoi qu'on décide ici : les schemas `dev` et `rag_public` appartiendront à `agent-os` et `portfolio-chatbot`, deux services Python dont l'écosystème (SQLAlchemy, Alembic) impose le snake_case. L'ADR l'anticipe en écrivant `documents, chunks, embeddings`
- La règle durable est donc celle que l'ADR-018 pose déjà, « un seul propriétaire par schema » : chaque propriétaire apporte la convention de son écosystème. Aligner `auth` créerait une exception dans une règle sinon universelle, sans rapprocher la base d'une homogénéité qu'elle n'atteindra jamais
- L'argument du fichier unique ne tient pas non plus : `dev` et `rag_public` ne figureront pas dans `prisma/schema.prisma`, leurs propriétaires les gérant
- Le choix n'a de toute façon **aucun effet sur le code applicatif** : Prisma Client expose les modèles en camelCase quel que soit le nom de la table, donc `prisma.user` s'écrit à l'identique dans les deux options
