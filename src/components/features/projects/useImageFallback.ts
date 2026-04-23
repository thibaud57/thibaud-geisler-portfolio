'use client'

import { useState } from 'react'

export function useImageFallback(filename: string | null) {
  const [errored, setErrored] = useState(false)
  return {
    showImage: filename !== null && !errored,
    onError: () => setErrored(true),
  }
}
