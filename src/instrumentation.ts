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

// Sans ce hook, une erreur non gérée d'un rendu serveur sort en texte brut et échappe au
// filtre `"level":"error"` sur lequel repose l'investigation d'incident (PRODUCTION.md).
// Point d'accroche de Sentry.captureRequestError quand le sub-project observabilité arrivera.
export async function onRequestError(err: unknown, request: { path: string }) {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return

  const { logger } = await import('./lib/logger')
  logger.error({ err, event: 'request:unhandled_error', path: request.path })
}
