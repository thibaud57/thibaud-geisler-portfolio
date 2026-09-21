---
feature: "Feature 1 — Espace admin"
subproject: "ecran-liste-projets"
goal: "Lister et parcourir tous les projets, publiés comme brouillons, depuis l'espace admin"
status: "implemented"
complexity: "M"
tdd_scope: "none"
depends_on: ["06-shell-admin-design.md", "08-crud-entreprises-design.md", "11-crud-projets-actions-design.md"]
date: "2026-09-03"
---

# Écran de liste des projets

## Scope

Remplacer la page d'attente `/admin/projets` par trois vues de la liste des projets, quel que soit leur statut : Tous, Client et Perso, choisies depuis des sous-entrées de la barre latérale sous l'item « Projets ». Chaque vue porte son titre, son accroche, son propre jeu de colonnes visibles par défaut, et la vue Tous porte en plus le glisser-déposer de l'ordre d'affichage. Recherche, colonnes masquables, filtres facettés, tri, pagination et suppression confirmée sont communs aux trois.

Exclut l'édition, portée par le sub-project `13`.

Restent hors périmètre, faute de support en base : la phase du projet et la date de mise en production que montre la maquette (`docs/BRAINSTORM.md` Feature 6 « Suivi du cycle de développement »). Aucune colonne ni aucun filtre ne leur est consacré.

### État livré

À la fin de ce sub-project, on peut : voir la totalité des projets y compris les brouillons et les archivés, basculer entre les vues Tous, Client et Perso depuis la barre latérale, filtrer et rechercher dans chacune, réordonner l'ensemble par glisser-déposer depuis la vue Tous, en supprimer un après confirmation, et consulter la liste depuis un téléphone sans défilement horizontal.

## Dependencies

- `06-shell-admin-design.md` (statut: draft) : fournit le shell et la page d'attente que ce sub-project remplace.
- `08-crud-entreprises-design.md` (statut: draft) : porte la refonte de la barre latérale (`AdminSidebar.tsx`, `src/config/admin-nav-items.ts`) dont ce sub-project n'ajoute que les sous-entrées des projets, et le sélecteur de colonnes affichées du `DataTable`, réutilisé tel quel.
- `11-crud-projets-actions-design.md` (statut: draft) : fournit `findAllProjectsForAdmin`, `deleteProject` et `reorderProjects`.

## Références de design

- **Maquette** : l'écran Projets (`isProjets`), ses trois vues de sous-navigation (script `8420-8424`, titre et accroche dynamiques `projViewTitle`/`projViewHint`), ses tris de colonne (`sortByOrder`, `sortTitle`, `sortYear`, `sortEnd`), son pied paginé (`projBar`), son état vide (`noRows`) et sa confirmation de suppression (`dlgDeleteProject`).
- **L'écran suit la maquette, y compris ses deux contrôles de barre d'outils** : le sélecteur de colonnes affichées (`projColsOpen`), venu du `DataTable` du sub-project `08`, et les filtres à compteurs facettés (`projFacets`), que le `DataTable` porte depuis le sub-project `07`. Les filtres sont des facettes multi-sélection à compteurs, jamais un `Select`.
- **Design system** : les fiches `.prompt.md` de `Table`, `Popover` et `Checkbox` (colonnes et facettes), `Pagination` et `Select` (pied), `Tooltip` (actions de ligne), `AlertDialog` (suppression) et `Sidebar` (sous-navigation).
- Règle de lecture et liens des deux projets : `.claude/rules/design/claude-design.md`.

## Files touched

- **À modifier** : `src/app/admin/(protected)/projets/page.tsx` (vue Tous, remplace la page d'attente)
- **À créer** : `src/app/admin/(protected)/projets/client/page.tsx` (vue Client) et `src/app/admin/(protected)/projets/perso/page.tsx` (vue Perso)
- **À créer** : `src/app/admin/(protected)/projets/nouveau/page.tsx` (page d'attente, remplacée par le sub-project `13`) et son `loading.tsx`
- **À créer** : `src/app/admin/(protected)/projets/[id]/page.tsx` (page d'attente, remplacée par le sub-project `13`) et son `loading.tsx`
- **À modifier** : `src/config/admin-nav-items.ts` (sous-entrées Tous / Clients / Perso sous l'item Projets, dans la forme que le `08` y introduit)
- **Composants shadcn** : `select`, `alert-dialog`, `pagination`, `popover`, `checkbox` et `tooltip` sont déjà posés par les sub-projects `07` et `08`. Vérifier leur présence et n'installer que ce qui manque
- **À modifier** : `src/components/features/admin/DataTable.tsx` (rendu carte sous `md:` à partir des mêmes lignes filtrées/triées/paginées que la table, états vides génériques, clic de ligne, facettes multi-valeurs)
- **À installer** : le composant `empty` du registry shadcn, support des deux états vides
- **À créer** : `src/components/features/admin/DetailDialog.tsx` (vue détail générique)
- **À modifier** : `src/components/features/admin/tags/TagsTable.tsx`, `src/components/features/admin/tags/TagFormDialog.tsx` et `src/components/features/admin/companies/CompaniesTable.tsx` (vue détail et états vides sur les deux listes déjà livrées)
- **À modifier** : `src/lib/projects.ts` (libellés d'affichage des enums projet, calcul de durée)
- **À créer** : `src/components/features/admin/projects/ProjectsTable.tsx`
- **À créer** : `src/components/features/admin/projects/DeleteProjectDialog.tsx`
- **À modifier** : `docs/DESIGN.md` § Mapping Composants (le rendu carte sort du post-MVP) et § Arbitrages (vue détail, états vides)

## Architecture approach

**La liste ignore le statut.** C'est la différence essentielle avec le site public, dont les requêtes filtrent sur `PUBLISHED`. L'administration existe précisément pour travailler sur les brouillons, et un projet invisible dans cette liste serait un projet perdu.

**Trois vues, une route par vue, un seul composant de table.** La maquette ne traite pas Tous/Client/Perso comme un filtre dans la barre d'outils de l'écran, mais comme trois entrées de sous-navigation dans la sidebar, au même pattern que Missions (Mission/CRA) ou Entreprises (Toutes/Travaillées). Changer de vue est donc une navigation, pas un état local : `/admin/projets` (Tous), `/admin/projets/client` et `/admin/projets/perso`, coexistant sans conflit avec la route dynamique `/admin/projets/[id]` puisque Next.js résout toujours un segment statique avant un segment dynamique de même niveau. Chaque route est une page `async` fine qui charge `findAllProjectsForAdmin()` et délègue à `<ProjectsTable projects={...} view="tous" | "client" | "perso" />`, seul composant qui connaît le détail des colonnes, des filtres et du glisser-déposer.

**`ProjectsTable` filtre par type avant de passer les lignes au `DataTable`.** Les vues Client et Perso ne sont pas un filtre applicable et retirable dans la barre d'outils : elles restreignent la donnée en amont, à la source, avant même que le `DataTable` reçoive les lignes. Le filtre facetté « Type de projet » du `DataTable`, lui, porte sur les formats du projet (API, Web App…), une donnée indépendante de cette nature Client/Perso : il garde donc sa place dans les trois vues.

**Le titre et l'accroche de l'en-tête suivent la vue.** Trois couples titre/accroche, en dur comme le reste de l'interface admin (ADR-021, monolingue français) : la spec ne recopie pas le texte de la maquette (`.claude/rules/design/claude-design.md`), l'écran `isProjets` en porte la source, `projViewTitle`/`projViewHint`.

**Le rendu carte sous `md:` est un ajout au `DataTable`, pas une réimplémentation à côté.** Aucun écran de liste livré avant celui-ci n'en a eu besoin : `07` (tags) ne bascule pas en cartes. Dupliquer la recherche, le tri et la pagination dans un composant de cartes séparé ferait diverger les deux rendus au premier changement de l'un des deux. `DataTable` gagne donc une prop `renderCard`, qui rend les mêmes lignes déjà filtrées, triées et paginées que la table, sous une structure `<div className="hidden md:block">` / `<div className="md:hidden">` togglée en CSS : voir Architectural decisions.

**Le sélecteur de colonnes et les facettes viennent du `DataTable`, ce sub-project ne les réécrit pas.** Le `08` ajoute au `DataTable` un Popover « Colonnes » symétrique de celui des filtres (bouton `outline`, icône `columns-3`, badge de compteur, une `Checkbox` par colonne masquable) ; ce sub-project déclare ses colonnes projets avec ce contrat, chacune portant l'indicateur « masquable » sauf Titre et `#`, et fournit le jeu de colonnes visibles par défaut propre à chaque vue. Si le `08` s'exécute avant celui-ci, il porte cet ajout ; sinon ce sub-project l'ajoute lui-même à `DataTable.tsx`, déjà listé dans ses Files touched pour le rendu carte.

**Colonnes de la table**, limitées à ce que `Project` et `ClientMeta` portent en base (la maquette en montre deux de plus, Phase et Date MEP, hors périmètre) :

| Colonne | Source | Masquable |
|---|---|---|
| # | `displayOrder`, rendu natif du `DataTable` | non |
| Titre | `titleFr`, avec le slug en dessous | non |
| Nature | `type`, badge `outline meta` Client/Perso | oui |
| Type de projet | `formats`, badges `secondary` capés à 3 + tooltip | oui |
| Entreprise | `clientMeta.company`, mini logo + nom, ou tiret | oui |
| Statut contrat | `clientMeta.contractStatus`, texte muted | oui |
| Date début | `startedAt`, triable | oui |
| Date fin | `endedAt`, triable | oui |
| Durée | calculée depuis `startedAt`/`endedAt` (ou aujourd'hui si en cours) | oui |
| Équipe | `clientMeta.teamSize`, aligné à droite, mono | oui |
| Liens | `githubUrl`/`demoUrl`, liens « GitHub · Démo » cliquables vers un nouvel onglet, ou tiret | oui |
| Statut | `status`, pastille + libellé (Brouillon/Publié/Archivé) | oui |
| Actions | édition + suppression | non |

Le tri par colonne, avec `aria-sort` et le cycle croissant/décroissant/ordre d'affichage déjà porté par le `DataTable`, ne s'applique qu'à Titre, Date début et Date fin, comme la maquette : les autres colonnes n'ont pas de `sortValue`.

**Colonnes visibles par défaut, par vue** (les autres restent masquées mais accessibles par le sélecteur), suivant l'arbitrage « Colonnes par vue » de `docs/DESIGN.md` :
- **Tous** : toutes les colonnes masquables
- **Client** : Nature, Type de projet, Entreprise, Date début, Durée, Statut
- **Perso** : Type de projet, Date début, Date fin, Liens, Statut

**Les filtres facettés portent sur le Statut de publication et sur le Type de projet dans les trois vues.** Aucune vue ne porte de filtre sur la nature Client/Perso, déjà tranchée par la route. Chaque compteur tient compte de la recherche en cours, sans option « Tous » (mécanisme déjà câblé par le `DataTable` depuis le `07`).

**Le glisser-déposer n'est câblé que dans la vue Tous.** `ProjectsTable` ne passe la prop `onReorder` (appelant `reorderProjects` du sub-project `11`) qu'en vue Tous ; les vues Client et Perso omettent cette prop, ce qui suffit à rendre leurs lignes non draggables sans changement au `DataTable` : `draggable` y vaut déjà `isOrderView && !!onReorder`. Le numéro affiché en colonne `#` reste la position globale du projet (cf. spec `11`, ordre 1..n sur l'ensemble des projets) : les vues Client et Perso l'affichent tel quel, non contigu dans leur sous-ensemble filtré, sans jamais permettre de le changer.

**Le clic sur une ligne ouvre une vue détail, décision du propriétaire qui vaut pour toute liste admin** (arbitrage consigné dans `docs/DESIGN.md`). Le `DataTable` gagne une prop `onRowClick` et une prop `rowLabel` qui nomme la ligne pour les technologies d'assistance ; la modale générique de détail, calquée sur l'écran `dlgDetail` de la maquette, vit à côté de lui et sert aussi les tags et les entreprises. Son pied mène à l'édition, quand le crayon de la colonne Actions y mène directement. Le titre de la ligne reste du texte, sans lien.

**Les deux états vides sont génériques, eux aussi portés par le `DataTable`** (même arbitrage) : base vide d'un côté, recherche ou facettes sans résultat de l'autre, ce dernier portant le bouton de réinitialisation qu'appelle l'edge case « Filtres non réinitialisables ». Chaque écran fournit l'icône, le titre et la phrase, le composant rend la forme.

**Actions de ligne en icônes seules, relues par `Tooltip`.** Motif déjà livré par `DeleteTagDialog.tsx` : `Button variant="ghost" size="icon-sm"`, crayon « Modifier » et poubelle « Supprimer », `aria-label` portant le titre du projet. Les cartes mobiles, elles, portent des boutons texte en pied de carte (« Modifier » en `outline`, « Supprimer » en `destructive`), comme la maquette.

**La suppression réutilise la confirmation déjà en place ailleurs.** Même `AlertDialog` que pour les tags et les entreprises : icône `TriangleAlert` seule dans `AlertDialogMedia`, titre « Supprimer « {titre du projet} » ? ». Contrairement aux tags et aux entreprises, aucune contrainte de base ne s'oppose à la suppression d'un projet : sa méta client et ses rattachements de tags partent en cascade, rien n'est récupérable, et le texte de la modale le dit. La confirmation est donc la seule protection, ce qui rend son libellé important. Boutons « Annuler » et « Supprimer le projet ».

**Pagination identique aux autres listes admin**, portée par le `DataTable` : compteur, sélecteur de lignes par page (5/10/25/50/100, 25 par défaut), pager à droite. Elle s'applique aux deux rendus, table et cartes, puisque `renderCard` consomme les mêmes lignes déjà paginées.

**Le chargement de chaque vue passe sous `<Suspense>`.** L'écran lit sans cache, or `cacheComponents: true` refuse une lecture dynamique qui n'est ni cachée ni suspendue. Un sous-composant `async` par route porte la requête, la page garde l'ossature (`AdminPageShell`) et le squelette (`DataTableSkeleton`), comme l'écran des tags.

**Ce sub-project dépend du `07` par la chaîne `12 → 11 → 07`, et du `08` pour la sous-navigation et le sélecteur de colonnes.** Aucun composant shadcn à réinstaller : `select`, `alert-dialog`, `popover`, `checkbox`, `pagination` et `tooltip` sont déjà posés.

**Aucun test.** Filtrer un tableau par vue ou par facette ne vérifie aucune règle métier du projet : c'est du filtrage générique, que la règle no-lib-test exclut. Les Server Actions consommées ici, y compris `reorderProjects`, sont déjà couvertes par le sub-project `11`.

Rules applicables : `.claude/rules/shadcn-ui/components.md`, `.claude/rules/nextjs/routing.md`, `.claude/rules/nextjs/data-fetching.md`, `.claude/rules/nextjs/server-client-components.md`, `.claude/rules/react/hooks.md`, `.claude/rules/tailwind/conventions.md`.

## Acceptance criteria

### Scénario 1 : Tous les statuts visibles
**GIVEN** des projets en brouillon, publiés et archivés
**WHEN** on affiche la vue Tous
**THEN** les trois catégories y figurent
**AND** le statut de chacun est lisible d'un coup d'œil

### Scénario 2 : Bascule entre les trois vues
**GIVEN** la barre latérale, sous-entrées Tous / Clients / Perso de l'item Projets
**WHEN** on clique sur Clients puis sur Perso
**THEN** la liste ne montre que les projets du type correspondant à chaque fois
**AND** le titre, l'accroche et le jeu de colonnes par défaut changent avec la vue

### Scénario 3 : Filtre par statut, dans chaque vue
**GIVEN** une vue affichée
**WHEN** on filtre sur les brouillons
**THEN** seuls les projets en brouillon de cette vue restent affichés
**AND** le nombre de résultats est indiqué

### Scénario 4 : Filtre par type de projet, dans les trois vues
**GIVEN** une vue affichée, Tous, Client ou Perso
**WHEN** on ouvre les filtres
**THEN** un filtre Type de projet (les formats du projet) est disponible en plus du filtre Statut
**AND** aucune vue ne propose de filtre sur la nature Client/Perso, déjà tranchée par la route

### Scénario 5 : Filtres combinés sans résultat
**GIVEN** un filtre de type et un filtre de statut actifs en vue Tous
**WHEN** aucun projet ne satisfait les deux
**THEN** un état vide explicite s'affiche, distinct d'une liste en cours de chargement

### Scénario 6 : Tri
**GIVEN** la liste affichée
**WHEN** on clique sur l'en-tête « Titre » puis à nouveau
**THEN** l'ordre passe en croissant puis en décroissant, et un troisième clic revient à l'ordre d'affichage
**AND** `aria-sort` reflète l'état courant

### Scénario 7 : Recherche, colonnes et pagination
**GIVEN** la liste complète d'une vue
**WHEN** on saisit un terme dans la recherche, puis on décoche une colonne dans le sélecteur
**THEN** seules les lignes correspondantes restent affichées, et la colonne décochée disparaît de la table
**AND** le pied indique le nombre de résultats et permet de changer de page

### Scénario 8 : Cohérence avec les autres listes
**GIVEN** les écrans `/admin/tags`, `/admin/entreprises` et `/admin/projets`
**WHEN** on compare leur recherche, leur tri, leurs colonnes et leur pied
**THEN** les quatre se comportent de la même façon, le composant étant partagé

### Scénario 9 : Glisser-déposer en vue Tous
**GIVEN** la vue Tous, sans tri, recherche ni filtre actif
**WHEN** on dépose un projet sur un autre
**THEN** le déposé prend la position de la cible, l'ordre de l'ensemble des projets est réécrit de 1 à n

### Scénario 10 : Ordre affiché mais non modifiable en vue Client ou Perso
**GIVEN** la vue Client ou la vue Perso
**WHEN** on observe la colonne `#`
**THEN** chaque projet affiche son numéro global, non contigu dans cette vue
**AND** aucune ligne n'est draggable

### Scénario 11 : Suppression confirmée
**GIVEN** un projet dans la liste
**WHEN** on demande sa suppression et qu'on confirme
**THEN** il disparaît de la liste et de la base
**AND** ses tags et son entreprise existent toujours

### Scénario 12 : Suppression annulée
**GIVEN** la confirmation de suppression affichée
**WHEN** on annule
**THEN** rien n'est supprimé

### Scénario 13 : Lecture sur téléphone
**GIVEN** une fenêtre de moins de 768 pixels
**WHEN** on affiche la liste, dans n'importe quelle vue
**THEN** les projets se présentent en cartes empilées, avec des boutons texte pour les actions
**AND** la page ne défile pas horizontalement

### Scénario 14 : Vue détail au clic de ligne
**GIVEN** la liste affichée
**WHEN** on clique sur une ligne ailleurs que sur ses actions
**THEN** une modale montre les champs du projet
**AND** son bouton de modification mène à l'écran d'édition, quand le crayon de la colonne Actions y mène sans passer par elle

## Edge cases

- **Garde par page** : chaque page appelle `await getCurrentUser()` avant tout rendu et vit sous le `loading.tsx` de son propre segment (cf. `.claude/rules/nextjs/auth.md`)
- **Confirmation comme seule protection** : contrairement aux tags et aux entreprises, aucune contrainte de base n'empêche la suppression d'un projet. La méta client et les rattachements partent en cascade, et rien n'est récupérable. Le libellé de la confirmation doit donc nommer le projet, pas se contenter d'un « Êtes-vous sûr ? »
- **État vide et chargement confondus** : une liste filtrée sans résultat ressemble à une liste qui charge. Les deux états doivent être distincts, sinon on croit à une lenteur
- **Projet client sans entreprise affichable** : la méta client peut manquer si une donnée a été créée hors de l'application. L'affichage doit le tolérer sans planter, même si les Server Actions du sub-project `11` rendent ce cas improbable
- **Titre long** : les titres bilingues peuvent être longs. Sans troncature, ils cassent la mise en page de la table sur les écrans intermédiaires
- **Filtres non réinitialisables** : après un filtrage sans résultat, il faut un moyen évident de tout réafficher, faute de quoi la liste paraît vide
- **Numéro non contigu en vue filtrée** : en vue Client ou Perso, la colonne `#` saute des valeurs (l'ordre global inclut l'autre type). Ce n'est pas une anomalie d'affichage, c'est la conséquence directe de l'ordre 1..n global posé par le `11`
- **Colonnes masquées perdues au changement de vue** : changer de vue change aussi le jeu de colonnes par défaut ; un choix de colonnes fait dans une vue ne doit pas survivre silencieusement à la navigation vers une autre, au risque de colonnes vides ou incohérentes avec le contenu de la nouvelle vue
- **Deux routes à créer d'avance pour `typedRoutes`** : le bouton « Nouveau projet » pointe vers `/admin/projets/nouveau` et chaque ligne de la liste vers `/admin/projets/[id]`, deux routes que seul le sub-project `13` construira. Avec la vérification des liens à la compilation, le build échouerait sur l'une comme sur l'autre. Ce sub-project crée donc deux pages d'attente, comme le `06` l'a fait pour les quatre sections. Oublier la route dynamique est le piège le moins visible des deux : elle n'apparaît pas dans un bouton isolé mais dans une colonne d'actions
- **Ordre d'exécution avec le `08`** : le sélecteur de colonnes et la sous-navigation de la sidebar sont portés par le `08`. Si ce sub-project s'exécute en premier, il doit les ajouter lui-même (`DataTable.tsx`, `admin-nav-items.ts`) plutôt que supposer leur présence, faute de quoi la liste des projets n'aurait ni vues ni colonnes masquables

## Architectural decisions

### Décision : où vit le rendu carte mobile

**Options envisagées :**
- **A. `DataTable` gagne une prop `renderCard`** : le composant partagé rend lui-même, à partir de son état interne (recherche, tri, pagination déjà appliqués), soit la table soit les cartes, togglées en CSS.
- **B. Un composant de cartes séparé, à côté du `DataTable`** : `ProjectsTable` recalcule filtrage, tri et pagination une seconde fois pour nourrir ses propres cartes.

**Choix : A**

**Rationale :**
- Le `DataTable` est déjà la seule source de vérité sur ce qui est affiché (recherche, facettes, tri, page courante) : lui faire exposer cet état à un composant externe (option B) serait plus intrusif que lui faire consommer directement une fonction de rendu
- Dupliquer la logique de filtrage/tri/pagination dans un second composant ferait diverger les deux rendus au premier changement de l'un des deux, exactement l'inverse de l'objectif « les trois écrans de liste doivent se ressembler »
- L'option A garde `ProjectsTable` simple : il décrit ses colonnes et sa fonction `renderCard`, il ne réimplémente rien
- La prop reste optionnelle : les écrans qui n'en ont pas besoin (`07`) ne changent pas de comportement
