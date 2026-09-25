import Link from "next/link"

import { ADMIN_LOGIN_PATH } from "@/lib/admin-routes"

export default function Unauthorized() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 p-8 text-center">
      <h1 className="font-sans text-2xl font-semibold tracking-tight">Accès non autorisé</h1>
      <p className="text-muted-foreground">Cette page nécessite une session valide.</p>
      <Link className="text-primary underline underline-offset-2" href={ADMIN_LOGIN_PATH}>
        Se connecter
      </Link>
    </main>
  )
}
