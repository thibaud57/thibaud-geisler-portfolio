import { Fragment } from "react"

import { EmptyValue } from "@/components/features/admin/display/EmptyValue"
import { formatRate, type reviewRates } from "@/lib/crm/weekly-reviews"

interface Props {
  rates: ReturnType<typeof reviewRates>
}

// Un seul élément : dans l'`output` flex du formulaire, chaque morceau de texte deviendrait sinon un item anonyme dont les espaces de bord sont rognés.
export function ReviewRates({ rates }: Props) {
  return (
    <span>
      {[rates.acceptance, rates.response, rates.meetingConversion].map((rate, index) => (
        <Fragment key={index}>
          {index > 0 ? " · " : null}
          {formatRate(rate) ?? <EmptyValue />}
        </Fragment>
      ))}
    </span>
  )
}
