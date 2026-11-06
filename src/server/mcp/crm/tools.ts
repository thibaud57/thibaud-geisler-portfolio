import "server-only"
import type { CallToolResult, McpServer } from "@modelcontextprotocol/server"
import { z } from "zod"

import { assertNever } from "@/lib/assert-never"
import { companyIdSchema } from "@/lib/ids"
import { findCompanyByIdForAdmin } from "@/server/queries/companies"

// Union racine dès la première entité : les entités CRM suivantes s'y ajoutent comme membres
const fetchInputSchema = z.discriminatedUnion("entity", [
  z.object({
    entity: z.literal("company").describe("Type of CRM record to fetch."),
    id: companyIdSchema.describe("Id of the company to fetch."),
  }),
])

type FetchInput = z.infer<typeof fetchInputSchema>

function textResult(value: unknown): CallToolResult {
  return { content: [{ type: "text", text: JSON.stringify(value) }] }
}

function errorResult(message: string): CallToolResult {
  return { content: [{ type: "text", text: message }], isError: true }
}

async function fetchRecord(input: FetchInput): Promise<CallToolResult> {
  switch (input.entity) {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- union à un seul membre jusqu'à l'ajout des autres entités CRM, le switch garde l'exhaustivité
    case "company": {
      const company = await findCompanyByIdForAdmin(input.id)
      return company
        ? textResult(company)
        : errorResult(`No company has the id "${input.id}". Check the id and call crm_fetch again.`)
    }
    default:
      return assertNever(input.entity)
  }
}

export function registerCrmTools(server: McpServer): void {
  server.registerTool(
    "crm_fetch",
    {
      title: "Fetch a CRM record",
      description:
        "Fetch one CRM record by its id. Returns the full record as JSON, or an error naming the id if nothing matches.",
      inputSchema: fetchInputSchema,
      annotations: { readOnlyHint: true, idempotentHint: true },
    },
    fetchRecord,
  )
}
