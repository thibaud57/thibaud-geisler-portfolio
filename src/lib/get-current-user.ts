import "server-only"
import { headers } from "next/headers"
import { unauthorized } from "next/navigation"
import { cache, experimental_taintObjectReference, experimental_taintUniqueValue } from "react"

import { env } from "@/env"
import { isAdminEmail } from "@/lib/admin-whitelist"
import { auth } from "@/lib/auth"

// cache() : le layout protégé et sa page l'appellent dans le même rendu, une seule lecture de session par requête
export const getCurrentUser = cache(async () => {
  const session = await auth.api.getSession({ headers: await headers() })

  // Le hook de whitelist ne s'exécute qu'à la création du compte : sans ce contrôle, un compte
  // créé avant un changement d'ADMIN_EMAIL garderait l'accès
  if (!session || !isAdminEmail(session.user.email, env.ADMIN_EMAIL)) unauthorized()

  experimental_taintObjectReference(
    "N'expose jamais l'objet user complet à un Client Component : sélectionne les champs nécessaires.",
    session.user,
  )

  experimental_taintUniqueValue(
    "N'expose jamais le token de session à un Client Component.",
    session,
    session.session.token,
  )

  return session.user
})
