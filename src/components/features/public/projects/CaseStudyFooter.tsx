import { ArrowLeft } from "lucide-react"
import { useTranslations } from "next-intl"
import { Link } from "@/i18n/navigation"
import type { LocalizedProjectWithRelations } from "@/types/project"
import { CaseStudyLinks } from "./CaseStudyLinks"

interface Props {
  project: LocalizedProjectWithRelations
}

export function CaseStudyFooter({ project }: Props) {
  const t = useTranslations("Projects.caseStudy")

  return (
    <footer className="flex flex-col gap-6 border-t border-border pt-8">
      <CaseStudyLinks project={project} />

      <Link
        href="/projets"
        className="inline-flex items-center text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        {t("backToList")}
      </Link>
    </footer>
  )
}
