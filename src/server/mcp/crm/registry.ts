import "server-only"

import { entityTable } from "@/server/mcp/entity-definition"

import { companyEntity } from "./entities/company"
import { contactEntity } from "./entities/contact"
import { interviewEntity } from "./entities/interview"
import { leadEntity } from "./entities/lead"
import { opportunityEntity } from "./entities/opportunity"
import { prospectingActionEntity } from "./entities/prospecting-action"
import { signalEntity } from "./entities/signal"
import { weeklyReviewEntity } from "./entities/weekly-review"

export const CRM_ENTITY_BY_NAME = entityTable({
  company: companyEntity,
  lead: leadEntity,
  contact: contactEntity,
  opportunity: opportunityEntity,
  interview: interviewEntity,
  "prospecting-action": prospectingActionEntity,
  signal: signalEntity,
  "weekly-review": weeklyReviewEntity,
})

export type CrmEntity = keyof typeof CRM_ENTITY_BY_NAME

export const CRM_ENTITIES = Object.values(CRM_ENTITY_BY_NAME)

export const CRM_ENTITY_NAMES = CRM_ENTITIES.map((entry) => entry.entity)
