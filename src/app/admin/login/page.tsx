import { Suspense } from "react"

import { GoogleSignInButton } from "@/components/features/admin/GoogleSignInButton"

const ERROR_MESSAGES: Record<string, string> = {
  FORBIDDEN: "Ce compte Google n'est pas autorisé à accéder à cet espace.",
}

async function LoginError({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams

  if (!error) return null

  return (
    <p className="text-sm text-destructive">
      {ERROR_MESSAGES[error] ?? "La connexion a échoué. Réessayez."}
    </p>
  )
}

export default function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 p-8">
      <h1 className="font-sans text-2xl font-semibold tracking-tight">Connexion</h1>
      <Suspense fallback={null}>
        <LoginError searchParams={searchParams} />
      </Suspense>
      <GoogleSignInButton />
    </main>
  )
}
