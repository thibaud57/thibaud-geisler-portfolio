# Formulaire de projet — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Créer et modifier un projet complet depuis un formulaire pleine page, entreprise et couverture comprises.

**Architecture:** Un composant de formulaire unique sert la création et la modification, l'action liée changeant seule. Deux colonnes de `Card` reprennent le regroupement de la maquette : contenu à gauche, publication et méta à droite, colonne droite sticky. La carte Méta client est active quel que soit le type, le sub-project `11` exigeant une méta sur tout projet. Les tags s'ajoutent par un Combobox groupé et se réordonnent par glisser-déposer. L'entreprise se choisit parmi les entreprises existantes, sans création possible depuis cet écran.

**Tech Stack:** Next.js 16 App Router, React 19 (`useActionState`), shadcn/ui, Tailwind 4.

**Spec:** `docs/superpowers/specs/espace-admin/13-formulaire-projet-design.md`

## Global Constraints

- **Un seul composant** pour la création et la modification : dupliquer garantirait la divergence.
- La card **Méta client est active quel que soit le type** : aucun de ses contrôles n'est jamais `disabled`, et le formulaire ne porte aucune branche conditionnelle au type. Le sub-project `11` exige `companyId` et `workMode` sur tout projet, `PERSONAL` comme `CLIENT`, et écrit la `ClientMeta` dans les deux cas.
- Le champ de type **ne supprime rien et n'avertit de rien** : pas d'`AlertDialog`, pas de texte persistant. Il ne porte que la distinction d'affichage, et se rend en deux `RadioGroupItem` côte à côte plutôt qu'en `Switch` (cf. `docs/DESIGN.md` § Arbitrages).
- **Tags** : Combobox de recherche groupé par `TagKind` pour ajouter, liste des tags retenus réordonnable par glisser-déposer avec retrait. `ProjectTag.displayOrder` vaut la position dans la liste, `index + 1`.
- **Entreprise choisie parmi les entreprises existantes**, aucun bouton de création ni modale depuis ce formulaire : une entreprise manquante se crée sur son propre écran, au sub-project `08`.
- Le sélecteur de couverture est **restreint au dossier `projets/`** des assets : proposer les CV rendrait le choix confus.
- Markdown en zones de saisie simples, sans éditeur enrichi ni prévisualisation.
- Fil d'ariane **déclaré par page**, pas dérivé du chemin.
- **Trois `Select`** (statut, mode de travail, statut de contrat) soumis par `onSubmit` + `startTransition`, jamais par `<form action>` : Radix Select perdrait sa valeur au premier reset après erreur.
- **Aucun test** : les Server Actions sont couvertes par le sub-project `11`, le reste est de l'assemblage.
- `src/app/admin/(protected)/projets/nouveau/page.tsx` et `src/app/admin/(protected)/projets/[id]/page.tsx` existent comme pages d'attente, créées au sub-project `12` pour que ses liens compilent : les **remplacer** toutes les deux, ne pas en créer de secondes à côté.
- Aucun commit intermédiaire. Le périmètre du commit final est validé par l'utilisateur.

**Rules :** `.claude/rules/shadcn-ui/components.md`, `.claude/rules/react/hooks.md`, `.claude/rules/nextjs/server-actions.md`, `.claude/rules/nextjs/server-client-components.md`, `.claude/rules/tailwind/conventions.md`.

---

### Task 1 : Composants et fil d'ariane

**Files:**
- Create: `src/components/ui/breadcrumb.tsx` (via le CLI, **seulement s'il est absent**)
- Create: `src/components/ui/radio-group.tsx` (via le CLI)
- Create: `src/components/ui/calendar.tsx` (via le CLI)
- Create: `src/components/layout/AdminBreadcrumb.tsx` (**seulement s'il est absent**)

**Interfaces:**
- Consomme : rien.
- Produit : `<AdminBreadcrumb items={{ label: string; href?: string }[]} />`, monté par les pages des Tasks 4 et 5.

- [ ] **Step 1: Installer les composants manquants**

```bash
ls src/components/ui/                                         # vérifier avant
pnpm dlx shadcn@latest add breadcrumb radio-group calendar --dry-run  # simuler d'abord
```

`radio-group` et `calendar` sont introduits ici : le premier pour le champ de type, le second pour les sélecteurs de date de début et de fin, composés avec `Popover`. Pas de `switch` : sa fiche du design system le réserve aux réglages appliqués à l'instant. `breadcrumb` peut déjà être posé si le sub-project `08` l'a installé pour son propre écran plein d'entreprise : ne l'ajouter que s'il manque, une réinstallation écraserait le composant en place. `dialog`, `select`, `alert-dialog`, `pagination`, `checkbox`, `popover` et `command` viennent du sub-project `07`, déjà présents par la chaîne de dépendances (`13 → 12 → 11 → 07` et `13 → 08 → 07`) : ne rien réinstaller.

- [ ] **Step 2: Écrire le fil d'ariane, si absent**

Si `AdminBreadcrumb` existe déjà (posé par le `08`), passer cette étape : le composant est générique, sans rien de propre au formulaire projet.

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

- [ ] **Step 3: Sortir les composants installés du post-MVP**

Modifier `docs/DESIGN.md` § Mapping Composants : `RadioGroup` rejoint Formulaires (ligne « Formulaires admin »), `Popover + Calendar` rejoint Formulaires (ligne « Sélecteur de date »), et `Breadcrumb` rejoint Navigation (ligne « Fil d'ariane ») si ce sub-project l'installe (sinon le `08` l'a déjà fait). Retirer les lignes correspondantes de la section Post-MVP.

- [ ] **Step 4: Vérifier typage et lint**

```bash
just typecheck && just lint
```

Expected: aucune erreur.

---

### Task 2 : Champs de tags et de méta client

**Files:**
- Create: `src/components/features/admin/projects/ProjectTagsField.tsx`
- Create: `src/components/features/admin/projects/ClientMetaFields.tsx`
- Modify: `src/lib/projects.ts` (ajout de `WORK_MODE_LABELS`)

**Interfaces:**
- Consomme : les enums de `src/lib/schemas/project.ts`, la liste des entreprises fournie par le sub-project `08`, `PROJECT_TYPE_LABELS` / `PROJECT_STATUS_LABELS` / `PROJECT_FORMAT_LABELS` / `CONTRACT_STATUS_LABELS` du sub-project `12`.
- Produit : `WORK_MODE_LABELS`, à côté des quatre autres. `<ProjectTagsField tags={AdminTag[]} defaultSelectedIds={string[]} />` (non contrôlé : état interne, rien ne remonte au parent, la valeur part par les inputs cachés) et `<ClientMetaFields companies={AdminCompany[]} defaultValues={...} errors={...} />`, montés par le formulaire de la Task 3.

- [ ] **Step 0: Compléter `src/lib/projects.ts`**

```typescript
import type { WorkMode } from '@/generated/prisma/client'

export const WORK_MODE_LABELS: Record<WorkMode, string> = {
  REMOTE: 'Remote',
  HYBRIDE: 'Hybride',
  PRESENTIEL: 'Sur site',
}
```

`PROJECT_TYPE_LABELS`, `PROJECT_STATUS_LABELS`, `PROJECT_FORMAT_LABELS` et `CONTRACT_STATUS_LABELS` existent déjà, écrits au sub-project `12` : ne pas les redéfinir ici, `ClientMetaFields` (Step 2) et `ProjectForm` (Task 3) les importent tels quels.

- [ ] **Step 1: Écrire le champ de tags**

Composant client. Points imposés :

- un Combobox (`Popover` + `Command`) liste les tags **non encore retenus**, groupés par `TagKind` (`CommandGroup` par catégorie, libellé français écrit en dur comme au `07`), avec recherche sur `nameFr`
- la coche d'un `CommandItem` se pilote par l'attribut `data-checked`, pas par l'état interne de `cmdk`, comme `IconCombobox` de `TagFormDialog` (`src/components/features/admin/tags/TagFormDialog.tsx`)
- choisir un tag l'ajoute en fin de la liste des tags retenus et le retire des options du Combobox
- la liste des tags retenus est un tableau en état local (`useState<Tag[]>`), rendu séparément : chaque ligne porte son rang (`index + 1`), le `nameFr` du tag, et un bouton de retrait
- chaque ligne est `draggable`, avec `onDragStart`, `onDragOver` et `onDrop` qui réordonnent le tableau par `splice`, sur le modèle du glisser-déposer déjà écrit dans `DataTable` (`src/components/features/admin/DataTable.tsx`), mais en état purement client : ce composant n'écrit rien en base, il compose seulement la valeur soumise par le formulaire
- chaque tag retenu est rendu dans un `<input type="hidden" name="tagIds" value={tag.id} />`, dans l'ordre du tableau : la Server Action du sub-project `11` lit `formData.getAll('tagIds')` et en déduit `displayOrder` par position
- état vide : la liste retenue affiche un message plutôt que rien, tant qu'aucun tag n'est choisi

- [ ] **Step 2: Écrire les champs de méta client**

Composant client rendant l'entreprise, le mode de travail, le statut de contrat, la taille d'équipe et le nombre de livrables. Aucune prop `disabled`, aucune branche selon le type : le sub-project `11` exige une méta sur tout projet, `PERSONAL` comme `CLIENT`, et ces champs sont toujours actifs.

Le champ Entreprise est un **Combobox de recherche** parmi les entreprises passées en prop (même composition que le sélecteur d'icône du `07`), pas un `Select` : au-delà d'une dizaine d'entreprises, la recherche vaut mieux que la liste déroulante (`docs/DESIGN.md` § Champ de recherche). Sa valeur rejoint le `FormData` par un `<input type="hidden" name="companyId" />`, comme la couverture le fait pour `coverFilename` (Task 3). **Aucun bouton de création n'accompagne ce champ** : une entreprise manquante se crée sur son propre écran, au sub-project `08`, et redevient disponible ici au rechargement de la page.

Le mode de travail et le statut de contrat sont deux `Select` distincts, soumis par le formulaire parent via `onSubmit` + `startTransition` (Task 3). Le mode de travail est **requis**, contrairement au statut de contrat et à la taille d'équipe : il n'est pas nullable en base.

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
- Consomme : `createProject`, `updateProject` (sub-project `11`), `<ProjectTagsField />` et `<ClientMetaFields />`, `PROJECT_TYPE_LABELS`, `PROJECT_STATUS_LABELS`, `PROJECT_FORMAT_LABELS`, `WORK_MODE_LABELS`, `CONTRACT_STATUS_LABELS` (Task 2), `<AssetPicker assets={…} />` (sub-project `10`, qui reçoit ses données en prop : sa requête est `server-only`), `AdminBreadcrumb` (sub-project `08`).
- Produit : `<ProjectForm project={AdminProjectDetail | null} tags={AdminTag[]} companies={AdminCompany[]} coverAssets={AssetEntry[]} />`, monté par les pages des Tasks 4 et 5. Le type vient du sub-project `11` : `ProjectWithRelations` décrit la requête publique et ne correspond pas à l'`include` de `findProjectForAdmin`.

- [ ] **Step 1: Écrire le formulaire**

Composant client en `useActionState`. Points imposés :

```typescript
const action = project ? updateProject.bind(null, project.id) : createProject
const [state, formAction, pending] = useActionState(action, initialProjectFormState)
```

**En-tête du formulaire**, juste sous le fil d'ariane rendu par la page : le titre (`project.titleFr` ou « Nouveau projet ») à gauche, « Annuler » (`variant="ghost"`, lien vers `/admin/projets`) et « Enregistrer » (`type="submit"`, désactivé pendant `pending`) à droite, sur le modèle de `CompanyForm` (`08`). Le formulaire porte ce titre lui-même, pas la page : le bouton d'enregistrement a besoin de `pending`, propre à ce composant client, et `AdminPageShell` ne convient pas à un formulaire pleine page pour cette raison.

```tsx
<form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
  <div className="flex flex-wrap items-center justify-between gap-4">
    <h1 className="font-sans text-2xl font-semibold tracking-tight">
      {project ? project.titleFr : "Nouveau projet"}
    </h1>
    <div className="flex gap-2">
      <Button type="button" variant="ghost" asChild>
        <Link href="/admin/projets">Annuler</Link>
      </Button>
      <Button type="submit" disabled={pending}>
        <Save aria-hidden data-icon="inline-start" />
        {pending ? "Enregistrement..." : "Enregistrer"}
      </Button>
    </div>
  </div>
  {/* deux colonnes de Card, ci-dessous */}
</form>
```

**`font-sans` sur ce `h1` est requis.** `globals.css` applique en `@layer base` `h1 { @apply font-display text-4xl font-bold tracking-tight text-balance sm:text-5xl }` : une classe utilitaire écrase la taille et la graisse, jamais la famille. Sans `font-sans`, ce titre rendrait en Sansation à 600, une graisse qui n'est pas chargée (`Sansation` est déclarée en `['700']` seul). Le `tracking-tight` hérité est conservé : l'écran admin reprend le réglage H3, 24px en 600, comme `docs/DESIGN.md` le prescrit.

**Disposition**, deux colonnes de `Card` comme la maquette : une seule colonne en mobile, dans l'ordre du DOM ci-dessous ; au-delà, la colonne de contenu occupe la plus grande part, la colonne latérale une part plus étroite et reste `sticky` pendant le défilement.

Colonne de contenu :

| Card | Champs |
|---|---|
| Identité | slug, ordre d'affichage, titre (français), titre (anglais), puis en pleine largeur le type de projet (`formats`, `Checkbox` multiples) |
| Description | description (français), description (anglais) |
| Tags | `<ProjectTagsField />` (Task 2) |
| Case study | contenu (français, `rows=8`), contenu (anglais, `rows=4`), `font-mono`, redimensionnables verticalement |

Colonne latérale :

| Card | Champs |
|---|---|
| Publication | statut (`Select`), type (`RadioGroup`), dates de début et de fin (`Popover` + `Calendar`, `locale` française) |
| Liens | URL de dépôt, URL de démonstration. Pas de bloc « Phase » : la maquette le dérive de l'étape de développement, hors périmètre faute de colonne Prisma. La card ne gardant que les deux liens, elle s'intitule « Liens » et non « Avancement » |
| Couverture | `AssetPicker`, alimenté par la prop `coverAssets` que la page charge par `listAssets('projets/')`, plus un `<input type="hidden" name="coverFilename" />` qui porte la sélection jusqu'à l'action |
| Méta client | `<ClientMetaFields ... />` (Task 2), toujours active |

Chaque `Card` porte son titre dans un `CardTitle` (« Identité », « Description », « Tags », « Case study », « Publication », « Liens », « Couverture », « Méta client »), le composant portant déjà l'échelle admin (`docs/DESIGN.md` § Scale typographique) : pas de style de libellé ad hoc à composer.

Les libellés d'énumération (`formats`, `status`, `type`, `workMode`, `contractStatus`) s'importent tous les cinq depuis `@/lib/projects` (Task 2) : `PROJECT_FORMAT_LABELS`, `PROJECT_STATUS_LABELS`, `PROJECT_TYPE_LABELS`, `WORK_MODE_LABELS`, `CONTRACT_STATUS_LABELS`. Aucun n'est redéfini ici.

**Sept comportements non négociables :**

1. **Repeuplement après erreur.** Chaque champ tire son `defaultValue` de `state.values` s'il existe, sinon du projet, sinon vide. Un formulaire de cette taille qui perd la saisie sur une erreur de validation est inutilisable.

2. **Erreur sous chaque champ**, depuis `state.errors`, et pas seulement un message global.

3. **Le changement de type n'avertit de rien.** Il change l'état de `type` et rien d'autre. Aucune `AlertDialog`, aucun texte persistant : le sub-project `11` réécrit la méta avec les valeurs soumises sans jamais la supprimer, quel que soit le sens du changement. Deux `RadioGroupItem` côte à côte, libellés par `PROJECT_TYPE_LABELS` (« Client », « Perso »), et non le `Switch` de la maquette, que sa fiche du design system réserve aux réglages appliqués à l'instant.

4. **La card Méta client est toujours active.** `<ClientMetaFields />` ne reçoit pas de prop `disabled` : ses cinq champs sont modifiables quel que soit le type, et `companyId` comme `workMode` partent dans le `FormData` dans les deux cas. Un projet personnel se rattache à la société du propriétaire (`OWNER_COMPANY_SLUG`, `prisma/seed-data/companies.ts`).

5. **Le bouton de soumission est désactivé pendant `pending`**, un enregistrement double créerait un conflit de slug.

6. **La couverture rejoint le `FormData` par un champ caché.** `AssetPicker` est un composant contrôlé, sa valeur n'atteint pas l'action toute seule : rendre `<input type="hidden" name="coverFilename" value={selected ?? ''} />` à côté de lui, comme les tags le font avec `tagIds`. Sans lui, `formData.get('coverFilename')` du sub-project `11` lit toujours une chaîne vide et le scénario 8 échoue.

7. **Retour à la liste après enregistrement.** Le scénario 1 de la spec l'exige (« on est redirigé vers la liste, où il figure ») et rien ne le produit aujourd'hui : les actions du sub-project `11` retournent `{ ok: true, savedId }` sans rediriger. Un `useEffect` sur `state.ok` qui appelle `router.push('/admin/projets')`, la redirection appartenant à l'interface et non à l'action, qui doit rester réutilisable.

Les formats sont des `Checkbox` shadcn partageant `name="formats"`, ce qui produit les valeurs multiples lues par `getAll`. Le composant Radix ne soumet rien de lui-même : lui passer `name` et `value` pour qu'il monte l'input caché correspondant. `deliverablesCount` porte `defaultValue={1}` : un champ vidé produit `Number('')`, soit `0`, et le schéma acceptant désormais `0`, cet oubli s'enregistrerait en silence.

**Trois `Select` imposent `onSubmit` + `startTransition`.** Statut, mode de travail et statut de contrat perdraient leur valeur au premier envoi si le formulaire soumettait par `<form action>` : React le réinitialise après l'action, et Radix Select répond à ce `reset` en rappelant `onValueChange` avec sa valeur du premier rendu. Le formulaire soumet donc :

```typescript
function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
  event.preventDefault()
  const formData = new FormData(event.currentTarget)
  startTransition(() => {
    formAction(formData)
  })
}
```

comme `TagFormDialog` (`src/components/features/admin/tags/TagFormDialog.tsx`, `.claude/rules/shadcn-ui/components.md`).

- [ ] **Step 2: Vérifier typage et lint**

```bash
just typecheck && just lint
```

Expected: aucune erreur.

---

### Task 4 : Page de création

**Files:**
- Modify: `src/app/admin/(protected)/projets/nouveau/page.tsx`

**Interfaces:**
- Consomme : `<ProjectForm />` (Task 3), `<AdminBreadcrumb />` (Task 1), les requêtes d'administration des tags et des entreprises.
- Produit : la page `/admin/projets/nouveau`.

> **Les deux pages de ce sub-project lisent des données dynamiques : leur chargement passe sous `<Suspense>`.** Avec `cacheComponents: true`, une lecture ni cachée ni suspendue lève `"Uncached data was accessed outside of <Suspense>"` et fait échouer le build. Le motif est le même dans les deux cas : un sous-composant `async` porte le `Promise.all` et rend le formulaire, la page ne garde que le fil d'Ariane, le `<Suspense>` et son `StackedSkeleton`, aux hauteurs des blocs de champs. `docs/DESIGN.md` en fait le composant de fallback de `<Suspense>` : il empile des `Skeleton` aux hauteurs passées en props, il n'y a pas de squelette à écrire. `src/app/[locale]/(public)/projets/[slug]/page.tsx` en donne la forme exacte, à relire avant d'écrire. Ne pas prendre `(public)/projets/page.tsx` pour modèle : sa query est en `'use cache'`, donc il ne porte aucun `<Suspense>`. Le bloc de code ci-dessous montre le chargement, pas la structure finale de la page.

- [ ] **Step 1: Remplacer la page d'attente**

**Reprendre à l'identique la forme de `src/app/admin/(protected)/entreprises/nouvelle/page.tsx`** (sub-project `08`), l'écran plein frère de celui-ci : `await getCurrentUser()` dans la page, un sous-composant async qui porte le `Promise.all`, le fil d'ariane et le formulaire, un `<Suspense>` dont le fallback est un `StackedSkeleton`, et le conteneur `w-full px-4 py-6 md:px-6 lg:py-8`. Le lire avant d'écrire.

```typescript
async function NewProjectSection() {
  const [tags, companies, coverAssets] = await Promise.all([
    findAllTagsForAdmin(),
    findAllCompaniesForAdmin(),
    listAssets('projets/'),
  ])

  return (
    <div className="flex flex-col gap-6">
      <AdminBreadcrumb
        items={[
          { label: 'Projets', href: '/admin/projets' },
          { label: 'Nouveau projet' },
        ]}
      />
      <ProjectForm project={null} tags={tags} companies={companies} coverAssets={coverAssets} />
    </div>
  )
}
```

Les trois requêtes sont parallélisées : elles ne dépendent pas les unes des autres. `listAssets` et non `listAdminAssets` : les couvertures vivent dans le bucket public, sous `projets/client/` et `projets/personal/` (`isProjectAssetKey`, `src/lib/schemas/asset.ts`). Pas de `h1` séparé dans la page : `ProjectForm` (Task 3) porte son propre titre, dans la rangée d'en-tête qui accueille aussi « Annuler » et « Enregistrer ».

---

### Task 5 : Page d'édition

**Files:**
- Modify: `src/app/admin/(protected)/projets/[id]/page.tsx`

**Interfaces:**
- Consomme : `findProjectForAdmin` (sub-project `11`), `<ProjectForm />` (Task 3), `<AdminBreadcrumb />` (Task 1).
- Produit : la page `/admin/projets/[id]`.

- [ ] **Step 1: Remplacer la page d'attente**

**Même forme que la Task 4**, sur le modèle de `src/app/admin/(protected)/entreprises/[id]/page.tsx` : la page déballe `params` et appelle `getCurrentUser()`, le sous-composant async reçoit l'identifiant et porte le chargement.

```typescript
async function EditProjectSection({ id }: { id: string }) {
  const [project, tags, companies, coverAssets] = await Promise.all([
    findProjectForAdmin(id),
    findAllTagsForAdmin(),
    findAllCompaniesForAdmin(),
    listAssets('projets/'),
  ])
  if (!project) notFound()

  return (
    <div className="flex flex-col gap-6">
      <AdminBreadcrumb
        items={[{ label: 'Projets', href: '/admin/projets' }, { label: project.titleFr }]}
      />
      <ProjectForm project={project} tags={tags} companies={companies} coverAssets={coverAssets} />
    </div>
  )
}
```

`notFound()` traite l'identifiant inconnu par une 404 propre plutôt qu'une erreur de rendu.

Le fil d'ariane affiche le titre du projet, ce qu'une dérivation depuis le `pathname` n'aurait pas pu faire sans requête supplémentaire. Pas de `h1` séparé ici non plus : `ProjectForm` affiche `project.titleFr` dans sa propre rangée d'en-tête.

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

- [ ] **Step 2: Vérifier que la méta client reste active quel que soit le type**

Basculer le type sur client, puis à nouveau sur personnel.

Expected: les cinq champs de méta client restent actifs et conservent leur valeur dans les deux sens. Aucune boîte de confirmation ne s'ouvre.

- [ ] **Step 3: Vérifier le repeuplement après erreur**

Remplir largement le formulaire, laisser l'entreprise vide, enregistrer.

Expected: l'erreur apparaît sous le champ d'entreprise et **aucune autre valeur n'est perdue**.

- [ ] **Step 4: Vérifier l'ajout, le réordonnancement et le retrait des tags**

Ajouter trois tags par le Combobox dans un ordre choisi, en glisser un à une autre position, retirer le dernier, enregistrer, rouvrir le projet.

```sql
SELECT t.slug, pt."displayOrder" FROM "ProjectTag" pt
JOIN "Tag" t ON t.id = pt."tagId"
JOIN "Project" p ON p.id = pt."projectId"
WHERE p.slug = '<slug>' ORDER BY pt."displayOrder";
```

Expected: l'ordre en base correspond à l'ordre final de la liste, sans trou après le retrait.

- [ ] **Step 5: Vérifier le sélecteur de couverture**

Ouvrir le sélecteur.

Expected: seuls les assets du dossier `projets/` sont proposés, pas les CV.

- [ ] **Step 6: Vérifier la bascule de type**

Modifier un projet client existant, passer son type sur personnel, enregistrer, rouvrir le projet.

Expected: aucune boîte de confirmation. Le type est passé à personnel et la méta client est intacte : entreprise, mode de travail, statut de contrat, taille d'équipe et nombre de livrables inchangés.

- [ ] **Step 7: Vérifier la préservation en modification**

Modifier uniquement le titre français d'un projet complet, enregistrer.

```sql
SELECT "coverFilename", "caseStudyMarkdownFr", "githubUrl", "displayOrder"
FROM "Project" WHERE slug = '<slug>';
```

Expected: tous ces champs sont inchangés.

- [ ] **Step 8: Vérifier la 404**

Demander `/admin/projets/identifiant-inexistant`.

Expected: une 404 propre.

- [ ] **Step 9: Vérifier la publication**

Passer un projet en publié, puis consulter `/fr/projets`.

Expected: il y apparaît. Son absence signalerait que `updateTag('projects')` n'a pas fonctionné.

- [ ] **Step 10: Vérifier sur téléphone**

Réduire la fenêtre sous 768 pixels et parcourir le formulaire.

Expected: une seule colonne, dans l'ordre contenu puis latérale, tous les champs utilisables, aucun défilement horizontal, et les zones de markdown restent lisibles.

- [ ] **Step 11: Vérifier le nombre de livrables**

Créer un projet client sans toucher au champ du nombre de livrables, puis en créer un second en vidant ce champ.

Expected: le premier s'enregistre avec la valeur 1. Le second affiche un message de validation compréhensible sous le champ, pas une erreur technique.

- [ ] **Step 12: Lancer la suite**

```bash
just test
```

Expected: tous les tests verts.

- [ ] **Step 13: Noter le sort du seed pour la clôture de l'epic**

L'espace admin devient la source du contenu à l'issue de ce sub-project. `docs/PRODUCTION.md` § Checklist Post-MEP annonce que le Schedule Dokploy `manual-seed` « disparaîtra le jour où le CRUD admin deviendra la source du contenu ». Le risque est concret : après une restauration, un re-seed en `upsert` écraserait tout ce qui a été édité depuis l'admin.

Le retrait n'a pas lieu ici mais au `/finalize-feature` de l'epic, une fois le CRUD vérifié de bout en bout. Trois gestes à ce moment-là :

1. supprimer le Schedule `manual-seed` dans Dokploy ;
2. rendre le seed non écrasant, création seule, pour qu'il reste utilisable au bootstrap d'une base vide ;
3. mettre `docs/PRODUCTION.md` à jour, la ligne annonçant la disparition devenant le constat qu'elle a eu lieu.

Le seed du build CI de `deploy.yml` n'est pas concerné : il ne sert qu'au prerender sur une base éphémère.

- [ ] **Step 14: Demander la validation avant commit**

Ne pas committer sans accord explicite de l'utilisateur sur le périmètre et le message. Message proposé :

```
feat(admin): formulaire de création et d'édition des projets
```
