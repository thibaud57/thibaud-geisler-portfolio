import { ADMIN_CONTACTS_PATH, ADMIN_LEADS_PATH } from "@/lib/admin-routes"
import { detailHref } from "@/lib/detail-links"

interface PersonWithRoles {
  id: string
  lead: object | null
  contact: object | null
}

type PersonDetailHref =
  | ReturnType<typeof detailHref<typeof ADMIN_LEADS_PATH>>
  | ReturnType<typeof detailHref<typeof ADMIN_CONTACTS_PATH>>

// Lead prioritaire sur Contact quand une personne porte les deux : son pipeline commercial reste la vue la plus utile depuis un lien d'une autre fiche.
export function personDetailHref(person: PersonWithRoles): PersonDetailHref | null {
  if (person.lead) return detailHref(ADMIN_LEADS_PATH, person.id)
  if (person.contact) return detailHref(ADMIN_CONTACTS_PATH, person.id)
  return null
}
