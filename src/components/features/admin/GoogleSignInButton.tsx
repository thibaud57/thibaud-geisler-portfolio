"use client"

import { Button } from "@/components/ui/button"
import { ADMIN_ROOT } from "@/lib/admin-routes"
import { authClient } from "@/lib/auth-client"

export function GoogleSignInButton() {
  return (
    <Button
      onClick={() => void authClient.signIn.social({ provider: "google", callbackURL: ADMIN_ROOT })}
    >
      Continuer avec Google
    </Button>
  )
}
