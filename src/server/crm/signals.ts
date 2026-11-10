import "server-only"
import { revalidatePath } from "next/cache"

import type { Prisma } from "@/generated/prisma/client"
import { canReceiveSignal, signalTypesFor } from "@/lib/crm/signals"
import { ADMIN_COMPANIES_PATH, ADMIN_LEADS_PATH } from "@/lib/admin/routes"
import { signalIdSchema, type CompanyId, type PersonId, type SignalId } from "@/lib/ids"
import { prisma } from "@/lib/prisma"
import type { SignalInput } from "@/lib/schemas/signal"
import { isPrismaError, isRowGone, rowExists, violatedConstraint } from "@/lib/server-utils"

import { fail, ok, type DomainResult } from "@/server/result"

export type SignalWriteData = SignalInput

// `sourceUrl` nul l'efface.
export type SignalPatch = Partial<SignalWriteData>

// Le rattachement se pose à la création et ne change jamais : l'union interdit d'en nommer deux ou aucun.
export type SignalOwnerRef = { companyId: CompanyId } | { personId: PersonId }

export type SignalWriteError =
  | { code: "type_mismatch" }
  | { code: "lead_not_eligible" }
  | { code: "company_not_found" }
  | { code: "not_found" }

export interface WrittenSignal {
  id: SignalId
}

const toWritten = (row: { id: string }): WrittenSignal => ({
  id: signalIdSchema.parse(row.id),
})

const typeFits = (kind: "company" | "lead", type: SignalInput["type"]): boolean =>
  signalTypesFor(kind).includes(type)

// Les signaux de l'entreprise et du lead s'affichent dans leurs fiches : l'écriture invalide les deux listes.
export function revalidateSignalLists(): void {
  revalidatePath(ADMIN_COMPANIES_PATH, "layout")
  revalidatePath(ADMIN_LEADS_PATH, "layout")
}

// Seul un lead outbound reçoit un signal, jamais une personne opposée. Lu sur le client de la transaction
// qui crée le signal : une opposition posée entre la lecture et l'écriture ne laisse pas passer un signal.
async function leadAccepts(tx: Prisma.TransactionClient, personId: PersonId): Promise<boolean> {
  const lead = await tx.lead.findUnique({
    where: { personId },
    select: { origin: true, person: { select: { optedOutAt: true } } },
  })
  return (
    lead !== null && canReceiveSignal({ origin: lead.origin, optedOutAt: lead.person.optedOutAt })
  )
}

export async function createSignal(
  owner: SignalOwnerRef,
  data: SignalWriteData,
): Promise<DomainResult<WrittenSignal, SignalWriteError>> {
  if (!typeFits("companyId" in owner ? "company" : "lead", data.type)) {
    return fail({ code: "type_mismatch" })
  }

  try {
    return await prisma.$transaction(
      async (tx): Promise<DomainResult<WrittenSignal, SignalWriteError>> => {
        if ("personId" in owner && !(await leadAccepts(tx, owner.personId))) {
          return fail({ code: "lead_not_eligible" })
        }
        const created = await tx.signal.create({
          data: { ...data, ...owner },
          select: { id: true },
        })
        return ok(toWritten(created))
      },
    )
  } catch (err) {
    if (isPrismaError(err, "P2003") && violatedConstraint(err)?.includes("companyId")) {
      return fail({ code: "company_not_found" })
    }
    throw err
  }
}

export async function updateSignal(
  id: SignalId,
  patch: SignalPatch,
): Promise<DomainResult<WrittenSignal, SignalWriteError>> {
  try {
    // Le rattachement se relit pour valider le type. Un signal déjà posé reste modifiable après le passage du lead en inbound ; l'opposition supprime les signaux de la personne.
    const current = await prisma.signal.findUnique({
      where: { id },
      select: { companyId: true },
    })
    if (!current) return fail({ code: "not_found" })
    if (patch.type !== undefined && !typeFits(current.companyId ? "company" : "lead", patch.type)) {
      return fail({ code: "type_mismatch" })
    }

    const updated = await prisma.signal.update({ where: { id }, data: patch, select: { id: true } })
    return ok(toWritten(updated))
  } catch (err) {
    if (await isRowGone(err, () => rowExists(prisma.signal, { id }))) {
      return fail({ code: "not_found" })
    }
    throw err
  }
}
