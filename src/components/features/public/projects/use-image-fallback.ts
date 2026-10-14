"use client"

import { useState } from "react"

export function useImageFallback(filename: string | null) {
  const [errored, setErrored] = useState(false)
  const [trackedFilename, setTrackedFilename] = useState(filename)

  // Ajustement pendant le rendu (pattern React), pas un useEffect : évite le flash d'un aperçu
  // masqué le temps qu'un effet retire l'erreur d'une clé précédente.
  if (filename !== trackedFilename) {
    setTrackedFilename(filename)
    setErrored(false)
  }

  return {
    showImage: filename !== null && !errored,
    onError: () => {
      setErrored(true)
    },
  }
}
