import type { Locale } from "next-intl"
import { io } from "next/cache"
import { getTranslations } from "next-intl/server"
import { Suspense } from "react"

import { TEASER_LIMIT } from "@/components/features/home/constants"
import { ProjectCard } from "@/components/features/projects/ProjectCard"
import { BentoGrid } from "@/components/magicui/bento-grid"
import { Button } from "@/components/ui/button"
import { StackedSkeleton } from "@/components/ui/stacked-skeleton"
import { Link } from "@/i18n/navigation"
import { findManyPublished } from "@/server/queries/projects"

interface Props {
  locale: Locale
}

export async function ProjectsTeaserSection({ locale }: Props) {
  const t = await getTranslations("HomePage.projectsTeaser")

  return (
    <section className="flex flex-col gap-8">
      <header className="flex flex-col items-center gap-3 text-center">
        <h2 className="font-display">{t("title")}</h2>
        <p className="max-w-2xl text-base text-muted-foreground">{t("subtitle")}</p>
      </header>

      <Suspense
        fallback={
          <StackedSkeleton
            heights={["h-[510px] lg:h-[475px]", "h-[510px] lg:hidden", "h-[510px] md:hidden"]}
          />
        }
      >
        <ProjectsTeaserGrid locale={locale} />
      </Suspense>

      <div className="flex justify-center">
        <Button asChild variant="ghost" size="lg">
          <Link href="/projets">{t("seeAll")}</Link>
        </Button>
      </div>
    </section>
  )
}

async function ProjectsTeaserGrid({ locale }: Props) {
  await io()
  const projects = await findManyPublished({ locale })
  const featured = projects.slice(0, TEASER_LIMIT)

  return (
    <BentoGrid>
      {featured.map((project) => (
        <ProjectCard key={project.slug} project={project} />
      ))}
    </BentoGrid>
  )
}
