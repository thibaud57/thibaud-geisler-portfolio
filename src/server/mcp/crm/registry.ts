import "server-only"

import { companyEntity } from "./entities/company"
import type { RegisteredCrmEntity } from "./entity-definition"

const REGISTERED_ENTITIES = [companyEntity] as const

export type CrmEntity = (typeof REGISTERED_ENTITIES)[number]["entity"]

// Un registre à une seule entité type `...others` en `[]` : annoter la forme générale garde les `.map` typés
export const CRM_ENTITIES: readonly [
  RegisteredCrmEntity<CrmEntity>,
  ...RegisteredCrmEntity<CrmEntity>[],
] = REGISTERED_ENTITIES

const [firstEntity, ...otherEntities] = CRM_ENTITIES

export const CRM_ENTITY_NAMES: readonly [CrmEntity, ...CrmEntity[]] = [
  firstEntity.entity,
  ...otherEntities.map((entry) => entry.entity),
]
