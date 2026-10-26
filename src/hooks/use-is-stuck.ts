import { type RefObject, useEffect, useState } from "react"

export function useIsStuck(ref: RefObject<HTMLElement | null>): boolean {
  const [stuck, setStuck] = useState(false)

  useEffect(() => {
    const element = ref.current
    if (!element) return
    // Racine rognée d'1 px : collé à top-0, l'élément n'est plus entièrement visible.
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries.at(-1)
        if (entry) setStuck(entry.intersectionRatio < 1 && entry.boundingClientRect.top <= 0)
      },
      { rootMargin: "-1px 0px 0px 0px", threshold: 1 },
    )
    observer.observe(element)
    return () => {
      observer.disconnect()
    }
  }, [ref])

  return stuck
}
