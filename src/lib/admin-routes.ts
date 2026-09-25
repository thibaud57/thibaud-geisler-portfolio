export const ADMIN_ROOT = "/admin"
export const ADMIN_LOGIN_PATH = "/admin/login"

export function isAdminPath(pathname: string): boolean {
  return pathname === ADMIN_ROOT || pathname.startsWith(`${ADMIN_ROOT}/`)
}

export function requiresSession(pathname: string): boolean {
  return isAdminPath(pathname) && pathname !== ADMIN_LOGIN_PATH
}
