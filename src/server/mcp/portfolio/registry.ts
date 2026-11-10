import "server-only"

import { entityTable } from "@/server/mcp/entity-definition"

import { tagEntity } from "./entities/tag"

export const PORTFOLIO_ENTITY_BY_NAME = entityTable({
  tag: tagEntity,
})

export type PortfolioEntity = keyof typeof PORTFOLIO_ENTITY_BY_NAME

export const PORTFOLIO_ENTITIES = Object.values(PORTFOLIO_ENTITY_BY_NAME)

export const PORTFOLIO_ENTITY_NAMES = PORTFOLIO_ENTITIES.map((entry) => entry.entity)
