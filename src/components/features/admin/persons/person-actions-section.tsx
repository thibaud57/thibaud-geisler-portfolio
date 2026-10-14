import { linksSection } from "@/components/features/admin/detail/detail-sections"
import { ADMIN_PROSPECTING_ACTIONS_PATH } from "@/lib/admin/routes"
import { detailHref } from "@/lib/admin/detail-links"
import { PERSON_SECTION_TITLES } from "@/lib/crm/persons"
import { toActionLink } from "@/lib/crm/prospecting-actions"
import type { ActionTimelineRow } from "@/server/queries/prospecting-actions"

export function personActionsSection(history: readonly ActionTimelineRow[]) {
  return linksSection(
    PERSON_SECTION_TITLES.actions,
    history.map((action) => ({
      ...toActionLink(action),
      href: detailHref(ADMIN_PROSPECTING_ACTIONS_PATH, action.id),
    })),
  )
}
