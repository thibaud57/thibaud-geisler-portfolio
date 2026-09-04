# Formulaire de projet — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Créer et modifier un projet complet depuis un formulaire pleine page, entreprise et couverture comprises.

**Architecture:** Un composant de formulaire unique sert la création et la modification, l'action liée changeant seule. Le bloc de méta client s'affiche selon le type, les tags se cochent par catégorie, et l'entreprise se crée depuis le select grâce au composant conçu au sub-project `08` pour ce double montage.

**Tech Stack:** Next.js 16 App Router, React 19 (`useActionState`), shadcn/ui, Tailwind 4.

**Spec:** `docs/superpowers/specs/espace-admin/13-formulaire-projet-design.md`

## Global Constraints

- **Un seul composant** pour la création et la modification : dupliquer garantirait la divergence.
- Le bloc de méta client s'affiche **uniquement** pour le type `CLIENT`, en écho à la règle du schéma Zod du sub-project `11`.
- La bascule de `CLIENT` vers `PERSONAL` **avertit avant d'enregistrer** : la méta client sera supprimée, de façon irréversible.
- **Pas de composant `Command`** pour les tags : son état sélectionné est incorrect en style `radix-nova` (issue shadcn-ui#9228). Cases à cocher groupées par `TagKind`.
- L'ordre des tags **suit l'ordre de sélection**, il alimente `ProjectTag.displayOrder`.
- `CompanyFormDialog` est monté depuis le select d'entreprise, avec son rappel `onCreated` : sans lui, créer un projet pour un nouveau client ferait perdre la saisie.
- Le sélecteur de couverture est **restreint aux dossiers de projets** : proposer les CV rendrait le choix confus.
- Markdown en zones de saisie simples, sans éditeur enrichi ni prévisualisation.
- Fil d'ariane **déclaré par page**, pas dérivé du chemin.
- **Aucun test** : les Server Actions sont couvertes par le sub-project `11`, le reste est de l'assemblage.
- `src/app/admin/projets/nouveau/page.tsx` et `src/app/admin/projets/[id]/page.tsx` existent comme pages d'attente, créées au sub-project `12` pour que ses liens compilent : les **remplacer** toutes les deux, ne pas en créer de secondes à côté.
- Aucun commit intermédiaire. Le périmètre du commit final est validé par l'utilisateur.

**Rules :** `.claude/rules/shadcn-ui/components.md`, `.claude/rules/react/hooks.md`, `.claude/rules/nextjs/server-actions.md`, `.claude/rules/nextjs/server-client-components.md`, `.claude/rules/tailwind/conventions.md`.

---

### Task 1 : Fil d'ariane

**Files:**
- Create: `src/components/ui/breadcrumb.tsx` (via le CLI)
- Create: `src/components/ui/dialog.tsx` (via le CLI)
- Create: `src/components/ui/select.tsx` (via le CLI)
- Create: `src/components/ui/alert-dialog.tsx` (via le CLI)
- Create: `src/components/layout/AdminBreadcrumb.tsx`

**Interfaces:**
- Consomme : rien.
- Produit : `<AdminBreadcrumb items={{ label: string; href?: string }[]} />`, monté par les pages des Tasks 4 et 5.

- [ ] **Step 1: Installer le composant**

```bash
pnpm dlx shadcn@latest add breadcrumb dialog select alert-dialog
```

`dialog` et `select` ont été retirés du dépôt et rangés en post-MVP dans `docs/DESIGN.md` : le formulaire en dépend directement (selects de statut, type, mode de travail, statut de contrat, entreprise) et indirectement via `CompanyFormDialog`. `alert-dialog` porte la confirmation du scénario 3, où l'enregistrement n'a lieu qu'après accord explicite sur la suppression de la méta client. Passer `--dry-run` d'abord, ne rien écraser. Les cases à cocher des formats et des tags sont des `<input type="checkbox">` natifs, `checkbox` n'ayant jamais été installé.

- [ ] **Step 2: Écrire le fil d'ariane**

```typescript
import Link from 'next/link'

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'

export type BreadcrumbEntry = { label: string; href?: string }

export function AdminBreadcrumb({ items }: { items: BreadcrumbEntry[] }) {
  return (
    <Breadcrumb>
      <BreadcrumbList>
        {items.map((item, index) => (
          <BreadcrumbItem key={item.label}>
            {item.href && index < items.length - 1 ? (
              <>
                <BreadcrumbLink asChild>
                  <Link href={item.href}>{item.label}</Link>
                </BreadcrumbLink>
                <BreadcrumbSeparator />
              </>
            ) : (
              <BreadcrumbPage>{item.label}</BreadcrumbPage>
            )}
          </BreadcrumbItem>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
```

Les items sont fournis par chaque page. Une dérivation depuis le `pathname` supposerait de résoudre un identifiant de projet en titre lisible, ce qu'une page connaît déjà puisqu'elle a chargé le projet.

`AdminHeader` n'est **pas** touché. Le fil se rend en tête du contenu de chaque page, pas dans le header : celui-ci est monté par le layout, donc lui faire porter le fil imposerait un contexte ou un slot pour qu'une page lui transmette ses maillons. La page, elle, a déjà chargé le projet dont elle affiche le titre.

- [ ] **Step 3: Vérifier typage et lint**

```bash
just typecheck && just lint
```

Expected: aucune erreur.

---

### Task 2 : Champs de tags et de méta client

**Files:**
- Create: `src/components/features/admin/projects/ProjectTagsField.tsx`
- Create: `src/components/features/admin/projects/ClientMetaFields.tsx`

**Interfaces:**
- Consomme : les enums de `src/lib/schemas/project.ts`, `CompanyFormDialog` du sub-project `08`.
- Produit : `<ProjectTagsField tags={Tag[]} value={string[]} onChange={(ids: string[]) => void} />` et `<ClientMetaFields companies={{id, name}[]} legalEntities={{id, name}[]} defaultValues={...} errors={...} />`, montés par le formulaire de la Task 3.

`legalEntities` traverse `ClientMetaFields` sans lui servir : il ne fait que l'acheminer jusqu'à `CompanyFormDialog`, qui en a besoin pour son select d'entité légale. L'oublier dans la signature casserait la création d'entreprise depuis le formulaire projet.

- [ ] **Step 1: Écrire le champ de tags**

Composant client. Points imposés :

- les tags sont **groupés par `kind`**, avec le libellé de catégorie en en-tête de chaque groupe
- chaque tag est une case à cocher `<input type="checkbox">`, **jamais** un `Command` : son état sélectionné est incorrect en `radix-nova`. Le libellé affiché est `nameFr`, l'interface d'administration étant en français, et l'en-tête de groupe est un libellé français écrit en dur pour chacune des six valeurs de `TagKind`, que l'enum ne porte pas
- les identifiants retenus sont émis dans l'**ordre de sélection**, pas dans l'ordre d'affichage. C'est cet ordre qui alimentera `displayOrder`
- la liste des tags retenus est affichée séparément, dans son ordre, pour que l'ordre soit visible avant enregistrement
- chaque identifiant retenu est rendu dans un `<input type="hidden" name="tagIds" />`, ce qui produit les valeurs multiples que la Server Action lit avec `getAll`

L'ordre de sélection est ce qui permet de se passer d'une interface de réordonnancement : recocher dans l'ordre voulu suffit.

- [ ] **Step 2: Écrire les champs de méta client**

Composant client rendant l'entreprise, le mode de travail, le statut de contrat, la taille d'équipe et le nombre de livrables.

Le select d'entreprise est accompagné d'un bouton qui monte `CompanyFormDialog` :

```typescript
<CompanyFormDialog
  company={null}
  legalEntities={legalEntities}
  trigger={
    <Button variant="outline" size="icon" aria-label="Nouvelle entreprise">
      <Plus className="size-5" />
    </Button>
  }
  onCreated={(id) => setCompanyId(id)}
/>
```

C'est l'usage pour lequel ce composant a été écrit au sub-project `08`. `onCreated` sélectionne l'entreprise créée sans rechargement, donc sans perdre la saisie du projet en cours.

L'icône est un `Plus` de `lucide-react`, en import nommé, à 20px (`size-5`) : `docs/DESIGN.md` impose Lucide pour toutes les icônes d'interface, un `+` typographique n'en est pas une.

Le mode de travail est **requis** dès que le type est `CLIENT`, contrairement au statut de contrat et à la taille d'équipe : il n'est pas nullable en base.

- [ ] **Step 3: Vérifier typage et lint**

```bash
just typecheck && just lint
```

Expected: aucune erreur.

---

### Task 3 : Formulaire

**Files:**
- Create: `src/components/features/admin/projects/ProjectForm.tsx`

**Interfaces:**
- Consomme : `createProject`, `updateProject` (sub-project `11`), `<ProjectTagsField />` et `<ClientMetaFields />` (Task 2), `<AssetPicker assets={…} />` (sub-project `10`, qui reçoit ses données en prop : sa requête est `server-only`).
- Produit : `<ProjectForm project={AdminProjectDetail | null} tags={Tag[]} companies={...} legalEntities={...} />`, monté par les pages des Tasks 4 et 5. Le type vient du sub-project `11` : `ProjectWithRelations` décrit la requête publique et ne correspond pas à l'`include` de `findProjectForAdmin`.

- [ ] **Step 1: Écrire le formulaire**

Composant client en `useActionState`. Points imposés :

```typescript
const action = project ? updateProject.bind(null, project.id) : createProject
const [state, formAction, pending] = useActionState(action, initialProjectFormState)
```

**Structure des champs**, dans cet ordre :

| Section | Champs |
|---|---|
| Identification | slug, statut, ordre d'affichage |
| Contenu français | titre, description, markdown de case study |
| Contenu anglais | titre, description, markdown de case study |
| Classification | type, formats (cases à cocher multiples), tags |
| Liens | URL de dépôt, URL de démonstration |
| Dates | début, fin |
| Couverture | `AssetPicker`, alimenté par la page qui appelle `listAssets('projets/')` et lui passe le résultat en prop, plus un `<input type="hidden" name="coverFilename" />` qui porte la sélection jusqu'à l'action |
| Méta client | `ClientMetaFields`, affiché seulement si le type vaut `CLIENT` |

Chaque intitulé de section relève de la famille Label de la scale : `text-sm font-medium uppercase tracking-[0.25em] text-muted-foreground`. Au-delà d'une dizaine de caractères, y ajouter `text-balance` : l'espacement large fait déborder, ce qui s'est déjà produit deux fois sur le site public. « Contenu français » fait seize caractères, « Classification » quatorze.

**Répartition responsive**, mobile-first au même titre que le site public :

- **Base** : une colonne. Les paires de champs courts admettent deux colonnes, ce qui vaut pour la date de début et la date de fin
- **`md:`** : deux colonnes pour Identification, Classification, Liens, Dates et Méta client. Contenu français, Contenu anglais et Couverture restent sur une colonne pleine largeur, leurs zones de markdown et leurs vignettes n'ayant rien à gagner à être resserrées
- **`lg:`** : trois colonnes pour Identification et Méta client, les seules sections qui portent assez de champs courts. Les autres gardent leur palier `md:`

**Six comportements non négociables :**

1. **Repeuplement après erreur.** Chaque champ tire son `defaultValue` de `state.values` s'il existe, sinon du projet, sinon vide. Un formulaire de cette taille qui perd la saisie sur une erreur de validation est inutilisable.

2. **Erreur sous chaque champ**, depuis `state.errors`, et pas seulement un message global.

3. **Avertissement à la bascule vers personnel.** Quand on édite un projet qui avait une méta client et qu'on passe le type sur `PERSONAL`, afficher un avertissement avant enregistrement : la méta sera supprimée définitivement. Le sub-project `11` l'exécute sans broncher, c'est l'interface qui doit prévenir.

   L'avertissement est un `<p className="text-sm text-destructive">` rendu sous le select de type, et non un `Alert` : le composant n'est pas installé, et le formulaire rend déjà toutes ses erreurs de champ sous cette forme. La soumission passe ensuite par un `AlertDialog` : le scénario 3 exige que l'enregistrement n'ait lieu **qu'après confirmation**, ce qu'un message seul ne produit pas.

4. **Le bouton de soumission est désactivé pendant `pending`**, un enregistrement double créerait un conflit de slug.

5. **La couverture rejoint le `FormData` par un champ caché.** `AssetPicker` est un composant contrôlé, sa valeur n'atteint pas l'action toute seule : rendre `<input type="hidden" name="coverFilename" value={selected ?? ''} />` à côté de lui, comme les tags le font avec `tagIds`. Sans lui, `formData.get('coverFilename')` du sub-project `11` lit toujours une chaîne vide et le scénario 8 échoue.

6. **Retour à la liste après enregistrement.** Le scénario 1 de la spec l'exige (« on est redirigé vers la liste, où il figure ») et rien ne le produit aujourd'hui : les actions du sub-project `11` retournent `{ ok: true, savedId }` sans rediriger. Un `useEffect` sur `state.ok` qui appelle `router.push('/admin/projets')`, la redirection appartenant à l'interface et non à l'action, qui doit rester réutilisable.

Les formats sont des cases à cocher partageant `name="formats"`, ce qui produit les valeurs multiples lues par `getAll`.

- [ ] **Step 2: Vérifier typage et lint**

```bash
just typecheck && just lint
```

Expected: aucune erreur.

---

### Task 4 : Page de création

**Files:**
- Modify: `src/app/admin/projets/nouveau/page.tsx`

**Interfaces:**
- Consomme : `<ProjectForm />` (Task 3), `<AdminBreadcrumb />` (Task 1), les requêtes d'administration des tags et des entreprises.
- Produit : la page `/admin/projets/nouveau`.

> **Les deux pages de ce sub-project lisent des données dynamiques : leur chargement passe sous `<Suspense>`.** Avec `cacheComponents: true`, une lecture ni cachée ni suspendue lève `"Uncached data was accessed outside of <Suspense>"` et fait échouer le build. Le motif est le même dans les deux cas : un sous-composant `async` porte le `Promise.all` et rend le formulaire, la page ne garde que le fil d'Ariane, le `<Suspense>` et son `StackedSkeleton`, aux hauteurs des blocs de champs. `docs/DESIGN.md` en fait le composant de fallback de `<Suspense>` : il empile des `Skeleton` aux hauteurs passées en props, il n'y a pas de squelette à écrire. `src/app/[locale]/(public)/projets/[slug]/page.tsx` en donne la forme exacte, à relire avant d'écrire. Ne pas prendre `(public)/projets/page.tsx` pour modèle : sa query est en `'use cache'`, donc il ne porte aucun `<Suspense>`. Les blocs de code ci-dessous montrent le chargement, pas la structure finale de la page.

- [ ] **Step 1: Remplacer la page d'attente**

```typescript
import { AdminBreadcrumb } from '@/components/layout/AdminBreadcrumb'
import { ProjectForm } from '@/components/features/admin/projects/ProjectForm'
import { findAllCompaniesForAdmin, findAvailableLegalEntities } from '@/server/queries/companies'
import { findAllTagsForAdmin } from '@/server/queries/tags'

export default async function AdminNouveauProjetPage() {
  const [tags, companies, legalEntities] = await Promise.all([
    findAllTagsForAdmin(),
    findAllCompaniesForAdmin(),
    findAvailableLegalEntities(),
  ])

  return (
    <div className="w-full py-6 lg:py-8">
      <AdminBreadcrumb
        items={[
          { label: 'Projets', href: '/admin/projets' },
          { label: 'Nouveau projet' },
        ]}
      />
      <h1 className="mt-4 font-sans text-2xl font-medium tracking-normal">Nouveau projet</h1>
      <div className="mt-6">
        <ProjectForm
          project={null}
          tags={tags}
          companies={companies}
          legalEntities={legalEntities}
        />
      </div>
    </div>
  )
}
```

Les trois requêtes sont parallélisées : elles ne dépendent pas les unes des autres.

Deux points de style sont imposés par `docs/DESIGN.md` et valent pour les deux pages de ce sub-project :

- **`font-sans` et `font-medium` sur le `h1`.** `globals.css` applique en `@layer base` `h1 { @apply font-display text-4xl font-bold tracking-tight text-balance sm:text-5xl }`. Une classe utilitaire écrase la taille et la graisse, jamais la famille : sans `font-sans`, ce titre rendrait en Sansation, et en graisse 600, qui n'est pas chargée (`Sansation` est déclarée en `['700']` seul). `tracking-normal` annule le `tracking-tight` hérité. Les pages internes de l'admin gardent Geist Sans.
- **`w-full py-6 lg:py-8` sur le conteneur.** Le container admin occupe la pleine largeur restante après la sidebar, sans `max-w-7xl` centré, et son rythme vertical est resserré : la densité prime sur le souffle.

---

### Task 5 : Page d'édition

**Files:**
- Modify: `src/app/admin/projets/[id]/page.tsx`

**Interfaces:**
- Consomme : `findProjectForAdmin` (sub-project `11`), `<ProjectForm />` (Task 3), `<AdminBreadcrumb />` (Task 1).
- Produit : la page `/admin/projets/[id]`.

- [ ] **Step 1: Remplacer la page d'attente**

```typescript
import { notFound } from 'next/navigation'

import { AdminBreadcrumb } from '@/components/layout/AdminBreadcrumb'
import { ProjectForm } from '@/components/features/admin/projects/ProjectForm'
import { findAllCompaniesForAdmin, findAvailableLegalEntities } from '@/server/queries/companies'
import { findProjectForAdmin } from '@/server/queries/projects'
import { findAllTagsForAdmin } from '@/server/queries/tags'

export default async function AdminEditProjetPage({
  params,
}: PageProps<'/admin/projets/[id]'>) {
  const { id } = await params

  const [project, tags, companies, legalEntities] = await Promise.all([
    findProjectForAdmin(id),
    findAllTagsForAdmin(),
    findAllCompaniesForAdmin(),
    findAvailableLegalEntities(),
  ])

  if (!project) notFound()

  return (
    <div className="w-full py-6 lg:py-8">
      <AdminBreadcrumb
        items={[
          { label: 'Projets', href: '/admin/projets' },
          { label: project.titleFr },
        ]}
      />
      <h1 className="mt-4 font-sans text-2xl font-medium tracking-normal">{project.titleFr}</h1>
      <div className="mt-6">
        <ProjectForm
          project={project}
          tags={tags}
          companies={companies}
          legalEntities={legalEntities}
        />
      </div>
    </div>
  )
}
```

`notFound()` traite l'identifiant inconnu par une 404 propre plutôt qu'une erreur de rendu.

Le fil d'ariane affiche le titre du projet, ce qu'une dérivation depuis le `pathname` n'aurait pas pu faire sans requête supplémentaire.

- [ ] **Step 2: Vérifier que tout compile**

```bash
just typecheck && just lint && just build
```

Expected: aucune erreur.

---

### Task 6 : Vérifier de bout en bout

**Files:** aucun fichier du dépôt.

- [ ] **Step 1: Créer un projet personnel**

Depuis `/admin/projets`, cliquer sur « Nouveau projet », renseigner les champs requis avec le type personnel, deux tags et un format.

Expected: le projet est créé et apparaît dans la liste.

- [ ] **Step 2: Vérifier l'affichage conditionnel**

Basculer le type sur client.

Expected: les cinq champs de méta client apparaissent. Rebasculer sur personnel les masque.

- [ ] **Step 3: Créer une entreprise sans quitter la page**

Sur un projet client partiellement rempli, ouvrir la création d'entreprise depuis le select, la créer.

Expected: elle est sélectionnée, et **tous les champs déjà saisis du projet sont intacts**. C'est le scénario qui justifie tout le travail de double montage du sub-project `08`.

- [ ] **Step 4: Vérifier le repeuplement après erreur**

Remplir largement le formulaire en type client, laisser l'entreprise vide, enregistrer.

Expected: l'erreur apparaît sous le champ d'entreprise et **aucune autre valeur n'est perdue**.

- [ ] **Step 5: Vérifier l'ordre des tags**

Cocher trois tags dans un ordre choisi, enregistrer, rouvrir le projet.

```sql
SELECT t.slug, pt."displayOrder" FROM "ProjectTag" pt
JOIN "Tag" t ON t.id = pt."tagId"
JOIN "Project" p ON p.id = pt."projectId"
WHERE p.slug = '<slug>' ORDER BY pt."displayOrder";
```

Expected: l'ordre en base correspond à l'ordre de sélection.

- [ ] **Step 6: Vérifier le sélecteur de couverture**

Ouvrir le sélecteur.

Expected: seuls les assets des dossiers de projets sont proposés, pas les CV.

- [ ] **Step 7: Vérifier l'avertissement de bascule**

Modifier un projet client existant et passer son type sur personnel.

Expected: un avertissement signale la suppression de la méta client avant l'enregistrement.

- [ ] **Step 8: Vérifier la préservation en modification**

Modifier uniquement le titre français d'un projet complet, enregistrer.

```sql
SELECT "coverFilename", "caseStudyMarkdownFr", "githubUrl", "displayOrder"
FROM "Project" WHERE slug = '<slug>';
```

Expected: tous ces champs sont inchangés.

- [ ] **Step 9: Vérifier la 404**

Demander `/admin/projets/identifiant-inexistant`.

Expected: une 404 propre.

- [ ] **Step 10: Vérifier la publication**

Passer un projet en publié, puis consulter `/fr/projets`.

Expected: il y apparaît. Son absence signalerait que `updateTag('projects')` n'a pas fonctionné.

- [ ] **Step 11: Vérifier sur téléphone**

Réduire la fenêtre sous 768 pixels et parcourir le formulaire.

Expected: tous les champs sont utilisables, aucun défilement horizontal, et les zones de markdown restent lisibles.

- [ ] **Step 12: Lancer la suite**

```bash
just test
```

Expected: tous les tests verts.

- [ ] **Step 13: Demander la validation avant commit**

Ne pas committer sans accord explicite de l'utilisateur sur le périmètre et le message. Message proposé :

```
feat(admin): formulaire de création et d'édition des projets
```
