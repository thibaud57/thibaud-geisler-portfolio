"use client"

import { useMemo, useState, type ReactNode } from "react"
import { Folder, Pencil } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

import { CompanyLogoTile } from "@/components/features/admin/CompanyLogoTile"
import { DataTable, type Column, type Facet } from "@/components/features/admin/DataTable"
import { type DetailContent, DetailDialog } from "@/components/features/admin/DetailDialog"
import { RowActionButton } from "@/components/features/admin/RowActionButton"
import { TruncateTooltip } from "@/components/features/admin/TruncateTooltip"
import { DeleteProjectDialog } from "@/components/features/admin/projects/DeleteProjectDialog"
import { AssetPreviewLink } from "@/components/features/admin/assets/AssetPreviewLink"
import { BadgeList } from "@/components/features/admin/BadgeList"
import { ExternalUrl } from "@/components/features/admin/ExternalUrl"
import { NameSlugCell } from "@/components/features/admin/NameSlugCell"
import { Badge } from "@/components/ui/badge"
import type { ProjectFormat, ProjectStatus, ProjectType } from "@/generated/prisma/client"
import {
  PROJECT_COLUMN_WIDTHS,
  PROJECT_VIEW_DEFAULT_VISIBLE_COLUMNS,
  type ProjectColumnKey,
  type ProjectView,
} from "@/lib/admin-table-widths"
import {
  CONTRACT_STATUS_LABELS,
  formatProjectDuration,
  formatShortDate,
  PROJECT_FORMAT_LABELS,
  PROJECT_FIELD_LABELS,
  PROJECT_SECTION_TITLES,
  PROJECT_STATUS_LABELS,
  PROJECT_TYPE_LABELS,
  WORK_MODE_LABELS,
} from "@/lib/projects"
import { safeExternalUrl } from "@/lib/url"
import { cn } from "@/lib/utils"
import { reorderProjects } from "@/server/actions/projects"
import type { AdminProjectListItem } from "@/server/queries/projects"

export type { ProjectView }

const VIEW_TYPE: Record<ProjectView, ProjectType | null> = {
  tous: null,
  client: "CLIENT",
  perso: "PERSONAL",
}

const PROJECT_STATUS_VALUES = Object.keys(PROJECT_STATUS_LABELS) as ProjectStatus[]
const PROJECT_FORMAT_VALUES = Object.keys(PROJECT_FORMAT_LABELS) as ProjectFormat[]

const PROJECT_STATUS_DOT_CLASS: Record<ProjectStatus, string> = {
  DRAFT: "bg-warning",
  PUBLISHED: "bg-success",
  ARCHIVED: "bg-muted-foreground",
}

// Un case study fait plusieurs milliers de caractères : la vue détail dit qu'il existe et ce qu'il
// pèse, la lecture du texte appartient à l'écran d'édition.
function describeMarkdown(markdown: string | null): ReactNode {
  if (!markdown) return null
  return `Rédigé (${markdown.length} caractères)`
}

function renderProjectStatus(status: ProjectStatus): ReactNode {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn("size-1.5 shrink-0 rounded-full", PROJECT_STATUS_DOT_CLASS[status])} />
      {PROJECT_STATUS_LABELS[status]}
    </span>
  )
}

function renderProjectLinks(project: AdminProjectListItem): ReactNode {
  const links = [
    { label: "GitHub", url: project.githubUrl },
    { label: "Démo", url: project.demoUrl },
  ].filter((link) => safeExternalUrl(link.url) !== null)

  if (links.length === 0) return null

  return (
    <span className="inline-flex items-center gap-1.5">
      {links.map((link, index) => (
        <span key={link.label} className="inline-flex items-center gap-1.5">
          {index > 0 ? <span className="text-muted-foreground">·</span> : null}
          <ExternalUrl url={link.url}>{link.label}</ExternalUrl>
        </span>
      ))}
    </span>
  )
}

function hideable(
  view: ProjectView,
  key: Exclude<ProjectColumnKey, "titre" | "actions">,
): Pick<Column<AdminProjectListItem>, "hideable" | "defaultVisible"> {
  return {
    hideable: true,
    defaultVisible: PROJECT_VIEW_DEFAULT_VISIBLE_COLUMNS[view].includes(key),
  }
}

function buildColumns(view: ProjectView): readonly Column<AdminProjectListItem>[] {
  return [
    {
      key: "titre",
      header: PROJECT_FIELD_LABELS.titleFr,
      width: PROJECT_COLUMN_WIDTHS.titre,
      sortValue: (project) => project.titleFr,
      searchValue: (project) => `${project.titleFr} ${project.slug}`,
      cell: (project) => <NameSlugCell name={project.titleFr} slug={project.slug} />,
    },
    {
      key: "nature",
      header: PROJECT_FIELD_LABELS.type,
      width: PROJECT_COLUMN_WIDTHS.nature,
      ...hideable(view, "nature"),
      cell: (project) => (
        <Badge variant="outline" meta>
          {PROJECT_TYPE_LABELS[project.type]}
        </Badge>
      ),
    },
    {
      key: "formats",
      header: PROJECT_FIELD_LABELS.formats,
      width: PROJECT_COLUMN_WIDTHS.formats,
      ...hideable(view, "formats"),
      cell: (project) => (
        <BadgeList
          labels={project.formats.map((format) => PROJECT_FORMAT_LABELS[format])}
          noun="types de projet"
        />
      ),
    },
    {
      key: "entreprise",
      header: PROJECT_FIELD_LABELS.companyId,
      width: PROJECT_COLUMN_WIDTHS.entreprise,
      ...hideable(view, "entreprise"),
      cell: (project) => {
        const company = project.clientMeta?.company
        if (!company) return null
        return (
          <span className="flex min-w-0 items-center gap-2">
            <CompanyLogoTile logoFilename={company.logoFilename} size="sm" className="shrink-0" />
            <TruncateTooltip className="text-muted-foreground">{company.name}</TruncateTooltip>
          </span>
        )
      },
    },
    {
      key: "contrat",
      header: PROJECT_FIELD_LABELS.contractStatus,
      width: PROJECT_COLUMN_WIDTHS.contrat,
      className: "whitespace-nowrap",
      ...hideable(view, "contrat"),
      cell: (project) =>
        project.clientMeta?.contractStatus ? (
          <Badge variant="secondary">
            {CONTRACT_STATUS_LABELS[project.clientMeta.contractStatus]}
          </Badge>
        ) : null,
    },
    {
      key: "debut",
      header: PROJECT_FIELD_LABELS.startedAt,
      width: PROJECT_COLUMN_WIDTHS.debut,
      className: "whitespace-nowrap text-muted-foreground",
      sortValue: (project) => project.startedAt?.getTime() ?? 0,
      ...hideable(view, "debut"),
      cell: (project) => formatShortDate(project.startedAt),
    },
    {
      key: "fin",
      header: PROJECT_FIELD_LABELS.endedAt,
      width: PROJECT_COLUMN_WIDTHS.fin,
      className: "whitespace-nowrap text-muted-foreground",
      sortValue: (project) => project.endedAt?.getTime() ?? 0,
      ...hideable(view, "fin"),
      cell: (project) => formatShortDate(project.endedAt),
    },
    {
      key: "duree",
      header: "Durée",
      width: PROJECT_COLUMN_WIDTHS.duree,
      className: "whitespace-nowrap text-muted-foreground",
      ...hideable(view, "duree"),
      cell: (project) => formatProjectDuration(project.startedAt, project.endedAt),
    },
    {
      key: "equipe",
      header: PROJECT_FIELD_LABELS.teamSize,
      width: PROJECT_COLUMN_WIDTHS.equipe,
      align: "right",
      className: "tabular-nums text-muted-foreground",
      ...hideable(view, "equipe"),
      cell: (project) =>
        project.clientMeta?.teamSize != null ? String(project.clientMeta.teamSize) : null,
    },
    {
      key: "liens",
      header: PROJECT_SECTION_TITLES.links,
      width: PROJECT_COLUMN_WIDTHS.liens,
      className: "whitespace-nowrap",
      ...hideable(view, "liens"),
      cell: renderProjectLinks,
    },
    {
      key: "statut",
      header: PROJECT_FIELD_LABELS.status,
      width: PROJECT_COLUMN_WIDTHS.statut,
      className: "whitespace-nowrap",
      ...hideable(view, "statut"),
      cell: (project) => renderProjectStatus(project.status),
    },
    {
      key: "actions",
      header: "Actions",
      width: PROJECT_COLUMN_WIDTHS.actions,
      align: "right",
      cell: (project) => (
        <span className="inline-flex gap-0">
          <RowActionButton aria-label={`Modifier ${project.titleFr}`} asChild>
            <Link href={`/admin/projets/${project.id}`}>
              <Pencil className="size-4" />
            </Link>
          </RowActionButton>
          <DeleteProjectDialog project={project} />
        </span>
      ),
    },
  ]
}

const facets: readonly Facet<AdminProjectListItem, ProjectStatus | ProjectFormat>[] = [
  {
    key: "statut",
    label: "Statut",
    options: PROJECT_STATUS_VALUES.map((status) => ({
      value: status,
      label: PROJECT_STATUS_LABELS[status],
    })),
    value: (project) => [project.status],
  },
  {
    key: "formats",
    label: "Type de projet",
    options: PROJECT_FORMAT_VALUES.map((format) => ({
      value: format,
      label: PROJECT_FORMAT_LABELS[format],
    })),
    value: (project) => project.formats,
  },
]

function buildProjectDetail(project: AdminProjectListItem, onEdit: () => void): DetailContent {
  const clientMeta = project.clientMeta
  return {
    title: project.titleFr,
    slug: project.slug,
    subtitle: (
      <span className="flex flex-wrap items-center gap-2">
        <span className="font-mono">#{project.displayOrder}</span>
        <Badge variant="outline" meta>
          {PROJECT_TYPE_LABELS[project.type]}
        </Badge>
      </span>
    ),
    status: renderProjectStatus(project.status),
    sections: [
      // Chaque bloc reprend les champs de la card du formulaire, dans son ordre et à sa place,
      // moins ceux que l'en-tête porte déjà (slug, ordre d'affichage, statut, nature).
      {
        title: PROJECT_SECTION_TITLES.identity,
        rows: [
          { label: PROJECT_FIELD_LABELS.titleFr, value: project.titleFr },
          { label: PROJECT_FIELD_LABELS.titleEn, value: project.titleEn },
          {
            label: PROJECT_FIELD_LABELS.formats,
            fullWidth: true,
            value: (
              <BadgeList
                labels={project.formats.map((format) => PROJECT_FORMAT_LABELS[format])}
                noun="types de projet"
                max={Infinity}
              />
            ),
          },
        ],
      },
      {
        title: PROJECT_SECTION_TITLES.description,
        rows: [
          {
            label: PROJECT_FIELD_LABELS.descriptionFr,
            fullWidth: true,
            value: project.descriptionFr,
          },
          {
            label: PROJECT_FIELD_LABELS.descriptionEn,
            fullWidth: true,
            value: project.descriptionEn,
          },
        ],
      },
      {
        title: PROJECT_SECTION_TITLES.tags,
        rows: [
          {
            value: (
              <BadgeList
                labels={project.tags.map((projectTag) => projectTag.tag.nameFr)}
                noun="tags"
                max={Infinity}
              />
            ),
          },
        ],
      },
      {
        title: PROJECT_SECTION_TITLES.caseStudy,
        rows: [
          {
            label: PROJECT_FIELD_LABELS.caseStudyMarkdownFr,
            fullWidth: true,
            value: describeMarkdown(project.caseStudyMarkdownFr),
          },
          {
            label: PROJECT_FIELD_LABELS.caseStudyMarkdownEn,
            fullWidth: true,
            value: describeMarkdown(project.caseStudyMarkdownEn),
          },
        ],
      },
      {
        title: PROJECT_SECTION_TITLES.publication,
        rows: [
          {
            label: PROJECT_FIELD_LABELS.startedAt,
            value: formatShortDate(project.startedAt),
          },
          {
            label: PROJECT_FIELD_LABELS.endedAt,
            value: formatShortDate(project.endedAt),
          },
          {
            label: "Durée",
            value: formatProjectDuration(project.startedAt, project.endedAt),
          },
        ],
      },
      {
        title: PROJECT_SECTION_TITLES.links,
        rows: [
          {
            label: PROJECT_FIELD_LABELS.githubUrl,
            value: <ExternalUrl url={project.githubUrl} className="wrap-anywhere" />,
          },
          {
            label: PROJECT_FIELD_LABELS.demoUrl,
            value: <ExternalUrl url={project.demoUrl} className="wrap-anywhere" />,
          },
        ],
      },
      {
        title: PROJECT_SECTION_TITLES.cover,
        rows: [
          {
            value: project.coverFilename ? (
              <AssetPreviewLink assetKey={project.coverFilename} />
            ) : null,
          },
        ],
      },
      // Un projet perso n'a pas de méta client : le bloc entier disparaît plutôt que d'aligner
      // trois tirets sous leur propre titre.
      ...(clientMeta
        ? [
            {
              title: PROJECT_SECTION_TITLES.clientMeta,
              rows: [
                {
                  label: PROJECT_FIELD_LABELS.companyId,
                  fullWidth: true,
                  value: clientMeta.company.name,
                },
                {
                  label: PROJECT_FIELD_LABELS.workMode,
                  value: <Badge variant="secondary">{WORK_MODE_LABELS[clientMeta.workMode]}</Badge>,
                },
                {
                  label: PROJECT_FIELD_LABELS.contractStatus,
                  value: clientMeta.contractStatus ? (
                    <Badge variant="secondary">
                      {CONTRACT_STATUS_LABELS[clientMeta.contractStatus]}
                    </Badge>
                  ) : null,
                },
                {
                  label: PROJECT_FIELD_LABELS.teamSize,
                  value: clientMeta.teamSize != null ? String(clientMeta.teamSize) : null,
                },
                {
                  label: PROJECT_FIELD_LABELS.deliverablesCount,
                  value: String(clientMeta.deliverablesCount),
                },
              ],
            },
          ]
        : []),
    ],
    onEdit,
  }
}

interface Props {
  projects: readonly AdminProjectListItem[]
  view: ProjectView
}

export function ProjectsTable({ projects, view }: Props) {
  const router = useRouter()
  const [selectedProject, setSelectedProject] = useState<AdminProjectListItem | null>(null)

  const viewProjects = useMemo(() => {
    const type = VIEW_TYPE[view]
    return type ? projects.filter((project) => project.type === type) : projects
  }, [projects, view])

  const columns = useMemo<readonly Column<AdminProjectListItem>[]>(() => buildColumns(view), [view])

  const detail = useMemo<DetailContent | null>(
    () =>
      selectedProject
        ? buildProjectDetail(selectedProject, () => {
            router.push(`/admin/projets/${selectedProject.id}`)
          })
        : null,
    [selectedProject, router],
  )

  return (
    <>
      <DataTable
        rows={viewProjects}
        columns={columns}
        getRowId={(project) => project.id}
        orderValue={(project) => project.displayOrder}
        facets={facets}
        onReorder={
          view === "tous" ? (_groupKey, orderedRowIds) => reorderProjects(orderedRowIds) : undefined
        }
        onRowClick={setSelectedProject}
        rowLabel={(project) => project.titleFr}
        searchPlaceholder="Rechercher un titre ou un slug"
        noun="projet"
        empty={{
          icon: Folder,
          title: "Aucun projet",
          description: "Aucun projet pour le moment. Créez-en un via le bouton ci-dessus.",
        }}
      />
      <DetailDialog
        detail={detail}
        onOpenChange={(open) => {
          if (!open) setSelectedProject(null)
        }}
      />
    </>
  )
}
