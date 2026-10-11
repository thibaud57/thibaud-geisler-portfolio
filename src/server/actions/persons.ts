"use server"

import "server-only"
import { revalidatePath } from "next/cache"

import { ADMIN_LEADS_PATH, ADMIN_PROSPECTING_ACTIONS_PATH } from "@/lib/admin-routes"
import { getCurrentUser } from "@/lib/get-current-user"
import { OPTED_OUT_CLEARED, optOutDeletesPerson } from "@/lib/persons"
import { prisma } from "@/lib/prisma"
import { createActionLogger } from "@/lib/server-utils"

import { revalidatePersonLists } from "./person-guards"
import type { PersonActionState } from "./persons.types"

export async function optOutPerson(id: string): Promise<PersonActionState> {
  await getCurrentUser()

  return createActionLogger("optOutPerson", async ({ log }) => {
    try {
      const outcome = await prisma.$transaction(async (tx) => {
        const person = await tx.person.findUnique({
          where: { id },
          select: {
            email: true,
            linkedinUrl: true,
            optedOutAt: true,
            lead: { select: { personId: true } },
          },
        })
        if (!person) throw new Error(`Personne ${id} introuvable`)
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
      if (outcome === "refused") {
        log.warn({ event: "person:opt_out_refused", id, reason: "no_lead_role" })
        return { ok: false, message: "unknown_error" }
      }
      revalidatePersonLists()
      log.info({ event: "person:opted_out", id, outcome })
      return { ok: true, message: null }
    } catch (err) {
      log.error({ err, event: "person:opt_out_failed", id })
      return { ok: false, message: "unknown_error" }
    }
  })
}

export async function erasePersonExchanges(id: string): Promise<PersonActionState> {
  await getCurrentUser()

  return createActionLogger("erasePersonExchanges", async ({ log }) => {
    try {
      const outcome = await prisma.$transaction(async (tx) => {
        const person = await tx.person.findUnique({
          where: { id },
          select: { optedOutAt: true, exchangesErasedAt: true },
        })
        if (!person) throw new Error(`Personne ${id} introuvable`)
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
      revalidatePath(ADMIN_LEADS_PATH, "layout")
      revalidatePath(ADMIN_PROSPECTING_ACTIONS_PATH, "layout")
      log.info({ event: "person:exchanges_erased", id, outcome })
      return { ok: true, message: null }
    } catch (err) {
      log.error({ err, event: "person:erase_exchanges_failed", id })
      return { ok: false, message: "unknown_error" }
    }
  })
}
