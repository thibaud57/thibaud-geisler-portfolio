import "server-only"
import type { McpServer, ServerContext } from "@modelcontextprotocol/server"
import { revalidatePath } from "next/cache"
import { z } from "zod"

import { ADMIN_ASSETS_PATH } from "@/lib/admin/routes"
import { companyIdSchema } from "@/lib/ids"
import { refreshCompanyLogo } from "@/server/crm/companies"
import { docsOf, INSTANTS, type McpDomainConfig } from "@/server/mcp/domain-tools"
import type { McpLogger } from "@/server/mcp/logger"
import { guardTool, toolError, toolJson } from "@/server/mcp/results"

import { companyLogoErrorMessage, refreshCompanyCaches } from "./entities/company"
import { CRM_ENTITIES, CRM_ENTITY_BY_NAME, type CrmEntity } from "./registry"

const SEARCH_DESCRIPTION = `Find CRM records by an approximate name, case and accents ignored. Call this first: crm_fetch and crm_update need the id it returns. Returns { results: [{ entity, id, label, hint }] }, where hint tells two homonyms apart: ${docsOf(CRM_ENTITIES, ({ search }) => search).join(", ")}. A person who opted out of prospecting is returned only on their exact email or LinkedIn URL, as { label: "Opposée à la prospection", optedOut: true } without name: never recreate or contact them.`

const FETCH_DESCRIPTION = `Fetch one CRM record by id, with its links. ${docsOf(CRM_ENTITIES, ({ fetch }) => fetch).join(" ")} A person who opted out is reduced to { id, name: null, optedOut: true, optedOutAt }. Call crm_search first to get the id. Returns an error naming the id if nothing matches. ${INSTANTS}`

const QUERY_DESCRIPTION = `List CRM records of one entity, filtered, sorted and paginated. Use it to browse (e.g. all active companies); use crm_search to find one record by name. Returns { rows, total }: summary rows (id, name, slug or company, status, types, zones, updated date; ${docsOf(CRM_ENTITIES, ({ queryRow }) => queryRow).join("; ")}) and the total count before pagination. Persons who opted out are never listed. Page with offset. ${docsOf(CRM_ENTITIES, ({ querySort }) => querySort).join(" ")} ${INSTANTS}`

const CREATE_DESCRIPTION = `Create a CRM record. Call crm_search first to check it does not exist yet. ${docsOf(CRM_ENTITIES, ({ create }) => create).join(" ")} A duplicate email or LinkedIn URL, or a person who opted out, is refused. The legal entity cannot be written here, nor the score of a lead. Returns the id (and the slug and name for a company, the title for an opportunity) of the new record.`

const UPDATE_DESCRIPTION = `Update a CRM record by id: fields (absent stays unchanged, null clears an optional field), a Details section by title, or both. Call crm_search first for the id, and crm_fetch to read the current values. Replacing one Details section leaves the others untouched. Only a company, a lead, a contact, an opportunity and an interview have Details: a signal, a prospecting action and a weekly review take fields only and refuse detailsSection. The legal entity cannot be written here, nor the score of a lead, and the record of a person who opted out is locked. ${docsOf(CRM_ENTITIES, ({ update }) => update).join(" ")} Returns the id (and the slug and name for a company, the title for an opportunity).`

const fetchCompanyLogoInputSchema = z.strictObject({
  id: companyIdSchema.describe("Id of the company. Get it from crm_search first."),
})

function registerFetchCompanyLogo(
  server: McpServer,
  logger: (ctx: ServerContext) => McpLogger,
): void {
  server.registerTool(
    "crm_fetch_company_logo",
    {
      title: "Fetch the logo of a company",
      description:
        "Fetch the logo of a company from its website and store it in logoFilename. Call crm_search first for the id. The company needs a websiteUrl: fill it with crm_update if missing (a Wayback Machine capture works when the site cannot be read). Replaces the current logo. Returns { id, logoFilename }.",
      inputSchema: fetchCompanyLogoInputSchema,
      annotations: { idempotentHint: true },
    },
    ({ id }, ctx) => {
      const log = logger(ctx)
      return guardTool(
        log,
        {
          event: "company_logo:fetch_failed",
          message:
            "The logo could not be fetched because of an internal error. Call crm_fetch to check the company's current logoFilename before retrying.",
          context: { id },
        },
        () => refreshCompanyLogo(id),
        (result) => {
          if (!result.ok) return toolError(companyLogoErrorMessage(result.error))

          revalidatePath(ADMIN_ASSETS_PATH)
          // Les pages publiques lisent logoFilename sous le tag projects
          refreshCompanyCaches()
          log.info({ event: "company_logo:fetched", id })
          return toolJson({ id, logoFilename: result.value.key })
        },
      )
    },
  )
}

export const crmDomain: McpDomainConfig<CrmEntity> = {
  prefix: "crm",
  entities: CRM_ENTITIES,
  byName: CRM_ENTITY_BY_NAME,
  texts: {
    recordNoun: "CRM record",
    fetchNotFound: (entity, id) =>
      `No ${entity} has the id "${id}". Call crm_search to find the right id, then call crm_fetch again.`,
    readFailure:
      "The CRM could not be read because of an internal error. Call the tool again once; if it fails again, stop and report the error.",
    queryOrderDescription: "Sort direction. Defaults to asc, desc for a weekly review.",
    search: { title: "Search CRM records by name", description: SEARCH_DESCRIPTION },
    fetch: { title: "Fetch a CRM record", description: FETCH_DESCRIPTION },
    query: { title: "List CRM records with filters", description: QUERY_DESCRIPTION },
    create: { title: "Create a CRM record", description: CREATE_DESCRIPTION },
    update: { title: "Update a CRM record", description: UPDATE_DESCRIPTION },
  },
  detailsSectionDescription:
    "Replace the body of one section of the Details. Only a company, a lead, a contact, an opportunity and an interview have Details. Do not combine with fields.details.",
  registerExtraTools: registerFetchCompanyLogo,
}
