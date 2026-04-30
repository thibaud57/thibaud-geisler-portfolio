import type { Components } from 'react-markdown'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

import { cn } from '@/lib/utils'

type Props = {
  markdown: string
  className?: string
  components?: Components
}

const defaultComponents: Components = {
  a: ({ href, children }) => {
    const isExternal = typeof href === 'string' && href.startsWith('http')
    return (
      <a
        href={href}
        target={isExternal ? '_blank' : undefined}
        rel={isExternal ? 'noopener noreferrer' : undefined}
      >
        {children}
      </a>
    )
  },
}

export function MarkdownContent({ markdown, className, components }: Props) {
  return (
    <article
      className={cn('prose prose-lg dark:prose-invert max-w-none', className)}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{ ...defaultComponents, ...components }}
      >
        {markdown}
      </ReactMarkdown>
    </article>
  )
}
