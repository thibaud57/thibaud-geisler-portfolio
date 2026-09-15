import { Suspense, type ReactNode } from "react"

import { getCurrentUser } from "@/lib/get-current-user"

async function Guard({ children }: { children: ReactNode }) {
  await getCurrentUser()
  return <>{children}</>
}

export default function ProtectedLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<div className="p-8" aria-hidden />}>
      <Guard>{children}</Guard>
    </Suspense>
  )
}
