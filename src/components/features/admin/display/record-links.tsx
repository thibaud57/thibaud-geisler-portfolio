import type { ComponentProps, ReactNode } from "react"
import Link from "next/link"
import { CompanyLogoTile } from "@/components/features/admin/display/CompanyLogoTile"
import { ExternalUrl } from "@/components/features/admin/display/ExternalUrl"
import { TruncateTooltip } from "@/components/features/admin/display/TruncateTooltip"
import { Badge } from "@/components/ui/badge"
import { detailHref } from "@/lib/admin/detail-links"
import { ADMIN_COMPANIES_PATH } from "@/lib/admin/routes"
import { personDetailHref } from "@/lib/crm/person-links"
import { OPTED_OUT_LABEL, personDisplayName } from "@/lib/crm/persons"
import { cn } from "@/lib/utils"

export function linkedinLink(person: { linkedinUrl: string | null }) {
  return person.linkedinUrl ? (
    <ExternalUrl url={person.linkedinUrl} className="wrap-anywhere" />
  ) : null
}

interface CompanyRef {
  id: string
  name: string
  logoFilename: string | null
}

// Fonction et non composant, comme `truncatedCell` : DataTable ne pose EmptyValue que sur un null reçu.
export function companyCell(row: { company: CompanyRef | null }) {
  return row.company ? <CompanyLink company={row.company} /> : null
}

// Un seul lien, en couleur du texte : le vert reste aux liens qui sortent de l'admin. Sans fiche à
// ouvrir, la référence reste en texte simple.
export function RecordLink({
  href,
  leading,
  children,
}: {
  href: ComponentProps<typeof Link>["href"] | null
  leading?: ReactNode
  children: string
}) {
  const content = (
    <>
      {leading}
      <TruncateTooltip
        className={cn("min-w-0", href && "underline-offset-4 group-hover:underline")}
      >
        {children}
      </TruncateTooltip>
    </>
  )
  const className = "group inline-flex max-w-full min-w-0 items-center gap-2"
  return href ? (
    <Link href={href} className={className}>
      {content}
    </Link>
  ) : (
    <span className={className}>{content}</span>
  )
}

export function CompanyLink({ company }: { company: CompanyRef }) {
  return (
    <RecordLink
      href={detailHref(ADMIN_COMPANIES_PATH, company.id)}
      leading={<CompanyLogoTile logoFilename={company.logoFilename} size="sm" />}
    >
      {company.name}
    </RecordLink>
  )
}

interface PersonRef {
  name: string | null
  email: string | null
  linkedinUrl: string | null
  company?: { logoFilename: string | null } | null
}

export function PersonRecordLink({
  person,
  href,
}: {
  person: PersonRef
  href: ComponentProps<typeof RecordLink>["href"]
}) {
  return (
    <RecordLink
      href={href}
      leading={
        person.company ? (
          <CompanyLogoTile logoFilename={person.company.logoFilename} size="sm" />
        ) : null
      }
    >
      {personDisplayName(person)}
    </RecordLink>
  )
}

// Une personne peut avoir perdu ses rôles Lead et Contact : sans fiche à ouvrir, son nom reste en texte simple.
export function PersonLink({
  person,
}: {
  person: PersonRef & {
    id: string
    lead: object | null
    contact: object | null
    optedOutAt?: Date | null
  }
}) {
  return (
    <span className="inline-flex max-w-full min-w-0 items-center gap-2">
      <PersonRecordLink person={person} href={personDetailHref(person)} />
      {person.optedOutAt ? <Badge variant="outline">{OPTED_OUT_LABEL}</Badge> : null}
    </span>
  )
}
