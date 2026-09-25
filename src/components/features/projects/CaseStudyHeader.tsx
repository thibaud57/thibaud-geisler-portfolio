import { safeExternalUrl } from "@/lib/url"
import Image from "next/image"
import { User } from "lucide-react"
import { getTranslations } from "next-intl/server"
import { cn } from "@/lib/utils"
import { buildAssetUrl } from "@/lib/assets"
import { getProjectTimeline } from "@/lib/projects"
import { LABEL_CLASS } from "@/lib/typography"
import { getLiveProjectDuration } from "@/server/queries/projects"
import type { LocalizedProjectWithRelations } from "@/types/project"
import { LeadParagraph } from "@/components/ui/lead-paragraph"
import { FormatBadges } from "./FormatBadges"

interface Props {
  project: LocalizedProjectWithRelations
}

export async function CaseStudyHeader({ project }: Props) {
  const t = await getTranslations("Projects.caseStudy")

  const timeline = getProjectTimeline(project.startedAt, project.endedAt)
  const { startYear, endYear, inProgress } = timeline
  const endLabel = endYear?.toString() ?? (inProgress ? t("inProgress") : "")
  const { company, teamSize, contractStatus: contract, workMode } = project.clientMeta ?? {}
  const companyUrl = safeExternalUrl(company?.websiteUrl)
  // Un projet personnel est rattaché à l'entreprise du freelance lui-même : la vitrine montre la
  // même carte, mais « Personnel » avec une icône, jamais la fiche de cette entreprise.
  const isPersonal = project.type === "PERSONAL"

  // La frise porte déjà les années : Durée dit combien de temps, jusqu'à aujourd'hui en cours.
  const duration = await getLiveProjectDuration(project.startedAt, project.endedAt)
  const durationValue = duration
    ? [
        duration.years > 0 ? t("meta.durationYears", { count: duration.years }) : null,
        duration.months > 0 ? t("meta.durationMonths", { count: duration.months }) : null,
      ]
        .filter(Boolean)
        .join(" ")
    : null

  return (
    <header>
      {startYear !== null ? (
        <div className="mb-6 flex items-center gap-3" aria-label={t("meta.duration")}>
          <TimelineMarker label={String(startYear)} />
          <span
            className="h-px max-w-24 flex-1 bg-linear-to-r from-primary/60 to-primary/10"
            aria-hidden="true"
          />
          <TimelineMarker label={endLabel} variant={inProgress ? "active" : "default"} />
        </div>
      ) : null}

      <h1>{project.title}</h1>

      <FormatBadges formats={project.formats} className="mt-5" />

      <LeadParagraph className="mt-8">{project.description}</LeadParagraph>

      {project.coverFilename ? (
        <figure className="relative mt-10 aspect-[16/7] w-full overflow-hidden rounded-2xl border border-border">
          <Image
            src={buildAssetUrl(project.coverFilename)}
            alt={project.title}
            fill
            sizes="(max-width: 1024px) 100vw, 1024px"
            preload
            className="object-cover"
          />
        </figure>
      ) : (
        <div
          aria-hidden="true"
          className="mt-10 aspect-[16/7] w-full rounded-2xl border border-border bg-linear-to-br from-primary/15 via-accent/10 to-background"
        />
      )}

      {isPersonal || company ? (
        <div className="mt-10 flex w-fit items-center gap-4 rounded-xl border border-border bg-muted/30 p-5">
          {!isPersonal && company?.logoFilename ? (
            <Image
              src={buildAssetUrl(company.logoFilename)}
              alt={company.name}
              width={56}
              height={56}
              className="size-14 shrink-0 rounded-md border border-border bg-muted object-contain"
            />
          ) : (
            <div className="flex size-14 shrink-0 items-center justify-center rounded-md border border-border bg-muted">
              <User className="size-7 text-muted-foreground" aria-hidden="true" />
            </div>
          )}
          <div className="flex flex-col gap-1">
            {isPersonal ? (
              <span className="text-xl font-semibold">{t("personal")}</span>
            ) : companyUrl ? (
              <a
                href={companyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xl font-semibold hover:text-primary"
              >
                {company?.name}
              </a>
            ) : (
              <span className="text-xl font-semibold">{company?.name}</span>
            )}
            {!isPersonal && company ? (
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted-foreground">
                {company.sectors.length > 0 ? (
                  <span>{company.sectors.map((s) => t(`sector.${s}`)).join(" / ")}</span>
                ) : null}
                {company.size ? <span>{t(`companySize.${company.size}`)}</span> : null}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      <dl className="mt-10 grid grid-cols-2 gap-x-6 gap-y-6 border-y border-border py-8 text-sm md:grid-cols-4">
        {teamSize ? (
          <MetaItem
            label={t("meta.teamSize")}
            value={t("meta.teamSizeValue", { count: teamSize })}
          />
        ) : null}
        {contract ? (
          <MetaItem label={t("meta.contract")} value={t(`contractStatus.${contract}`)} />
        ) : null}
        {workMode ? (
          <MetaItem label={t("meta.workMode")} value={t(`workMode.${workMode}`)} />
        ) : null}
        {durationValue ? <MetaItem label={t("meta.duration")} value={durationValue} /> : null}
      </dl>
    </header>
  )
}

function TimelineMarker({
  label,
  variant = "default",
}: {
  label: string
  variant?: "default" | "active"
}) {
  return (
    <div className="flex items-center gap-2">
      <span
        aria-hidden="true"
        className={cn(
          "size-2.5 rounded-full bg-primary",
          variant === "active" && "animate-pulse ring-4 ring-primary/20",
        )}
      />
      <span className={cn(LABEL_CLASS, "font-mono")}>{label}</span>
    </div>
  )
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className={LABEL_CLASS}>{label}</dt>
      <dd className="font-medium text-foreground">{value}</dd>
    </div>
  )
}
