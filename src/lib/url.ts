const SAFE_PROTOCOLS = ['http:', 'https:']

// Les URL externes des projets et des entreprises viennent de la base, sans schéma Zod à
// l'écriture. Un `javascript:` ou un `data:text/html` y deviendrait un XSS stocké au clic.
export function safeExternalUrl(url: string | null | undefined): string | null {
  if (!url) return null

  try {
    return SAFE_PROTOCOLS.includes(new URL(url).protocol) ? url : null
  } catch {
    return null
  }
}
