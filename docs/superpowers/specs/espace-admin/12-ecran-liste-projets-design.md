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

Remplacer la page d'attente `/admin/projets` par une liste de tous les projets, quel que soit leur statut, avec filtres par type et par statut, tri, et suppression confirmée.

Exclut l'édition, portée par le sub-project `13`. Exclut la pagination : le volume actuel se compte en dizaines, et l'ajouter maintenant relèverait de l'anticipation.

### État livré

À la fin de ce sub-project, on peut : voir la totalité des projets y compris les brouillons et les archivés, les filtrer par type et par statut, en supprimer un après confirmation, et consulter la liste depuis un téléphone sans défilement horizontal.

## Dependencies

- `06-shell-admin-design.md` (statut: draft) — fournit le shell et la page d'attente que ce sub-project remplace.
- `11-crud-projets-actions-design.md` (statut: draft) — fournit `findAllProjectsForAdmin` et `deleteProject`.

## Files touched

- **À modifier** : `src/app/admin/projets/page.tsx` (remplacement de la page d'attente)
- **À créer** : `src/app/admin/projets/nouveau/page.tsx` (page d'attente, remplacée par le sub-project `13`)
- **À créer** : `src/app/admin/projets/[id]/page.tsx` (page d'attente, remplacée par le sub-project `13`)
- **À installer** : `src/components/ui/select.tsx` et `src/components/ui/alert-dialog.tsx` par le CLI shadcn. Les deux sont rangés en post-MVP dans `docs/DESIGN.md` et absents de `src/components/ui/`. Ce sub-project ne dépend pas du `07`, il n'hérite donc d'aucune de ses installations
- **À créer** : `src/components/features/admin/projects/ProjectsTable.tsx`
- **À créer** : `src/components/features/admin/projects/ProjectsFilters.tsx`
- **À créer** : `src/components/features/admin/projects/DeleteProjectDialog.tsx`

## Architecture approach

**La liste ignore le statut.** C'est la différence essentielle avec le site public, dont les requêtes filtrent sur `PUBLISHED`. L'administration existe précisément pour travailler sur les brouillons, et un projet invisible dans cette liste serait un projet perdu.

**Deux rendus selon la largeur, pas une table compressée.** `docs/DESIGN.md` pose que les tables de l'espace admin « se conçoivent mobile-first ». Une table à six colonnes sur un écran de téléphone impose soit un défilement horizontal, soit des colonnes illisibles. La liste se rend donc en cartes empilées sous le point de bascule et en table au-delà, à partir des mêmes données.

**Le filtrage se fait côté client, sur les données déjà chargées.** À l'échelle de quelques dizaines de projets, filtrer en base imposerait un aller-retour serveur par changement de filtre pour un gain nul. Le jour où le volume l'exigerait, le filtrage remonterait vers la requête, et c'est aussi ce jour-là qu'apparaîtrait le besoin de pagination.

**Le chargement de la liste passe sous `<Suspense>`.** L'écran lit sans cache, or `cacheComponents: true` refuse une lecture dynamique qui n'est ni cachée ni suspendue. Un sous-composant `async` porte la requête, la page garde l'ossature et le squelette, comme la page publique d'un case study. Les deux filtres imposent par ailleurs d'installer `select`, retiré du dépôt et rangé en post-MVP dans `docs/DESIGN.md`.

**Le tri et le filtrage sont un pattern, pas un composant.** `docs/DESIGN.md` le note pour la table shadcn : « le tri, le filtrage et la pagination sont un pattern à implémenter, pas un composant du registry ». Aucune librairie de table n'est installée pour ce seul écran, ce qui déroge sciemment au mapping de `docs/DESIGN.md`, lequel associe « Tables de données » à TanStack Table : la dépendance ne se justifie pas pour un unique écran d'administration à volumétrie faible.

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
**WHEN** on trie par titre puis par ordre d'affichage
**THEN** l'ordre change en conséquence
**AND** le critère actif est visible

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
- **Deux routes à créer d'avance pour `typedRoutes`** : le bouton « Nouveau projet » pointe vers `/admin/projets/nouveau` et chaque ligne de la liste vers `/admin/projets/[id]`, deux routes que seul le sub-project `13` construira. Avec la vérification des liens à la compilation, le build échouerait sur l'une comme sur l'autre. Ce sub-project crée donc **deux** pages d'attente, comme le `06` l'a fait pour les quatre sections. Oublier la route dynamique est le piège le moins visible des deux : elle n'apparaît pas dans un bouton isolé mais dans une colonne d'actions
