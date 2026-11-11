---
feature: "Feature 3 : Outils de l'app pour les agents"
subproject: "outils-projets"
goal: "Exposer aux agents les projets du portfolio (recherche, lecture, liste, création, modification, statut de publication compris) sur la logique métier commune à l'admin."
status: "implemented"
complexity: "L"
tdd_scope: "full"
execution: "subagent-driven"
model: "opus"
effort: "high"
depends_on: ["06-socle-mcp-multi-domaine-design.md"]
date: "2026-11-10"
---

# Outils du portfolio : projets

## Scope

Couvre deux volets :
- la création et la modification des projets sortent des Server Actions vers `src/server/portfolio/projects.ts`, l'action admin n'étant plus qu'un adaptateur ;
- l'entité `project` rejoint le registre du domaine `portfolio` : recherche, lecture, liste, création et modification, champs FR et EN, études de cas FR et EN, entreprise cliente, tags, couverture et statut de publication.

Une modification d'un projet publié part en ligne aussitôt, un projet n'ayant qu'une version (décision du propriétaire du 2026-11-10, `docs/BRAINSTORM.md` Feature 3). Exclut :
- la suppression et le réordonnancement des projets, qui restent dans l'admin ;
- le téléversement d'assets : la couverture et les images de l'étude de cas ne citent que des clés déjà déposées ;
- toute version « proposée » d'un projet publié, qui resterait en attente de relecture.

### État livré

À la fin de ce sub-project, on peut : avec la clé du poste, créer par `portfolio_create` un projet brouillon rattaché à une entreprise trouvée par `crm_search` et à des tags trouvés par `portfolio_search`, le relire, le voir en dernière position dans l'admin, puis le publier par `portfolio_update` et obtenir 200 sur sa page publique `/fr/projets/<slug>` avec le contenu écrit.

## Dependencies

- `06-socle-mcp-multi-domaine-design.md` (statut: draft) : socle des outils génériques, domaine `portfolio` et registre où s'ajoute l'entité, entité tag dont les ids alimentent `tagIds`. Les noms et signatures du socle (`defineEntity`, `RegisteredEntity`, `McpDomainConfig`, `PORTFOLIO_ENTITY_BY_NAME`, `invalidateTagCaches`) sont ceux du bloc Interfaces du plan `06-socle-mcp-multi-domaine.md`

## Files touched

- **À créer** : `src/server/portfolio/projects.ts` (logique de création et de modification, `DomainResult`)
- **À créer** : `src/server/portfolio/projects.integration.test.ts`
- **À créer** : `src/server/mcp/portfolio/entities/project.ts`
- **À modifier** : `src/server/mcp/portfolio/registry.ts` (entrée `project`)
- **À modifier** : `src/server/mcp/portfolio/tools.integration.test.ts` et `src/server/mcp/portfolio/tools-list.snapshot.json` (contrat du domaine avec `project`)
- **À modifier** : `src/server/actions/projects.ts` (création et modification déléguées au module de domaine)
- **À modifier** : `src/server/actions/projects.test.ts` (adaptation testée avec la fonction de domaine mockée)
- **À modifier** : `src/server/actions/projects.integration.test.ts` (les cas de règle métier rejoignent `src/server/portfolio/projects.integration.test.ts`, seuls restent ceux de l'adaptation sur la base)
- **À modifier** : `src/server/queries/projects.ts` (lectures sans cache pour l'outil : recherche, fiche, page filtrée)
- **À modifier** : `src/lib/ids.ts` (`projectIdSchema` et `ProjectId`)
- **À modifier** : `docs/ARCHITECTURE.md` (entités du domaine `portfolio`, module `server/portfolio/projects.ts`)
- **À modifier** : `docs/PRODUCTION.md` (smoke test de release : lecture d'un projet par `portfolio_fetch` avec la clé du poste)

## Architecture approach

- **Logique des projets hors des Server Actions** (ADR-025, ARCHITECTURE.md § motif Server Action vers adaptateur, `.claude/rules/nextjs/server-actions.md`) : `createProject(data, position?)` et `updateProject(id, patch, position?)` dans `src/server/portfolio/projects.ts` rendent un `DomainResult` aux codes `slug_taken`, `company_not_found`, `tag_not_found`, `dates_out_of_order` et `not_found`. Elles reprennent la transaction de l'action : lecture de l'ordre dans la transaction, renumérotation (`computeIdsAtPosition`, `renumberEntities`), `ClientMeta` créé ou mis à jour, tags remplacés dans l'ordre du tableau. À la création, une position absente place le projet en dernier ; en modification, elle garde son rang actuel, sans renumérotation. L'action admin passe toujours celle du formulaire, l'outil jamais. `updateProject` lit le projet et son `ClientMeta`, fusionne le patch, et ne touche aux tags que si `tagIds` est présent. Tout projet a son `ClientMeta`, créé avec lui par l'une ou l'autre entrée (11 projets sur 11 en base de dev le 2026-11-10) : la modification partielle le met à jour sans le créer, et une absence, impossible par l'app, lève une erreur journalisée plutôt qu'un code de domaine (choix du rédacteur). `slug_taken` s'attribue par la contrainte violée, jamais par le seul code P2002 (`ProjectTag` a sa propre unicité). La règle « fin pas avant début » passe du schéma admin au domaine pour valoir aussi contre les dates en base dans un patch partiel.
- **Invalidation** (`.claude/rules/nextjs/rendering-caching.md`) : `invalidateProjectCaches(invalidate)` prend la primitive en paramètre, comme `invalidateCompanyCaches` (`src/server/crm/companies.ts`). Elle invalide le tag de cache `projects`, qui couvre la liste publique, les études de cas, l'accueil, la page À propos, le sitemap et `llms.txt`. Elle appelle aussi `revalidatePath` sur les pages admin des projets (layout, sous-pages comprises) et sur la page des tags, qui affiche leur nombre de projets. `updateTag` dans l'action, `revalidateTag("projects", "max")` dans l'outil : la première requête publique après une écriture d'outil peut encore servir l'ancienne version, la suivante sert la nouvelle.
- **Entité projet** (`.claude/rules/modelcontextprotocol-server/input-schema.md`, `.claude/rules/zod/schemas.md`) : schéma propre au MCP, écrit pour JSON. Il reprend les bornes et enums de `src/lib/schemas/project.ts` (slug 80 au motif `SLUG_PATTERN`, titres 120, descriptions non vides, `ProjectType`, `ProjectStatus`, au moins un `ProjectFormat`, URL http ou https, `WorkMode`, `ContractStatus`, `teamSize` d'au moins 1, `deliverablesCount` d'au moins 0) et `isProjectAssetKey` pour la couverture. `startedAt` et `endedAt` sont des jours `YYYY-MM-DD` lus et écrits comme l'admin les stocke, minuit UTC, par le codec `dateColumnDay` (`src/server/mcp/crm/day-fields.ts`, déplacé au socle si le CRM et le portfolio le partagent). `companyId` et `workMode` sont requis pour tout projet, comme dans l'admin : un projet personnel se rattache à la société du propriétaire (type `MA_SOCIETE`). Les deux études de cas sont des champs markdown indépendants et nullables. `status` vaut `DRAFT` par défaut à la création, et `PUBLISHED` ou `ARCHIVED` s'écrivent comme dans l'admin. Le slug n'existe qu'à la création dans le schéma de l'outil, qui le refuse en modification avec un message qui dit qu'il est fixé ; le domaine accepte toujours un changement de slug venu de l'admin. L'ordre d'affichage n'est pas exposé.
- **Lien inter-domaines** : l'entreprise cliente vit dans le domaine `crm`. L'outil reçoit son id, que l'agent obtient par `crm_search` (la clé du poste porte les deux domaines). Une entreprise inconnue répond `company_not_found` avec un message qui renvoie à `crm_search`. La fiche d'un projet rend l'entreprise par `companyRefSelect` (id, nom, logo), jamais d'autre donnée du CRM.
- **Descriptions vues par l'agent** (`.claude/rules/modelcontextprotocol-server/tools.md`) : `portfolio_create` et `portfolio_update` disent qu'un statut `PUBLISHED` met le projet en ligne aussitôt (liste, étude de cas, sitemap, logo de son entreprise servi en public) et qu'une modification d'un projet publié part en ligne aussitôt.
- **Lectures** : recherche par slug, titre FR et titre EN (libellé `titleFr`, indice « slug · statut ») ; fiche avec tous les champs, l'entreprise, le `ClientMeta` et les tags dans leur ordre ; liste filtrée par statut, type, entreprise et tag, le tri `name` suivant l'ordre d'affichage comme l'admin, avec les deux titres, le statut, le type, le nom de l'entreprise et l'ordre. Lectures sans `'use cache'` dans `src/server/queries/projects.ts`, distinctes des lectures publiques en cache.
- **Résultats, logs et tests** : `writeRecord` du socle, événements `project:created`, `project:updated`, `project:create_failed`, `project:update_failed` (`.claude/rules/pino/usage.md`) ; tests MCP sur le handler réel (`.claude/rules/modelcontextprotocol-server/tests.md`), règle métier sur la base de test, action testée avec la fonction de domaine mockée (`.claude/rules/nextjs/tests.md`).

## Acceptance criteria

### Scénario 1 : création d'un brouillon
**GIVEN** une entreprise trouvée par `crm_search` et deux tags trouvés par `portfolio_search`
**WHEN** l'agent appelle `portfolio_create` avec `entity: "project"`, slug, titres et descriptions FR et EN, type, au moins un format, `companyId`, `workMode` et `tagIds`
**THEN** le projet est créé en `DRAFT`, en dernière position, avec son `ClientMeta` et ses tags dans l'ordre envoyé
**AND** l'outil rend son id, son slug et son titre FR, et invalide `projects` par `revalidateTag("projects", "max")`

### Scénario 2 : publication
**GIVEN** un projet brouillon
**WHEN** l'agent appelle `portfolio_update` avec `fields: { status: "PUBLISHED" }`
**THEN** le projet est publié et sa page `/fr/projets/<slug>` répond 200 à la seconde requête qui suit l'écriture
**AND** les autres champs, le `ClientMeta` et les tags sont inchangés

### Scénario 3 : correction d'un projet en ligne
**GIVEN** un projet publié avec trois tags
**WHEN** l'agent modifie son `caseStudyMarkdownFr` sans envoyer `tagIds`
**THEN** l'étude de cas FR est remplacée, l'EN et les trois tags restent
**AND** le statut reste `PUBLISHED`

### Scénario 4 : remplacement des tags
**GIVEN** un projet avec les tags A et B
**WHEN** l'agent envoie `tagIds: [C, A]`
**THEN** le projet porte C puis A, dans cet ordre

### Scénario 5 : refus explicites
**GIVEN** un projet existant
**WHEN** l'agent envoie un slug en modification, une couverture hors des dossiers `projets/client/` et `projets/personal/`, un `companyId` inconnu, un tag inconnu, une fin avant le début (y compris contre la date de début en base), ou un id inexistant
**THEN** l'outil répond `isError` avec un message qui nomme la correction (slug fixé, champ `coverFilename`, `crm_search`, `portfolio_search`, `endedAt`)
**AND** rien n'est écrit en base

### Scénario 6 : admin inchangé pour l'utilisateur
**GIVEN** l'écran Projets de l'admin
**WHEN** le propriétaire crée ou modifie un projet à une position donnée, avec ses tags et son client
**THEN** l'ordre, la modification du slug et les messages (`slug_taken`, entreprise ou tag disparus, projet introuvable) sont les mêmes qu'avant l'extraction
**AND** l'invalidation couvre en plus les sous-pages admin des projets et la page des tags

## Tests à écrire

### Integration
- `src/server/portfolio/projects.integration.test.ts` :
  - crée un projet en dernière position sans position, et à la position demandée avec renumérotation
  - modifie partiellement un projet : champs du projet et du `ClientMeta` fusionnés avec la base, tags conservés sans `tagIds`, remplacés dans l'ordre avec `tagIds`
  - rend `slug_taken`, `company_not_found`, `tag_not_found`, `not_found`
  - rend `dates_out_of_order` sur une fin avant le début, y compris quand seule la fin est envoyée et que le début est en base
- `src/server/mcp/portfolio/tools.integration.test.ts` :
  - contrat `listTools` du domaine avec `project` (snapshot), `entity` limité à `tag` et `project`
  - `portfolio_create` d'un brouillon, relu par `portfolio_fetch` (entreprise, `ClientMeta`, tags ordonnés), trouvé par `portfolio_search` (slug, titre FR, titre EN), listé par `portfolio_query` filtré par statut, type, entreprise et tag
  - `portfolio_update` : publication, correction d'un projet publié sans toucher aux tags, remplacement des tags, archivage
  - refus : slug en modification, couverture hors dossier de projet, entreprise inconnue (message vers `crm_search`), tag inconnu, fin avant début, id inexistant, patch vide
  - jours `startedAt` et `endedAt` rendus en `YYYY-MM-DD`, instants à l'heure de Paris
  - invalidation de `projects` et des pages admin après succès, aucune après refus ; événements `project:created`, `project:updated`

### Unit
- `src/server/actions/projects.test.ts` (existant, adapté) :
  - l'action valide le `FormData`, passe la position du formulaire, traduit chaque code du domaine en état de formulaire et invalide par `updateTag`

## Edge cases

- **`deliverablesCount` à 0** : accepté, comme dans l'admin (« 0 légitime »)
- **Couverture d'un dossier qui ne correspond pas au type** (`projets/personal/…` sur un projet `CLIENT`) : acceptée, l'admin ne les relie pas
- **Image retirée du markdown de l'étude de cas** : l'asset n'est plus référencé et redevient supprimable dans l'admin, sans autre contrôle, comme aujourd'hui
- **Projet archivé** : modifiable par l'outil comme un brouillon, hors du site public
- **Modification sans position** : le projet garde son rang, l'ordre public ne bouge pas
- **Champ nullable à `null`** (`githubUrl`, `demoUrl`, `coverFilename`, études de cas, dates, `contractStatus`, `teamSize`) : efface la valeur, comme les outils du CRM ; `tagIds` en doublon refusé comme dans l'admin
- **Écriture concurrente de l'ordre** (admin et agent en même temps) : même comportement qu'aujourd'hui, la mutation suivante renumérote l'ensemble

## Architectural decisions

### Décision : patch partiel des tags et du ClientMeta

**Options envisagées :**
- **A. Patch partiel** : un champ absent garde la valeur en base, `tagIds` présent remplace la liste entière dans l'ordre envoyé
- **B. Remplacement complet à chaque modification**, comme le formulaire admin : l'agent doit renvoyer tous les champs, au risque d'effacer des tags ou une étude de cas qu'il n'a pas relus

**Choix : A**

**Rationale :**
- Même sémantique que les outils du CRM (« absent stays unchanged »), dont `correspondentIds` d'un entretien pour une liste
- Une correction d'étude de cas ne doit jamais faire perdre les tags d'un projet en ligne
