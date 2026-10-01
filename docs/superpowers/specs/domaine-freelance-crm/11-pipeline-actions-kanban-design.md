---
feature: "Feature 2 — Domaine freelance CRM"
subproject: "pipeline-actions-kanban"
goal: "Voir les actions de prospection en colonnes de statut et changer le statut d'une action en glissant sa carte, avec le Kanban ReUI."
status: "draft"
complexity: "M"
tdd_scope: "partial"
depends_on: ["09-actions-prospection-donnees-design.md", "10-ecran-actions-prospection-design.md", "07-leads-donnees-design.md"]
date: "2026-09-29"
---

# Pipeline des actions de prospection

## Scope

Installe le Kanban ReUI (registre `@reui`, dépendance `dnd-kit`) et crée la vue Pipeline des actions : une colonne par statut, une carte par action, filtre de période, clic vers la vue détail, glisser une carte d'une colonne à l'autre pour changer son statut sous les règles du `09`. Exclut le calendrier (`12`), tout ordre manuel des cartes dans une colonne et le déplacement des colonnes.

### État livré

À la fin de ce sub-project, on peut : ouvrir Actions prospection > Pipeline, glisser une carte de À faire vers Fait et la voir prendre l'heure du lâcher, la retrouver dans la vue Connexions ou Discussions selon son canal, et cliquer une carte pour ouvrir sa vue détail puis sa modification.

## Dependencies

- `09-actions-prospection-donnees-design.md` (statut: draft) : `ActionStatus`, `changeProspectingActionStatus`, lecture des actions
- `10-ecran-actions-prospection-design.md` (statut: draft) : écran des actions (formulaire, vue détail, menu) étendu ici
- `07-leads-donnees-design.md` (statut: draft) : `findPersonOptions()`, `PersonOption`, `personDisplayName` (`@/lib/persons`)

## Références de design

- **Maquette** : `isActions` (mode Kanban, `actBoardColumns`), `dlgDetail`
- **Design system** : `post-mvp/kanban/Kanban`, `core/Card`, `core/Badge`, `core/Select`, `patterns/DetailDialog`, `patterns/EmptyState`
- Règle de lecture : `.claude/rules/design/claude-design.md`

## Files touched

- **À modifier** : `components.json` (registre `@reui`)
- **À créer** : `src/components/reui/kanban.tsx` (copié par la CLI)
- **À modifier** : `package.json` et `pnpm-lock.yaml` (`@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`)
- **À modifier** : `docs/VERSIONS.md` (section `dnd-kit`, skill `versions-doc`)
- **À modifier** : `docs/DESIGN.md` (ligne Kanban de § Post-MVP déplacée dans sa famille, skill `design-doc`)
- **À créer** : `src/lib/action-board.ts` et `src/lib/action-board.test.ts` (colonnes du tableau, période, lecture d'un déplacement)
- **À créer** : `src/components/features/admin/prospection/ActionsBoard.tsx`
- **À créer** : `src/components/features/admin/prospection/action-detail.tsx` (vue détail d'une action, partagée avec la liste)
- **À créer** : `src/app/admin/(protected)/actions-prospection/pipeline/page.tsx` et `loading.tsx`
- **À modifier** : `src/components/features/admin/prospection/ProspectingActionsTable.tsx` (vue détail lue depuis `action-detail.tsx`)
- **À modifier** : `src/components/features/admin/prospection/ProspectingActionFormDialog.tsx` (mode contrôlé, sans bouton déclencheur, pour l'ouvrir depuis une carte)
- **À modifier** : `src/components/features/admin/prospection/ActionsViewPage.tsx` (bouton « Nouvelle action » de l'en-tête, partagé avec le Pipeline)
- **À modifier** : `src/config/admin-nav-items.ts` (sous-entrée Pipeline)

## Architecture approach

- **Installation** (`.claude/rules/shadcn-ui/setup.md`) : registre `"@reui": "https://reui.io/r/{style}/{name}.json"` dans `components.json` (documentation ReUI : `{style}` accepte `radix-nova`, le style du projet), puis `pnpm dlx shadcn@latest add @reui/kanban`, qui copie `src/components/reui/kanban.tsx` et ajoute `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` ; corrections après `add` de la rule (import `cn` réécrit, paquet npm `cn` retiré) ; `docs/VERSIONS.md` gagne la section `dnd-kit`, `docs/DESIGN.md` range la ligne Kanban dans sa famille
- **Colonnes** (`src/lib/action-board.ts`, fonctions pures) : une colonne par statut dans l'ordre À faire, Fait, Répondu, Converti, Ignoré, titrée par son libellé et son nombre ; dans chaque colonne, les actions de la plus récente à la plus ancienne (tri Notion « Date desc »). Les colonnes ne se déplacent pas (aucune poignée de colonne rendue)
- **Carte** (fiche `post-mvp/kanban/Kanban` : le composant est headless, la carte se compose en `Card`) : titre de l'action, personne (`personDisplayName`, `07`) et date avec l'heure sur une ligne en `text-xs` muted, badge du canal ; clic sur la carte (un appui qui ne se déplace pas) : vue détail
- **Glisser** : `onValueChange` réordonne l'affichage pendant le geste ; `onValueCommit` (une fois, au lâcher) lit le déplacement dans ses métadonnées. Un déplacement d'une colonne à une autre appelle `changeProspectingActionStatus(id, statut de la colonne d'arrivée)` (`09`), dont les règles posent l'heure d'envoi ou la date de réponse. En cas d'échec, le tableau revient à l'état d'avant le geste et un toast le signale ; un déplacement dans la même colonne n'enregistre rien, l'ordre restant celui des dates au prochain affichage
- **État local** : le tableau part des actions reçues du serveur et s'y réaligne à chaque nouvelle lecture (après la revalidation de l'action), en ajustant l'état pendant le rendu plutôt que par un effet
- **Filtre** : Période (« Toute la période », « 7 jours », « 30 jours », autour d'aujourd'hui, comme la vue liste du `10`), par un `Select` au-dessus du tableau
- **Vue détail et modification** : la vue détail d'une action est extraite de `ProspectingActionsTable` dans `action-detail.tsx` et partagée ; « Modifier » ouvre `ProspectingActionFormDialog` en mode contrôlé
- **Page** : `/admin/actions-prospection/pipeline`, titre « Pipeline de prospection » et sous-titre de la maquette, bouton « Nouvelle action » en en-tête comme les vues liste ; lit les actions et les options de personne (`findPersonOptions`, `07`) comme la liste ; au téléphone, le tableau défile horizontalement
- **Menu** : sous-entrée « Pipeline » entre Candidatures et Journal, ordre de la maquette
- **Rules** : `.claude/rules/shadcn-ui/setup.md`, `.claude/rules/shadcn-ui/components.md`, `.claude/rules/nextjs/routing.md`, `.claude/rules/nextjs/data-fetching.md`, `.claude/rules/nextjs/server-client-components.md`, `.claude/rules/nextjs/auth.md`, `.claude/rules/react/hooks.md`, `.claude/rules/design/claude-design.md`, `.claude/rules/vitest/setup.md`

## Acceptance criteria

### Scénario 1 : tableau
**GIVEN** des actions à tous les statuts
**WHEN** on ouvre Actions prospection > Pipeline
**THEN** cinq colonnes À faire, Fait, Répondu, Converti, Ignoré affichent leur nombre et leurs cartes, les plus récentes en haut

### Scénario 2 : glisser
**GIVEN** une action À faire planifiée hier
**WHEN** on glisse sa carte dans Fait
**THEN** son statut devient Fait et sa date l'heure du lâcher ; elle apparaît dans la vue liste correspondant à son canal

### Scénario 3 : échec
**GIVEN** une action que le serveur ne peut pas mettre à jour (supprimée entre-temps)
**WHEN** on la glisse dans une autre colonne
**THEN** la carte revient à sa place et un message d'erreur s'affiche

### Scénario 4 : clic
**GIVEN** le tableau
**WHEN** on clique une carte sans la déplacer
**THEN** sa vue détail s'ouvre, et « Modifier » ouvre son formulaire

### Scénario 5 : période
**GIVEN** des actions datées d'hier et d'il y a deux mois
**WHEN** on choisit « 30 jours »
**THEN** seule celle d'hier reste sur le tableau

## Tests à écrire

### Unit
- `src/lib/action-board.test.ts` :
  - puts every status in its own column, in the pipeline order
  - sorts each column from the most recent action
  - keeps actions within the period around today
  - reads a move to another column as a status change
  - ignores a move within the same column

## Edge cases

- **Colonne vide** : elle reste affichée, avec sa zone de dépôt
- **Glisser pendant une mise à jour précédente** : chaque lâcher part avec son propre appel, le tableau se réaligne sur la dernière lecture du serveur
- **Carte d'une personne opposée** : visible et déplaçable, son historique étant gardé (`01`, `09`)

## Architectural decisions

### Décision : quand enregistrer le changement de statut

**Options envisagées :**
- **A. À chaque changement d'état** (`onValueChange`) : appelé tout au long du geste, il enverrait une écriture par colonne survolée
- **B. Au lâcher** (`onValueCommit`) : une seule écriture, avec l'état d'avant le geste pour revenir en arrière

**Choix : B**

**Rationale :**
- Fiche design system du Kanban : « the single commit point is onMove, which fires once, on drop (onValueCommit if you want the whole board rather than the one move) »
- `onValueCommit` fournit `previousValue`, ce qui rend le retour arrière trivial en cas d'échec
