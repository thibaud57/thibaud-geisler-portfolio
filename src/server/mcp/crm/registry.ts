import "server-only"

import { companyEntity } from "./entities/company"
import { contactEntity } from "./entities/contact"
import { interviewEntity } from "./entities/interview"
import { leadEntity } from "./entities/lead"
import { opportunityEntity } from "./entities/opportunity"
import { prospectingActionEntity } from "./entities/prospecting-action"
import { signalEntity } from "./entities/signal"
import { weeklyReviewEntity } from "./entities/weekly-review"
import type { RegisteredCrmEntity } from "./entity-definition"

const REGISTERED_ENTITIES = [
  companyEntity,
  leadEntity,
  contactEntity,
  opportunityEntity,
  interviewEntity,
  prospectingActionEntity,
  signalEntity,
  weeklyReviewEntity,
] as const

export type CrmEntity = (typeof REGISTERED_ENTITIES)[number]["entity"]

// Annoter la forme générale : le tuple littéral figerait le nombre d'entités dans le type des `.map`
export const CRM_ENTITIES: readonly [
  RegisteredCrmEntity<CrmEntity>,
  ...RegisteredCrmEntity<CrmEntity>[],
] = REGISTERED_ENTITIES

const [firstEntity, ...otherEntities] = CRM_ENTITIES

export const CRM_ENTITY_NAMES: readonly [CrmEntity, ...CrmEntity[]] = [
  firstEntity.entity,
  ...otherEntities.map((entry) => entry.entity),
]
