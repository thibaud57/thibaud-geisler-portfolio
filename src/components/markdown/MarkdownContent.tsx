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
    <div
      className={cn(
        'prose dark:prose-invert max-w-none',
        'prose-h2:mt-12 prose-h2:mb-6 prose-h2:text-3xl prose-h2:font-semibold prose-h2:tracking-tight prose-h2:text-balance sm:prose-h2:text-4xl',
        'prose-h3:text-2xl prose-h3:font-semibold prose-h3:tracking-tight',
        '[&>:first-child]:mt-0 [&>:last-child]:mb-0',
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
