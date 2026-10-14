import type { ReactNode } from "react"

// Les ids `-error` et `-help` sont posés par FormField : un champ qui câble `aria-describedby` à la main les redit ici.
export function describedBy(id: string, help: ReactNode): string {
  return help ? `${id}-error ${id}-help` : `${id}-error`
}
