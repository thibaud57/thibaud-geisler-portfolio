'use client'

// Point d'entrée des surfaces de consentement, chargé uniquement par next/dynamic.
// Un import CSS ne peut pas être conditionné : posé dans providers.tsx, il partait dans le
// chunk synchrone et bloquait le premier rendu (71 Ko) alors que le JS, lui, était déjà lazy.
// Isolé ici, il suit le module dans son chunk à la demande.
// Le CSS de c15t chaîne 3 packages via @import et Lightning CSS ne suit pas la résolution
// npm transitive : il doit rester importé par le bundler Next, jamais depuis globals.css.
import '@c15t/nextjs/styles.css'

export { ConsentBanner, ConsentDialog } from '@c15t/nextjs'
