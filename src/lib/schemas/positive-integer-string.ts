import { z } from "zod"

interface PositiveIntegerStringOptions {
  requiredMessage: string
  numberMessage: string
  intMessage: string
  minValue: number
  minMessage: string
}

// Le contrôle de chaîne précède la coercition : Number("") vaut 0, un champ vidé passerait
// sinon pour un ordre ou un compte valide.
export function positiveIntegerString(options: PositiveIntegerStringOptions) {
  return z
    .string()
    .trim()
    .min(1, options.requiredMessage)
    .pipe(
      z.coerce
        .number<string>({ error: options.numberMessage })
        .int(options.intMessage)
        .min(options.minValue, options.minMessage),
    )
}
