"use client"

import { SiGoogle } from "@icons-pack/react-simple-icons"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { ADMIN_ROOT } from "@/lib/admin/routes"
import { authClient } from "@/lib/auth-client"

export function GoogleSignInButton() {
  return (
    <Button
      variant="outline"
      size="lg"
      className="w-full"
      onClick={() => {
        void authClient.signIn.social({
          provider: "google",
          callbackURL: ADMIN_ROOT,
          fetchOptions: {
            onError: () => {
              toast.error("La connexion avec Google a échoué, réessaie.")
            },
          },
        })
      }}
    >
      <SiGoogle aria-hidden data-icon="inline-start" />
      Continuer avec Google
    </Button>
  )
}
