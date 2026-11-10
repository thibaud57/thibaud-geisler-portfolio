import "server-only"

import { docsOf, INSTANTS, type McpDomainConfig } from "@/server/mcp/domain-tools"

import { PORTFOLIO_ENTITIES, PORTFOLIO_ENTITY_BY_NAME, type PortfolioEntity } from "./registry"

const SEARCH_DESCRIPTION = `Find portfolio records by an approximate name, case and accents ignored. Call this first: portfolio_fetch and portfolio_update need the id it returns. Returns { results: [{ entity, id, label, hint }] }, where hint tells two homonyms apart: ${docsOf(PORTFOLIO_ENTITIES, ({ search }) => search).join(", ")}.`

const FETCH_DESCRIPTION = `Fetch one portfolio record by id, with its links. ${docsOf(PORTFOLIO_ENTITIES, ({ fetch }) => fetch).join(" ")} Call portfolio_search first to get the id. Returns an error naming the id if nothing matches. ${INSTANTS}`

const QUERY_DESCRIPTION = `List portfolio records of one entity, filtered, sorted and paginated. Use it to browse (e.g. all the tags of a category); use portfolio_search to find one record by name. Returns { rows, total }: summary rows (${docsOf(PORTFOLIO_ENTITIES, ({ queryRow }) => queryRow).join("; ")}) and the total count before pagination. Page with offset. ${docsOf(PORTFOLIO_ENTITIES, ({ querySort }) => querySort).join(" ")} ${INSTANTS}`

const CREATE_DESCRIPTION = `Create a portfolio record. Call portfolio_search first to check it does not exist yet. ${docsOf(PORTFOLIO_ENTITIES, ({ create }) => create).join(" ")} Returns the id and the slug of the new record.`

const UPDATE_DESCRIPTION = `Update a portfolio record by id: fields (absent stays unchanged, null clears an optional field). Call portfolio_search first for the id, and portfolio_fetch to read the current values. ${docsOf(PORTFOLIO_ENTITIES, ({ update }) => update).join(" ")} Returns the id and the slug.`

export const portfolioDomain: McpDomainConfig<PortfolioEntity> = {
  prefix: "portfolio",
  entities: PORTFOLIO_ENTITIES,
  byName: PORTFOLIO_ENTITY_BY_NAME,
  texts: {
    recordNoun: "portfolio record",
    fetchNotFound: (entity, id) =>
      `No ${entity} has the id "${id}". Call portfolio_search to find the right id, then call portfolio_fetch again.`,
    readFailure:
      "The portfolio could not be read because of an internal error. Call the tool again once; if it fails again, stop and report the error.",
    queryOrderDescription:
      "Sort direction. Defaults to asc: for the name sort, asc follows the order of the admin.",
    search: { title: "Search portfolio records by name", description: SEARCH_DESCRIPTION },
    fetch: { title: "Fetch a portfolio record", description: FETCH_DESCRIPTION },
    query: { title: "List portfolio records with filters", description: QUERY_DESCRIPTION },
    create: { title: "Create a portfolio record", description: CREATE_DESCRIPTION },
    update: { title: "Update a portfolio record", description: UPDATE_DESCRIPTION },
  },
}
