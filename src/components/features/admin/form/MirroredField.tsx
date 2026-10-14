import type { ReactNode } from "react"

import { ReadOnlyField } from "@/components/features/admin/form/ReadOnlyField"
import { cn } from "@/lib/utils"

interface Props {
  mirrored: boolean
  mirror: { id: string; label: string; value: string; loading?: boolean }
  fullWidth?: boolean
  children: ReactNode
}

// La saisie reste montée, seulement masquée : elle se retrouve intacte au retour du mode miroir.
export function MirroredField({ mirrored, mirror, fullWidth = false, children }: Props) {
  const span = fullWidth && "sm:col-span-2"
  return (
    <>
      <div hidden={mirrored} className={cn(span)}>
        {children}
      </div>
      {mirrored ? (
        <div className={cn(span)}>
          <ReadOnlyField {...mirror} />
        </div>
      ) : null}
    </>
  )
}
