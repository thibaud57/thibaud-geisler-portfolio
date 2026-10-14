import Link from "next/link"

import { AdminPageShell } from "@/components/layout/admin/AdminPageShell"
import { Card, CardHeader, CardTitle } from "@/components/ui/card"
import { ADMIN_NAV_QUICK_LINKS, entryHref } from "@/config/admin-nav-items"
import { getCurrentUser } from "@/lib/get-current-user"

export default async function AdminHomePage() {
  // Next rend la page en parallèle de son layout : sans cette garde, son payload RSC part au
  // client même quand celle du layout lève unauthorized()
  await getCurrentUser()

  return (
    <AdminPageShell title="Accueil">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {ADMIN_NAV_QUICK_LINKS.map((item) => (
          <Link key={item.href} href={entryHref(item)}>
            <Card>
              <CardHeader className="flex flex-row items-center gap-3">
                <item.icon className="size-5 text-muted-foreground" />
                <CardTitle className="text-base">{item.label}</CardTitle>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </AdminPageShell>
  )
}
