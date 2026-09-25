import { cookies } from "next/headers"
import { Suspense, type CSSProperties, type ReactNode } from "react"

import { AdminHeader } from "@/components/layout/AdminHeader"
import { AdminSidebar } from "@/components/layout/AdminSidebar"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Skeleton } from "@/components/ui/skeleton"
import { TooltipProvider } from "@/components/ui/tooltip"
import { getCurrentUser } from "@/lib/get-current-user"

async function Shell({ children }: { children: ReactNode }) {
  const [user, cookieStore] = await Promise.all([getCurrentUser(), cookies()])
  const account = { name: user.name, email: user.email, image: user.image ?? null }
  // Nom en dur : importée ici, la constante SIDEBAR_COOKIE_NAME du module "use client" arriverait en référence client et non en string
  const defaultOpen = cookieStore.get("sidebar_state")?.value !== "false"

  return (
    <TooltipProvider>
      <SidebarProvider
        defaultOpen={defaultOpen}
        style={{ "--sidebar-width": "13rem" } as CSSProperties}
      >
        <AdminSidebar />
        <SidebarInset>
          <AdminHeader account={account} />
          {children}
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  )
}

function AdminShellSkeleton() {
  return (
    <div className="flex min-h-svh">
      <Skeleton className="hidden h-dvh w-52 shrink-0 rounded-none md:block" />
      <Skeleton className="h-14 flex-1 rounded-none" />
    </div>
  )
}

export default function ProtectedLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<AdminShellSkeleton />}>
      <Shell>{children}</Shell>
    </Suspense>
  )
}
