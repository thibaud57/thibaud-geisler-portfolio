import { Link } from '@/i18n/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { LabeledText } from '@/components/ui/labeled-text'
import { cn } from '@/lib/utils'
import { ServiceCardBeam } from './ServiceCardBeam'
import { SERVICE_HIGHLIGHTS, SERVICE_ICONS, type ServiceSlug } from './service-slugs'

type Props = {
  slug: ServiceSlug
  title: string
  description: string
  bullets: string[]
  ctaLabel: string
}

export function ServiceCard({ slug, title, description, bullets, ctaLabel }: Props) {
  const Icon = SERVICE_ICONS[slug]

  return (
    <Card
      className={cn(
        'relative flex h-full flex-col overflow-hidden',
        'transition hover:-translate-y-0.5 hover:shadow-md',
      )}
    >
      <CardHeader className="gap-4">
        <Icon className="size-8 text-primary" aria-hidden />
        <CardTitle className="font-display text-2xl font-semibold">{title}</CardTitle>
        <CardDescription className="text-base text-muted-foreground">
          {description}
        </CardDescription>
      </CardHeader>

      <CardContent className="flex-1">
        <ul className="flex flex-col gap-2 text-base">
          {bullets.map((bullet) => (
            <li key={bullet} className="flex gap-2">
              <span className="mt-1 size-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
              <LabeledText text={bullet} />
            </li>
          ))}
        </ul>
      </CardContent>

      <CardFooter>
        <Button asChild className="w-full">
          <Link href={{ pathname: '/contact', query: { service: slug } }}>
            {ctaLabel}
          </Link>
        </Button>
      </CardFooter>
      {SERVICE_HIGHLIGHTS[slug] && <ServiceCardBeam />}
    </Card>
  )
}
