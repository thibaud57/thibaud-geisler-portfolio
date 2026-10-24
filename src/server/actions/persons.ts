"use server"

import "server-only"

import { assertNever } from "@/lib/assert-never"
import { getCurrentUser } from "@/lib/get-current-user"
import { OPTED_OUT_CLEARED, optOutDeletesPerson } from "@/lib/crm/persons"
import { prisma } from "@/lib/prisma"
import { createActionLogger } from "@/lib/server-utils"

import { revalidatePersonLists } from "./_support/person-guards"
import type { ErasePersonExchangesState, OptOutPersonState } from "./persons.types"

type OptOutOutcome = "not_found" | "refused" | "already_opted_out" | "deleted" | "opted_out"

type EraseOutcome = "not_found" | "not_opted_out" | "already_erased" | "erased"

export async function optOutPerson(id: string): Promise<OptOutPersonState> {
  await getCurrentUser()

  return createActionLogger("optOutPerson", async ({ log }) => {
    try {
      const outcome: OptOutOutcome = await prisma.$transaction(async (tx) => {
        const person = await tx.person.findUnique({
          where: { id },
          select: {
            email: true,
            linkedinUrl: true,
            optedOutAt: true,
            lead: { select: { personId: true } },
          },
        })
        if (!person) return "not_found"
        // Un second « stop » ne repousse pas la date du premier, point de départ des 3 ans.
        if (person.optedOutAt) return "already_opted_out"
        // L'opposition ne se pose que depuis la fiche lead : sans ce rôle, la personne opposée n'apparaîtrait plus nulle part.
        if (!person.lead) return "refused"
        if (optOutDeletesPerson(person)) {
          await tx.person.delete({ where: { id } })
          return "deleted"
        }
        // L'UPDATE d'abord : il verrouille la ligne, qu'un rattachement « Depuis un lead » verrouille aussi. Ce rattachement voit alors l'opposition, ou son rôle Contact, déjà créé, part avec la suppression qui suit.
        await tx.person.update({
          where: { id },
          data: { ...OPTED_OUT_CLEARED, optedOutAt: new Date() },
        })
        // Les signaux ne servaient qu'à cibler la prospection : l'opposition leur ôte toute finalité, à la différence de l'historique des échanges, gardé comme preuve.
        await tx.signal.deleteMany({ where: { personId: id } })
        // Une personne opposée quitte la liste du réseau : la trace de l'opposition reste sur le rôle Lead.
        await tx.contact.deleteMany({ where: { personId: id } })
        return "opted_out"
      })
      switch (outcome) {
        case "not_found":
          revalidatePersonLists()
          log.warn({ event: "person:opt_out_not_found", id })
          return { ok: false, message: "person_not_found" }
        case "refused":
          log.warn({ event: "person:opt_out_refused", id, reason: "no_lead_role" })
          return { ok: false, message: "opt_out_refused" }
        case "deleted":
        case "opted_out":
        case "already_opted_out":
          revalidatePersonLists()
          log.info({ event: "person:opted_out", id, outcome })
          return { ok: true, message: null }
        default:
          return assertNever(outcome)
      }
    } catch (err) {
      log.error({ err, event: "person:opt_out_failed", id })
      return { ok: false, message: "unknown_error" }
    }
  })
}

export async function erasePersonExchanges(id: string): Promise<ErasePersonExchangesState> {
  await getCurrentUser()

  return createActionLogger("erasePersonExchanges", async ({ log }) => {
    try {
      const outcome: EraseOutcome = await prisma.$transaction(async (tx) => {
        const person = await tx.person.findUnique({
          where: { id },
          select: { optedOutAt: true, exchangesErasedAt: true },
        })
        if (!person) return "not_found"
        if (!person.optedOutAt) return "not_opted_out"
        if (person.exchangesErasedAt) return "already_erased"

        await tx.prospectingAction.deleteMany({ where: { personId: id } })
        // L'entretien reste un fait de l'opportunité : seule l'identification de la personne en part.
        await tx.person.update({
          where: { id },
          data: { exchangesErasedAt: new Date(), interviews: { set: [] } },
        })
        return "erased"
      })
      switch (outcome) {
        case "not_found":
          revalidatePersonLists()
          log.warn({ event: "person:erase_exchanges_not_found", id })
          return { ok: false, message: "person_not_found" }
        case "not_opted_out":
          log.warn({ event: "person:erase_exchanges_refused", id, reason: "not_opted_out" })
          return { ok: false, message: "not_opted_out" }
        case "already_erased":
        case "erased":
          revalidatePersonLists()
          log.info({ event: "person:exchanges_erased", id, outcome })
          return { ok: true, message: null }
        default:
          return assertNever(outcome)
      }
    } catch (err) {
      log.error({ err, event: "person:erase_exchanges_failed", id })
      return { ok: false, message: "unknown_error" }
    }
  })
}
