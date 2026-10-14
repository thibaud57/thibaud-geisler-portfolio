import { useEffect, useEffectEvent } from "react"
import { toast } from "sonner"
import { GENERIC_ERROR_TOAST } from "@/lib/admin/toasts"

interface Options<M extends string> {
  saved: string
  onSaved: () => void
  messages?: Partial<Record<M | "unknown_error", string>>
  // Code `<entité>_not_found` de la fiche elle-même (pas d'un rattachement, qui reste une erreur de champ).
  gone?: { code: M; toast: string }
}

export function useSaveFeedback<M extends string>(
  state: { ok: boolean | null; message: M | "unknown_error" | null },
  { saved, onSaved, messages, gone }: Options<M>,
) {
  // Effect Event : seul un nouvel état rejoue le toast, ni la revalidation qui livre un nouvel objet fiche ni un `onSaved` d'identité changeante (le formulaire d'une modale reste monté pendant sa fermeture).
  const notify = useEffectEvent(() => {
    if (state.ok === true) {
      toast.success(saved)
      onSaved()
      return
    }
    if (state.ok !== false || state.message === null) return
    if (gone?.code === state.message) {
      toast.error(gone.toast)
      onSaved()
      return
    }
    const message: string | undefined = messages?.[state.message]
    if (message) toast.error(message)
    else if (state.message === "unknown_error") toast.error(GENERIC_ERROR_TOAST)
  })

  useEffect(() => {
    notify()
  }, [state])
}
