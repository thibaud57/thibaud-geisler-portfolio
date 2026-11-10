import "server-only"
import { z } from "zod"

import { ContactStatus, ContactType } from "@/generated/prisma/browser"
import type { Prisma } from "@/generated/prisma/client"
import { CONTACT_DETAILS_TEMPLATE } from "@/lib/crm/details-templates"
import { personIdSchema } from "@/lib/ids"
import {
  attachContact,
  createContact,
  updateContact,
  type ContactPatch,
} from "@/server/crm/contacts"
import { defineEntity } from "@/server/mcp/entity-definition"
import { pageQueryShape } from "@/server/mcp/query-page"
import { updateSchemaOf } from "@/server/mcp/update-input"
import { findContactByIdForAdmin, findContactsPage } from "@/server/queries/contacts"

import { withDays } from "../day-fields"
import {
  newPersonShape,
  PERSON_DOCS,
  personFieldShape,
  personFilterShape,
  personFilterWhere,
  personOrderBy,
} from "../person-fields"
import { rolesOf } from "../person-ref"
import { searchPersons } from "../person-search"
import { personWrites, writePerson } from "../person-write-tool"

const entityField = z.literal("contact").describe('Type of CRM record: always "contact" here.')

const roleShape = {
  types: z.array(z.enum(ContactType)).describe("Kinds of relationship (e.g. CLIENT, MENTOR)."),
  status: z.enum(ContactStatus).describe("Status of the contact: ACTIF, INACTIF or A_RECONTACTER."),
} as const

const fieldShape = { ...personFieldShape, ...roleShape } as const

const promoteSchema = z
  .strictObject({
    fromLeadId: personIdSchema.describe(
      "Id of an existing lead to promote to contact. Get it from crm_search with the entity lead.",
    ),
    types: roleShape.types.default([]),
    status: roleShape.status.default("ACTIF"),
  })
  .describe("Promote an existing lead to contact: no person field is allowed with fromLeadId.")

const newContactSchema = z
  .strictObject({
    ...newPersonShape,
    types: roleShape.types.default([]),
    status: roleShape.status.default("ACTIF"),
    details: personFieldShape.details
      .optional()
      .describe(
        "Whole Details text in markdown. Omit it to get the standard contact template. null creates the contact without Details.",
      ),
  })
  .describe("Create a new person with the contact role. Only name is required.")

const DATA_HELP =
  "Give either { fromLeadId, types, status } to promote an existing lead, or the person fields (name required) to create a new contact, never both."

// L'union ne dit pas quelle branche corriger : le message nomme la branche que `fromLeadId` désigne, et ses écarts.
const createDataSchema = z.union([promoteSchema, newContactSchema], {
  error: (issue) => {
    const input: unknown = issue.input
    const promoting = typeof input === "object" && input !== null && "fromLeadId" in input
    const details = (issue.errors[promoting ? 0 : 1] ?? [])
      .map(({ path, message }) => `${path.join(".") || "data"}: ${message}`)
      .join("; ")
    return details === "" ? DATA_HELP : `${DATA_HELP} Problems found: ${details}`
  },
})

const updateFieldsSchema = z
  .strictObject(fieldShape)
  .partial()
  .describe("Fields to change. A field left out stays unchanged, null clears an optional field.")

const contactFilterSchema = z
  .strictObject({
    types: z
      .array(z.enum(ContactType))
      .min(1)
      .optional()
      .describe("Contacts having at least one of these types."),
    status: z.enum(ContactStatus).optional().describe("Only this status."),
    ...personFilterShape("contacts"),
  })
  .describe("Filters, combined with AND. types matches any of its values.")

const querySchema = z.strictObject({
  entity: entityField,
  filters: contactFilterSchema.optional(),
  ...pageQueryShape,
})

const createSchema = z.strictObject({ entity: entityField, data: createDataSchema })

const updateSchema = updateSchemaOf(
  entityField,
  personIdSchema.describe("Id of the contact to update. Get it from crm_search first."),
  updateFieldsSchema,
)

function toWhere(filters: z.output<typeof querySchema>["filters"]): Prisma.ContactWhereInput {
  return {
    types: filters?.types ? { hasSome: filters.types } : undefined,
    status: filters?.status,
    person: personFilterWhere(filters),
  }
}

const WRITES = personWrites("contact")

export const contactEntity = defineEntity({
  entity: "contact",
  docs: {
    ...PERSON_DOCS,
    create:
      "A contact is created from its person fields, or by promoting an existing lead with { fromLeadId, types, status } and no person field.",
  },
  search: (query) => searchPersons("contact", query),
  async fetch(id) {
    const contact = await findContactByIdForAdmin(personIdSchema.parse(id))
    if (!contact) return null

    const { hasLeadRole, ...record } = contact
    return {
      ...withDays(record, ["metAt"]),
      roles: rolesOf({ lead: hasLeadRole, contact: true }),
    }
  },
  querySchema,
  query: ({ filters, sort, order, limit, offset }) =>
    findContactsPage({
      where: toWhere(filters),
      orderBy: personOrderBy(sort, order),
      take: limit,
      skip: offset,
    }),
  createSchema,
  create: ({ data }, ctx) =>
    "fromLeadId" in data
      ? writePerson(
          () => attachContact(data.fromLeadId, { types: data.types, status: data.status }),
          ctx,
          WRITES.create,
          { personId: data.fromLeadId },
        )
      : writePerson(
          () =>
            createContact({
              ...data,
              details: data.details === undefined ? CONTACT_DETAILS_TEMPLATE : data.details,
            }),
          ctx,
          WRITES.create,
          {},
        ),
  updateSchema,
  update: (input, ctx) => {
    const patch: ContactPatch = { ...input.fields, detailsSection: input.detailsSection }
    return writePerson(() => updateContact(input.id, patch), ctx, WRITES.update, {
      personId: input.id,
    })
  },
})
