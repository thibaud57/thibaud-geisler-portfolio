# Écran de liste des projets — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Afficher tous les projets, brouillons compris, avec filtres, tri et suppression confirmée.

**Architecture:** Un Server Component charge la liste complète et la passe à un composant client qui filtre et trie en mémoire. Le rendu se dédouble selon la largeur : cartes empilées sur téléphone, table au-delà, à partir des mêmes données.

**Tech Stack:** Next.js 16 App Router, shadcn/ui, Tailwind 4.

**Spec:** `docs/superpowers/specs/espace-admin/12-ecran-liste-projets-design.md`

## Global Constraints

- La liste **ignore le statut** : brouillons et archivés doivent apparaître, contrairement au site public.
- **Deux rendus, pas une table compressée** : cartes sous `md:`, table au-delà. Une table à six colonnes est illisible sur un téléphone.
- Filtrage et tri **côté client**, sur les données déjà chargées. Pas de pagination : le volume ne la justifie pas.
- **Aucune librairie de table** : le tri et le filtrage sont un pattern à écrire, comme le note `docs/DESIGN.md`.
- La confirmation de suppression **nomme le projet** : aucune contrainte de base ne protège ici, contrairement aux tags et aux entreprises.
- **Aucun test** : filtrer un tableau par statut ne vérifie aucune règle métier du projet.
- `src/app/admin/projets/page.tsx` existe comme page d'attente : la **remplacer**.
- **Deux pages d'attente sont à créer avant d'écrire le moindre lien** : `/admin/projets/nouveau` et `/admin/projets/[id]`. Avec `typedRoutes: true`, un lien vers une route inexistante fait **échouer la compilation**, il ne produit pas une 404. La route dynamique est la plus facile à oublier : elle n'est pas dans un bouton visible mais dans la colonne d'actions de la liste.
- Aucun commit intermédiaire. Le périmètre du commit final est validé par l'utilisateur.

**Rules :** `.claude/rules/shadcn-ui/components.md`, `.claude/rules/nextjs/server-client-components.md`, `.claude/rules/react/hooks.md`, `.claude/rules/tailwind/conventions.md`.

---

### Task 1 : Filtres et confirmation de suppression

**Files:**
- Create: `src/app/admin/projets/nouveau/page.tsx`
- Create: `src/app/admin/projets/[id]/page.tsx`
- Create: `src/components/features/admin/projects/ProjectsFilters.tsx`
- Create: `src/components/features/admin/projects/DeleteProjectDialog.tsx`

**Interfaces:**
- Consomme : `deleteProject` du sub-project `11`, les enums de `src/lib/schemas/project.ts`.
- Produit : les deux routes d'attente, plus `<ProjectsFilters value={Filters} onChange={(f: Filters) => void} resultCount={number} />` et `<DeleteProjectDialog projectId={string} projectTitle={string} />`, montés par la table de la Task 2.

- [ ] **Step 1: Créer les deux pages d'attente**

Elles viennent **avant** tout le reste : la table de la Task 2 porte un lien par ligne vers `/admin/projets/[id]` et la page de la Task 3 un bouton vers `/admin/projets/nouveau`. Avec `typedRoutes: true`, écrire l'un ou l'autre sans que la route existe fait échouer le `typecheck`, pas produire une 404.

`src/app/admin/projets/nouveau/page.tsx` :

```typescript
export default function AdminNouveauProjetPage() {
  return (
    <div className="w-full py-6 lg:py-8">
      <h1 className="font-sans text-2xl font-medium tracking-normal">Nouveau projet</h1>
      <p className="mt-2 text-muted-foreground">Formulaire à construire.</p>
    </div>
  )
}
```

`src/app/admin/projets/[id]/page.tsx` :

```typescript
export default function AdminEditProjetPage() {
  return (
    <div className="w-full py-6 lg:py-8">
      <h1 className="font-sans text-2xl font-medium tracking-normal">Projet</h1>
      <p className="mt-2 text-muted-foreground">Formulaire à construire.</p>
    </div>
  )
}
```

Le sub-project `13` **remplace** ces deux fichiers, il n'en crée pas de seconds à côté. La page d'édition ne lit pas encore ses `params` : elle n'a rien à afficher, et le sub-project `13` écrira la signature complète.

Deux points de style sont imposés par `docs/DESIGN.md` et valent pour les trois pages de ce sub-project :

- **`font-sans` et `font-medium` sur le `h1`.** `globals.css` applique en `@layer base` `h1 { @apply font-display text-4xl font-bold tracking-tight text-balance sm:text-5xl }`. Une classe utilitaire écrase la taille et la graisse, jamais la famille : sans `font-sans`, ce titre rendrait en Sansation, et en graisse 600, qui n'est pas chargée (`Sansation` est déclarée en `['700']` seul). `tracking-normal` annule le `tracking-tight` hérité. Les pages internes de l'admin gardent Geist Sans.
- **`w-full py-6 lg:py-8` sur le conteneur.** Le container admin occupe la pleine largeur restante après la sidebar, sans `max-w-7xl` centré, et son rythme vertical est resserré : la densité prime sur le souffle.

- [ ] **Step 2: Écrire les filtres**

Composant client portant deux selects et un bouton de réinitialisation :

```typescript
export type ProjectFilters = {
  type: 'ALL' | 'CLIENT' | 'PERSONAL'
  status: 'ALL' | 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
}

export const EMPTY_FILTERS: ProjectFilters = { type: 'ALL', status: 'ALL' }
```

Points imposés :

- chaque select porte une option « Tous » correspondant à `ALL`
- le nombre de résultats est affiché en permanence, pas seulement quand il est nul
- un bouton de réinitialisation apparaît dès qu'un filtre est actif : après un filtrage sans résultat, il doit rester un moyen évident de tout réafficher

- [ ] **Step 3: Écrire la confirmation de suppression**

`AlertDialog` shadcn appelant `deleteProject(projectId)`.
> **Composants shadcn à installer d'abord.** `select` et `alert-dialog` sont rangés en post-MVP dans `docs/DESIGN.md` et absents de `src/components/ui/` : `pnpm dlx shadcn@latest add select alert-dialog`, avec `--dry-run` en premier et aucun écrasement des composants existants. Pas de `dialog` : cet écran n'utilise que `AlertDialog`. Ce sub-project ne dépend pas du `07`, il ne peut donc rien hériter de ses installations. Les cases à cocher sont des `<input type="checkbox">` natifs, `checkbox` n'ayant jamais été installé : ne pas l'introduire pour ce seul écran.


Le libellé doit **nommer le projet** et énoncer ce qui disparaît :

> Supprimer « {projectTitle} » ? Le projet, sa méta client et ses rattachements de tags seront supprimés définitivement.

Contrairement aux tags et aux entreprises, aucune contrainte de base ne s'oppose ici à la suppression : la méta et les rattachements partent en cascade et rien n'est récupérable. Cette confirmation est la seule protection, un « Êtes-vous sûr ? » générique ne la remplirait pas.

- [ ] **Step 4: Vérifier typage et lint**

```bash
just typecheck && just lint
```

Expected: aucune erreur.

---

### Task 2 : Liste à deux rendus

**Files:**
- Create: `src/components/features/admin/projects/ProjectsTable.tsx`

**Interfaces:**
- Consomme : `<ProjectsFilters />` et `<DeleteProjectDialog />` (Task 1), le type retourné par `findAllProjectsForAdmin`.
- Produit : `<ProjectsTable projects={AdminProjectListItem[]} />`, monté par la page de la Task 3. Le type vient du sub-project `11` : ne pas réutiliser `ProjectWithRelations`, qui décrit la requête publique et charge une `Company` complète que la requête d'administration ne sélectionne pas.

- [ ] **Step 1: Écrire la liste**

Composant client tenant l'état des filtres et du tri, et dérivant la liste affichée par `useMemo`.

Colonnes de la table, à partir de `md:` :

| Colonne | Contenu |
|---|---|
| Titre | `titleFr`, tronqué, avec le slug en dessous en `text-muted-foreground` |
| Type | `<Badge variant="outline" meta>` client ou personnel |
| Statut | `<Badge variant="outline" meta>`, libellé distinct pour brouillon et archivé |
| Entreprise | `clientMeta.company.name`, ou un tiret |
| Ordre | `displayOrder` |
| Actions | lien d'édition vers `/admin/projets/[id]`, plus la suppression |

Sous `md:`, chaque projet devient une `Card` empilée reprenant les mêmes informations, l'entreprise et l'ordre passant en ligne secondaire. Le basculement se fait par les classes utilitaires, pas par un rendu conditionnel en JavaScript : les deux structures sont dans le DOM et Tailwind en masque une, ce qui évite un décalage au premier rendu.

Cette carte porte le lien d'édition que la ligne de table porte dans sa colonne d'actions : c'est donc une **surface cliquable**, et `docs/DESIGN.md` lui impose `transition duration-300 ease-out hover:scale-[1.01] hover:shadow-xl`. Deux pièges :

- **ne pas écrire de `hover:border-*`** : la `Card` shadcn en `radix-nova` dessine son contour par `ring-1 ring-foreground/10` et sa bordure fait 0px, la classe n'aurait aucun effet visible
- **ne rien ajouter sur la table** : `src/components/ui/table.tsx` est vendored et applique déjà `hover:bg-muted/50` sur `TableRow`

Trois points à ne pas manquer :

- **tronquer le titre** : les titres bilingues sont longs et cassent la mise en page sur les écrans intermédiaires
- **tolérer une méta client absente** : afficher un tiret plutôt que planter. Les Server Actions du sub-project `11` rendent le cas improbable, pas impossible
- **distinguer l'état vide de l'état de chargement** : une liste filtrée sans résultat doit afficher un message explicite, sinon on croit à une lenteur

Le tri porte sur le titre et sur `displayOrder`, avec le critère actif visible dans l'en-tête de colonne.

- [ ] **Step 2: Vérifier typage et lint**

```bash
just typecheck && just lint
```

Expected: aucune erreur.

---

### Task 3 : Page

**Files:**
- Modify: `src/app/admin/projets/page.tsx`

**Interfaces:**
- Consomme : `findAllProjectsForAdmin` (sub-project `11`), `<ProjectsTable />` (Task 2), les deux routes d'attente de la Task 1.
- Produit : l'écran `/admin/projets` complet.

- [ ] **Step 1: Remplacer la page d'attente**

```typescript
import { ProjectsTable } from '@/components/features/admin/projects/ProjectsTable'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { findAllProjectsForAdmin } from '@/server/queries/projects'

export default async function AdminProjetsPage() {
  const projects = await findAllProjectsForAdmin()

  return (
    <div className="w-full py-6 lg:py-8">
      <div className="flex items-center justify-between">
        <h1 className="font-sans text-2xl font-medium tracking-normal">Projets</h1>
        <Button asChild>
          <Link href="/admin/projets/nouveau">Nouveau projet</Link>
        </Button>
      </div>
      <div className="mt-6">
        <ProjectsTable projects={projects} />
      </div>
    </div>
  )
}
```

Server Component qui charge et délègue. Aucun `'use cache'`, contrainte héritée de l'espace admin.

**Le chargement passe donc sous `<Suspense>`.** Avec `cacheComponents: true`, une lecture dynamique qui n'est ni cachée ni suspendue lève `"Uncached data was accessed outside of <Suspense>"` et fait échouer le build. Extraire un sous-composant `async` qui appelle la requête, le monter dans un `<Suspense>` avec un `StackedSkeleton` en `fallback`, aux hauteurs des lignes de la table, et laisser la page elle-même statique. `docs/DESIGN.md` en fait le composant de fallback de `<Suspense>` : il empile des `Skeleton` aux hauteurs passées en props, il n'y a pas de squelette de table à écrire. C'est le motif déjà employé par `src/app/[locale]/(public)/projets/[slug]/page.tsx` et `contact/page.tsx`, à relire avant d'écrire. Ne pas prendre `(public)/projets/page.tsx` pour modèle : sa query est en `'use cache'`, donc il ne porte aucun `<Suspense>`.

Le bouton pointe vers `/admin/projets/nouveau`, créée en page d'attente à la Task 1. La table de la Task 2 pointe de son côté vers `/admin/projets/[id]`, créée au même endroit. Les deux routes existent donc déjà quand ces liens s'écrivent.

- [ ] **Step 2: Vérifier que tout compile**

```bash
just typecheck && just lint && just build
```

Expected: aucune erreur. Un échec sur un `href` signalerait qu'une des deux pages d'attente de la Task 1 manque.

---

### Task 4 : Vérifier

**Files:** aucun fichier du dépôt.

- [ ] **Step 1: Vérifier la présence de tous les statuts**

Passer un projet du seed en `DRAFT` et un autre en `ARCHIVED` directement en base, puis afficher la liste.

```sql
UPDATE "Project" SET status = 'DRAFT' WHERE slug = '<slug1>';
UPDATE "Project" SET status = 'ARCHIVED' WHERE slug = '<slug2>';
```

Expected: les deux apparaissent, avec un statut lisible. Leur absence signalerait qu'on a réutilisé la requête publique, qui filtre sur `PUBLISHED`.

- [ ] **Step 2: Vérifier les filtres**

Filtrer par statut, puis par type, puis combiner les deux.

Expected: le nombre de résultats suit, et une combinaison sans résultat affiche un message explicite avec un moyen de réinitialiser.

- [ ] **Step 3: Vérifier le tri**

Trier par titre puis par ordre d'affichage.

Expected: l'ordre change, et le critère actif est visible.

- [ ] **Step 4: Vérifier le rendu mobile**

Réduire la fenêtre sous 768 pixels.

Expected: cartes empilées, et **aucun défilement horizontal**. C'est le défaut le plus courant d'une liste et il est invisible sur écran large.

- [ ] **Step 5: Vérifier un titre long**

Modifier temporairement un titre pour qu'il fasse une centaine de caractères.

Expected: il est tronqué, la mise en page tient sur toutes les largeurs.

- [ ] **Step 6: Vérifier la suppression**

Supprimer un projet client de test, après avoir noté ses tags et son entreprise.

```sql
SELECT count(*) FROM "Tag";
SELECT count(*) FROM "Company";
```

Expected: le projet disparaît, mais les compteurs de tags et d'entreprises sont inchangés. Leurs relations portent `Restrict`, seules la méta et les rattachements partent en cascade.

- [ ] **Step 7: Vérifier l'annulation**

Ouvrir la confirmation puis annuler.

Expected: rien n'est supprimé, et le libellé nommait bien le projet.

- [ ] **Step 8: Restaurer les statuts modifiés**

```bash
just db-reset
```

- [ ] **Step 9: Lancer la suite**

```bash
just test
```

Expected: tous les tests verts. Ce sub-project n'en ajoute aucun.

- [ ] **Step 10: Demander la validation avant commit**

Ne pas committer sans accord explicite de l'utilisateur sur le périmètre et le message. Message proposé :

```
feat(admin): écran de liste des projets
```
