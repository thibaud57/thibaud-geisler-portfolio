"use client"

import { useSyncExternalStore } from "react"

const subscribeNever = () => () => undefined

// Faux au rendu serveur et à l'hydratation, vrai ensuite : l'heure locale du navigateur ne peut pas être lue avant.
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribeNever,
    () => true,
    () => false,
  )
}
