# Liste des entreprises enrichie : Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Afficher et filtrer les entreprises selon leurs champs CRM, avec les vues Toutes, Travaillées et Recrutement et une vue détail alignée sur le formulaire.

**Architecture:** Même motif que la liste des projets : un type `CompanyView`, une table des colonnes visibles par vue dans `src/lib/admin-table-widths.ts`, une `CompaniesTable` qui filtre ses lignes et reconstruit ses colonnes selon la vue. Les trois pages partagent une coquille serveur `CompaniesViewPage`. `AdminCompany` gagne le dérivé `worked`, calculé dans `toAdminCompany` (`src/server/queries/companies.ts`) depuis les `ClientMeta` liés à un projet `CLIENT`.

**Tech Stack:** Next.js 16 (Server Components, `Suspense`), React 19, `DataTable` et `DetailDialog` maison, shadcn/ui `Badge`.

**Spec:** `docs/superpowers/specs/domaine-freelance-crm/04-liste-entreprises-enrichie-design.md`

## Global Constraints

- **Prérequis** : les plans du `02` et du `03` sont implémentés (`AdminCompany` porte `types`, `relationStatus`, `zones`, `notes`, `details` ; libellés `COMPANY_TYPE_LABELS`, `RELATION_STATUS_LABELS`, `ZONE_LABELS`, `COMPANY_SECTION_TITLES.relation`, `.notes` et `.details`).
- **Dérivé `worked`** : n'existe pas avant ce plan ; introduit à la Task 2 dans `toAdminCompany` (`src/server/queries/companies.ts`), vrai dès que l'entreprise a au moins un `ClientMeta` vers un projet de type `CLIENT` (un projet `PERSONAL` crée aussi un `ClientMeta`, `src/server/actions/projects.ts`, et ne doit pas compter). Le `15` étendra cette même ligne avec `|| hasAcceptedMission(company)`.
- **Filtre des vues** : Travaillées = `worked` ; Recrutement = `types` contient `ESN_RECRUTEMENT`.
- **Titres et sous-titres exacts** : Toutes « Toutes les entreprises » / « Clients, intermédiaires et prospects. » ; Travaillées « Entreprises travaillées » / « Celles où une mission a été réalisée, en direct ou via une ESN. » ; Recrutement « Recrutement » / « ESN et cabinets, avec leur historique de propositions. ».
- **Colonnes par défaut** : Toutes, toutes ; Travaillées, Types, Secteurs, Zones, Taille, Statut, Projets ; Recrutement, Types, Zones, Statut, Travaillée.
- **Un même mot par donnée** : en-têtes, filtres et vue détail prennent leurs libellés dans `COMPANY_FIELD_LABELS` (arbitrage DESIGN.md).
- **Chaque page** garde `await getCurrentUser()` et son `loading.tsx` d'une ligne.
- **Aucun commit** : `/implement-subproject` porte le commit unique, que le propriétaire valide.

**Rules :** `.claude/rules/nextjs/routing.md`, `.claude/rules/nextjs/data-fetching.md`, `.claude/rules/nextjs/server-client-components.md`, `.claude/rules/nextjs/auth.md`, `.claude/rules/shadcn-ui/components.md`, `.claude/rules/tailwind/conventions.md`, `.claude/rules/design/claude-design.md`.

## Review Focus

- **Page sans `loading.tsx`** : sans frontière `Suspense` propre au segment, Next lève « encountered uncached data during prerendering » en dev sous session valide (rule `nextjs/auth.md`). Chaque nouvelle page a le sien (Task 4).
- **Colonnes par défaut figées au changement de vue** : `DataTable` initialise ses colonnes masquées une seule fois ; les colonnes sont reconstruites par vue (`useMemo` sur `view`), et chaque vue est une page distincte, donc un nouveau montage. Vérifié à la Task 5, Step 2.
- **Statut répété dans la vue détail** : l'arbitrage interdit de répéter en bloc ce que porte l'en-tête. Le bloc Relation ne contient pas le statut.
- **Notes et Détails** : `notes` est une ligne courte (200 caractères au plus, `02`), en cellule comme en vue détail ; le markdown long vit dans `details`, rendu par `MarkdownContent` dans son propre bloc. Chacun des deux blocs disparaît quand son champ est vide, pour ne pas montrer un bloc sans donnée. Vérifié à la Task 5, Step 4.
- **`worked` mal filtré** : un projet `PERSONAL` (ex. la société du propriétaire) crée lui aussi un `ClientMeta` et ne doit pas compter comme travaillée, seul un projet `CLIENT` le doit ; `toAdminCompany` est le seul endroit qui pose `worked`, pour que le `15` étende cette même ligne sans dupliquer la règle. Vérifié à la Task 5, Step 3.
- **Nom répété dans Identité** : le bloc Identité de la vue détail ne reprend pas `name`, déjà porté par l'en-tête (`title: company.name`) ; sinon le même nom apparaît deux fois. Vérifié à la Task 5, Step 4.
- **`BadgeList` sans `icons`** : le prop reste optionnel pour Secteurs, qui n'a pas de glyphe ; lui en passer un ferait basculer ses badges sur `EnumBadge` sans table d'icônes derrière. Vérifié à la Task 3, Step 4.

---

### Task 1 : Largeurs et colonnes par vue

**Files:**
- Modify: `src/lib/admin-table-widths.ts` (lignes 20-31)

**Interfaces:**
- Consumes: rien
- Produces: `COMPANY_COLUMN_WIDTHS` étendu, `CompanyColumnKey`, `CompanyView = "toutes" | "travaillees" | "recrutement"`, `COMPANY_VIEW_DEFAULT_VISIBLE_COLUMNS: Record<CompanyView, readonly CompanyColumnKey[]>`, `companySkeletonWidths(view: CompanyView): readonly number[]`. `COMPANY_SKELETON_WIDTHS` disparaît.

- [ ] **Step 1 : Remplacer le bloc entreprises**

Dans `src/lib/admin-table-widths.ts`, remplacer `COMPANY_COLUMN_WIDTHS` et `COMPANY_SKELETON_WIDTHS` par :

```ts
export const COMPANY_COLUMN_WIDTHS = {
  logo: 44,
  name: 211,
  types: 179,
  sectors: 179,
  zones: 160,
  size: 140,
  relationStatus: 150,
  worked: 104,
  legalEntity: 160,
  websiteUrl: 150,
  notes: 220,
  projects: 96,
  actions: 88,
} as const

export type CompanyColumnKey = keyof typeof COMPANY_COLUMN_WIDTHS

export type CompanyView = "toutes" | "travaillees" | "recrutement"

// Source unique des colonnes visibles par défaut par vue, lue par la table comme par son squelette.
export const COMPANY_VIEW_DEFAULT_VISIBLE_COLUMNS: Record<
  CompanyView,
  readonly CompanyColumnKey[]
> = {
  toutes: [
    "types",
    "sectors",
    "zones",
    "size",
    "relationStatus",
    "worked",
    "legalEntity",
    "websiteUrl",
    "notes",
    "projects",
  ],
  travaillees: ["types", "sectors", "zones", "size", "relationStatus", "projects"],
  recrutement: ["types", "zones", "relationStatus", "worked"],
}

export function companySkeletonWidths(view: CompanyView): readonly number[] {
  const keys: readonly CompanyColumnKey[] = [
    "logo",
    "name",
    ...COMPANY_VIEW_DEFAULT_VISIBLE_COLUMNS[view],
    "actions",
  ]
  return keys.map((key) => COMPANY_COLUMN_WIDTHS[key])
}
```

- [ ] **Step 2 : Vérifier le typage**

Run: `just typecheck`
Expected: erreurs uniquement dans les deux pages entreprises qui importent encore `COMPANY_SKELETON_WIDTHS`, corrigées à la Task 4.

---

### Task 2 : Dérivé travaillée

**Files:**
- Modify: `src/server/queries/companies.ts`
- Modify: `src/lib/companies.ts` (`COMPANY_FIELD_LABELS`)

**Interfaces:**
- Consumes: rien
- Produces: `AdminCompany` étendu du dérivé `worked: boolean` ; `toAdminCompany(company: AdminCompanyRaw): AdminCompany` ; `COMPANY_FIELD_LABELS.worked`

- [ ] **Step 1 : Ajouter le libellé**

Dans `src/lib/companies.ts`, dans `COMPANY_FIELD_LABELS`, ajouter après `relationStatus` :

```ts
  worked: "Travaillée",
```

- [ ] **Step 2 : Calculer `worked` dans `toAdminCompany`**

Dans `src/server/queries/companies.ts`, remplacer le type `AdminCompany` et la fonction `findAllCompaniesForAdmin` par :

```ts
type AdminCompanyRaw = Prisma.CompanyGetPayload<{
  include: typeof adminCompanyInclude & {
    _count: { select: { clientMetas: true } }
    clientMetas: { select: { project: { select: { type: true } } } }
  }
}>

export type AdminCompany = Omit<AdminCompanyRaw, "clientMetas"> & { worked: boolean }

// Point d'entrée unique des dérivés d'AdminCompany : worked ici, les prochains rejoignent cette même fonction.
function toAdminCompany({ clientMetas, ...company }: AdminCompanyRaw): AdminCompany {
  // Un projet personnel crée aussi un ClientMeta (src/server/actions/projects.ts) : seul un projet CLIENT compte comme travaillée.
  return { ...company, worked: clientMetas.some((meta) => meta.project.type === "CLIENT") }
}

// Sans 'use cache', comme les tags : l'administration doit lire la base juste après ses propres mutations.
export async function findAllCompaniesForAdmin(): Promise<AdminCompany[]> {
  const companies = await prisma.company.findMany({
    include: {
      ...adminCompanyInclude,
      _count: { select: { clientMetas: true } },
      // Chargé seulement pour calculer `worked` dans `toAdminCompany`, jamais renvoyé.
      clientMetas: { select: { project: { select: { type: true } } } },
    },
    orderBy: { name: "asc" },
  })

  return companies.map(toAdminCompany)
}
```

`findCompanyByIdForAdmin` et `adminCompanyInclude` ne changent pas ; `_count.clientMetas` reste la source de la colonne Projets.

- [ ] **Step 3 : Vérifier le typage**

Run: `just typecheck`
Expected: aucune erreur dans `src/server/queries/companies.ts` ; les erreurs restantes ailleurs (colonnes, vue détail) sont attendues, corrigées à la Task 3.

---

### Task 3 : Table, filtres et vue détail

**Files:**
- Modify: `src/components/markdown/MarkdownContent.tsx` (variante `admin`)
- Create: `src/components/features/admin/EnumBadge.tsx`
- Modify: `src/components/features/admin/BadgeList.tsx` (prop `icons` optionnelle)
- Modify: `src/components/features/admin/companies/CompaniesTable.tsx` (remplacement complet)

**Interfaces:**
- Consumes: Task 1, Task 2 ; `ADMIN_MARKDOWN_CLASS` (`03`, `@/lib/typography`) ; `AdminCompany` (`@/server/queries/companies`) ; libellés et glyphes `@/lib/companies` (`COMPANY_TYPE_ICONS`, `COMPANY_STATUS_ICONS`), `@/lib/zones` ; `COMPANY_TYPES`, `RELATION_STATUSES` (`@/lib/schemas/company`) ; `IconComponent` (`@/lib/icons`)
- Produces: `EnumBadge({ label, icon }: { label: string; icon: IconComponent | null })` ; `BadgeList` étendu de la prop `icons?: Partial<Record<string, IconComponent | null>>` ; `CompaniesTable({ companies, view }: { companies: readonly AdminCompany[]; view: CompanyView })`. La prop `workedOnly` disparaît. `MarkdownContent` gagne `variant?: "public" | "admin"`, que les vues détail des plans `08`, `13`, `15` et `17` réutilisent.

- [ ] **Step 1 : Variante admin de `MarkdownContent`**

Dans `src/components/markdown/MarkdownContent.tsx`, ajouter `ADMIN_MARKDOWN_CLASS` à l'import de `@/lib/typography` :

```tsx
import { ADMIN_MARKDOWN_CLASS, LINK_CLASS, STANDALONE_LINK_CLASS } from "@/lib/typography"
```

ajouter la prop, à la fin de `Props` :

```tsx
  // "admin" : Détails d'une fiche, à l'échelle de l'éditeur qui les saisit.
  variant?: "public" | "admin"
```

la lire dans la signature :

```tsx
export function MarkdownContent({
  markdown,
  className,
  components,
  links = "text",
  variant = "public",
}: Props) {
```

et remplacer le `className` du `div` racine par :

```tsx
      className={cn(
        variant === "admin"
          ? ADMIN_MARKDOWN_CLASS
          : [
              "prose max-w-none dark:prose-invert",
              "prose-h2:mt-12 prose-h2:mb-6 prose-h2:text-3xl prose-h2:font-semibold prose-h2:tracking-tight prose-h2:text-balance sm:prose-h2:text-4xl",
              "prose-h3:text-2xl prose-h3:font-semibold prose-h3:tracking-tight",
              "[&>:first-child]:mt-0 [&>:last-child]:mb-0",
            ],
        className,
      )}
```

Les pages publiques (case study, pages légales) n'en changent pas : elles gardent la variante par défaut.

- [ ] **Step 2 : Créer `EnumBadge` et étendre `BadgeList`**

Créer `src/components/features/admin/EnumBadge.tsx` :

```tsx
import { Badge } from "@/components/ui/badge"
import type { IconComponent } from "@/lib/icons"

interface Props {
  label: string
  icon: IconComponent | null
}

// Première liste à badges d'énumération du domaine CRM (02, décision 7) : réutilisé par les plans suivants.
export function EnumBadge({ label, icon: Icon }: Props) {
  return (
    <Badge variant="secondary">
      {Icon ? <Icon aria-hidden data-icon="inline-start" /> : null}
      {label}
    </Badge>
  )
}
```

Dans `src/components/features/admin/BadgeList.tsx`, ajouter l'import et la prop :

```tsx
import { EnumBadge } from "@/components/features/admin/EnumBadge"
import type { IconComponent } from "@/lib/icons"
```

```ts
interface Props {
  labels: readonly string[]
  noun: string
  max?: number
  empty?: ReactNode
  // Fournie : chaque badge bascule sur EnumBadge. Absente : rendu inchangé (secteurs, sans glyphe).
  icons?: Partial<Record<string, IconComponent | null>>
}

export function BadgeList({
  labels,
  noun,
  max = MAX_VISIBLE,
  empty = <EmptyValue />,
  icons,
}: Props) {
```

et remplacer le rendu des badges visibles :

```tsx
      {shown.map((label) =>
        icons ? (
          <EnumBadge key={label} label={label} icon={icons[label] ?? null} />
        ) : (
          <Badge key={label} variant="secondary">
            {label}
          </Badge>
        ),
      )}
```

Le reste de `BadgeList` (le « +N » et son `Tooltip`) ne change pas.

- [ ] **Step 3 : Réécrire `CompaniesTable.tsx`**

```tsx
"use client"

import { useMemo, useState } from "react"
import { Building2, Pencil } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

import { CompanyLogoTile } from "@/components/features/admin/CompanyLogoTile"
import { DataTable, type Column, type Facet } from "@/components/features/admin/DataTable"
import {
  type DetailContent,
  type DetailSection,
  DetailDialog,
} from "@/components/features/admin/DetailDialog"
import { RowActionButton } from "@/components/features/admin/RowActionButton"
import { TruncateTooltip } from "@/components/features/admin/TruncateTooltip"
import { DeleteCompanyDialog } from "@/components/features/admin/companies/DeleteCompanyDialog"
import { AssetPreviewLink } from "@/components/features/admin/assets/AssetPreviewLink"
import { BadgeList } from "@/components/features/admin/BadgeList"
import { EnumBadge } from "@/components/features/admin/EnumBadge"
import { ExternalUrl } from "@/components/features/admin/ExternalUrl"
import { NameSlugCell } from "@/components/features/admin/NameSlugCell"
import { MarkdownContent } from "@/components/markdown/MarkdownContent"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import {
  COMPANY_COLUMN_WIDTHS,
  COMPANY_VIEW_DEFAULT_VISIBLE_COLUMNS,
  type CompanyColumnKey,
  type CompanyView,
} from "@/lib/admin-table-widths"
import {
  COMPANY_FIELD_LABELS,
  COMPANY_SECTION_TITLES,
  COMPANY_SECTOR_LABELS,
  COMPANY_SIZE_HEADCOUNTS,
  COMPANY_SIZE_LABELS,
  COMPANY_STATUS_ICONS,
  COMPANY_TYPE_ICONS,
  COMPANY_TYPE_LABELS,
  RELATION_STATUS_LABELS,
} from "@/lib/companies"
import { COMPANY_TYPES, RELATION_STATUSES } from "@/lib/schemas/company"
import { ZONE_LABELS, ZONES } from "@/lib/zones"
import type { AdminCompany } from "@/server/queries/companies"

export type { CompanyView }

const VIEW_FILTER: Record<CompanyView, (company: AdminCompany) => boolean> = {
  toutes: () => true,
  travaillees: (company) => company.worked,
  recrutement: (company) => company.types.includes("ESN_RECRUTEMENT"),
}

function TruncatedCell({ value }: { value: string | null | undefined }) {
  if (!value) return null
  return <TruncateTooltip className="block w-full">{value}</TruncateTooltip>
}

function typeLabels(company: AdminCompany): string[] {
  return company.types.map((type) => COMPANY_TYPE_LABELS[type])
}

function sectorLabels(company: AdminCompany): string[] {
  return company.sectors.map((sector) => COMPANY_SECTOR_LABELS[sector])
}

function zoneLabels(company: AdminCompany): string[] {
  return company.zones.map((zone) => ZONE_LABELS[zone])
}

// Glyphe par libellé plutôt que par valeur : BadgeList ne connaît que les libellés déjà résolus.
const TYPE_ICONS_BY_LABEL = Object.fromEntries(
  COMPANY_TYPES.map((type) => [COMPANY_TYPE_LABELS[type], COMPANY_TYPE_ICONS[type]]),
)

function sizeBadge(company: AdminCompany) {
  if (!company.size) return null
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge variant="secondary" tabIndex={0}>
          {COMPANY_SIZE_LABELS[company.size]}
        </Badge>
      </TooltipTrigger>
      <TooltipContent>{COMPANY_SIZE_HEADCOUNTS[company.size]}</TooltipContent>
    </Tooltip>
  )
}

function hideable(
  view: CompanyView,
  key: Exclude<CompanyColumnKey, "logo" | "name" | "actions">,
): Pick<Column<AdminCompany>, "hideable" | "defaultVisible"> {
  return {
    hideable: true,
    defaultVisible: COMPANY_VIEW_DEFAULT_VISIBLE_COLUMNS[view].includes(key),
  }
}

function buildColumns(view: CompanyView): readonly Column<AdminCompany>[] {
  return [
    {
      key: "logo",
      header: "Logo",
      headerSrOnly: true,
      width: COMPANY_COLUMN_WIDTHS.logo,
      cell: (company) => <CompanyLogoTile logoFilename={company.logoFilename} />,
    },
    {
      key: "name",
      header: COMPANY_FIELD_LABELS.name,
      width: COMPANY_COLUMN_WIDTHS.name,
      sortValue: (company) => company.name,
      searchValue: (company) => `${company.name} ${company.slug}`,
      cell: (company) => <NameSlugCell name={company.name} slug={company.slug} />,
    },
    {
      key: "types",
      header: COMPANY_FIELD_LABELS.types,
      width: COMPANY_COLUMN_WIDTHS.types,
      ...hideable(view, "types"),
      cell: (company) => (
        <BadgeList labels={typeLabels(company)} noun="types" icons={TYPE_ICONS_BY_LABEL} />
      ),
    },
    {
      key: "sectors",
      header: COMPANY_FIELD_LABELS.sectors,
      width: COMPANY_COLUMN_WIDTHS.sectors,
      ...hideable(view, "sectors"),
      cell: (company) => <BadgeList labels={sectorLabels(company)} noun="secteurs" />,
    },
    {
      key: "zones",
      header: COMPANY_FIELD_LABELS.zones,
      width: COMPANY_COLUMN_WIDTHS.zones,
      ...hideable(view, "zones"),
      // Zone est une énumération comme Type, mais sans glyphe à ce jour (02, décision 7) : icons={{}} bascule tout de même sur EnumBadge.
      cell: (company) => <BadgeList labels={zoneLabels(company)} noun="zones" icons={{}} />,
    },
    {
      key: "size",
      header: COMPANY_FIELD_LABELS.size,
      width: COMPANY_COLUMN_WIDTHS.size,
      ...hideable(view, "size"),
      cell: sizeBadge,
    },
    {
      key: "relationStatus",
      header: COMPANY_FIELD_LABELS.relationStatus,
      width: COMPANY_COLUMN_WIDTHS.relationStatus,
      ...hideable(view, "relationStatus"),
      cell: (company) => (
        <EnumBadge
          label={RELATION_STATUS_LABELS[company.relationStatus]}
          icon={COMPANY_STATUS_ICONS[company.relationStatus]}
        />
      ),
    },
    {
      key: "worked",
      header: COMPANY_FIELD_LABELS.worked,
      width: COMPANY_COLUMN_WIDTHS.worked,
      className: "text-muted-foreground",
      ...hideable(view, "worked"),
      cell: (company) => (company.worked ? "Oui" : "Non"),
    },
    {
      key: "legalEntity",
      header: COMPANY_FIELD_LABELS.legalEntityId,
      width: COMPANY_COLUMN_WIDTHS.legalEntity,
      className: "text-muted-foreground",
      ...hideable(view, "legalEntity"),
      cell: (company) => <TruncatedCell value={company.legalEntity?.name} />,
    },
    {
      key: "websiteUrl",
      header: COMPANY_FIELD_LABELS.websiteUrl,
      width: COMPANY_COLUMN_WIDTHS.websiteUrl,
      ...hideable(view, "websiteUrl"),
      cell: (company) =>
        company.websiteUrl ? (
          <TruncateTooltip className="block w-full">
            <ExternalUrl url={company.websiteUrl} />
          </TruncateTooltip>
        ) : null,
    },
    {
      key: "notes",
      header: COMPANY_FIELD_LABELS.notes,
      width: COMPANY_COLUMN_WIDTHS.notes,
      className: "text-muted-foreground",
      ...hideable(view, "notes"),
      cell: (company) => <TruncatedCell value={company.notes} />,
    },
    {
      key: "projects",
      header: "Projets",
      width: COMPANY_COLUMN_WIDTHS.projects,
      align: "right",
      className: "tabular-nums text-muted-foreground",
      ...hideable(view, "projects"),
      sortValue: (company) => company._count.clientMetas,
      cell: (company) => company._count.clientMetas,
    },
    {
      key: "actions",
      header: "Actions",
      width: COMPANY_COLUMN_WIDTHS.actions,
      align: "right",
      cell: (company) => (
        <span className="inline-flex gap-0">
          <RowActionButton aria-label={`Modifier ${company.name}`} asChild>
            <Link href={`/admin/entreprises/${company.id}`}>
              <Pencil className="size-4" />
            </Link>
          </RowActionButton>
          <DeleteCompanyDialog company={company} />
        </span>
      ),
    },
  ]
}

function buildCompanyDetail(company: AdminCompany, onEdit: () => void): DetailContent {
  const projectCount = company._count.clientMetas
  // Arbitrage « bloc sans donnée » : pas de bloc rempli d'un tiret quand la donnée est vide.
  const notesSections: DetailSection[] = company.notes
    ? [{ title: COMPANY_SECTION_TITLES.notes, rows: [{ value: company.notes, fullWidth: true }] }]
    : []
  const detailsSections: DetailSection[] = company.details
    ? [
        {
          title: COMPANY_SECTION_TITLES.details,
          rows: [
            {
              value: <MarkdownContent markdown={company.details} variant="admin" />,
              fullWidth: true,
            },
          ],
        },
      ]
    : []

  const StatusIcon = COMPANY_STATUS_ICONS[company.relationStatus]

  return {
    title: company.name,
    slug: company.slug,
    subtitle: `${projectCount} projet${projectCount > 1 ? "s" : ""}`,
    status: (
      <Badge variant="outline" meta>
        {StatusIcon ? <StatusIcon aria-hidden data-icon="inline-start" /> : null}
        {RELATION_STATUS_LABELS[company.relationStatus]}
      </Badge>
    ),
    sections: [
      // Reprend les blocs de la card du formulaire, dans l'ordre, moins le nom et le statut déjà dans l'en-tête.
      {
        title: COMPANY_SECTION_TITLES.identity,
        rows: [
          {
            label: COMPANY_FIELD_LABELS.websiteUrl,
            value: <ExternalUrl url={company.websiteUrl} className="wrap-anywhere" />,
          },
          {
            label: COMPANY_FIELD_LABELS.zones,
            value: (
              <BadgeList labels={zoneLabels(company)} noun="zones" max={Infinity} icons={{}} />
            ),
          },
        ],
      },
      {
        title: COMPANY_SECTION_TITLES.classification,
        rows: [
          {
            label: COMPANY_FIELD_LABELS.types,
            value: (
              <BadgeList
                labels={typeLabels(company)}
                noun="types"
                max={Infinity}
                icons={TYPE_ICONS_BY_LABEL}
              />
            ),
          },
          {
            label: COMPANY_FIELD_LABELS.sectors,
            value: <BadgeList labels={sectorLabels(company)} noun="secteurs" max={Infinity} />,
          },
        ],
      },
      ...detailsSections,
      {
        title: COMPANY_SECTION_TITLES.relation,
        rows: [
          { label: COMPANY_FIELD_LABELS.size, value: sizeBadge(company) },
          { label: COMPANY_FIELD_LABELS.worked, value: company.worked ? "Oui" : "Non" },
        ],
      },
      {
        title: COMPANY_SECTION_TITLES.logo,
        rows: [
          {
            value: company.logoFilename ? (
              <AssetPreviewLink assetKey={company.logoFilename} />
            ) : null,
          },
        ],
      },
      ...notesSections,
      {
        title: COMPANY_SECTION_TITLES.legalEntity,
        rows: [{ value: company.legalEntity?.name }],
      },
    ],
    onEdit,
  }
}

const facets: readonly Facet<AdminCompany>[] = [
  {
    key: "relationStatus",
    label: COMPANY_FIELD_LABELS.relationStatus,
    options: RELATION_STATUSES.map((status) => ({
      value: status,
      label: RELATION_STATUS_LABELS[status],
    })),
    value: (company) => company.relationStatus,
  },
  {
    key: "types",
    label: COMPANY_FIELD_LABELS.types,
    options: COMPANY_TYPES.map((type) => ({ value: type, label: COMPANY_TYPE_LABELS[type] })),
    value: (company) => company.types,
  },
  {
    key: "zones",
    label: COMPANY_FIELD_LABELS.zones,
    options: ZONES.map((zone) => ({ value: zone, label: ZONE_LABELS[zone] })),
    value: (company) => company.zones,
  },
]

interface Props {
  companies: readonly AdminCompany[]
  view: CompanyView
}

export function CompaniesTable({ companies, view }: Props) {
  const router = useRouter()
  const [selectedCompany, setSelectedCompany] = useState<AdminCompany | null>(null)

  const viewCompanies = useMemo(() => companies.filter(VIEW_FILTER[view]), [companies, view])
  const columns = useMemo<readonly Column<AdminCompany>[]>(() => buildColumns(view), [view])

  const detail = useMemo<DetailContent | null>(
    () =>
      selectedCompany
        ? buildCompanyDetail(selectedCompany, () => {
            router.push(`/admin/entreprises/${selectedCompany.id}`)
          })
        : null,
    [selectedCompany, router],
  )

  return (
    <>
      <DataTable
        rows={viewCompanies}
        columns={columns}
        getRowId={(company) => company.id}
        searchPlaceholder="Rechercher un nom ou un slug"
        noun="entreprise"
        onRowClick={setSelectedCompany}
        rowLabel={(company) => company.name}
        empty={{
          icon: Building2,
          title: "Aucune entreprise",
          description: "Aucune entreprise pour le moment. Créez-en une via le bouton ci-dessus.",
        }}
        facets={facets}
      />
      <DetailDialog
        detail={detail}
        onOpenChange={(open) => {
          if (!open) setSelectedCompany(null)
        }}
      />
    </>
  )
}
```

- [ ] **Step 4 : Vérifier le typage**

Run: `just typecheck`
Expected: plus d'erreur dans `CompaniesTable.tsx` ; seules les pages restent en erreur (`workedOnly`, `COMPANY_SKELETON_WIDTHS`), corrigées à la Task 4.

---

### Task 4 : Pages et menu

**Files:**
- Create: `src/components/features/admin/companies/CompaniesViewPage.tsx`
- Modify: `src/app/admin/(protected)/entreprises/page.tsx`
- Modify: `src/app/admin/(protected)/entreprises/travaillees/page.tsx`
- Create: `src/app/admin/(protected)/entreprises/recrutement/page.tsx`
- Create: `src/app/admin/(protected)/entreprises/recrutement/loading.tsx`
- Modify: `src/config/admin-nav-items.ts` (bloc CRM > Entreprises)

**Interfaces:**
- Consumes: `CompaniesTable` (Task 3), `companySkeletonWidths`, `CompanyView` (Task 1), `findAllCompaniesForAdmin`
- Produces: `CompaniesViewPage({ view, title, subtitle }: { view: CompanyView; title: string; subtitle: string })`

- [ ] **Step 1 : Créer la coquille commune**

`src/components/features/admin/companies/CompaniesViewPage.tsx` :

```tsx
import { Suspense } from "react"
import { Plus } from "lucide-react"
import Link from "next/link"

import { CompaniesTable } from "@/components/features/admin/companies/CompaniesTable"
import { DataTableSkeleton } from "@/components/features/admin/DataTableSkeleton"
import { AdminPageShell } from "@/components/layout/AdminPageShell"
import { Button } from "@/components/ui/button"
import { companySkeletonWidths, type CompanyView } from "@/lib/admin-table-widths"
import { findAllCompaniesForAdmin } from "@/server/queries/companies"

async function CompaniesSection({ view }: { view: CompanyView }) {
  const companies = await findAllCompaniesForAdmin()
  return <CompaniesTable companies={companies} view={view} />
}

interface Props {
  view: CompanyView
  title: string
  subtitle: string
}

export function CompaniesViewPage({ view, title, subtitle }: Props) {
  return (
    <AdminPageShell
      title={title}
      subtitle={subtitle}
      actions={
        <Button asChild>
          <Link href="/admin/entreprises/nouvelle">
            <Plus aria-hidden data-icon="inline-start" />
            Nouvelle entreprise
          </Link>
        </Button>
      }
    >
      <Suspense fallback={<DataTableSkeleton columnWidths={companySkeletonWidths(view)} />}>
        <CompaniesSection view={view} />
      </Suspense>
    </AdminPageShell>
  )
}
```

- [ ] **Step 2 : Page Toutes**

Remplacer le contenu de `src/app/admin/(protected)/entreprises/page.tsx` par :

```tsx
import { CompaniesViewPage } from "@/components/features/admin/companies/CompaniesViewPage"
import { getCurrentUser } from "@/lib/get-current-user"

export default async function AdminEntreprisesPage() {
  await getCurrentUser()

  return (
    <CompaniesViewPage
      view="toutes"
      title="Toutes les entreprises"
      subtitle="Clients, intermédiaires et prospects."
    />
  )
}
```

- [ ] **Step 3 : Page Travaillées**

Remplacer le contenu de `src/app/admin/(protected)/entreprises/travaillees/page.tsx` par :

```tsx
import { CompaniesViewPage } from "@/components/features/admin/companies/CompaniesViewPage"
import { getCurrentUser } from "@/lib/get-current-user"

export default async function AdminEntreprisesTravailleesPage() {
  await getCurrentUser()

  return (
    <CompaniesViewPage
      view="travaillees"
      title="Entreprises travaillées"
      subtitle="Celles où une mission a été réalisée, en direct ou via une ESN."
    />
  )
}
```

- [ ] **Step 4 : Page Recrutement**

`src/app/admin/(protected)/entreprises/recrutement/page.tsx` :

```tsx
import { CompaniesViewPage } from "@/components/features/admin/companies/CompaniesViewPage"
import { getCurrentUser } from "@/lib/get-current-user"

export default async function AdminEntreprisesRecrutementPage() {
  await getCurrentUser()

  return (
    <CompaniesViewPage
      view="recrutement"
      title="Recrutement"
      subtitle="ESN et cabinets, avec leur historique de propositions."
    />
  )
}
```

`src/app/admin/(protected)/entreprises/recrutement/loading.tsx` :

```tsx
export { default } from "@/app/admin/(protected)/loading"
```

- [ ] **Step 5 : Activer l'entrée du menu**

Dans `src/config/admin-nav-items.ts`, remplacer la sous-entrée sans lien :

```ts
      { label: "Recrutement" },
```

par :

```ts
      { label: "Recrutement", href: "/admin/entreprises/recrutement" },
```

L'entrée `{ label: "Prospects" }` reste sans `href` : le `08` l'activera.

- [ ] **Step 6 : Qualité**

Run: `just typecheck`
Expected: aucune erreur (les routes typées de Next reconnaissent la nouvelle page après `just dev` ou un build ; si le typage du `href` échoue avant, lancer `just dev` une fois pour régénérer les types de routes, puis relancer).

Run: `just lint`
Expected: aucune erreur (si le formatage échoue : `just format`, puis relancer).

---

### Task 5 : Parcours manuel

**Files:**
- Aucun fichier modifié

**Interfaces:**
- Consumes: Tasks 1 à 4
- Produces: rien

- [ ] **Step 1 : Préparer des données**

Run: `just dev`, se connecter. Depuis le formulaire (`03`), avoir au moins : une ESN / Recrutement avec deux zones, une ligne de notes et des détails markdown (titre, liste) sur l'une d'elles, une entreprise liée en base à un projet `CLIENT` et une entreprise liée seulement à un projet `PERSONAL` (pour tester Travaillées).

- [ ] **Step 2 : Vues et colonnes**

Ouvrir successivement Toutes, Travaillées et Recrutement depuis le menu.
Expected: chaque entrée du menu est active sur sa page ; chaque vue ne montre que son objet ; les colonnes visibles sont celles des Global Constraints ; le bouton Colonnes permet d'afficher les autres ; le squelette de chargement a le bon nombre de colonnes.

- [ ] **Step 3 : Contenu des vues**

Expected: l'entreprise liée au projet `CLIENT` apparaît dans Travaillées avec Travaillée à Oui ; l'entreprise liée seulement au projet `PERSONAL` n'y apparaît pas et affiche Travaillée à Non dans Toutes.

- [ ] **Step 4 : Filtres et détail**

Dans Toutes, filtrer sur la zone Luxembourg puis sur un type.
Expected: seules les lignes correspondantes restent, les compteurs comptent une entreprise à plusieurs zones dans chacune.

Cliquer la ligne de l'ESN.
Expected: blocs Identité, Classification, Détails, Relation, Logo, Notes, Entité légale, dans cet ordre ; statut de la relation en tête avec son glyphe, absent du bloc Relation ; les badges Types portent leur glyphe ; le bloc Détails rend le markdown (titre, liste) comme sur le site public. Une entreprise sans notes n'a pas de bloc Notes, une entreprise sans détails n'a pas de bloc Détails. Puis `just stop`.
