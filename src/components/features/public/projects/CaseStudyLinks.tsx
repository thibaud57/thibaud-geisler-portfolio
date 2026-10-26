import { SiGithub } from "@icons-pack/react-simple-icons"
import { ExternalLink } from "lucide-react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { BorderBeam } from "@/components/magicui/border-beam"
import { safeExternalUrl } from "@/lib/url"
import type { LocalizedProjectWithRelations } from "@/types/project"

interface Props {
  project: Pick<LocalizedProjectWithRelations, "demoUrl" | "githubUrl">
}

export function CaseStudyLinks({ project }: Props) {
  const t = useTranslations("Projects.caseStudy")
  const demoUrl = safeExternalUrl(project.demoUrl)
  const githubUrl = safeExternalUrl(project.githubUrl)

  if (!demoUrl && !githubUrl) return null

  return (
    <div className="flex flex-wrap gap-3">
      {demoUrl ? (
        <Button asChild variant="default" className="relative">
          <a href={demoUrl} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="mr-2 h-4 w-4" />
            {t("links.demo")}
            <BorderBeam
              size={40}
              duration={7}
              borderWidth={2}
              colorFrom="var(--shine)"
              colorTo="transparent"
            />
          </a>
        </Button>
      ) : null}
      {githubUrl ? (
        <Button asChild variant="outline">
          <a href={githubUrl} target="_blank" rel="noopener noreferrer">
            <SiGithub className="mr-2 size-4" />
            {t("links.github")}
          </a>
        </Button>
      ) : null}
    </div>
  )
}
