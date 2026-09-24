import { startTransition, type SubmitEvent } from "react"

// À utiliser à la place de <form action={...}> : React réinitialise le formulaire après chaque
// envoi, et Radix Select répond à ce reset en rappelant onValueChange avec sa valeur du premier
// rendu, effaçant les champs contrôlés (Select, catégorie, ordre...) dès la première erreur de
// validation.
export function useFormActionSubmit(
  formAction: (formData: FormData) => void,
  // Retour explicite sur tous les chemins (noImplicitReturns) : true poursuit la soumission,
  // false l'annule (ex. garde métier non satisfaite dans AssetUploadDialog).
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
