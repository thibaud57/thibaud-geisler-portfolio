import { AdminNavDisabledItem } from "@/components/layout/AdminNavDisabledItem"
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
import { ADMIN_NAV_GROUPS } from "@/config/admin-nav-items"
import { LABEL_CLASS } from "@/lib/typography"

export function AdminSidebar() {
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="h-14 justify-center border-b border-sidebar-border px-4 group-data-[collapsible=icon]:px-2">
        <AdminSidebarBrand />
      </SidebarHeader>
      <SidebarContent>
        {ADMIN_NAV_GROUPS.map((group) => {
          return (
            <SidebarGroup key={group.label ?? "home"}>
              {group.label ? (
                <SidebarGroupLabel className={LABEL_CLASS}>{group.label}</SidebarGroupLabel>
              ) : null}
              <SidebarGroupContent>
                <SidebarMenu>
                  {group.items.map((item) => (
                    <SidebarMenuItem key={item.label}>
                      {item.href ? (
                        <AdminNavLink href={item.href} label={item.label} subItems={item.subItems}>
                          <item.icon />
                          <span>{item.label}</span>
                        </AdminNavLink>
                      ) : (
                        <AdminNavDisabledItem label={item.label} icon={item.icon} />
                      )}
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )
        })}
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
