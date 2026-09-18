import { AdminNavLink } from "@/components/layout/AdminNavLink"
import { AdminSidebarBrand } from "@/components/layout/AdminSidebarBrand"
import { AdminSignOutButton } from "@/components/layout/AdminSignOutButton"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { ADMIN_NAV_ITEMS, ADMIN_NAV_SECTION } from "@/config/admin-nav-items"
import { LABEL_CLASS } from "@/lib/typography"

export function AdminSidebar() {
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="h-14 justify-center border-b border-sidebar-border px-4 group-data-[collapsible=icon]:px-2">
        <AdminSidebarBrand />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className={LABEL_CLASS}>{ADMIN_NAV_SECTION}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {ADMIN_NAV_ITEMS.map(({ href, label, icon: Icon }) => (
                <SidebarMenuItem key={href}>
                  <AdminNavLink href={href} label={label}>
                    <Icon />
                    <span>{label}</span>
                  </AdminNavLink>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <AdminSignOutButton />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
