export const ADMIN_ROOT = "/admin"
export const ADMIN_LOGIN_PATH = "/admin/login"
export const ADMIN_LEADS_PATH = "/admin/leads"
export const ADMIN_PROSPECTING_ACTIONS_PATH = "/admin/actions-prospection"
export const ADMIN_COMPANIES_PATH = "/admin/entreprises"

export function isAdminPath(pathname: string): boolean {
  return pathname === ADMIN_ROOT || pathname.startsWith(`${ADMIN_ROOT}/`)
}

export function requiresSession(pathname: string): boolean {
  return isAdminPath(pathname) && pathname !== ADMIN_LOGIN_PATH
}
