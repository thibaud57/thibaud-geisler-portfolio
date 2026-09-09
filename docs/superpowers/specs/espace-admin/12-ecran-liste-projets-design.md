---
feature: "Feature 1 — Espace admin"
subproject: "ecran-liste-projets"
goal: "Lister et parcourir tous les projets, publiés comme brouillons, depuis l'espace admin"
status: "draft"
complexity: "M"
tdd_scope: "none"
depends_on: ["06-shell-admin-design.md", "11-crud-projets-actions-design.md"]
date: "2026-09-03"
---

# Écran de liste des projets

## Scope

Remplacer la page d'attente `/admin/projets` par une liste de tous les projets, quel que soit leur statut, avec recherche, filtres par type et par statut, tri, pagination et suppression confirmée.

Exclut l'édition, portée par le sub-project `13`.

### État livré

À la fin de ce sub-project, on peut : voir la totalité des projets y compris les brouillons et les archivés, les filtrer par type et par statut, en supprimer un après confirmation, et consulter la liste depuis un téléphone sans défilement horizontal.

## Dependencies

- `06-shell-admin-design.md` (statut: draft) : fournit le shell et la page d'attente que ce sub-project remplace.
- `11-crud-projets-actions-design.md` (statut: draft) : fournit `findAllProjectsForAdmin` et `deleteProject`.

## Files touched

- **À modifier** : `src/app/admin/(protected)/projets/page.tsx` (remplacement de la page d'attente)
- **À créer** : `src/app/admin/(protected)/projets/nouveau/page.tsx` (page d'attente, remplacée par le sub-project `13`)
- **À créer** : `src/app/admin/(protected)/projets/[id]/page.tsx` (page d'attente, remplacée par le sub-project `13`)
- **Composants shadcn** : `select`, `alert-dialog` et `pagination` sont posés par le sub-project `07`, dont celui-ci dépend transitivement par le `11`. Vérifier leur présence et n'installer que ce qui manque
- **À créer** : `src/components/features/admin/projects/ProjectsTable.tsx`
- **À créer** : `src/components/features/admin/projects/ProjectsFilters.tsx`
- **À créer** : `src/components/features/admin/projects/DeleteProjectDialog.tsx`

## Architecture approach

**La liste ignore le statut.** C'est la différence essentielle avec le site public, dont les requêtes filtrent sur `PUBLISHED`. L'administration existe précisément pour travailler sur les brouillons, et un projet invisible dans cette liste serait un projet perdu.

**Deux rendus selon la largeur, pas une table compressée.** `docs/DESIGN.md` pose que les tables de l'espace admin « se conçoivent mobile-first ». Une table à six colonnes sur un écran de téléphone impose soit un défilement horizontal, soit des colonnes illisibles. La liste se rend donc en cartes empilées sous le point de bascule et en table au-delà, à partir des mêmes données.

**Le filtrage se fait côté client, sur les données déjà chargées.** À l'échelle de quelques dizaines de projets, filtrer en base imposerait un aller-retour serveur par changement de filtre pour un gain nul. Le jour où le volume l'exigerait, le filtrage remonterait vers la requête, et c'est aussi ce jour-là qu'apparaîtrait le besoin de pagination.

**Le chargement de la liste passe sous `<Suspense>`.** L'écran lit sans cache, or `cacheComponents: true` refuse une lecture dynamique qui n'est ni cachée ni suspendue. Un sous-composant `async` porte la requête, la page garde l'ossature et le squelette, comme la page publique d'un case study. Les deux filtres imposent par ailleurs d'installer `select`, retiré du dépôt et rangé en post-MVP dans `docs/DESIGN.md`.

**La table réutilise le `DataTable` du sub-project `07`.** Recherche, tri par colonne avec `aria-sort` et pied paginé y sont déjà écrits, en état local React et sans librairie de table, comme `docs/DESIGN.md` le prescrit : « le tri, le filtrage et la pagination sont un pattern à implémenter, pas un composant du registry ». Ne rien réécrire ici, les trois écrans de liste de l'epic devant se ressembler.

Ce sub-project **dépend du `07`** par la chaîne `12 → 11 → 07`. La rédaction initiale affirmait le contraire et prévoyait de réinstaller `select` et `alert-dialog` : c'est faux, et une réinstallation les écraserait.

Deux filtres s'ajoutent au `DataTable` : type et statut, en `Select`, parce qu'ils portent une sémantique propre à cet écran. Ils restent des `Select` et non les `Popover` à compteurs facettés décrits par `docs/DESIGN.md`, qui restent hors epic : ils n'ont de sens qu'avec du volume et des colonnes à masquer.

**La suppression réutilise la confirmation déjà en place ailleurs.** Même `AlertDialog` que pour les tags, les entreprises et les assets, avec le titre du projet dans le message. Contrairement à ces trois cas, aucune contrainte de base ne s'y oppose : un projet se supprime toujours, sa méta et ses rattachements partant en cascade. La confirmation est donc la seule protection, ce qui rend son libellé important.

**Aucun test.** Filtrer un tableau par statut ne vérifie aucune règle métier du projet : c'est du filtrage générique, que la règle no-lib-test exclut. Les Server Actions consommées ici sont déjà couvertes par le sub-project `11`.

Rules applicables : `.claude/rules/shadcn-ui/components.md`, `.claude/rules/nextjs/routing.md`, `.claude/rules/nextjs/data-fetching.md`, `.claude/rules/nextjs/server-client-components.md`, `.claude/rules/react/hooks.md`, `.claude/rules/tailwind/conventions.md`.

## Acceptance criteria

### Scénario 1 : Tous les statuts visibles
**GIVEN** des projets en brouillon, publiés et archivés
**WHEN** on affiche la liste
**THEN** les trois catégories y figurent
**AND** le statut de chacun est lisible d'un coup d'œil

### Scénario 2 : Filtre par statut
**GIVEN** la liste complète
**WHEN** on filtre sur les brouillons
**THEN** seuls les projets en brouillon restent affichés
**AND** le nombre de résultats est indiqué

### Scénario 3 : Filtre par type
**GIVEN** la liste complète
**WHEN** on filtre sur les projets client
**THEN** seuls ceux-ci restent affichés
**AND** l'entreprise associée est visible pour chacun

### Scénario 4 : Filtres combinés
**GIVEN** un filtre de type et un filtre de statut actifs
**WHEN** aucun projet ne satisfait les deux
**THEN** un état vide explicite s'affiche, distinct d'une liste en cours de chargement

### Scénario 5 : Tri
**GIVEN** la liste affichée
**WHEN** on clique sur l'en-tête « Titre » puis à nouveau
**THEN** l'ordre passe en croissant puis en décroissant, et un troisième clic revient à l'ordre d'affichage
**AND** `aria-sort` reflète l'état courant

### Scénario 5 bis : Recherche et pagination
**GIVEN** la liste complète
**WHEN** on saisit un terme dans la recherche
**THEN** seules les lignes correspondantes restent affichées
**AND** le pied indique le nombre de résultats et permet de changer de page

### Scénario 5 ter : Cohérence avec les autres listes
**GIVEN** les écrans `/admin/tags`, `/admin/entreprises` et `/admin/projets`
**WHEN** on compare leur recherche, leur tri et leur pied
**THEN** les trois se comportent de la même façon, le composant étant partagé

### Scénario 6 : Suppression confirmée
**GIVEN** un projet dans la liste
**WHEN** on demande sa suppression et qu'on confirme
**THEN** il disparaît de la liste et de la base
**AND** ses tags et son entreprise existent toujours

### Scénario 7 : Suppression annulée
**GIVEN** la confirmation de suppression affichée
**WHEN** on annule
**THEN** rien n'est supprimé

### Scénario 8 : Lecture sur téléphone
**GIVEN** une fenêtre de moins de 768 pixels
**WHEN** on affiche la liste
**THEN** les projets se présentent en cartes empilées
**AND** la page ne défile pas horizontalement

## Edge cases

- **Confirmation comme seule protection** : contrairement aux tags et aux entreprises, aucune contrainte de base n'empêche la suppression d'un projet. La méta client et les rattachements partent en cascade, et rien n'est récupérable. Le libellé de la confirmation doit donc nommer le projet, pas se contenter d'un « Êtes-vous sûr ? »
- **État vide et chargement confondus** : une liste filtrée sans résultat ressemble à une liste qui charge. Les deux états doivent être distincts, sinon on croit à une lenteur
- **Projet client sans entreprise affichable** : la méta client peut manquer si une donnée a été créée hors de l'application. L'affichage doit le tolérer sans planter, même si les Server Actions du sub-project `11` rendent ce cas improbable
- **Titre long** : les titres bilingues peuvent être longs. Sans troncature, ils cassent la mise en page de la table sur les écrans intermédiaires
- **Filtres non réinitialisables** : après un filtrage sans résultat, il faut un moyen évident de tout réafficher, faute de quoi la liste paraît vide
- **Croire ce sub-project indépendant du `07`** : la rédaction initiale l'affirmait et prévoyait de réinstaller `select` et `alert-dialog`. La chaîne `12 → 11 → 07` rend cette affirmation fausse, et une réinstallation écraserait des composants en place. Vérifier avant d'installer, ici comme partout dans l'epic
- **Deux routes à créer d'avance pour `typedRoutes`** : le bouton « Nouveau projet » pointe vers `/admin/projets/nouveau` et chaque ligne de la liste vers `/admin/projets/[id]`, deux routes que seul le sub-project `13` construira. Avec la vérification des liens à la compilation, le build échouerait sur l'une comme sur l'autre. Ce sub-project crée donc **deux** pages d'attente, comme le `06` l'a fait pour les quatre sections. Oublier la route dynamique est le piège le moins visible des deux : elle n'apparaît pas dans un bouton isolé mais dans une colonne d'actions
