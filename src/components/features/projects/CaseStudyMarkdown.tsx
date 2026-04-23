import Image from 'next/image'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

type Props = {
  markdown: string
}

export function CaseStudyMarkdown({ markdown }: Props) {
  return (
    <section className="mt-0 mb-12">
      <article className="prose prose-lg dark:prose-invert max-w-none">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            img: ({ src, alt }) => {
              if (typeof src !== 'string') return null
              return (
                <figure className="my-8">
                  <Image
                    src={src}
                    alt={alt ?? ''}
                    width={1600}
                    height={900}
                    sizes="(max-width: 768px) 100vw, 1200px"
                    className="h-auto w-full rounded-lg border border-border"
                  />
                  {alt ? (
                    <figcaption className="mt-2 text-center text-sm text-muted-foreground">
                      {alt}
                    </figcaption>
                  ) : null}
                </figure>
              )
            },
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
          }}
        >
          {markdown}
        </ReactMarkdown>
      </article>
    </section>
  )
}
