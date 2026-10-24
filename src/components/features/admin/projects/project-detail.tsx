import { type ReactNode } from "react"
import { headerBadge, type DetailContent } from "@/components/features/admin/detail/DetailDialog"
import { iconsByLabel } from "@/components/features/admin/table/table-cells"
import { enumBadge, workModeBadge } from "@/components/features/admin/display/badges"
import { companyCell } from "@/components/features/admin/display/record-links"
import { BadgeList } from "@/components/features/admin/display/BadgeList"
import { ExternalUrl } from "@/components/features/admin/display/ExternalUrl"
import { formatShortDate } from "@/lib/date-time"
import {
  formatProjectDuration,
  PROJECT_FORMAT_ICONS,
  PROJECT_FORMAT_LABELS,
  PROJECT_FORMATS,
  PROJECT_FIELD_LABELS,
  PROJECT_SECTION_TITLES,
  PROJECT_STATUS_LABELS,
  PROJECT_TYPE_LABELS,
} from "@/lib/projects"
import { CONTRACT_STATUS_ICONS, CONTRACT_STATUS_LABELS } from "@/lib/contract-terms"
import type { AdminProjectListItem } from "@/server/queries/projects"

export const FORMAT_ICONS_BY_LABEL = iconsByLabel(
  PROJECT_FORMATS,
  PROJECT_FORMAT_LABELS,
  PROJECT_FORMAT_ICONS,
)

// Un case study fait plusieurs milliers de caractères : la vue détail dit qu'il existe et ce qu'il
// pèse, la lecture du texte appartient à l'écran d'édition.
function describeMarkdown(markdown: string | null): ReactNode {
  if (!markdown) return null
  return `Rédigé (${markdown.length} caractères)`
}

export function buildProjectDetail(
  project: AdminProjectListItem,
  now: Date,
  onEdit: () => void,
): DetailContent {
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
            value: formatProjectDuration(project.startedAt, project.endedAt, now),
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
