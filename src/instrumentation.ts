export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./lib/logger')

    // Invalide le cache build (rempli au build CI avec données seed ephemeral)
    // pour forcer le fill avec les vraies données prod au premier hit après deploy.
    if (process.env.NEXT_PHASE === 'phase-production-server') {
      const { revalidateTag } = await import('next/cache')
      revalidateTag('projects', 'max')
      revalidateTag('tags', 'max')
      revalidateTag('legal-entity', 'max')
      revalidateTag('legal-content', 'max')
    }
  }
}
