# Formulaire de la fiche entreprise enrichie : Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Saisir depuis le formulaire entreprise les champs CRM ajoutés au modèle : types, zones, statut de la relation, notes (ligne courte) et détails (markdown, éditeur Pages CMS Editor), ce dernier partagé avec l'étude de cas des projets.

**Architecture:** `CompanyForm` garde sa grille à deux colonnes. La colonne principale réordonne Identité (nom avant slug, zones triées) et Classification (types en cases avec glyphe, secteurs), puis gagne une card Détails et l'emplacement d'une prop `relatedCards` ; la colonne latérale reçoit une nouvelle card Relation (composant `CompanyRelationCard`, statut avec glyphe), le Logo inchangé, une card Notes réduite à un `Input` d'une ligne, puis la card Entité légale déplacée depuis la colonne principale (contenu inchangé, propriété du `05`). Chaque liste envoie toujours un champ caché vide pour que l'action du `02` distingue « vidé » de « absent ». L'éditeur Pages CMS Editor (Tiptap, ADR-024) s'installe par la CLI shadcn et se partage avec l'étude de cas des projets (`ProjectForm.tsx`).

**Tech Stack:** Next.js 16 (Server Components pour les pages, Client Component pour le formulaire), React 19, shadcn/ui `radix-nova` (Select, Checkbox), Pages CMS Editor (Tiptap) pour les champs markdown.

**Spec:** `docs/superpowers/specs/domaine-freelance-crm/03-formulaire-entreprise-enrichi-design.md`

## Global Constraints

- **Prérequis** : le plan du `02` est implémenté (enums, champs `types`, `relationStatus`, `zones`, `notes` (200 caractères au plus), `details`, libellés, `optionalStringValues`).
- **Noms des champs du `FormData`** : `types`, `zones` (listes), `relationStatus`, `size`, `notes`, `details`.
- **Sentinelle** : chaque liste (`types`, `zones`) rend en permanence `<input type="hidden" name="<liste>" value="" />`.
- **Éditeur** : installé par `npx shadcn@latest add https://editor.pagescms.org/r/editor.json`, employé avec `format="markdown"` et `enableImages={false}`, corrections post-install de `.claude/rules/shadcn-ui/setup.md` (import `cn`, paquet `cn` retiré) appliquées avant tout commit.
- **Gabarit** : `COMPANY_DETAILS_TEMPLATE` (`src/lib/details-templates.ts`) ne pré-remplit Détails qu'à la création, jamais sur une fiche existante.
- **Libellés exacts** : aide « Au moins un type est requis. », aide « Une ligne de marqueurs, séparés par | », message « Les notes tiennent sur une ligne (200 caractères au plus) ».
- **Arbitrages DESIGN.md** : `gap-4`, `sm:grid-cols-2` pour deux champs courts, multi-sélection en pleine largeur.
- **Admin monolingue** : libellés en dur ou depuis `src/lib/companies.ts`, jamais via next-intl.
- **Aucun commit** : `/implement-subproject` porte le commit unique, que le propriétaire valide.

**Rules :** `.claude/rules/nextjs/server-client-components.md`, `.claude/rules/nextjs/data-fetching.md`, `.claude/rules/shadcn-ui/components.md`, `.claude/rules/shadcn-ui/setup.md`, `.claude/rules/tailwind/conventions.md`, `.claude/rules/react/hooks.md`, `.claude/rules/design/claude-design.md`.

## Review Focus

- **Sentinelle oubliée sur une liste** : vider toutes les zones n'enverrait plus la clé `zones`, et l'action garderait les anciennes. Vérifié à la Task 4, Step 3.
- **Libellé relié à l'éditeur** : Pages CMS Editor documente `value`, `onChange`, `format`, `disabled`, `enableImages`, `className` et `editorClassName` (README de `github.com/pagescms/editor`, lu le 2026-09-27), sans `id` ni attributs `aria-*`. Le fichier copié est donc étendu à la Task 3, Step 1 pour les transmettre à la zone d'édition : sans cela, le libellé et le message d'erreur du `FormField` ne sont plus annoncés par un lecteur d'écran. Vérifié à la Task 4 par le clic sur le libellé, qui doit placer le curseur dans l'éditeur.
- **Gabarit rejoué sur une fiche existante** : `COMPANY_DETAILS_TEMPLATE` ne doit apparaître qu'à la création, jamais réinjecté sur une fiche dont `details` est déjà vide. Vérifié à la Task 4, Step 5.
- **Entité légale déplacée sans régression** : seul son emplacement bouge (colonne latérale, sous Notes) ; son contenu, sa validation et ses props restent ceux du `05`. Vérifié à la Task 4, Step 1.
- **Détails et Notes sans `FormField`** : le `CardTitle` porte l'`id` référencé par `aria-labelledby`, sinon le champ perd son libellé accessible. Vérifié à la Task 4, Step 6 par l'inspection du nom accessible de chaque champ.

---

### Task 1 : Type de détail d'une entreprise

**Files:**
- Modify: `src/server/queries/companies.ts`

**Interfaces:**
- Consumes: `findCompanyByIdForAdmin` (existant, inchangé depuis le `02`)
- Produces: type `AdminCompanyDetail`

- [ ] **Step 1 : Ajouter le type**

À la fin de `src/server/queries/companies.ts` :

```ts
export type AdminCompanyDetail = NonNullable<Awaited<ReturnType<typeof findCompanyByIdForAdmin>>>
```

- [ ] **Step 2 : Vérifier le typage**

Run: `just typecheck`
Expected: aucune erreur (le type n'est pas encore consommé).

---

### Task 2 : Card Relation

**Files:**
- Modify: `src/lib/companies.ts` (`COMPANY_SECTION_TITLES`)
- Create: `src/components/features/admin/companies/CompanyRelationCard.tsx`

**Interfaces:**
- Consumes: `COMPANY_FIELD_LABELS`, `COMPANY_SIZE_LABELS`, `RELATION_STATUS_LABELS`, `COMPANY_STATUS_ICONS` (`@/lib/companies`), `COMPANY_SIZES`, `RELATION_STATUSES`, `NONE_VALUE` (`@/lib/schemas/company`)
- Produces: `CompanyRelationCard` et ses props :

```ts
interface Props {
  formId: string
  errors: CompanyFormState["errors"]
  defaults: {
    relationStatus: RelationStatus
    size: CompanySize | null
  }
}
```

- [ ] **Step 1 : Titres de card**

Dans `src/lib/companies.ts`, remplacer `COMPANY_SECTION_TITLES` par :

```ts
export const COMPANY_SECTION_TITLES = {
  identity: "Identité",
  classification: "Classification",
  details: "Détails",
  relation: "Relation",
  logo: "Logo",
  notes: "Notes",
  legalEntity: "Entité légale",
} as const
```

- [ ] **Step 2 : Créer `CompanyRelationCard`**

```tsx
"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FormField } from "@/components/ui/form-field"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import type { CompanySize, RelationStatus } from "@/generated/prisma/client"
import {
  COMPANY_FIELD_LABELS,
  COMPANY_SECTION_TITLES,
  COMPANY_SIZE_LABELS,
  COMPANY_STATUS_ICONS,
  RELATION_STATUS_LABELS,
} from "@/lib/companies"
import { COMPANY_SIZES, NONE_VALUE, RELATION_STATUSES } from "@/lib/schemas/company"
import type { CompanyFormState } from "@/server/actions/companies.types"

interface Props {
  formId: string
  errors: CompanyFormState["errors"]
  defaults: {
    relationStatus: RelationStatus
    size: CompanySize | null
  }
}

export function CompanyRelationCard({ formId, errors, defaults }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{COMPANY_SECTION_TITLES.relation}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        <FormField
          id={`${formId}-relationStatus`}
          label={COMPANY_FIELD_LABELS.relationStatus}
          errors={errors.relationStatus}
        >
          <Select name="relationStatus" defaultValue={defaults.relationStatus}>
            <SelectTrigger
              id={`${formId}-relationStatus`}
              className="w-full"
              aria-invalid={!!errors.relationStatus?.length}
              aria-describedby={`${formId}-relationStatus-error`}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RELATION_STATUSES.map((status) => {
                const Icon = COMPANY_STATUS_ICONS[status]
                return (
                  <SelectItem key={status} value={status}>
                    {Icon ? <Icon aria-hidden data-icon="inline-start" /> : null}
                    {RELATION_STATUS_LABELS[status]}
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>
        </FormField>

        <FormField id={`${formId}-size`} label={COMPANY_FIELD_LABELS.size} errors={errors.size}>
          <Select name="size" defaultValue={defaults.size ?? NONE_VALUE}>
            <SelectTrigger
              id={`${formId}-size`}
              className="w-full"
              aria-invalid={!!errors.size?.length}
              aria-describedby={`${formId}-size-error`}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE_VALUE}>Non renseignée</SelectItem>
              {COMPANY_SIZES.map((size) => (
                <SelectItem key={size} value={size}>
                  {COMPANY_SIZE_LABELS[size]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 3 : Vérifier le typage**

Run: `just typecheck`
Expected: aucune erreur dans `CompanyRelationCard.tsx` (le composant n'est pas encore utilisé).

---

### Task 3 : Éditeur et formulaire

**Files:**
- Create: composants copiés par `npx shadcn@latest add https://editor.pagescms.org/r/editor.json` sous `src/components/ui/` (Pages CMS Editor, ADR-024)
- Create: `src/lib/details-templates.ts`
- Modify: `src/lib/typography.ts` (`ADMIN_MARKDOWN_CLASS`)
- Modify: `src/components/features/admin/companies/CompanyForm.tsx`
- Modify: `src/components/features/admin/projects/ProjectForm.tsx`
- Modify: `docs/DESIGN.md`

**Interfaces:**
- Consumes: `CompanyRelationCard` (Task 2), `AdminCompanyDetail` (Task 1), `COMPANY_TYPES` (`@/lib/schemas/company`), `COMPANY_TYPE_LABELS`, `COMPANY_TYPE_ICONS` (`@/lib/companies`), `ZONES`, `ZONE_LABELS`, `sortZones` (`@/lib/zones`)
- Produces: `CompanyForm` avec les props `company: AdminCompanyDetail | null`, `legalEntities`, `logoAssets`, `relatedCards?: React.ReactNode` ; `COMPANY_DETAILS_TEMPLATE` (`@/lib/details-templates`) ; l'éditeur Pages CMS Editor, employé par `CompanyForm` et `ProjectForm` ; `ADMIN_MARKDOWN_CLASS: string` (`@/lib/typography`), échelle des champs markdown de l'admin

- [ ] **Step 1 : Installer l'éditeur Pages CMS Editor**

Run: `npx shadcn@latest add https://editor.pagescms.org/r/editor.json`
Expected: les fichiers du registre (Tiptap, extensions, `tippy.js`) copiés sous `src/components/ui/`, `pnpm-lock.yaml` mis à jour.

Corrections post-install (`.claude/rules/shadcn-ui/setup.md`), sur chaque fichier copié :
- réécrire tout `import { cn } from "cn"` en `import { cn } from "@/lib/utils"`
- `pnpm remove cn`
- corriger toute violation de `noPropertyAccessFromIndexSignature` (notation crochet) révélée par `just typecheck`

Run: `just typecheck`
Expected: aucune erreur dans les fichiers copiés. Noter le chemin et le nom exporté du composant (les steps suivantes supposent `Editor` depuis `@/components/ui/editor`).

Le composant est contrôlé : `value` (le markdown courant) et `onChange(value: string)`, avec `format="markdown"` et `enableImages={false}` (ADR-024). Il ne reçoit ni `id` ni attributs `aria-*` : dans le fichier copié, ajouter les props `id`, `aria-invalid` et `aria-describedby` et les passer à la zone d'édition Tiptap par `editorProps.attributes`, pour que le libellé et l'erreur du `FormField` restent reliés au champ.

Échelle compacte, décidée par le propriétaire le 2026-10-01 : ajouter à la fin de `src/lib/typography.ts` :

```ts
// Échelle compacte des champs markdown de l'admin (docs/DESIGN.md, Champ markdown), commune à
// l'éditeur et à la lecture : relire puis modifier montre le même texte à la même taille.
export const ADMIN_MARKDOWN_CLASS = [
  "prose prose-sm max-w-none dark:prose-invert text-sm leading-relaxed",
  "prose-h1:mt-5 prose-h1:mb-1.5 prose-h1:text-lg prose-h1:font-semibold",
  "prose-h2:mt-3.5 prose-h2:mb-1 prose-h2:text-base prose-h2:font-semibold",
  "prose-h3:mt-3 prose-h3:mb-1 prose-h3:text-sm prose-h3:font-semibold",
  "prose-p:my-1.5 prose-ul:my-1.5 prose-ol:my-1.5 prose-li:my-0.5",
  "prose-blockquote:my-2 prose-blockquote:border-l-2 prose-blockquote:pl-3 prose-blockquote:font-normal prose-blockquote:not-italic prose-blockquote:text-muted-foreground",
  "[&>:first-child]:mt-0 [&>:last-child]:mb-0",
].join(" ")
```

Puis, dans le fichier copié, appliquer `ADMIN_MARKDOWN_CLASS` à la zone d'édition Tiptap, fusionné par `cn` avec `editorClassName` : tous les champs markdown de l'admin (Détails, étude de cas) prennent cette échelle sans que chaque appel la passe. La lecture des Détails la reprend (`MarkdownContent` en variante `admin`, plan `04`).

- [ ] **Step 2 : Créer le gabarit Détails**

Créer `src/lib/details-templates.ts` :

```ts
// Titres seuls, séparés d'une ligne vide : le propriétaire remplit le corps depuis l'éditeur.
export const COMPANY_DETAILS_TEMPLATE = `# 🏢 À propos

# 📊 Chiffres clés

# 🌐 Activités

# 🤝 Contexte de la relation

# 🔗 Liens

# 📝 Notes libres
`
```

- [ ] **Step 3 : Imports et props**

Dans `src/components/features/admin/companies/CompanyForm.tsx` :

- ajouter les imports :

```tsx
import { CompanyRelationCard } from "@/components/features/admin/companies/CompanyRelationCard"
import { Checkbox } from "@/components/ui/checkbox"
import { Editor } from "@/components/ui/editor"
import { COMPANY_DETAILS_TEMPLATE } from "@/lib/details-templates"
import { sortZones, ZONE_LABELS, ZONES } from "@/lib/zones"
import type { AdminCompanyDetail } from "@/server/queries/companies"
```

(le chemin et le nom exporté `Editor` sont ceux constatés à la Step 1 ; les corriger ici si le composant installé en porte d'autres.)

- remplacer l'import de `@/lib/companies` par :

```tsx
import {
  COMPANY_FIELD_LABELS,
  COMPANY_SECTION_TITLES,
  COMPANY_SECTOR_LABELS,
  COMPANY_TYPE_ICONS,
  COMPANY_TYPE_LABELS,
} from "@/lib/companies"
```

- remplacer l'import de `@/lib/schemas/company` par :

```tsx
import { COMPANY_SECTORS, COMPANY_TYPES, NONE_VALUE } from "@/lib/schemas/company"
```

- remplacer `import type { Company, LegalEntity } from "@/generated/prisma/client"` par `import type { LegalEntity, Zone } from "@/generated/prisma/client"`. Les imports de `Select` restent : la card Entité légale s'en sert encore.

- après `SECTOR_OPTIONS`, ajouter :

```tsx
const ZONE_OPTIONS = ZONES.map((value) => ({ value, label: ZONE_LABELS[value] }))
```

- remplacer `interface Props` par :

```tsx
interface Props {
  company: AdminCompanyDetail | null
  legalEntities: Pick<LegalEntity, "id" | "name">[]
  logoAssets: AssetEntry[]
  relatedCards?: React.ReactNode
}
```

- [ ] **Step 4 : État du formulaire**

Remplacer la signature et les `useState` du début du composant par :

```tsx
export function CompanyForm({ company, legalEntities, logoAssets, relatedCards }: Props) {
  const router = useRouter()
  const formId = useId()
  const action = company ? updateCompany.bind(null, company.id) : createCompany
  const [state, formAction, pending] = useActionState(action, initialCompanyFormState)
  const [sectors, setSectors] = useState<string[]>(company?.sectors ?? [])
  const [types, setTypes] = useState<string[]>(company?.types ?? [])
  const [zones, setZones] = useState<string[]>(company?.zones ?? [])
  // Le gabarit ne s'applique qu'à la création : une fiche existante garde son contenu enregistré, vide ou non.
  const [details, setDetails] = useState(company ? company.details ?? "" : COMPANY_DETAILS_TEMPLATE)
  const [logoFilename, setLogoFilename] = useState<string | null>(company?.logoFilename ?? null)
  const { showImage: showLogo, onError: onLogoError } = useImageFallback(logoFilename)

  function toggleType(type: string, checked: boolean) {
    setTypes((current) =>
      checked ? [...current, type] : current.filter((value) => value !== type),
    )
  }
```

Le `useEffect`, `handleSubmit` et `sectorsError` restent inchangés.

- [ ] **Step 5 : Card Identité**

Dans la card Identité, inverser l'ordre des deux premiers `FormField` (nom avant slug, décision du propriétaire, 2026-10-02) et retirer l'aide du slug : sur le `FormField` du slug, retirer `help="Identifiant d'URL, minuscules et tirets."` puis, dans son `aria-describedby`, retirer `${formId}-slug-help` (ne garde que `${formId}-slug-error`).

Puis envelopper le `FormField` du site web dans `<div className="sm:col-span-2">…</div>`, puis ajouter après lui :

```tsx
              <div className="sm:col-span-2">
                <FormField
                  id={`${formId}-zones`}
                  label={COMPANY_FIELD_LABELS.zones}
                  errors={state.errors.zones}
                >
                  <MultiSelectCombobox
                    id={`${formId}-zones`}
                    name="zones"
                    options={ZONE_OPTIONS}
                    selected={zones}
                    onChange={(values) => setZones(sortZones(values as Zone[]))}
                    placeholder="Ajouter une zone"
                    searchPlaceholder="Chercher une zone"
                    emptyMessage="Aucune zone ne correspond."
                    ariaInvalid={!!state.errors.zones?.length}
                    ariaDescribedby={`${formId}-zones-error`}
                  />
                  <input type="hidden" name="zones" value="" />
                </FormField>
              </div>
```

- [ ] **Step 6 : Card Classification**

Remplacer tout le contenu de la card Classification (du `CardHeader` à la fin du `CardContent`) par :

```tsx
            <CardHeader>
              <CardTitle>{COMPANY_SECTION_TITLES.classification}</CardTitle>
              <CardDescription>
                Cochez les types, cherchez puis ajoutez les secteurs.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <span id={`${formId}-types-label`} className="text-sm font-medium">
                  {COMPANY_FIELD_LABELS.types}
                </span>
                <div
                  role="group"
                  aria-labelledby={`${formId}-types-label`}
                  aria-describedby={`${formId}-types-error ${formId}-types-help`}
                  className="grid grid-cols-2 gap-x-3 gap-y-2 sm:grid-cols-3"
                >
                  {COMPANY_TYPES.map((type) => {
                    const Icon = COMPANY_TYPE_ICONS[type]
                    return (
                      <label
                        key={type}
                        className="-mx-2 flex min-h-8 cursor-pointer items-center gap-2 rounded-sm px-2 text-sm hover:bg-accent hover:text-accent-foreground"
                      >
                        <Checkbox
                          checked={types.includes(type)}
                          onCheckedChange={(checked) => {
                            toggleType(type, checked === true)
                          }}
                          aria-invalid={!!state.errors.types?.length}
                        />
                        {Icon ? <Icon aria-hidden data-icon="inline-start" /> : null}
                        {COMPANY_TYPE_LABELS[type]}
                      </label>
                    )
                  })}
                </div>
                {types.map((type) => (
                  <input key={type} type="hidden" name="types" value={type} />
                ))}
                <input type="hidden" name="types" value="" />
                <div id={`${formId}-types-error`} aria-live="polite">
                  {state.errors.types?.[0] ? (
                    <p className="text-sm text-destructive">{state.errors.types[0]}</p>
                  ) : null}
                </div>
                <p id={`${formId}-types-help`} className="text-xs text-muted-foreground">
                  Au moins un type est requis.
                </p>
              </div>
              <FormField
                id={`${formId}-sectors`}
                label={COMPANY_FIELD_LABELS.sectors}
                errors={state.errors.sectors}
              >
                <MultiSelectCombobox
                  id={`${formId}-sectors`}
                  name="sectors"
                  options={SECTOR_OPTIONS}
                  selected={sectors}
                  onChange={setSectors}
                  placeholder="Ajouter un secteur"
                  searchPlaceholder="Chercher un secteur"
                  emptyMessage="Aucun secteur ne correspond."
                  ariaInvalid={!!sectorsError}
                  ariaDescribedby={`${formId}-sectors-error`}
                />
              </FormField>
            </CardContent>
```

Le `Select` de taille disparaît de cette card : il vit désormais dans `CompanyRelationCard`.

- [ ] **Step 7 : Card Détails et `relatedCards`**

Dans la colonne principale, après la card Classification (désormais dernière carte de cette colonne) et avant le `</div>` qui la referme, ajouter :

```tsx
          <Card>
            <CardHeader>
              <CardTitle id={`${formId}-details-title`}>
                {COMPANY_SECTION_TITLES.details}
              </CardTitle>
              <CardDescription>
                Corps de la fiche. Raccourcis : « # » un titre, « - » une liste, « &gt; » une
                citation, « / » le menu des blocs.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <Editor
                id={`${formId}-details`}
                aria-labelledby={`${formId}-details-title`}
                format="markdown"
                enableImages={false}
                value={details}
                onChange={setDetails}
                aria-invalid={!!state.errors.details?.length}
                aria-describedby={`${formId}-details-error`}
              />
              <div id={`${formId}-details-error`} aria-live="polite">
                {state.errors.details?.[0] ? (
                  <p className="text-sm text-destructive">{state.errors.details[0]}</p>
                ) : null}
              </div>
              <input type="hidden" name="details" value={details} />
            </CardContent>
          </Card>

          {relatedCards}
```

La card Détails ne reprend plus `FormField` : le `CardTitle` porte l'`id` et sert de libellé par `aria-labelledby`, pour ne pas répéter « Détails » (décision du propriétaire, 2026-10-02). `relatedCards` reste `undefined` tant qu'aucun sub-project ne le passe (Leads au `08`, Opportunités au `15`, Signaux au `19`) : React ne rend rien dans ce cas.

- [ ] **Step 8 : Déplacer Entité légale, colonne latérale**

Déplacer tout le bloc `<Card>` de l'Entité légale (contenu inchangé, propriété du `05`) de la colonne principale vers la fin de la colonne latérale, après la card Notes.

Dans la colonne latérale (`<div className="flex min-w-0 flex-col gap-4 lg:sticky lg:top-18">`), insérer avant la card Logo :

```tsx
          <CompanyRelationCard
            formId={formId}
            errors={state.errors}
            defaults={{
              relationStatus: company?.relationStatus ?? "ACTIVE",
              size: company?.size ?? null,
            }}
          />
```

et après la card Logo, avant la card Entité légale déplacée :

```tsx
          <Card>
            <CardHeader>
              <CardTitle id={`${formId}-notes-title`}>{COMPANY_SECTION_TITLES.notes}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <Input
                id={`${formId}-notes`}
                name="notes"
                aria-labelledby={`${formId}-notes-title`}
                defaultValue={company?.notes ?? ""}
                placeholder="Leader assurance Luxembourg | Scala/Angular"
                aria-invalid={!!state.errors.notes?.length}
                aria-describedby={`${formId}-notes-error ${formId}-notes-help`}
              />
              <div id={`${formId}-notes-error`} aria-live="polite">
                {state.errors.notes?.[0] ? (
                  <p className="text-sm text-destructive">{state.errors.notes[0]}</p>
                ) : null}
              </div>
              <p id={`${formId}-notes-help`} className="text-xs text-muted-foreground">
                Une ligne de marqueurs, séparés par |
              </p>
            </CardContent>
          </Card>
```

La card Notes ne reprend plus `FormField`, même raison que Détails. Le `Label` et l'import `FormField` restent utilisés par les autres champs du formulaire (slug, nom, site web, zones, sectors, types).

- [ ] **Step 9 : Basculer l'étude de cas des projets sur l'éditeur**

Dans `src/components/features/admin/projects/ProjectForm.tsx` :

- ajouter l'import :

```tsx
import { Editor } from "@/components/ui/editor"
```

(chemin et nom conformes à la Task 3, Step 1 ; `Textarea` reste importé, les champs Description FR/EN le gardent.)

- ajouter, à côté des autres `useState` du composant, un état contrôlé par langue :

```tsx
  const [caseStudyMarkdownFr, setCaseStudyMarkdownFr] = useState(defaultCaseStudyFr)
  const [caseStudyMarkdownEn, setCaseStudyMarkdownEn] = useState(defaultCaseStudyEn)
```

- remplacer les deux champs de la card `{PROJECT_SECTION_TITLES.caseStudy}` :

```tsx
              <FormField
                id={`${formId}-caseStudyMarkdownFr`}
                label={PROJECT_FIELD_LABELS.caseStudyMarkdownFr}
                errors={state.errors.caseStudyMarkdownFr}
              >
                <Editor
                  id={`${formId}-caseStudyMarkdownFr`}
                  format="markdown"
                  enableImages={false}
                  value={caseStudyMarkdownFr}
                  onChange={setCaseStudyMarkdownFr}
                  aria-invalid={!!state.errors.caseStudyMarkdownFr?.length}
                  aria-describedby={`${formId}-caseStudyMarkdownFr-error`}
                />
              </FormField>
              <input type="hidden" name="caseStudyMarkdownFr" value={caseStudyMarkdownFr} />
              <FormField
                id={`${formId}-caseStudyMarkdownEn`}
                label={PROJECT_FIELD_LABELS.caseStudyMarkdownEn}
                errors={state.errors.caseStudyMarkdownEn}
              >
                <Editor
                  id={`${formId}-caseStudyMarkdownEn`}
                  format="markdown"
                  enableImages={false}
                  value={caseStudyMarkdownEn}
                  onChange={setCaseStudyMarkdownEn}
                  aria-invalid={!!state.errors.caseStudyMarkdownEn?.length}
                  aria-describedby={`${formId}-caseStudyMarkdownEn-error`}
                />
              </FormField>
              <input type="hidden" name="caseStudyMarkdownEn" value={caseStudyMarkdownEn} />
```

- dans la `CardDescription` de cette card, remplacer « Markdown brut, une zone par langue. Le rendu se relit sur le site public. » par « Une zone par langue. Le rendu se relit sur le site public. » : la saisie n'est plus du markdown brut.

Les noms de champs `FormData` (`caseStudyMarkdownFr`, `caseStudyMarkdownEn`) ne changent pas : le schéma et l'action du projet restent inchangés.

- [ ] **Step 10 : Mapping de `docs/DESIGN.md`**

Charger le skill `design-doc`, puis déplacer dans `docs/DESIGN.md` la ligne « Champ markdown (admin) » de § Post-MVP (non installés) vers § Formulaires, à sa place alphabétique ou logique dans le tableau, en gardant son texte (composant `Editor`, librairie Pages CMS Editor, renvoi à l'ADR-024) et en l'adaptant si besoin au ton des lignes déjà installées de cette section (le composant n'est plus « à installer », il l'est).

Run: `just lint`
Expected: aucune erreur de formatage sur `docs/DESIGN.md`.

Les pages `src/app/admin/(protected)/entreprises/nouvelle/page.tsx` et `src/app/admin/(protected)/entreprises/[id]/page.tsx` ne changent pas : elles passent déjà `company`, `legalEntities` et `logoAssets` à `CompanyForm`.

- [ ] **Step 11 : Qualité**

Run: `just typecheck`
Expected: aucune erreur.

Run: `just lint`
Expected: aucune erreur (si le formatage échoue : `just format`, puis relancer).

---

### Task 4 : Parcours manuel

**Files:**
- Aucun fichier modifié

**Interfaces:**
- Consumes: Tasks 1 à 3
- Produces: rien

- [ ] **Step 1 : Démarrer**

Run: `just dev`, se connecter, ouvrir `http://localhost:3000/admin/entreprises/nouvelle`.
Expected: colonne principale Identité (nom et slug côte à côte, sans aide sous le slug, site web puis zones en pleine largeur), Classification (quatre cases de types avec leur glyphe, aide « Au moins un type est requis. », secteurs), Détails en dernière position avec l'éditeur pré-rempli par le gabarit ; colonne latérale Relation (statut avec son glyphe, taille), Logo, Notes (`Input` d'une ligne, aide « Une ligne de marqueurs, séparés par | »), Entité légale.

- [ ] **Step 2 : Création complète**

Cocher ESN / Recrutement, choisir deux zones, le statut Dormante, une taille, saisir une ligne de notes et des détails (titre, liste et citation formés à la frappe), enregistrer.
Expected: toast « Entreprise créée », retour à la liste. En rouvrant la fiche, chaque valeur est retrouvée, le markdown des détails identique.

- [ ] **Step 3 : Liste vidée**

Sur cette fiche, retirer les deux zones, enregistrer, rouvrir.
Expected: aucune zone.

- [ ] **Step 4 : Type obligatoire**

Sur une fiche, décocher tous les types et enregistrer.
Expected: « Sélectionne au moins un type » sous les types, rien n'est enregistré, les autres valeurs saisies restent affichées.

- [ ] **Step 5 : Gabarit à la création**

Ouvrir `http://localhost:3000/admin/entreprises/nouvelle`, puis la fiche d'une entreprise déjà enregistrée.
Expected: le champ Détails du formulaire de création est pré-rempli par `COMPANY_DETAILS_TEMPLATE` (titres seuls, séparés d'une ligne vide) ; celui d'une fiche existante affiche uniquement son contenu enregistré, jamais le gabarit. Puis `just stop`.

- [ ] **Step 6 : Build de production, sécurité et raccourcis**

Run: `just build`, puis `pnpm start` (aucune recette `just` dédiée au démarrage de production).
Ouvrir le formulaire entreprise (`/admin/entreprises/nouvelle`) et le formulaire projet (`/admin/projets/nouveau`), la console du navigateur ouverte.
Expected: aucune violation de politique de sécurité (CSP) dans la console.

Dans l'éditeur d'un des deux formulaires, taper `#` puis un espace en début de ligne (titre), `-` puis un espace (liste), `>` puis un espace (citation), et `/` (menu des blocs).
Expected: les trois raccourcis transforment la ligne, le menu `/` s'ouvre.

Dans les outils d'accessibilité du navigateur, inspecter le champ Détails puis le champ Notes.
Expected: chacun expose pour nom accessible le texte de sa card (« Détails », « Notes »), porté par `aria-labelledby` vers le `CardTitle`, sans libellé visible répété dans la card.

Saisir un texte markdown varié (titre, liste, citation), enregistrer, rouvrir la fiche.
Expected: l'éditeur montre la même mise en forme qu'à la saisie ; le markdown stocké peut avoir été normalisé par Tiptap (espaces, marques de liste), sans changement de rendu (ADR-024). Puis arrêter le serveur de production.
