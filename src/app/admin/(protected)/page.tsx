import Link from "next/link"

import { AdminPageShell } from "@/components/layout/AdminPageShell"
import { Card, CardHeader, CardTitle } from "@/components/ui/card"
import { ADMIN_NAV_QUICK_LINKS } from "@/config/admin-nav-items"
import { getCurrentUser } from "@/lib/get-current-user"

export default async function AdminHomePage() {
  // Next rend la page en parallèle de son layout : sans cette garde, son payload RSC part au
  // client même quand celle du layout lève unauthorized()
  await getCurrentUser()

  return (
    <AdminPageShell title="Dashboard">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {ADMIN_NAV_QUICK_LINKS.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href}>
            <Card className="transition duration-300 ease-out hover:scale-[1.01] hover:shadow-xl">
              <CardHeader className="flex flex-row items-center gap-3">
                <Icon className="size-5 text-muted-foreground" />
                <CardTitle className="text-base">{label}</CardTitle>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </AdminPageShell>
  )
}
