function normalize(value: string | null | undefined): string {
  return value?.trim().toLowerCase() ?? ""
}

export function isAdminEmail(
  email: string | null | undefined,
  adminEmail: string | null | undefined,
): boolean {
  const normalizedEmail = normalize(email)
  const normalizedAdminEmail = normalize(adminEmail)

  if (!normalizedEmail || !normalizedAdminEmail) return false

  return normalizedEmail === normalizedAdminEmail
}
