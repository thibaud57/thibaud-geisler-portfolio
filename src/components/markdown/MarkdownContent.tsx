import type { Components } from "react-markdown"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

import { LINK_CLASS, STANDALONE_LINK_CLASS } from "@/lib/typography"
import { cn } from "@/lib/utils"

interface Props {
  markdown: string
  className?: string
  components?: Components
  // "text" : lien dans un paragraphe (pages légales). "standalone" : liste de liens seuls sur
  // leur ligne (case study).
  links?: "text" | "standalone"
}

export function MarkdownContent({ markdown, className, components, links = "text" }: Props) {
  const linkClassName = links === "standalone" ? STANDALONE_LINK_CLASS : LINK_CLASS
  const defaultComponents: Components = {
    a: ({ href, children }) => {
      const isExternal = typeof href === "string" && href.startsWith("http")
      return (
        <a
          href={href}
          target={isExternal ? "_blank" : undefined}
          rel={isExternal ? "noopener noreferrer" : undefined}
          className={linkClassName}
        >
          {children}
        </a>
      )
    },
  }

  return (
    <div
      className={cn(
        "prose max-w-none dark:prose-invert",
        "prose-h2:mt-12 prose-h2:mb-6 prose-h2:text-3xl prose-h2:font-semibold prose-h2:tracking-tight prose-h2:text-balance sm:prose-h2:text-4xl",
        "prose-h3:text-2xl prose-h3:font-semibold prose-h3:tracking-tight",
        "[&>:first-child]:mt-0 [&>:last-child]:mb-0",
        className,
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{ ...defaultComponents, ...components }}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  )
}
