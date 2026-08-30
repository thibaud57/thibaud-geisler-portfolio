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
- Create: `src/components/layout/AdminBreadcrumb.tsx`

**Interfaces:**
- Consomme : rien.
- Produit : `<AdminBreadcrumb items={{ label: string; href?: string }[]} />`, monté par les pages des Tasks 4 et 5.

- [ ] **Step 1: Installer le composant**

```bash
pnpm dlx shadcn@latest add breadcrumb
```

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
- chaque tag est une case à cocher, **jamais** un `Command` : son état sélectionné est incorrect en `radix-nova`
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
  trigger={<Button variant="outline" size="icon" aria-label="Nouvelle entreprise">+</Button>}
  onCreated={(id) => setCompanyId(id)}
/>
```

C'est l'usage pour lequel ce composant a été écrit au sub-project `08`. `onCreated` sélectionne l'entreprise créée sans rechargement, donc sans perdre la saisie du projet en cours.

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
- Consomme : `createProject`, `updateProject` (sub-project `11`), `<ProjectTagsField />` et `<ClientMetaFields />` (Task 2), `<AssetPicker />` (sub-project `10`).
- Produit : `<ProjectForm project={ProjectWithRelations | null} tags={Tag[]} companies={...} legalEntities={...} />`, monté par les pages des Tasks 4 et 5.

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
| Couverture | `AssetPicker` restreint au préfixe `projets/` |
| Méta client | `ClientMetaFields`, affiché seulement si le type vaut `CLIENT` |

**Quatre comportements non négociables :**

1. **Repeuplement après erreur.** Chaque champ tire son `defaultValue` de `state.values` s'il existe, sinon du projet, sinon vide. Un formulaire de cette taille qui perd la saisie sur une erreur de validation est inutilisable.

2. **Erreur sous chaque champ**, depuis `state.errors`, et pas seulement un message global.

3. **Avertissement à la bascule vers personnel.** Quand on édite un projet qui avait une méta client et qu'on passe le type sur `PERSONAL`, afficher un avertissement avant enregistrement : la méta sera supprimée définitivement. Le sub-project `11` l'exécute sans broncher, c'est l'interface qui doit prévenir.

4. **Le bouton de soumission est désactivé pendant `pending`**, un enregistrement double créerait un conflit de slug.

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
    <div>
      <AdminBreadcrumb
        items={[
          { label: 'Projets', href: '/admin/projets' },
          { label: 'Nouveau projet' },
        ]}
      />
      <h1 className="mt-4 text-2xl font-semibold">Nouveau projet</h1>
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
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const [project, tags, companies, legalEntities] = await Promise.all([
    findProjectForAdmin(id),
    findAllTagsForAdmin(),
    findAllCompaniesForAdmin(),
    findAvailableLegalEntities(),
  ])

  if (!project) notFound()

  return (
    <div>
      <AdminBreadcrumb
        items={[
          { label: 'Projets', href: '/admin/projets' },
          { label: project.titleFr },
        ]}
      />
      <h1 className="mt-4 text-2xl font-semibold">{project.titleFr}</h1>
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
