import "server-only"
import { z } from "zod"

import { LeadChannel, LeadInterest, LeadOrigin, LeadStatus } from "@/generated/prisma/browser"
import type { Prisma } from "@/generated/prisma/client"
import { leadDetailsTemplate } from "@/lib/crm/details-templates"
import { personIdSchema } from "@/lib/ids"
import { createLead, updateLead, type LeadPatch } from "@/server/crm/leads"
import { defineEntity } from "@/server/mcp/entity-definition"
import { pageQueryShape } from "@/server/mcp/query-page"
import { updateSchemaOf } from "@/server/mcp/update-input"
import { findLeadByIdForAdmin, findLeadPerson, findLeadsPage } from "@/server/queries/leads"

import { withDays, withMonth, withSignalDay, ZONED_DAY } from "../day-fields"
import {
  newPersonShape,
  PERSON_DOCS,
  personFieldShape,
  personFilterShape,
  personFilterWhere,
  personOrderBy,
} from "../person-fields"
import { personRef, rolesOf } from "../person-ref"
import { searchPersons } from "../person-search"
import { personWrites, writePerson } from "../person-write-tool"

const entityField = z.literal("lead").describe('Type of CRM record: always "lead" here.')

// `score`, `optedOutAt` et `exchangesErasedAt` restent hors des schémas : un champ exclu est refusé, jamais ignoré.
const roleShape = {
  origin: z
    .enum(LeadOrigin)
    .describe("How the lead came: INBOUND (the lead wrote first) or OUTBOUND."),
  status: z
    .enum(LeadStatus)
    .describe("Pipeline status (NOUVEAU, SUSPECT, DISCUSSION, HORS_ICP, PERDU, STAND_BY)."),
  interest: z.enum(LeadInterest).nullable().describe("Level of interest. null clears it."),
  channel: z.enum(LeadChannel).nullable().describe("Channel of the first contact. null clears it."),
} as const

const fieldShape = { ...personFieldShape, ...roleShape } as const

const createDataSchema = z
  .strictObject({
    ...newPersonShape,
    origin: roleShape.origin,
    status: roleShape.status.default("NOUVEAU"),
    interest: roleShape.interest.default(null),
    channel: roleShape.channel.default(null),
    details: personFieldShape.details
      .optional()
      .describe(
        "Whole Details text in markdown. Omit it to get the standard lead template for the origin. null creates the lead without Details.",
      ),
  })
  .describe("Fields of the lead to create. Only name and origin are required.")

const updateFieldsSchema = z
  .strictObject(fieldShape)
  .partial()
  .describe("Fields to change. A field left out stays unchanged, null clears an optional field.")

const leadFilterSchema = z
  .strictObject({
    status: z.enum(LeadStatus).optional().describe("Only this pipeline status."),
    origin: z.enum(LeadOrigin).optional().describe("Only this origin."),
    interest: z.enum(LeadInterest).optional().describe("Only this level of interest."),
    channel: z.enum(LeadChannel).optional().describe("Only this channel."),
    ...personFilterShape("leads"),
  })
  .describe("Filters, combined with AND.")

const querySchema = z.strictObject({
  entity: entityField,
  filters: leadFilterSchema.optional(),
  ...pageQueryShape,
})

const createSchema = z.strictObject({ entity: entityField, data: createDataSchema })

const updateSchema = updateSchemaOf(
  entityField,
  personIdSchema.describe("Id of the lead to update. Get it from crm_search first."),
  updateFieldsSchema,
)

function toWhere(filters: z.output<typeof querySchema>["filters"]): Prisma.LeadWhereInput {
  return {
    status: filters?.status,
    origin: filters?.origin,
    interest: filters?.interest,
    channel: filters?.channel,
    person: personFilterWhere(filters),
  }
}

const WRITES = personWrites("lead")

export const leadEntity = defineEntity({
  entity: "lead",
  docs: { ...PERSON_DOCS, create: "For a lead, only name and origin are required." },
  search: (query) => searchPersons("lead", query),
  async fetch(id) {
    const personId = personIdSchema.parse(id)
    const head = await findLeadPerson(personId)
    if (!head) return null
    // Une fiche opposée n'a que son identifiant et la date : email et LinkedIn restent en base pour la garde de doublon, pas pour l'agent. Lue avant le graphe complet.
    if (head.optedOutAt) return { ...personRef(head), optedOutAt: head.optedOutAt }

    const lead = await findLeadByIdForAdmin(personId)
    if (!lead) return null

    const { hasContactRole, interviews, ...record } = lead
    return {
      ...withDays(withDays(record, ["metAt"]), ["lastReplyAt"], ZONED_DAY),
      opportunities: record.opportunities.map(withMonth),
      signals: record.signals.map(withSignalDay),
      roles: rolesOf({ lead: true, contact: hasContactRole }),
      // Les entretiens de l'opportunité n'entrent pas dans le contexte de l'agent : l'opportunité se lit par son id
      interviews: interviews.map(({ opportunity, ...interview }) => ({
        ...interview,
        opportunity: { id: opportunity.id, title: opportunity.title },
      })),
    }
  },
  querySchema,
  query: ({ filters, sort, order, limit, offset }) =>
    findLeadsPage({
      where: toWhere(filters),
      orderBy: personOrderBy(sort, order),
      take: limit,
      skip: offset,
    }),
  createSchema,
  create: ({ data }, ctx) =>
    writePerson(
      () =>
        createLead({
          ...data,
          details: data.details === undefined ? leadDetailsTemplate(data.origin) : data.details,
        }),
      ctx,
      WRITES.create,
      {},
    ),
  updateSchema,
  update: (input, ctx) => {
    const patch: LeadPatch = { ...input.fields, detailsSection: input.detailsSection }
    return writePerson(() => updateLead(input.id, patch), ctx, WRITES.update, {
      personId: input.id,
    })
  },
})
