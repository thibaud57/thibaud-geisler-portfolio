import { AdminPageTitle } from "@/components/layout/AdminPageTitle"
import { AdminUserMenu, type AdminAccount } from "@/components/layout/AdminUserMenu"
import { ThemeToggle } from "@/components/layout/ThemeToggle"
import { SidebarTrigger } from "@/components/ui/sidebar"

export function AdminHeader({ account }: { account: AdminAccount }) {
  return (
    <header className="flex h-14 items-center gap-2 border-b border-border px-4">
      <SidebarTrigger />
      <AdminPageTitle />
      <div className="ml-auto flex items-center gap-2">
        <ThemeToggle label="Changer de thème" />
        <AdminUserMenu account={account} />
      </div>
    </header>
  )
}
