# Écran de liste des projets — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Afficher tous les projets, brouillons compris, dans trois vues choisies depuis la barre latérale (Tous, Client, Perso), avec colonnes masquables, filtres facettés, tri, pagination, glisser-déposer en vue Tous, et suppression confirmée.

**Architecture:** Trois routes fines, une par vue, chargent `findAllProjectsForAdmin()` côté serveur et délèguent à un composant client unique, `ProjectsTable`, qui décrit ses colonnes et son rendu carte et délègue au `DataTable` partagé (recherche, colonnes, facettes, tri, pagination, glisser-déposer). Le `DataTable` gagne une prop `renderCard` pour le rendu mobile, consommant les mêmes lignes déjà filtrées/triées/paginées que la table.

**Tech Stack:** Next.js 16 App Router, shadcn/ui, Tailwind 4.

**Spec:** `docs/superpowers/specs/espace-admin/12-ecran-liste-projets-design.md`

## Global Constraints

- La liste **ignore le statut** : brouillons et archivés doivent apparaître, contrairement au site public.
- **Trois vues, trois routes** : `/admin/projets` (Tous), `/admin/projets/client`, `/admin/projets/perso`. Chacune filtre les projets par type avant de les passer à `ProjectsTable`, sauf Tous qui les passe tous.
- **Le glisser-déposer n'est câblé qu'en vue Tous**, via `reorderProjects` du sub-project `11`. Les vues Client et Perso n'y passent pas de prop `onReorder` : leurs lignes affichent le numéro d'ordre global sans être draggables.
- **Le filtre facetté Type de projet n'apparaît qu'en vue Tous** : les vues Client et Perso sont déjà restreintes par leur route, un filtre qui répéterait ce choix serait trompeur.
- **Deux rendus, pas une table compressée** : cartes sous `md:`, table au-delà, portés par une prop `renderCard` du `DataTable` (Task 2), à partir des mêmes lignes déjà filtrées/triées/paginées. Aucune logique de filtrage/tri/pagination dupliquée à côté.
- Filtrage, tri **et pagination côté client**, sur les données déjà chargées, entièrement portés par le `DataTable` (recherche, facettes, colonnes masquables, pied paginé 5/10/25/50/100 à 25 par défaut).
- **Aucune librairie de table** : le tri et le filtrage sont un pattern à écrire, comme le note `docs/DESIGN.md`.
- Le sélecteur de colonnes affichées vient du `08` : ce sub-project le consomme. S'il n'est pas encore présent dans `DataTable.tsx` au moment de l'implémentation (`08` non exécuté avant), ce sub-project l'ajoute lui-même, sur le modèle du Popover Filtres déjà câblé.
- Les actions de ligne desktop sont des boutons icône seule (`variant="ghost" size="icon-sm"`) relus par `Tooltip`, motif de `DeleteTagDialog.tsx`. Les cartes mobiles portent des boutons texte (« Modifier » `outline`, « Supprimer » `destructive`).
- La confirmation de suppression **nomme le projet** (titre, pas slug) et reprend le texte de la maquette (`dlgDeleteProject`) : « Le projet, sa méta client et ses rattachements de tags partent en cascade. Rien n'est récupérable. Les tags et l'entreprise, eux, restent en base. » Boutons « Annuler » et « Supprimer le projet ».
- **Aucun test** : filtrer un tableau par vue ou par facette ne vérifie aucune règle métier du projet. `reorderProjects` est déjà couverte par le sub-project `11`.
- `src/app/admin/(protected)/projets/page.tsx` existe comme page d'attente : la **remplacer** par la vue Tous.
- **Deux pages d'attente sont à créer avant d'écrire le moindre lien** : `/admin/projets/nouveau` et `/admin/projets/[id]`. Avec `typedRoutes: true`, un lien vers une route inexistante fait **échouer la compilation**, il ne produit pas une 404. La route dynamique est la plus facile à oublier : elle n'est pas dans un bouton visible mais dans la colonne d'actions de la liste.
- Les sous-entrées de sidebar Tous / Clients / Perso s'ajoutent dans la forme que le `08` introduit pour `src/config/admin-nav-items.ts` et `AdminSidebar.tsx`. Si le `08` n'est pas encore passé, vérifier la forme réelle du fichier avant d'y greffer les trois entrées plutôt que de supposer une structure.
- Aucun commit intermédiaire. Le périmètre du commit final est validé par l'utilisateur.

**Rules :** `.claude/rules/shadcn-ui/components.md`, `.claude/rules/nextjs/routing.md`, `.claude/rules/nextjs/data-fetching.md`, `.claude/rules/nextjs/server-client-components.md`, `.claude/rules/react/hooks.md`, `.claude/rules/tailwind/conventions.md`.

---

### Task 1 : Pages d'attente, sous-navigation et libellés

**Files:**
- Create: `src/app/admin/(protected)/projets/nouveau/page.tsx`
- Create: `src/app/admin/(protected)/projets/[id]/page.tsx`
- Modify: `src/config/admin-nav-items.ts`
- Create: `src/lib/projects.ts`

**Interfaces:**
- Consomme : les enums de `src/lib/schemas/project.ts`.
- Produit : les deux routes d'attente, les sous-entrées de sidebar Tous/Clients/Perso, et les libellés `PROJECT_TYPE_LABELS`, `PROJECT_STATUS_LABELS`, `PROJECT_FORMAT_LABELS`, `CONTRACT_STATUS_LABELS`, `formatProjectDuration`, consommés par la Task 4 et, pour les quatre premiers, par le formulaire du sub-project `13`.

- [ ] **Step 1: Créer les deux pages d'attente**

Elles viennent **avant** tout le reste : la table de la Task 4 porte un lien par ligne vers `/admin/projets/[id]` et les pages de la Task 5 un bouton vers `/admin/projets/nouveau`. Avec `typedRoutes: true`, écrire l'un ou l'autre sans que la route existe fait échouer le `typecheck`, pas produire une 404.

```typescript
// src/app/admin/(protected)/projets/nouveau/page.tsx
import { AdminPageShell } from '@/components/layout/AdminPageShell'

export default function AdminNouveauProjetPage() {
  return (
    <AdminPageShell title="Nouveau projet" subtitle="Formulaire à construire." />
  )
}
```

```typescript
// src/app/admin/(protected)/projets/[id]/page.tsx
import { AdminPageShell } from '@/components/layout/AdminPageShell'

export default function AdminEditProjetPage() {
  return (
    <AdminPageShell title="Projet" subtitle="Formulaire à construire." />
  )
}
```

`AdminPageShell` (`src/components/layout/AdminPageShell.tsx`), déjà en place depuis l'écran des tags, porte le `h1` en `font-sans` et le conteneur `w-full py-6 lg:py-8` : rien à recomposer à la main ici.

Le sub-project `13` **remplace** ces deux fichiers, il n'en crée pas de seconds à côté. La page d'édition ne lit pas encore ses `params` : elle n'a rien à afficher, et le sub-project `13` écrira la signature complète.

- [ ] **Step 2: Ajouter les sous-entrées de sidebar**

Vérifier d'abord la forme de `src/config/admin-nav-items.ts` telle que le `08` l'a laissée : `ADMIN_NAV_GROUPS` (groupes `AdminNavGroup`), chaque entrée `AdminNavItem` portant un `href` si elle ouvre un écran (sinon rendue par `AdminNavDisabledItem`) et un `subItems?: readonly AdminNavSubItem[]` optionnel, chaque `AdminNavSubItem` portant `label` et `href?`. Y ajouter, sous l'entrée Projets, trois sous-entrées :

| Libellé | Route |
|---|---|
| Tous | `/admin/projets` |
| Clients | `/admin/projets/client` |
| Perso | `/admin/projets/perso` |

Si le `08` n'est pas encore passé et que `admin-nav-items.ts` est toujours la liste plate antérieure à sa refonte, ajouter le champ minimal nécessaire (un tableau `subItems` sur l'item Projets, avec les mêmes noms de type `AdminNavSubItem`) plutôt que d'anticiper toute la refonte en groupes du `08`, hors périmètre de ce sub-project.

- [ ] **Step 3: Écrire les libellés d'affichage**

```typescript
import type { ContractStatus, ProjectFormat, ProjectStatus, ProjectType } from '@/generated/prisma/client'

export const PROJECT_TYPE_LABELS: Record<ProjectType, string> = {
  CLIENT: 'Client',
  PERSONAL: 'Perso',
}

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  DRAFT: 'Brouillon',
  PUBLISHED: 'Publié',
  ARCHIVED: 'Archivé',
}

// Libellés actuels conservés : CLI reste "CLI", IA reste "IA" (décision propriétaire, la maquette
// montrant "Automatisation" et "Data / IA" sans que le schéma Prisma n'ait changé).
export const PROJECT_FORMAT_LABELS: Record<ProjectFormat, string> = {
  API: 'API',
  WEB_APP: 'Web App',
  MOBILE_APP: 'App Mobile',
  DESKTOP_APP: 'Desktop App',
  CLI: 'CLI',
  IA: 'IA',
}

// L'énumération fait foi, "Stage" reste (décision propriétaire, la maquette montrant "CDD").
export const CONTRACT_STATUS_LABELS: Record<ContractStatus, string> = {
  FREELANCE: 'Freelance',
  CDI: 'CDI',
  STAGE: 'Stage',
  ALTERNANCE: 'Alternance',
}

// Pas de date-fns/dayjs au projet : arithmétique manuelle, suffisante pour un affichage "X mois" / "X ans".
export function formatProjectDuration(startedAt: Date | null, endedAt: Date | null): string | null {
  if (!startedAt) return null
  const end = endedAt ?? new Date()
  const totalMonths =
    (end.getFullYear() - startedAt.getFullYear()) * 12 + (end.getMonth() - startedAt.getMonth())
  const months = Math.max(0, totalMonths)

  if (months < 12) return months <= 1 ? '1 mois' : `${months} mois`
  const years = Math.floor(months / 12)
  const remainder = months % 12
  const yearsLabel = years === 1 ? '1 an' : `${years} ans`
  return remainder === 0 ? yearsLabel : `${yearsLabel} ${remainder} mois`
}
```

- [ ] **Step 4: Vérifier typage et lint**

```bash
just typecheck && just lint
```

Expected: aucune erreur.

---

### Task 2 : `DataTable`, rendu carte mobile

**Files:**
- Modify: `src/components/features/admin/DataTable.tsx`

**Interfaces:**
- Consomme : rien de nouveau.
- Produit : une prop optionnelle `renderCard`, consommée par `ProjectsTable` (Task 4).

> **Vérifier avant de commencer** si le sélecteur de colonnes (Popover « Colonnes ») est déjà présent dans ce fichier, ajouté par le `08`. S'il manque, l'ajouter dans cette même tâche en reprenant le motif du Popover Filtres déjà câblé (bouton `outline` icône `columns-3` + badge de compteur, une `Checkbox` par colonne masquable, pied Réinitialiser/Appliquer), avant d'y greffer `renderCard` : les deux ajouts sont indépendants mais touchent le même fichier.

- [ ] **Step 1: Ajouter la prop et le rendu**

```typescript
interface Props<T, K extends string = string> {
  // ...props existantes...
  renderCard?: (row: T) => ReactNode
}
```

Remplacer le bloc qui rend la seule `<Card>` de table par deux blocs togglés en CSS, tous deux issus des **mêmes** `paginatedRows` déjà calculés :

```tsx
<div className={renderCard ? 'hidden md:block' : undefined}>
  <Card className="gap-0 py-0">
    <div className="overflow-x-auto">
      <Table className="min-w-[720px] table-fixed">{/* inchangé */}</Table>
    </div>
  </Card>
</div>

{renderCard ? (
  <div className="grid gap-3 md:hidden">
    {facetFilteredRows.length === 0 ? (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Aucun résultat pour cette recherche.
      </p>
    ) : (
      paginatedRows.map((row) => <div key={getRowId(row)}>{renderCard(row)}</div>)
    )}
  </div>
) : null}
```

Les deux structures restent dans le DOM, Tailwind en masque une : pas de bascule en JavaScript, donc pas de décalage au premier rendu (hydratation comprise). `renderCard` optionnelle : les écrans qui ne la passent pas (`07`) gardent leur comportement actuel, table seule à toutes les largeurs.

**Le message « Aucun résultat pour cette recherche » doit apparaître dans les deux rendus.** Il vit aujourd'hui dans une ligne de la `<Table>`, donc invisible sous `md:` une fois la table masquée : le bloc carte le répète.

- [ ] **Step 2: Vérifier typage et lint**

```bash
just typecheck && just lint
```

Expected: aucune erreur. Vérifier aussi que `TagsTable` (qui ne passe pas `renderCard`) compile et se comporte à l'identique.

---

### Task 3 : Confirmation de suppression

**Files:**
- Create: `src/components/features/admin/projects/DeleteProjectDialog.tsx`

**Interfaces:**
- Consomme : `deleteProject` du sub-project `11`.
- Produit : `<DeleteProjectDialog project={{ id: string; titleFr: string }} />`, monté par `ProjectsTable` (Task 4).

- [ ] **Step 1: Écrire la modale**

Même structure que `src/components/features/admin/tags/DeleteTagDialog.tsx` : `Tooltip` + `AlertDialogTrigger` sur un `Button variant="ghost" size="icon-sm"`, `AlertDialogMedia` avec `TriangleAlert` seul en `text-destructive`, titre « Supprimer « {project.titleFr} » ? ».

Contrairement aux tags, aucune contrainte de base ne s'oppose à la suppression d'un projet : pas de refus à afficher dès l'ouverture, la description est fixe.

```tsx
<AlertDialogDescription>
  Le projet, sa méta client et ses rattachements de tags partent en cascade. Rien n'est
  récupérable. Les tags et l'entreprise, eux, restent en base.
</AlertDialogDescription>
```

```tsx
<AlertDialogFooter>
  <AlertDialogCancel>Annuler</AlertDialogCancel>
  <AlertDialogAction variant="destructive" disabled={pending} onClick={handleConfirm}>
    {pending ? 'Suppression...' : 'Supprimer le projet'}
  </AlertDialogAction>
</AlertDialogFooter>
```

`handleConfirm` appelle `deleteProject(project.id)`, ferme la modale sur succès avec un `toast.success('Projet supprimé')`, et affiche un `toast.error` sur `unknown_error`, comme `DeleteTagDialog`.

- [ ] **Step 2: Vérifier typage et lint**

```bash
just typecheck && just lint
```

Expected: aucune erreur.

---

### Task 4 : `ProjectsTable`, colonnes, filtres, glisser-déposer, deux rendus

**Files:**
- Create: `src/components/features/admin/projects/ProjectsTable.tsx`

**Interfaces:**
- Consomme : `DataTable` (Task 2), `DeleteProjectDialog` (Task 3), les libellés de `src/lib/projects.ts` (Task 1), `reorderProjects` du sub-project `11`, le type `AdminProjectListItem` du sub-project `11`.
- Produit : `<ProjectsTable projects={AdminProjectListItem[]} view="tous" | "client" | "perso" />`, monté par les trois pages de la Task 5.

- [ ] **Step 1: Filtrer par vue et déclarer les colonnes**

```typescript
export type ProjectView = 'tous' | 'client' | 'perso'

const VIEW_TYPE: Record<ProjectView, ProjectType | null> = {
  tous: null,
  client: 'CLIENT',
  perso: 'PERSONAL',
}

const DEFAULT_VISIBLE_COLUMNS: Record<ProjectView, readonly string[]> = {
  tous: ['nature', 'formats', 'entreprise', 'debut', 'duree', 'statut'],
  client: ['nature', 'formats', 'entreprise', 'debut', 'duree', 'statut'],
  perso: ['formats', 'debut', 'fin', 'liens', 'statut'],
}
```

`VIEW_TYPE` filtre `projects` avant de les passer au `DataTable` : `view !== 'tous' ? projects.filter((p) => p.type === VIEW_TYPE[view]) : projects`. `DEFAULT_VISIBLE_COLUMNS` alimente le jeu de colonnes visibles par défaut que le sélecteur du `08` accepte (Titre et `#` en sont absents : ils ne sont jamais masquables).

Colonnes déclarées, chacune avec un flag « masquable » sauf Titre :

| key | header | masquable | sortable | contenu |
|---|---|---|---|---|
| `titre` | Titre | non | oui | `titleFr` tronqué, slug en dessous en `text-muted-foreground` |
| `nature` | Nature | oui | non | `Badge variant="outline" meta"` via `PROJECT_TYPE_LABELS` |
| `formats` | Type de projet | oui | non | `formats.map(...)` en `Badge variant="secondary"`, capés à 2 + `Tooltip` « +N » |
| `entreprise` | Entreprise | oui | non | mini logo 16px + `clientMeta.company.name`, ou tiret |
| `contrat` | Statut contrat | oui | non | `CONTRACT_STATUS_LABELS`, texte muted |
| `debut` | Date début | oui | oui | `startedAt` formatée, ou tiret |
| `fin` | Date fin | oui | oui | `endedAt` formatée, ou tiret |
| `duree` | Durée | oui | non | `formatProjectDuration(startedAt, endedAt)` |
| `equipe` | Équipe | oui | non | `clientMeta.teamSize`, `text-right font-mono tabular-nums` |
| `liens` | Liens | oui | non | `[githubUrl && 'GitHub', demoUrl && 'Démo'].filter(Boolean).join(' · ')` ou tiret |
| `statut` | Statut | oui | non | pastille + `PROJECT_STATUS_LABELS` |
| `actions` | Actions | non | non | lien d'édition (icône crayon) + `DeleteProjectDialog` |

Seules `titre`, `debut` et `fin` portent un `sortValue`, comme la maquette : les autres colonnes n'ont pas de tri.

- [ ] **Step 2: Déclarer les facettes**

```typescript
const facets = [
  {
    key: 'statut',
    label: 'Statut',
    options: PROJECT_STATUSES.map((status) => ({ value: status, label: PROJECT_STATUS_LABELS[status] })),
    value: (project) => project.status,
  },
  ...(view === 'tous'
    ? [
        {
          key: 'type',
          label: 'Type de projet',
          options: PROJECT_TYPES.map((type) => ({ value: type, label: PROJECT_TYPE_LABELS[type] })),
          value: (project) => project.type,
        },
      ]
    : []),
]
```

Le facet Type ne s'ajoute qu'en vue Tous, conditionnellement : les vues Client et Perso ne le déclarent pas, cf. Global Constraints.

- [ ] **Step 3: Câbler le glisser-déposer, seulement en vue Tous**

```typescript
async function handleReorder(orderedIds: string[]): Promise<boolean> {
  const result = await reorderProjects(orderedIds)
  if (result.ok) return true

  toast.error(
    result.message === 'stale_order'
      ? 'La liste a changé entre-temps. Rechargez la page.'
      : "Le nouvel ordre n'a pas pu être enregistré.",
  )
  return false
}
```

```tsx
<DataTable
  rows={filteredProjects}
  columns={columns}
  getRowId={(project) => project.id}
  orderValue={(project) => project.displayOrder}
  facets={facets}
  onReorder={view === 'tous' ? handleReorder : undefined}
  renderCard={(project) => <ProjectCard project={project} />}
  searchPlaceholder="Rechercher un titre ou un slug"
  countLabel={(count) => (count === 1 ? '1 projet' : `${count} projets`)}
  empty={
    <div className="flex flex-col items-center gap-2 py-8 text-center">
      <Folder aria-hidden className="size-8 text-muted-foreground" />
      <p className="text-sm text-muted-foreground">Aucun projet ne correspond à ces filtres.</p>
    </div>
  }
/>
```

`onReorder` n'est passé qu'en vue Tous : sans lui, `DataTable` ne rend aucune ligne draggable (`draggable = isOrderView && !!onReorder`, `src/components/features/admin/DataTable.tsx`), rien d'autre à faire pour désactiver le glisser-déposer en Client et Perso. La colonne `#`, elle, reste rendue nativement par `DataTable` dans les trois vues : le numéro affiché est `project.displayOrder`, la position globale, non contiguë en vue filtrée.

`DataTable` n'a pas de prop `groupBy` ici : contrairement aux tags, l'écran des projets n'a pas de ligne de groupe (cf. spec § Architecture approach, maquette sans groupes sur cet écran).

- [ ] **Step 4: Écrire la carte mobile**

`ProjectCard`, composant interne, reprend les mêmes informations que la table (nature, statut, entreprise, années) sous une `Card data-size="sm"`, avec en pied deux boutons texte : « Modifier » (`outline`, lien vers `/admin/projets/[id]`) et `DeleteProjectDialog` en variante bouton texte plutôt qu'icône.

Trois points à ne pas manquer :
- **tronquer le titre** : les titres bilingues sont longs et cassent la mise en page sur les écrans intermédiaires
- **tolérer une méta client absente** : afficher un tiret plutôt que planter. Les Server Actions du sub-project `11` rendent le cas improbable, pas impossible
- **actions de ligne desktop en icône + `Tooltip`** (`Button variant="ghost" size="icon-sm"`), motif de `DeleteTagDialog.tsx` : pas de texte visible dans la colonne Actions de la table, contrairement à la carte mobile

- [ ] **Step 5: Vérifier typage et lint**

```bash
just typecheck && just lint
```

Expected: aucune erreur.

---

### Task 5 : Trois pages de liste

**Files:**
- Modify: `src/app/admin/(protected)/projets/page.tsx`
- Create: `src/app/admin/(protected)/projets/client/page.tsx`
- Create: `src/app/admin/(protected)/projets/perso/page.tsx`

**Interfaces:**
- Consomme : `findAllProjectsForAdmin` (sub-project `11`), `<ProjectsTable />` (Task 4), les deux routes d'attente de la Task 1.
- Produit : les écrans `/admin/projets`, `/admin/projets/client` et `/admin/projets/perso`.

- [ ] **Step 1: Écrire la vue Tous**

```typescript
import { Suspense } from 'react'
import Link from 'next/link'
import { Plus } from 'lucide-react'

import { AdminPageShell } from '@/components/layout/AdminPageShell'
import { DataTableSkeleton } from '@/components/features/admin/DataTableSkeleton'
import { ProjectsTable } from '@/components/features/admin/projects/ProjectsTable'
import { Button } from '@/components/ui/button'
import { getCurrentUser } from '@/lib/get-current-user'
import { findAllProjectsForAdmin } from '@/server/queries/projects'

async function ProjectsList() {
  const projects = await findAllProjectsForAdmin()
  return <ProjectsTable projects={projects} view="tous" />
}

export default async function AdminProjetsPage() {
  // Next rend la page en parallèle de son layout : sans cette garde, son payload RSC part au
  // client même quand celle du layout lève unauthorized().
  await getCurrentUser()

  return (
    <AdminPageShell
      title="Tous les projets"
      subtitle="Projets clients et personnels, dans l'ordre de la page publique. Glissez une ligne pour le changer."
      actions={
        <Button asChild>
          <Link href="/admin/projets/nouveau">
            <Plus aria-hidden data-icon="inline-start" />
            Nouveau projet
          </Link>
        </Button>
      }
    >
      <Suspense fallback={<DataTableSkeleton />}>
        <ProjectsList />
      </Suspense>
    </AdminPageShell>
  )
}
```

**Le chargement passe sous `<Suspense>`.** Avec `cacheComponents: true`, une lecture dynamique qui n'est ni cachée ni suspendue lève `"Uncached data was accessed outside of <Suspense>"` et fait échouer le build. `DataTableSkeleton` est le même fallback que l'écran des tags : pas de squelette dédié à écrire.

- [ ] **Step 2: Écrire les vues Client et Perso**

Même structure, `view="client"` / `view="perso"`, titre et accroche propres à chacune :

```typescript
// src/app/admin/(protected)/projets/client/page.tsx
// ...mêmes imports, ProjectsList identique à un `view` près...
<AdminPageShell
  title="Projets clients"
  subtitle="Missions réalisées pour un client, avec leur entreprise et leur mode de travail."
  actions={/* identique */}
>
```

```typescript
// src/app/admin/(protected)/projets/perso/page.tsx
<AdminPageShell
  title="Projets perso"
  subtitle="Projets personnels, sans méta client."
  actions={/* identique */}
>
```

Les trois pages partagent le même bouton « Nouveau projet » vers `/admin/projets/nouveau`, créée en page d'attente à la Task 1. `ProjectsTable` pointe de son côté vers `/admin/projets/[id]`, créée au même endroit. Les deux routes existent donc déjà quand ces liens s'écrivent.

- [ ] **Step 3: Vérifier que tout compile**

```bash
just typecheck && just lint && just build
```

Expected: aucune erreur. Un échec sur un `href` signalerait qu'une des deux pages d'attente de la Task 1 manque.

---

### Task 6 : Vérifier

**Files:** aucun fichier du dépôt.

- [ ] **Step 1: Vérifier la présence de tous les statuts**

Passer un projet du seed en `DRAFT` et un autre en `ARCHIVED` directement en base, puis afficher la vue Tous.

```sql
UPDATE "Project" SET status = 'DRAFT' WHERE slug = '<slug1>';
UPDATE "Project" SET status = 'ARCHIVED' WHERE slug = '<slug2>';
```

Expected: les deux apparaissent, avec un statut lisible. Leur absence signalerait qu'on a réutilisé la requête publique, qui filtre sur `PUBLISHED`.

- [ ] **Step 2: Vérifier les trois vues**

Naviguer Tous → Clients → Perso depuis la sidebar.

Expected: le titre, l'accroche et le jeu de colonnes par défaut changent à chaque fois ; Clients ne montre que des projets `CLIENT`, Perso que des `PERSONAL`.

- [ ] **Step 3: Vérifier les colonnes et les filtres**

Masquer puis réafficher une colonne via le sélecteur. Filtrer par statut en vue Perso, puis vérifier que le filtre Type de projet n'apparaît qu'en vue Tous.

Expected: la colonne masquée disparaît de la table, le nombre de résultats suit le filtre, une combinaison sans résultat affiche un message explicite avec un moyen de réinitialiser.

- [ ] **Step 4: Vérifier le tri**

Trier par titre puis par date de début, en vue Tous.

Expected: l'ordre change, et le critère actif est visible via `aria-sort`. Un troisième clic sur le même en-tête revient à l'ordre d'affichage.

- [ ] **Step 5: Vérifier le glisser-déposer**

En vue Tous, sans filtre ni tri actif, glisser un projet sur un autre. Refaire la même manipulation en vue Client.

Expected: en vue Tous, l'ordre se réécrit et persiste après rechargement ; en vue Client, aucune ligne n'est draggable, le numéro `#` reste visible mais non contigu.

- [ ] **Step 6: Vérifier le rendu mobile**

Réduire la fenêtre sous 768 pixels, dans chaque vue.

Expected: cartes empilées avec boutons texte, et **aucun défilement horizontal**. C'est le défaut le plus courant d'une liste et il est invisible sur écran large.

- [ ] **Step 7: Vérifier un titre long**

Modifier temporairement un titre pour qu'il fasse une centaine de caractères.

Expected: il est tronqué, la mise en page tient sur toutes les largeurs, table et cartes.

- [ ] **Step 8: Vérifier la suppression**

Supprimer un projet client de test, après avoir noté ses tags et son entreprise.

```sql
SELECT count(*) FROM "Tag";
SELECT count(*) FROM "Company";
```

Expected: le projet disparaît, mais les compteurs de tags et d'entreprises sont inchangés. Leurs relations portent `Restrict`, seules la méta et les rattachements partent en cascade.

- [ ] **Step 9: Vérifier l'annulation**

Ouvrir la confirmation puis annuler.

Expected: rien n'est supprimé, et le libellé nommait bien le titre du projet.

- [ ] **Step 10: Restaurer les statuts modifiés**

```bash
just db-reset
```

- [ ] **Step 11: Lancer la suite**

```bash
just test
```

Expected: tous les tests verts. Ce sub-project n'en ajoute aucun côté projets ; vérifier que `TagsTable` (Task 2, `DataTable` modifié) se comporte toujours à l'identique.

- [ ] **Step 12: Demander la validation avant commit**

Ne pas committer sans accord explicite de l'utilisateur sur le périmètre et le message. Message proposé :

```
feat(admin): écran de liste des projets, vues Tous/Client/Perso
```
