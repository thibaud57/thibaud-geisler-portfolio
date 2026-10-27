"use client"

// Point d'entrée des surfaces de consentement, chargé uniquement par next/dynamic : leur code
// et le CSS qu'elles rendent en <style> suivent le module dans son chunk à la demande.
export { ConsentBanner, ConsentDialog } from "c15t/next"
