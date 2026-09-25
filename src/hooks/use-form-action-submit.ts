import { startTransition, type SubmitEvent } from "react"

// À utiliser à la place de <form action={...}> : React réinitialise le form après l'envoi, et
// Radix Select rappelle onValueChange avec sa valeur initiale sur ce reset, effaçant les champs
// contrôlés dès la première erreur de validation.
export function useFormActionSubmit(
  formAction: (formData: FormData) => void,
  // Retour explicite sur tous les chemins (noImplicitReturns) : true poursuit la soumission,
  // false l'annule (garde métier non satisfaite).
  prepare?: (formData: FormData) => boolean,
) {
  return (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    if (prepare && !prepare(formData)) return
    startTransition(() => {
      formAction(formData)
    })
  }
}
