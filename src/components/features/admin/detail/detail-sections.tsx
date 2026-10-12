import {
  RelatedLinksList,
  type RelatedLink,
} from "@/components/features/admin/detail/RelatedLinksList"
import type { DetailSection } from "@/components/features/admin/detail/DetailDialog"
import { MarkdownContent } from "@/components/markdown/MarkdownContent"

export function markdownSection(title: string, markdown: string | null): DetailSection {
  return {
    title,
    rows: [
      {
        value: markdown ? <MarkdownContent markdown={markdown} variant="admin" /> : null,
        fullWidth: true,
      },
    ],
  }
}

export function textSection(
  title: string,
  text: string | null | undefined,
  { preserveLines = false }: { preserveLines?: boolean } = {},
): DetailSection {
  const value = text === "" ? null : text
  return {
    title,
    rows: [
      {
        value:
          value && preserveLines ? <span className="whitespace-pre-line">{value}</span> : value,
        fullWidth: true,
      },
    ],
  }
}

export function linksSection(title: string, links: readonly RelatedLink[]): DetailSection {
  return {
    title,
    rows: [
      { value: links.length === 0 ? null : <RelatedLinksList links={links} />, fullWidth: true },
    ],
  }
}
