import { z } from "zod"

// Colonnes `String` libres en base : l'enum ferme l'ensemble des clés qui ont une traduction (`Legal.ape`, `Legal.retention`).
export const ApeCode = z.enum(["6201Z"])

export const RetentionPolicyKey = z.enum(["logs1Year", "logs30Days", "session13Months"])
