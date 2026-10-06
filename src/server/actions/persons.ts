"use server"

import "server-only"
import { revalidatePath } from "next/cache"

import { ADMIN_LEADS_PATH } from "@/lib/admin-routes"
import { getCurrentUser } from "@/lib/get-current-user"
import { OPTED_OUT_CLEARED, optOutDeletesPerson } from "@/lib/persons"
import { prisma } from "@/lib/prisma"
import { createActionLogger } from "@/lib/server-utils"

import type { PersonActionState } from "./persons.types"

export async function optOutPerson(id: string): Promise<PersonActionState> {
  await getCurrentUser()

  return createActionLogger("optOutPerson", async ({ log }) => {
    try {
      const outcome = await prisma.$transaction(async (tx) => {
        const person = await tx.person.findUnique({
          where: { id },
          select: { email: true, linkedinUrl: true, optedOutAt: true },
        })
        if (!person) throw new Error(`Personne ${id} introuvable`)
        // Un second « stop » ne repousse pas la date du premier, point de départ des 3 ans.
        if (person.optedOutAt) return "already_opted_out"
        if (optOutDeletesPerson(person)) {
          await tx.person.delete({ where: { id } })
          return "deleted"
        }
        await tx.person.update({
          where: { id },
          data: { ...OPTED_OUT_CLEARED, optedOutAt: new Date() },
        })
        return "opted_out"
      })
      revalidatePath(ADMIN_LEADS_PATH, "layout")
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

        // TODO: supprimer ici, dans cette même transaction, les actions, entretiens et signaux de la personne quand ces modèles existeront.
        await tx.person.update({ where: { id }, data: { exchangesErasedAt: new Date() } })
        return "erased"
      })
      revalidatePath(ADMIN_LEADS_PATH, "layout")
      log.info({ event: "person:exchanges_erased", id, outcome })
      return { ok: true, message: null }
    } catch (err) {
      log.error({ err, event: "person:erase_exchanges_failed", id })
      return { ok: false, message: "unknown_error" }
    }
  })
}
