---
feature: "Feature 3 : Outils de l'app pour les agents"
subproject: "socle-mcp-multi-domaine"
goal: "Rendre les outils MCP génériques communs à plusieurs domaines et ouvrir le domaine portfolio avec l'entité tag, sur une logique métier des tags commune à l'admin."
status: "implemented"
complexity: "L"
tdd_scope: "full"
execution: "subagent-driven"
model: "opus"
effort: "high"
depends_on: []
date: "2026-11-10"
---

# Socle MCP multi-domaine et tags du portfolio

## Scope

Couvre trois volets :
- le socle des outils génériques (`<domaine>_search`, `_fetch`, `_query`, `_create`, `_update`) sort de `src/server/mcp/crm/` pour servir tout domaine à partir de son registre d'entités, le domaine `crm` le réutilisant sans aucun changement de contrat ;
- le domaine `portfolio` (adresse `/api/mcp/portfolio`, libellé « Portfolio », choisi dans l'écran des clés sans y être présélectionné) ;
- les tags, première entité de ce domaine : leur création et leur modification sortent des Server Actions vers `src/server/portfolio/tags.ts`, l'action admin n'étant plus qu'un adaptateur.

Exclut :
- les projets (sub-project 07) ;
- la suppression et le réordonnancement des tags, qui restent dans l'admin ;
- les assets ;
- tout changement du contrat `crm_*` : `src/server/mcp/crm/tools-list.snapshot.json` reste identique à l'octet.

### État livré

À la fin de ce sub-project, on peut : avec une clé portant le domaine `portfolio`, lister les cinq outils `portfolio_*`, créer un tag que l'admin affiche en fin de sa catégorie, le modifier et voir un changement de slug refusé, pendant que le test de snapshot du contrat `crm_*` passe sans régénération.

## Dependencies

Aucune : ce sub-project est autoporté. Il s'appuie sur les sub-projects 01 à 05 de la feature, implémentés (serveur MCP, page des clés, outils CRM).

## Files touched

- **À créer** : `src/server/mcp/domain-tools.ts` (enregistrement des cinq outils génériques d'un domaine)
- **À créer** : `src/server/mcp/entity-definition.ts` (déplacé de `src/server/mcp/crm/`, rendu générique)
- **À créer** : `src/server/mcp/results.ts` (déplacé de `src/server/mcp/crm/`, textes paramétrés par le préfixe du domaine)
- **À créer** : `src/server/mcp/query-page.ts` (déplacé de `src/server/mcp/crm/`)
- **À créer** : `src/server/mcp/update-input.ts` (déplacé de `src/server/mcp/crm/`)
- **À créer** : `src/server/mcp/crm/domain.ts` (configuration du domaine `crm` : textes des outils, outil du logo)
- **À créer** : `src/server/mcp/portfolio/registry.ts`
- **À créer** : `src/server/mcp/portfolio/domain.ts` (configuration du domaine `portfolio`)
- **À créer** : `src/server/mcp/portfolio/entities/tag.ts`
- **À créer** : `src/server/mcp/portfolio/tools.integration.test.ts`
- **À créer** : `src/server/mcp/portfolio/tools-list.snapshot.json` (généré par le test)
- **À créer** : `src/server/portfolio/tags.ts` (logique de création et de modification des tags, `DomainResult`)
- **À créer** : `src/server/portfolio/tags.integration.test.ts`
- **À supprimer** : `src/server/mcp/crm/tools.ts`, `src/server/mcp/crm/entity-definition.ts`, `src/server/mcp/crm/results.ts`, `src/server/mcp/crm/query-page.ts`, `src/server/mcp/crm/update-input.ts` (remplacés par le socle)
- **À modifier** : `src/server/mcp/crm/entities/*.ts`, `src/server/mcp/crm/person-write-tool.ts`, `src/server/mcp/crm/person-fields.ts`, `src/server/mcp/crm/fields.ts`, `src/server/mcp/crm/registry.ts` (imports du socle, noms génériques)
- **À modifier** : `src/server/mcp/server.ts` (entrée `portfolio` dans la table des domaines)
- **À modifier** : `src/lib/mcp-domains.ts` (`portfolio` dans `MCP_DOMAINS` et `MCP_DOMAIN_LABELS`)
- **À modifier** : `src/app/api/mcp/[domain]/route.ts` (handler du domaine `portfolio`)
- **À modifier** : `src/server/actions/tags.ts` (création et modification déléguées à `src/server/portfolio/tags.ts`)
- **À modifier** : `src/server/actions/tags.test.ts` (l'adaptation se teste avec la fonction de domaine mockée)
- **À modifier** : `src/lib/ids.ts` (`tagIdSchema` et `TagId`)
- **À modifier** : `src/server/queries/tags.ts` (lectures sans cache pour l'outil : recherche, fiche avec ses projets, page filtrée)
- **À modifier** : `src/server/mcp/crm/tools.integration.test.ts` (imports seulement, snapshot inchangé)
- **À modifier** : `src/app/api/mcp/[domain]/route.integration.test.ts` (refus du domaine `portfolio` à une clé limitée à `crm`)
- **À modifier** : `docs/ARCHITECTURE.md` (arborescence `server/mcp/` et `server/portfolio/`, domaines servis, invalidation `tags` côté MCP)
- **À modifier** : `docs/PRODUCTION.md` (smoke tests de release : `POST /api/mcp/portfolio` sans clé → `401`, et lecture des tags avec la clé du poste ; consigne de la procédure des clés : `portfolio` jamais sur la clé des jobs d'`agent-os`)

## Architecture approach

- **Socle commun, domaine déclaratif** (ADR-025, `.claude/rules/modelcontextprotocol-server/tools.md`) : `domainToolsOf(domain)` construit une fois les schémas des cinq outils d'un domaine, à partir d'une configuration `{ prefix, entities, texts, extraTools }`, et rend la fonction qui les enregistre sur un `McpServer` neuf par requête. Le préfixe nomme les outils (`crm_search`, `portfolio_search`) et les textes d'erreur qui renvoient à un autre outil (« Call portfolio_search… »). Le domaine fournit ses descriptions et titres d'outils, assemblés comme aujourd'hui à partir des fragments `docs` de ses entités, et ses outils propres (le logo pour `crm`). Le `detailsSection` racine de `_update` n'est déclaré que si une entité du domaine a des Détails. Un nouveau domaine n'écrit donc que son registre, ses entités et ses textes.
- **Contrat CRM gelé** : `src/server/mcp/crm/domain.ts` reprend mot pour mot les titres, descriptions et schémas actuels. Le test de snapshot existant (`tools-list.snapshot.json`) doit passer sans régénération : c'est la preuve que la généralisation n'a rien changé pour les agents du CRM. Les messages d'erreur renvoyés par les outils `crm_*` restent identiques (ils citent `crm_search`, `crm_fetch`).
- **Schéma d'entrée** (`.claude/rules/modelcontextprotocol-server/input-schema.md`) : racine plate, `entity` en `z.enum` du registre du domaine, partie propre à l'entité en `looseObject` avec `anyOf` imbriqué, reparsée par le schéma strict de l'entité. Les règles (codecs de date, `prefault`, schémas JSON et non `FormData`) s'appliquent au domaine `portfolio` comme au CRM.
- **Domaine `portfolio`** (`.claude/rules/modelcontextprotocol-server/http-handler.md`) : ajouté à `MCP_DOMAINS` ; le typage `Record<McpDomain, …>` de `route.ts` et `server.ts` impose son handler et son entrée. L'authentification et la chaîne de refus de `src/server/mcp/authenticate.ts` sont déjà génériques : une clé sans `portfolio` dans ses `permissions` reçoit 403 sur `/api/mcp/portfolio`. Le domaine ne figure que sur la clé du poste du propriétaire (ADR-025) : l'écran des clés le propose sans le présélectionner, la valeur par défaut restant `["crm"]`.
- **Logique des tags hors des Server Actions** (ARCHITECTURE.md § motif Server Action vers adaptateur, `.claude/rules/nextjs/server-actions.md`) : `createTag(data, position?)` et `updateTag(id, patch, position?)` dans `src/server/portfolio/tags.ts` rendent un `DomainResult` (`src/server/result.ts`) aux codes `slug_taken` et `not_found`. Elles portent la renumérotation par catégorie (`findCategoryIds`, `renumberTags`, `computeIdsAtPosition`, `removeId` de `src/lib/reorder.ts`) : une position absente place le tag en fin de catégorie, un changement de catégorie retire le tag de l'ancienne et le place en fin de la nouvelle. L'action admin passe la position du formulaire, l'outil n'en passe pas. `invalidateTagCaches(invalidate)` prend la primitive en paramètre, sur le modèle de `invalidateCompanyCaches` (`src/server/crm/companies.ts`) : `updateTag` dans l'action, `revalidateTag(tag, "max")` dans l'outil, pour les tags de cache `tags` et `projects`, plus `revalidatePath` de la page admin des tags (`.claude/rules/nextjs/rendering-caching.md`). La suppression et le réordonnancement restent dans l'action et réutilisent les helpers exportés par le module de domaine.
- **Entité tag** (`.claude/rules/zod/schemas.md`) : schéma propre au MCP, écrit pour JSON, qui reprend les bornes de `src/lib/schemas/tag.ts` (slug 60, noms 60, `SLUG_PATTERN`) et l'enum `TagKind`. L'icône est un `z.enum(TAG_ICON_KEYS)` nullable (`src/lib/icons.tsx`) : l'agent voit la liste des clés acceptées dans le schéma. Le slug n'existe qu'à la création : le schéma strict de modification le refuse avec un message qui dit qu'il est fixé (13 slugs sont lus en dur par l'accueil). L'ordre d'affichage n'est pas exposé. Recherche par slug, nom FR et nom EN ; lecture avec le nombre et la liste des projets qui portent le tag ; requête filtrée par catégorie, le tri `name` suivant l'ordre des catégories de l'admin (`KIND_ORDER`) puis l'ordre d'affichage.
- **Résultats et logs** (`.claude/rules/modelcontextprotocol-server/tool-results.md`, `.claude/rules/pino/usage.md`) : `writeRecord` et `guardTool` du socle, événements `tag:created`, `tag:updated`, `tag:create_failed`, `tag:update_failed`, logger lié au domaine par `mcpLoggerFor("portfolio", authInfo)`. Les instants sortent à l'heure de Paris par `toolJson`.
- **Tests** (`.claude/rules/modelcontextprotocol-server/tests.md`, `.claude/rules/nextjs/tests.md`, `.claude/rules/vitest/setup.md`) : handler réel `createMcpHandler(() => buildServer("portfolio"))` sur la base de test, `next/cache` mocké, snapshot de contrat propre au domaine (`toMatchFileSnapshot`). La règle métier des tags se teste dans `src/server/portfolio/tags.integration.test.ts` ; l'action admin se teste avec la fonction de domaine mockée.

## Acceptance criteria

### Scénario 1 : contrat CRM inchangé
**GIVEN** le socle généralisé et le domaine `crm` branché dessus
**WHEN** le test de contrat appelle `listTools` sur `buildServer("crm")`
**THEN** le résultat est identique octet pour octet à `src/server/mcp/crm/tools-list.snapshot.json`
**AND** toute la suite `src/server/mcp/crm/tools.integration.test.ts` passe sans modification de ses assertions

### Scénario 2 : outils du domaine portfolio
**GIVEN** une clé dont les `permissions` portent `portfolio`
**WHEN** l'agent appelle `tools/list` sur `/api/mcp/portfolio`
**THEN** il reçoit exactement `portfolio_search`, `portfolio_fetch`, `portfolio_query`, `portfolio_create` et `portfolio_update`, avec `entity` limité à `tag`
**AND** aucun outil `crm_*` ni outil de suppression n'apparaît

### Scénario 3 : clé limitée au CRM
**GIVEN** une clé dont les `permissions` ne portent que `crm`
**WHEN** elle appelle `/api/mcp/portfolio`
**THEN** la route répond 403 sans servir aucun outil

### Scénario 4 : création d'un tag
**GIVEN** une catégorie `FRAMEWORK` de trois tags
**WHEN** l'agent appelle `portfolio_create` avec `{ entity: "tag", data: { slug, nameFr, nameEn, kind: "FRAMEWORK", icon } }`
**THEN** le tag est créé en quatrième position de sa catégorie, l'outil rend son id et son slug
**AND** les tags de cache `tags` et `projects` sont invalidés par `revalidateTag(tag, "max")` et la page admin des tags par `revalidatePath`

### Scénario 5 : slug fixé
**GIVEN** un tag existant
**WHEN** l'agent appelle `portfolio_update` avec `fields.slug`
**THEN** l'outil répond `isError` avec un message qui dit que le slug est fixé à la création
**AND** rien n'est écrit en base

### Scénario 6 : changement de catégorie
**GIVEN** un tag en deuxième position de `LANGUAGE`
**WHEN** l'agent passe son `kind` à `DATABASE`
**THEN** il est placé en fin de `DATABASE` et `LANGUAGE` est renumérotée sans trou à partir de 1

### Scénario 7 : refus explicites
**GIVEN** un tag de slug `nextjs`
**WHEN** l'agent crée un tag de même slug, ou envoie une icône absente du registre, ou modifie un id inexistant
**THEN** l'outil répond `isError` avec un message qui nomme la correction (slug déjà pris et `portfolio_search`, champ `icon`, `portfolio_search` pour trouver l'id)

### Scénario 8 : admin inchangé pour l'utilisateur
**GIVEN** l'écran Tags de l'admin
**WHEN** le propriétaire crée ou modifie un tag à une position donnée, ou change sa catégorie
**THEN** l'ordre, les messages et l'invalidation sont les mêmes qu'avant l'extraction

## Tests à écrire

### Integration
- `src/server/portfolio/tags.integration.test.ts` :
  - crée un tag en fin de catégorie sans position, et à la position demandée avec renumérotation
  - déplace un tag dans sa catégorie à une position donnée
  - change la catégorie d'un tag : fin de la nouvelle catégorie, ancienne renumérotée sans trou
  - rend `slug_taken` sur un slug pris et `not_found` sur un id inexistant
- `src/server/mcp/portfolio/tools.integration.test.ts` :
  - contrat `listTools` du domaine (snapshot) et `entity` limité aux entités du registre
  - `portfolio_create` d'un tag, relu par `portfolio_fetch` avec ses projets, trouvé par `portfolio_search` (slug, nom FR, nom EN), listé par `portfolio_query` filtré par catégorie et trié comme l'admin
  - `portfolio_update` partiel (nom, icône, catégorie), slug refusé, icône hors registre refusée, id inexistant refusé, patch vide refusé
  - invalidation `revalidateTag("tags", "max")`, `revalidateTag("projects", "max")` et `revalidatePath` de la page des tags après une écriture réussie, aucune après un refus
  - événements de log `tag:created`, `tag:updated`, sans valeur sensible
- `src/app/api/mcp/[domain]/route.integration.test.ts` :
  - 403 sur `/api/mcp/portfolio` pour une clé limitée à `crm`, `tools/list` servi pour une clé portant `portfolio`

### Unit
- `src/server/actions/tags.test.ts` (existant, adapté) :
  - l'action valide le `FormData`, appelle la fonction de domaine avec la position du formulaire, traduit `slug_taken` en erreur de champ et `not_found` en `tag_not_found`, invalide par `updateTag`

## Edge cases

- **Tag sans icône** : `icon: null` accepté à la création et en modification (efface l'icône)
- **Changement de catégorie dans le même patch que le nom** : une seule transaction, ancienne et nouvelle catégories renumérotées ensemble
- **Création concurrente dans la même catégorie** : même comportement que l'admin aujourd'hui (pas de verrou ajouté), hors de ce périmètre
- **Domaine `portfolio` sans projets** : `entity` ne liste que `tag` jusqu'au sub-project 07, qui ajoute `project` au registre sans toucher au socle
- **Clé existante du poste** : ses domaines sont fixés à la création. Pour utiliser `portfolio`, le propriétaire crée une nouvelle clé portant `crm` et `portfolio` dans l'admin, la met dans sa variable d'environnement à la place de l'ancienne, révoque l'ancienne et déclare le serveur `/api/mcp/portfolio` dans Claude Code à côté de `crm`. Étape d'exploitation de la release, pas de code
- **Lecture d'un tag** : les projets qui le portent sortent avec leur id, leur slug, leur titre FR et leur statut, sans autre champ (choix du rédacteur)
- **Instructions du serveur `portfolio`** : tirées du registre comme celles du CRM (« Portfolio of this app, entities: … »), pour qu'une entité ajoutée au 07 y figure sans retouche (choix du rédacteur)

## Architectural decisions

### Décision : forme du socle multi-domaine

**Options envisagées :**
- **A. Fabrique d'outils paramétrée par une configuration de domaine** : un seul code d'enregistrement des cinq outils ; chaque domaine fournit registre, préfixe, textes et outils propres. Contrat CRM préservé en reprenant ses textes tels quels.
- **B. Copier `src/server/mcp/crm/tools.ts` pour le portfolio** : rapide, mais deux codes à garder alignés à chaque évolution, et chaque domaine futur (Missions, Comptabilité…) en ajouterait une copie.

**Choix : A**

**Rationale :**
- L'ADR-025 prévoit qu'un nouveau domaine n'écrive que ses schémas et sa logique, les outils venant du générique
- Le snapshot du contrat CRM rend la généralisation vérifiable à l'octet
- Les domaines suivants (Features 5 à 8) partiront du même socle

### Décision : place de la logique des tags

**Options envisagées :**
- **A. Module de domaine `src/server/portfolio/tags.ts`** consommé par l'action et l'outil, sur le modèle de `src/server/crm/`
- **B. L'outil appelle les helpers de l'action** : pas de nouveau module, mais une Server Action (`"use server"`) importée par un route handler, et des règles mêlées à l'adaptation `FormData`

**Choix : A**

**Rationale :**
- ARCHITECTURE.md et l'ADR-025 font sortir la logique des Server Actions pour servir les deux entrées
- Le sub-project 07 y ajoute les projets dans le même dossier
