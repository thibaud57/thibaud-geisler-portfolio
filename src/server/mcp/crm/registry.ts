import "server-only"

import { companyEntity } from "./entities/company"
import { contactEntity } from "./entities/contact"
import { interviewEntity } from "./entities/interview"
import { leadEntity } from "./entities/lead"
import { opportunityEntity } from "./entities/opportunity"
import { prospectingActionEntity } from "./entities/prospecting-action"
import { signalEntity } from "./entities/signal"
import { weeklyReviewEntity } from "./entities/weekly-review"
export const CRM_ENTITIES = [
  companyEntity,
  leadEntity,
  contactEntity,
  opportunityEntity,
  interviewEntity,
  prospectingActionEntity,
  signalEntity,
  weeklyReviewEntity,
] as const

export type CrmEntity = (typeof CRM_ENTITIES)[number]["entity"]

export const CRM_ENTITY_NAMES = CRM_ENTITIES.map((entry) => entry.entity)
