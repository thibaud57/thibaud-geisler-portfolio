import "server-only"

import type { InterviewStatus, Prisma } from "@/generated/prisma/client"
import { interviewIdSchema, type InterviewId, type PersonId } from "@/lib/ids"
import { prisma } from "@/lib/prisma"
import type { InterviewInput } from "@/lib/schemas/interview"
import { isRowGone, rowExists } from "@/lib/server-utils"

import {
  resolveDetailsSection,
  type DetailsSection,
  type DetailsSectionError,
} from "./details-section"
import { assertNewIdentity, PersonConflictError, type PersonConflict } from "./person-guards"
import { fail, ok, type DomainResult } from "./result"

// Les nouveaux correspondants ne servent qu'à l'admin : l'outil n'en expose pas.
export type InterviewWriteData = Omit<InterviewInput, "newCorrespondents"> & {
  newCorrespondents?: InterviewInput["newCorrespondents"]
}

// Un champ absent reste inchangé ; `correspondentIds` présent remplace toute la liste.
export type InterviewPatch = Partial<InterviewWriteData> & { detailsSection?: DetailsSection }

type InterviewFieldsPatch = Partial<InterviewWriteData> & { detailsSection?: undefined }

// L'outil n'expose pas la création de correspondants : ces types excluent `correspondent_exists`.
interface WithoutNewCorrespondents {
  newCorrespondents?: undefined
}

export type InterviewPatchWithoutNewCorrespondents = InterviewPatch & WithoutNewCorrespondents

export interface CorrespondentExists {
  code: "correspondent_exists"
  conflict: Extract<PersonConflict, { reason: "exists" | "opted_out" }>
}

export type InterviewCreateError =
  | { code: "opportunity_not_found" }
  | { code: "opportunity_without_intermediary" }
  | { code: "correspondent_not_found" }
  | CorrespondentExists

export type InterviewFieldsError = InterviewCreateError | { code: "not_found" }

export type InterviewWriteError = InterviewFieldsError | DetailsSectionError

export interface WrittenInterview {
  id: InterviewId
}

const WRITTEN_SELECT = { id: true } as const

const toWritten = (row: { id: string }): WrittenInterview => ({
  id: interviewIdSchema.parse(row.id),
})

const distinct = <T>(values: readonly T[]): T[] => [...new Set(values)]

// L'issue ne se saisit que sur un entretien Fait ; un changement de statut la vide.
const outcomeFor = <T>(status: InterviewStatus, outcome: T): T | null =>
  status === "FAIT" ? outcome : null

// Un patch qui ne nomme ni le statut ni l'issue laisse l'issue stockée en l'état.
const touchesOutcome = ({ status, outcome }: Pick<InterviewFieldsPatch, "status" | "outcome">) =>
  status !== undefined || outcome !== undefined

interface Targets {
  // Absent : ni le côté ni l'opportunité ne changent, rien à revérifier.
  opportunity: { id: string; side: InterviewInput["side"] } | null
  correspondentIds: readonly PersonId[] | undefined
  interviewId: InterviewId | null
}

// Mener côté ESN suppose que l'opportunité en a une ; les correspondants existants doivent exister. Un correspondant opposé reste un fait de l'entretien : seul un nouveau ne doit pas l'être.
async function findTargetError(
  tx: Prisma.TransactionClient,
  { opportunity, correspondentIds, interviewId }: Targets,
): Promise<Exclude<InterviewCreateError, CorrespondentExists> | null> {
  if (opportunity) {
    const found = await tx.opportunity.findUnique({
      where: { id: opportunity.id },
      select: { intermediaryId: true },
    })
    if (!found) return { code: "opportunity_not_found" }
    if (opportunity.side === "ESN" && !found.intermediaryId) {
      return { code: "opportunity_without_intermediary" }
    }
  }

  if (correspondentIds !== undefined && correspondentIds.length > 0) {
    const found = await tx.person.count({
      where: {
        id: { in: [...correspondentIds] },
        ...(interviewId === null
          ? { optedOutAt: null }
          : { OR: [{ optedOutAt: null }, { interviews: { some: { id: interviewId } } }] }),
      },
    })
    if (found !== correspondentIds.length) return { code: "correspondent_not_found" }
  }
  return null
}

// Correspondant inconnu : personne au rôle Contact créée dans la même transaction ; email ou LinkedIn déjà connu (ou opposé à la prospection) refusé plutôt que dupliqué, par le garde partagé des fiches personne.
async function createCorrespondents(
  tx: Prisma.TransactionClient,
  newCorrespondents: NonNullable<InterviewWriteData["newCorrespondents"]>,
): Promise<{ id: string }[]> {
  const refs: { id: string }[] = []
  // Séquentiel : le garde puis la création s'enchaînent dans l'ordre, sur le client de la transaction.
  for (const { contactType, ...person } of newCorrespondents) {
    await assertNewIdentity(tx, { email: person.email, linkedinUrl: person.linkedinUrl }, null)
    refs.push(
      await tx.person.create({
        data: { ...person, contact: { create: { types: [contactType], status: "ACTIF" } } },
        select: { id: true },
      }),
    )
  }
  return refs
}

// Le garde lève dans la transaction pour l'annuler : le conflit redevient une valeur à sa sortie.
function correspondentConflict(err: unknown): CorrespondentExists | null {
  if (!(err instanceof PersonConflictError)) return null
  const { conflict } = err
  if (conflict.reason !== "exists" && conflict.reason !== "opted_out") throw err
  return { code: "correspondent_exists", conflict }
}

export function createInterview(
  data: InterviewWriteData & WithoutNewCorrespondents,
): Promise<DomainResult<WrittenInterview, Exclude<InterviewCreateError, CorrespondentExists>>>
export function createInterview(
  data: InterviewWriteData,
): Promise<DomainResult<WrittenInterview, InterviewCreateError>>
export async function createInterview(
  data: InterviewWriteData,
): Promise<DomainResult<WrittenInterview, InterviewCreateError>> {
  const { correspondentIds, newCorrespondents = [], ...fields } = data
  const ids = distinct(correspondentIds)

  try {
    return await prisma.$transaction(
      async (tx): Promise<DomainResult<WrittenInterview, InterviewCreateError>> => {
        const refused = await findTargetError(tx, {
          opportunity: { id: fields.opportunityId, side: fields.side },
          correspondentIds: ids,
          interviewId: null,
        })
        if (refused) return fail(refused)

        const created = await createCorrespondents(tx, newCorrespondents)
        const interview = await tx.interview.create({
          data: {
            ...fields,
            outcome: outcomeFor(fields.status, fields.outcome),
            correspondents: { connect: [...ids.map((id) => ({ id })), ...created] },
          },
          select: WRITTEN_SELECT,
        })
        return ok(toWritten(interview))
      },
    )
  } catch (err) {
    const conflict = correspondentConflict(err)
    if (conflict) return fail(conflict)
    throw err
  }
}

export function updateInterview(
  id: InterviewId,
  patch: InterviewFieldsPatch,
): Promise<DomainResult<WrittenInterview, InterviewFieldsError>>
export function updateInterview(
  id: InterviewId,
  patch: InterviewPatchWithoutNewCorrespondents,
): Promise<DomainResult<WrittenInterview, Exclude<InterviewWriteError, CorrespondentExists>>>
export function updateInterview(
  id: InterviewId,
  patch: InterviewPatch,
): Promise<DomainResult<WrittenInterview, InterviewWriteError>>
export async function updateInterview(
  id: InterviewId,
  patch: InterviewPatch,
): Promise<DomainResult<WrittenInterview, InterviewWriteError>> {
  const { detailsSection, correspondentIds, newCorrespondents = [], ...fields } = patch
  const ids = correspondentIds && distinct(correspondentIds)

  try {
    return await prisma.$transaction(
      async (tx): Promise<DomainResult<WrittenInterview, InterviewWriteError>> => {
        const stored = await tx.interview.findUnique({
          where: { id },
          select: { opportunityId: true, side: true, status: true, details: true },
        })
        if (!stored) return fail({ code: "not_found" })

        // Le contrôle porte sur les valeurs effectives : le patch fusionné avec la ligne.
        const opportunityChosen = fields.side !== undefined || fields.opportunityId !== undefined
        const refused = await findTargetError(tx, {
          opportunity: opportunityChosen
            ? {
                id: fields.opportunityId ?? stored.opportunityId,
                side: fields.side ?? stored.side,
              }
            : null,
          correspondentIds: ids,
          interviewId: id,
        })
        if (refused) return fail(refused)

        const section = detailsSection
          ? resolveDetailsSection(stored.details, detailsSection)
          : null
        if (section && !section.ok) return section

        // Aucune écriture avant ce point : renvoyer un échec valide la transaction.
        const created = await createCorrespondents(tx, newCorrespondents)
        const updated = await tx.interview.update({
          where: { id },
          data: {
            ...fields,
            outcome: touchesOutcome(fields)
              ? outcomeFor(fields.status ?? stored.status, fields.outcome)
              : undefined,
            details: section ? section.value : fields.details,
            correspondents:
              ids !== undefined
                ? { set: [...ids.map((personId) => ({ id: personId })), ...created] }
                : { connect: created },
          },
          select: WRITTEN_SELECT,
        })
        return ok(toWritten(updated))
      },
    )
  } catch (err) {
    const conflict = correspondentConflict(err)
    if (conflict) return fail(conflict)
    if (await isRowGone(err, () => rowExists(prisma.interview, { id }))) {
      return fail({ code: "not_found" })
    }
    throw err
  }
}
