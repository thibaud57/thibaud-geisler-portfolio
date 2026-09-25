import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { ADMIN_LOGIN_PATH } from "@/lib/admin-routes"
import { authClient } from "@/lib/auth-client"

export function useAdminSignOut() {
  const router = useRouter()

  return () => {
    void authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          router.push(ADMIN_LOGIN_PATH)
        },
        onError: () => {
          toast.error("La déconnexion a échoué. Réessayez.")
        },
      },
    })
  }
}
