"use client"

import { useMemo, useState, type ReactNode } from "react"
import { Folder, Pencil } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { CompanyLogoTile } from "@/components/features/admin/CompanyLogoTile"
import { DataTable, type Column, type Facet } from "@/components/features/admin/DataTable"
import { type DetailContent, DetailDialog } from "@/components/features/admin/DetailDialog"
import { RowActionButton } from "@/components/features/admin/RowActionButton"
import { TruncateTooltip } from "@/components/features/admin/TruncateTooltip"
import { DeleteProjectDialog } from "@/components/features/admin/projects/DeleteProjectDialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import type { ProjectFormat, ProjectStatus, ProjectType } from "@/generated/prisma/client"
import {
  PROJECT_COLUMN_WIDTHS,
  PROJECT_VIEW_DEFAULT_VISIBLE_COLUMNS,
  type ProjectColumnKey,
  type ProjectView,
} from "@/lib/admin-table-widths"
import {
  CONTRACT_STATUS_LABELS,
  formatDurationRange,
  formatProjectDuration,
  formatShortDate,
  getProjectTimeline,
  PROJECT_FORMAT_LABELS,
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

const MAX_VISIBLE_FORMATS = 3

const PROJECT_STATUS_VALUES = Object.keys(PROJECT_STATUS_LABELS) as ProjectStatus[]
const PROJECT_FORMAT_VALUES = Object.keys(PROJECT_FORMAT_LABELS) as ProjectFormat[]

const PROJECT_STATUS_DOT_CLASS: Record<ProjectStatus, string> = {
  DRAFT: "bg-warning",
  PUBLISHED: "bg-success",
  ARCHIVED: "bg-muted-foreground",
}

// Un case study fait plusieurs milliers de caractères : la vue détail dit qu'il existe et ce qu'il
// pèse, la lecture du texte appartient à l'écran d'édition.
function describeMarkdown(markdown: string | null): string {
  if (!markdown) return "—"
  return `Rédigé (${markdown.length} caractères)`
}

function renderProjectStatus(status: ProjectStatus, className?: string): ReactNode {
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <span className={cn("size-1.5 shrink-0 rounded-full", PROJECT_STATUS_DOT_CLASS[status])} />
      {PROJECT_STATUS_LABELS[status]}
    </span>
  )
}

// Même rendu partout où la donnée apparaît (colonne, vue détail, carte mobile) : un lien ouvert ne
// doit pas se comporter différemment selon l'endroit qui l'affiche.
function renderProjectLinks(project: AdminProjectListItem): ReactNode {
  const github = safeExternalUrl(project.githubUrl)
  const demo = safeExternalUrl(project.demoUrl)
  const links = [
    github ? { label: "GitHub", href: github } : null,
    demo ? { label: "Démo", href: demo } : null,
  ].filter((link): link is { label: string; href: string } => link !== null)

  if (links.length === 0) return "—"

  return (
    <span className="inline-flex items-center gap-1.5">
      {links.map((link, index) => (
        <span key={link.label} className="inline-flex items-center gap-1.5">
          {index > 0 ? <span className="text-muted-foreground">·</span> : null}
          <a
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline-offset-4 hover:underline"
          >
            {link.label}
          </a>
        </span>
      ))}
    </span>
  )
}

function capFormats(formats: readonly ProjectFormat[]) {
  const labels = formats.map((format) => PROJECT_FORMAT_LABELS[format])
  const shown = labels.slice(0, MAX_VISIBLE_FORMATS)
  const hidden = labels.slice(shown.length)
  return { shown, hidden }
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
      header: "Titre",
      width: PROJECT_COLUMN_WIDTHS.titre,
      sortValue: (project) => project.titleFr,
      searchValue: (project) => `${project.titleFr} ${project.slug}`,
      cell: (project) => (
        <div className="flex min-w-0 flex-col">
          <TruncateTooltip className="font-medium">{project.titleFr}</TruncateTooltip>
          <TruncateTooltip className="font-mono text-xs text-muted-foreground">
            {project.slug}
          </TruncateTooltip>
        </div>
      ),
    },
    {
      key: "nature",
      header: "Nature",
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
      header: "Type de projet",
      width: PROJECT_COLUMN_WIDTHS.formats,
      ...hideable(view, "formats"),
      cell: (project) => {
        const { shown, hidden } = capFormats(project.formats)
        return (
          <div className="flex flex-wrap gap-1">
            {shown.map((label) => (
              <Badge key={label} variant="secondary">
                {label}
              </Badge>
            ))}
            {hidden.length > 0 ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="outline" asChild>
                    <button
                      type="button"
                      aria-label={`Voir les formats supplémentaires : ${hidden.join(" · ")}`}
                    >
                      +{hidden.length}
                    </button>
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>{[...shown, ...hidden].join(" · ")}</TooltipContent>
              </Tooltip>
            ) : null}
          </div>
        )
      },
    },
    {
      key: "entreprise",
      header: "Entreprise",
      width: PROJECT_COLUMN_WIDTHS.entreprise,
      ...hideable(view, "entreprise"),
      cell: (project) => {
        const company = project.clientMeta?.company
        if (!company) return <span className="text-muted-foreground">—</span>
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
      header: "Statut contrat",
      width: PROJECT_COLUMN_WIDTHS.contrat,
      className: "whitespace-nowrap text-muted-foreground",
      ...hideable(view, "contrat"),
      cell: (project) =>
        project.clientMeta?.contractStatus
          ? CONTRACT_STATUS_LABELS[project.clientMeta.contractStatus]
          : "—",
    },
    {
      key: "debut",
      header: "Date début",
      width: PROJECT_COLUMN_WIDTHS.debut,
      className: "whitespace-nowrap text-muted-foreground",
      sortValue: (project) => project.startedAt?.getTime() ?? 0,
      ...hideable(view, "debut"),
      cell: (project) => formatShortDate(project.startedAt),
    },
    {
      key: "fin",
      header: "Date fin",
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
      cell: (project) => formatProjectDuration(project.startedAt, project.endedAt) ?? "—",
    },
    {
      key: "equipe",
      header: "Équipe",
      width: PROJECT_COLUMN_WIDTHS.equipe,
      align: "right",
      className: "font-mono tabular-nums text-muted-foreground",
      ...hideable(view, "equipe"),
      cell: (project) =>
        project.clientMeta?.teamSize != null ? String(project.clientMeta.teamSize) : "—",
    },
    {
      key: "liens",
      header: "Liens",
      width: PROJECT_COLUMN_WIDTHS.liens,
      className: "whitespace-nowrap",
      ...hideable(view, "liens"),
      cell: renderProjectLinks,
    },
    {
      key: "statut",
      header: "Statut",
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
          <DeleteProjectDialog project={project} trigger="icon" />
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

async function handleReorder(_groupKey: string, orderedRowIds: string[]): Promise<boolean> {
  const result = await reorderProjects(orderedRowIds)
  if (result.ok) return true

  toast.error(
    result.message === "stale_order"
      ? "La liste a changé entre-temps. Rechargez la page."
      : "Le nouvel ordre n'a pas pu être enregistré.",
  )
  return false
}

function buildProjectDetail(project: AdminProjectListItem, onEdit: () => void): DetailContent {
  const clientMeta = project.clientMeta
  return {
    title: project.titleFr,
    subtitle: (
      <span className="flex flex-wrap items-center gap-2">
        <span className="font-mono">#{project.displayOrder}</span>
        <Badge variant="outline" meta>
          {PROJECT_TYPE_LABELS[project.type]}
        </Badge>
        {renderProjectStatus(project.status)}
      </span>
    ),
    sections: [
      {
        title: PROJECT_SECTION_TITLES.identity,
        rows: [
          { label: "Titre (français)", value: project.titleFr },
          { label: "Titre (anglais)", value: project.titleEn },
          { label: "Slug", value: <span className="font-mono">{project.slug}</span> },
          {
            label: "Type de projet",
            fullWidth: true,
            value: project.formats.length ? (
              <span className="flex flex-wrap gap-1">
                {project.formats.map((format) => (
                  <Badge key={format} variant="secondary">
                    {PROJECT_FORMAT_LABELS[format]}
                  </Badge>
                ))}
              </span>
            ) : (
              "—"
            ),
          },
        ],
      },
      {
        title: PROJECT_SECTION_TITLES.description,
        rows: [
          { label: "Français", fullWidth: true, value: project.descriptionFr },
          { label: "Anglais", fullWidth: true, value: project.descriptionEn },
        ],
      },
      {
        title: PROJECT_SECTION_TITLES.tags,
        rows: [
          {
            value: project.tags.length ? (
              <span className="flex flex-wrap gap-1">
                {project.tags.map((projectTag) => (
                  <Badge key={projectTag.tagId} variant="secondary">
                    {projectTag.tag.nameFr}
                  </Badge>
                ))}
              </span>
            ) : (
              "—"
            ),
          },
        ],
      },
      {
        title: PROJECT_SECTION_TITLES.caseStudy,
        rows: [
          { label: "Français", value: describeMarkdown(project.caseStudyMarkdownFr) },
          { label: "Anglais", value: describeMarkdown(project.caseStudyMarkdownEn) },
        ],
      },
      {
        title: PROJECT_SECTION_TITLES.publication,
        rows: [
          { label: "Date début", value: formatShortDate(project.startedAt) },
          { label: "Date fin", value: formatShortDate(project.endedAt) },
          {
            label: "Durée",
            value: formatProjectDuration(project.startedAt, project.endedAt) ?? "—",
          },
        ],
      },
      {
        title: PROJECT_SECTION_TITLES.links,
        rows: [{ value: renderProjectLinks(project) }],
      },
      {
        title: PROJECT_SECTION_TITLES.cover,
        rows: [
          {
            value: project.coverFilename ? (
              <span className="font-mono text-xs">{project.coverFilename}</span>
            ) : (
              "—"
            ),
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
                { label: "Entreprise", value: clientMeta.company.name },
                { label: "Mode de travail", value: WORK_MODE_LABELS[clientMeta.workMode] },
                {
                  label: "Statut contrat",
                  value: clientMeta.contractStatus
                    ? CONTRACT_STATUS_LABELS[clientMeta.contractStatus]
                    : "—",
                },
                {
                  label: "Équipe",
                  value: clientMeta.teamSize != null ? String(clientMeta.teamSize) : "—",
                },
                { label: "Livrables", value: String(clientMeta.deliverablesCount) },
              ],
            },
          ]
        : []),
    ],
    onEdit,
  }
}

function ProjectCard({ project }: { project: AdminProjectListItem }) {
  const timeline = getProjectTimeline(project.startedAt, project.endedAt)
  const years = formatDurationRange(timeline, "En cours") ?? "—"
  const company = project.clientMeta?.company

  return (
    <Card size="sm">
      <CardHeader>
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <CardTitle>
              <TruncateTooltip className="block w-full">{project.titleFr}</TruncateTooltip>
            </CardTitle>
            <TruncateTooltip className="block w-full font-mono text-xs text-muted-foreground">
              {project.slug}
            </TruncateTooltip>
          </div>
          <Badge variant="outline" meta>
            {PROJECT_TYPE_LABELS[project.type]}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
        {renderProjectStatus(project.status, "text-foreground")}
        {company ? (
          <span className="inline-flex items-center gap-1.5">
            <CompanyLogoTile logoFilename={company.logoFilename} size="sm" className="shrink-0" />
            {company.name}
          </span>
        ) : null}
        <span>{years}</span>
        {renderProjectLinks(project)}
      </CardContent>
      <CardFooter className="gap-2">
        <Button variant="outline" size="sm" asChild>
          <Link href={`/admin/projets/${project.id}`}>Modifier</Link>
        </Button>
        <DeleteProjectDialog project={project} trigger="text" />
      </CardFooter>
    </Card>
  )
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
        onReorder={view === "tous" ? handleReorder : undefined}
        onRowClick={setSelectedProject}
        rowLabel={(project) => project.titleFr}
        renderCard={(project) => <ProjectCard project={project} />}
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
