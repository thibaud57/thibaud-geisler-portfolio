import { CircleAlert, ShieldBan } from "lucide-react"
import { Suspense } from "react"

import { GoogleSignInButton } from "@/components/layout/admin/GoogleSignInButton"
import { BrandLogo } from "@/components/layout/BrandLogo"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { firstParam } from "@/lib/admin/search-params"

const ERROR_MESSAGES: Record<string, string> = {
  FORBIDDEN: "Ce compte Google n'est pas autorisé à accéder à cet espace.",
}

async function LoginError({ searchParams }: Pick<PageProps<"/admin/login">, "searchParams">) {
  const { error: rawError } = await searchParams
  const error = firstParam(rawError)

  if (!error) return null

  const Icon = error === "FORBIDDEN" ? ShieldBan : CircleAlert

  return (
    <Alert variant="destructive">
      <Icon aria-hidden />
      <AlertDescription>
        {ERROR_MESSAGES[error] ?? "La connexion a échoué. Réessayez."}
      </AlertDescription>
    </Alert>
  )
}

export default function AdminLoginPage({ searchParams }: PageProps<"/admin/login">) {
  return (
    <main className="flex min-h-dvh items-center justify-center p-4 sm:p-8">
      <Card className="w-full max-w-sm">
        <CardHeader className="justify-items-center gap-2 text-center">
          <BrandLogo className="md:w-35" />
          <Separator className="my-2" />
          <h1 className="font-sans text-2xl font-semibold tracking-tight">Connexion</h1>
          <CardDescription>Espace d&apos;administration</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Suspense fallback={null}>
            <LoginError searchParams={searchParams} />
          </Suspense>
          <GoogleSignInButton />
        </CardContent>
      </Card>
    </main>
  )
}
