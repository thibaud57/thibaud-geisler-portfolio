"use client"

import { useCallback, useMemo, type ReactNode } from "react"
import { Folder } from "lucide-react"
import { useRouter } from "next/navigation"

import { DataTable, type Column, type Facet } from "@/components/features/admin/table/DataTable"
import { headerBadge, type DetailContent } from "@/components/features/admin/detail/DetailDialog"
import { EditRowLink } from "@/components/features/admin/table/EditRowLink"
import {
  actionsColumn,
  companyCell,
  enumBadge,
  enumFacet,
  HEADER_BADGE_PROPS,
  hideableColumn,
  iconsByLabel,
  workModeBadge,
} from "@/components/features/admin/table/table-cells"
import { DeleteProjectDialog } from "@/components/features/admin/projects/DeleteProjectDialog"
import { BadgeList } from "@/components/features/admin/BadgeList"
import { ExternalUrl } from "@/components/features/admin/ExternalUrl"
import { TitleCell } from "@/components/features/admin/table/TitleCell"
import { Badge } from "@/components/ui/badge"
import type { ProjectStatus, ProjectType } from "@/generated/prisma/client"
import { ADMIN_PROJECTS_PATH } from "@/lib/admin/routes"
import {
  PROJECT_COLUMN_WIDTHS,
  PROJECT_VIEW_DEFAULT_VISIBLE_COLUMNS,
} from "@/lib/admin/table-widths"
import { formatShortDate } from "@/lib/date-time"
import { useRowDetail } from "@/hooks/use-row-detail"
import { PROJECT_VIEW_LOCKED_FACETS, type ProjectView } from "@/lib/project-views"
import {
  CONTRACT_STATUS_ICONS,
  CONTRACT_STATUS_LABELS,
  formatProjectDuration,
  PROJECT_FORMAT_ICONS,
  PROJECT_FORMAT_LABELS,
  PROJECT_FORMATS,
  PROJECT_FIELD_LABELS,
  PROJECT_SECTION_TITLES,
  PROJECT_STATUS_LABELS,
  PROJECT_STATUSES,
  PROJECT_TYPE_LABELS,
  PROJECT_TYPES,
} from "@/lib/projects"
import { safeExternalUrl } from "@/lib/url"
import { cn } from "@/lib/utils"
import { reorderProjects } from "@/server/actions/projects"
import type { AdminProjectListItem } from "@/server/queries/projects"

const VIEW_TYPE: Record<ProjectView, ProjectType | null> = {
  all: null,
  client: "CLIENT",
  perso: "PERSONAL",
}

const FORMAT_ICONS_BY_LABEL = iconsByLabel(
  PROJECT_FORMATS,
  PROJECT_FORMAT_LABELS,
  PROJECT_FORMAT_ICONS,
)

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

function typeBadge(project: AdminProjectListItem) {
  return <Badge {...HEADER_BADGE_PROPS}>{PROJECT_TYPE_LABELS[project.type]}</Badge>
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

function buildColumns(view: ProjectView): readonly Column<AdminProjectListItem>[] {
  const visibleByDefault = PROJECT_VIEW_DEFAULT_VISIBLE_COLUMNS[view]
  return [
    {
      key: "titre",
      header: PROJECT_FIELD_LABELS.titleFr,
      width: PROJECT_COLUMN_WIDTHS.titre,
      sortValue: (project) => project.titleFr,
      searchValue: (project) => `${project.titleFr} ${project.slug}`,
      cell: (project) => <TitleCell title={project.titleFr} subtitle={project.slug} mono />,
    },
    {
      key: "nature",
      header: PROJECT_FIELD_LABELS.type,
      width: PROJECT_COLUMN_WIDTHS.nature,
      ...hideableColumn(visibleByDefault, "nature"),
      cell: typeBadge,
    },
    {
      key: "formats",
      header: PROJECT_FIELD_LABELS.formats,
      width: PROJECT_COLUMN_WIDTHS.formats,
      ...hideableColumn(visibleByDefault, "formats"),
      cell: (project) => (
        <BadgeList
          labels={project.formats.map((format) => PROJECT_FORMAT_LABELS[format])}
          noun="types de projet"
          icons={FORMAT_ICONS_BY_LABEL}
        />
      ),
    },
    {
      key: "entreprise",
      header: PROJECT_FIELD_LABELS.companyId,
      width: PROJECT_COLUMN_WIDTHS.entreprise,
      ...hideableColumn(visibleByDefault, "entreprise"),
      cell: (project) => companyCell({ company: project.clientMeta?.company ?? null }),
    },
    {
      key: "contrat",
      wrapHeader: true,
      header: PROJECT_FIELD_LABELS.contractStatus,
      width: PROJECT_COLUMN_WIDTHS.contrat,
      className: "whitespace-nowrap",
      ...hideableColumn(visibleByDefault, "contrat"),
      cell: (project) =>
        enumBadge(
          project.clientMeta?.contractStatus ?? null,
          CONTRACT_STATUS_LABELS,
          CONTRACT_STATUS_ICONS,
        ),
    },
    {
      key: "debut",
      header: PROJECT_FIELD_LABELS.startedAt,
      width: PROJECT_COLUMN_WIDTHS.debut,
      className: "whitespace-nowrap text-muted-foreground",
      sortValue: (project) => project.startedAt?.getTime() ?? 0,
      ...hideableColumn(visibleByDefault, "debut"),
      cell: (project) => formatShortDate(project.startedAt),
    },
    {
      key: "fin",
      header: PROJECT_FIELD_LABELS.endedAt,
      width: PROJECT_COLUMN_WIDTHS.fin,
      className: "whitespace-nowrap text-muted-foreground",
      sortValue: (project) => project.endedAt?.getTime() ?? 0,
      ...hideableColumn(visibleByDefault, "fin"),
      cell: (project) => formatShortDate(project.endedAt),
    },
    {
      key: "duree",
      header: PROJECT_FIELD_LABELS.duration,
      width: PROJECT_COLUMN_WIDTHS.duree,
      className: "whitespace-nowrap text-muted-foreground",
      ...hideableColumn(visibleByDefault, "duree"),
      cell: (project) => formatProjectDuration(project.startedAt, project.endedAt),
    },
    {
      key: "equipe",
      wrapHeader: true,
      header: PROJECT_FIELD_LABELS.teamSize,
      width: PROJECT_COLUMN_WIDTHS.equipe,
      align: "right",
      className: "tabular-nums text-muted-foreground",
      ...hideableColumn(visibleByDefault, "equipe"),
      cell: (project) =>
        project.clientMeta?.teamSize != null ? String(project.clientMeta.teamSize) : null,
    },
    {
      key: "liens",
      header: PROJECT_SECTION_TITLES.links,
      width: PROJECT_COLUMN_WIDTHS.liens,
      className: "whitespace-nowrap",
      ...hideableColumn(visibleByDefault, "liens"),
      cell: renderProjectLinks,
    },
    {
      key: "statut",
      header: PROJECT_FIELD_LABELS.status,
      width: PROJECT_COLUMN_WIDTHS.statut,
      className: "whitespace-nowrap",
      ...hideableColumn(visibleByDefault, "statut"),
      cell: (project) => renderProjectStatus(project.status),
    },
    actionsColumn<AdminProjectListItem>((project) => (
      <>
        <EditRowLink
          href={`${ADMIN_PROJECTS_PATH}/${project.id}`}
          label={`Modifier ${project.titleFr}`}
        />
        <DeleteProjectDialog project={project} />
      </>
    )),
  ]
}

const facets: readonly Facet<AdminProjectListItem>[] = [
  enumFacet(
    "nature",
    PROJECT_FIELD_LABELS.type,
    PROJECT_TYPES,
    PROJECT_TYPE_LABELS,
    (project: AdminProjectListItem) => project.type,
  ),
  enumFacet(
    "statut",
    PROJECT_FIELD_LABELS.status,
    PROJECT_STATUSES,
    PROJECT_STATUS_LABELS,
    (project) => project.status,
  ),
  enumFacet(
    "formats",
    PROJECT_FIELD_LABELS.formats,
    PROJECT_FORMATS,
    PROJECT_FORMAT_LABELS,
    (project) => project.formats,
  ),
]

function buildProjectDetail(project: AdminProjectListItem, onEdit: () => void): DetailContent {
  const clientMeta = project.clientMeta
  return {
    image: { assetKey: project.coverFilename },
    title: project.titleFr,
    subtitle: project.slug,
    badges: [
      headerBadge(project.status, PROJECT_STATUS_LABELS),
      headerBadge(project.type, PROJECT_TYPE_LABELS),
    ],
    sections: [
      {
        title: PROJECT_SECTION_TITLES.identity,
        rows: [
          { label: PROJECT_FIELD_LABELS.displayOrder, value: String(project.displayOrder) },
          {
            label: PROJECT_FIELD_LABELS.formats,
            value: (
              <BadgeList
                labels={project.formats.map((format) => PROJECT_FORMAT_LABELS[format])}
                noun="types de projet"
                icons={FORMAT_ICONS_BY_LABEL}
                max={Infinity}
              />
            ),
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
        title: PROJECT_SECTION_TITLES.publication,
        rows: [
          { label: PROJECT_FIELD_LABELS.startedAt, value: formatShortDate(project.startedAt) },
          { label: PROJECT_FIELD_LABELS.endedAt, value: formatShortDate(project.endedAt) },
          {
            label: PROJECT_FIELD_LABELS.duration,
            value: formatProjectDuration(project.startedAt, project.endedAt),
          },
        ],
      },
      {
        title: PROJECT_SECTION_TITLES.links,
        rows: [
          {
            label: PROJECT_FIELD_LABELS.githubUrl,
            value: project.githubUrl ? (
              <ExternalUrl url={project.githubUrl} className="wrap-anywhere" />
            ) : null,
          },
          {
            label: PROJECT_FIELD_LABELS.demoUrl,
            value: project.demoUrl ? (
              <ExternalUrl url={project.demoUrl} className="wrap-anywhere" />
            ) : null,
          },
        ],
      },
      {
        title: PROJECT_SECTION_TITLES.clientMeta,
        rows: [
          {
            label: PROJECT_FIELD_LABELS.companyId,
            value: companyCell({ company: clientMeta?.company ?? null }),
          },
          {
            label: PROJECT_FIELD_LABELS.workMode,
            value: clientMeta ? workModeBadge(clientMeta) : null,
          },
          {
            label: PROJECT_FIELD_LABELS.contractStatus,
            value: clientMeta
              ? enumBadge(clientMeta.contractStatus, CONTRACT_STATUS_LABELS, CONTRACT_STATUS_ICONS)
              : null,
          },
          {
            label: PROJECT_FIELD_LABELS.teamSize,
            value: clientMeta?.teamSize != null ? String(clientMeta.teamSize) : null,
          },
          {
            label: PROJECT_FIELD_LABELS.deliverablesCount,
            value: clientMeta ? String(clientMeta.deliverablesCount) : null,
          },
        ],
      },
      {
        title: PROJECT_SECTION_TITLES.description,
        rows: [
          {
            label: PROJECT_FIELD_LABELS.descriptionFr,
            value: project.descriptionFr,
            fullWidth: true,
          },
          {
            label: PROJECT_FIELD_LABELS.descriptionEn,
            value: project.descriptionEn,
            fullWidth: true,
          },
        ],
      },
      {
        title: PROJECT_SECTION_TITLES.caseStudy,
        rows: [
          {
            label: PROJECT_FIELD_LABELS.caseStudyMarkdownFr,
            value: describeMarkdown(project.caseStudyMarkdownFr),
          },
          {
            label: PROJECT_FIELD_LABELS.caseStudyMarkdownEn,
            value: describeMarkdown(project.caseStudyMarkdownEn),
          },
        ],
      },
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

  const viewProjects = useMemo(() => {
    const type = VIEW_TYPE[view]
    return type ? projects.filter((project) => project.type === type) : projects
  }, [projects, view])

  const columns = useMemo<readonly Column<AdminProjectListItem>[]>(() => buildColumns(view), [view])

  const buildDetail = useCallback(
    (project: AdminProjectListItem) =>
      buildProjectDetail(project, () => {
        router.push(`${ADMIN_PROJECTS_PATH}/${project.id}`)
      }),
    [router],
  )

  const { open, dialog } = useRowDetail({ rows: projects, build: buildDetail })

  return (
    <>
      <DataTable
        rows={viewProjects}
        columns={columns}
        getRowId={(project) => project.id}
        orderValue={(project) => project.displayOrder}
        facets={facets}
        lockedFacets={PROJECT_VIEW_LOCKED_FACETS[view]}
        onReorder={
          view === "all" ? (_groupKey, orderedRowIds) => reorderProjects(orderedRowIds) : undefined
        }
        onRowClick={open}
        rowLabel={(project) => project.titleFr}
        searchPlaceholder="Rechercher un titre ou un slug"
        noun="projet"
        empty={{
          icon: Folder,
          title: "Aucun projet",
          description: "Aucun projet dans cette vue. Créez-en un via le bouton ci-dessus.",
        }}
      />
      {dialog}
    </>
  )
}
