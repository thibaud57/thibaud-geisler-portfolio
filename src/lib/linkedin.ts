const PROFILE_PATH = /^\/in\/([^/]+)/
const SCHEME = /^https?:\/\//i

export const LINKEDIN_PROFILE_ERROR = "Lien de profil LinkedIn attendu (linkedin.com/in/…)"

// Une forme unique par profil (casse, sous-domaine de langue, barre finale, paramètres de suivi) : c'est elle que l'unicité en base compare.
export function normalizeLinkedinProfileUrl(value: string): string | null {
  const raw = value.trim()
  let url: URL
  try {
    url = new URL(SCHEME.test(raw) ? raw : `https://${raw}`)
  } catch {
    return null
  }

  if (url.hostname !== "linkedin.com" && !url.hostname.endsWith(".linkedin.com")) return null
  const handle = PROFILE_PATH.exec(url.pathname)?.[1]
  if (!handle) return null

  try {
    return `https://www.linkedin.com/in/${encodeURIComponent(decodeURIComponent(handle).toLowerCase())}`
  } catch {
    return null
  }
}
