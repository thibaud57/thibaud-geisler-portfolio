'use client'

import { useEffect, useRef, useState, useSyncExternalStore } from 'react'

import { cn } from '@/lib/utils'

type Props = {
  index?: number
  className?: string
  animate?: boolean
  children: React.ReactNode
}

const VIEWPORT_THRESHOLD = 0.2
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'

function subscribeReducedMotion(callback: () => void) {
  const mql = window.matchMedia(REDUCED_MOTION_QUERY)
  mql.addEventListener('change', callback)
  return () => mql.removeEventListener('change', callback)
}

// useSyncExternalStore plutôt qu'un effet + setState : c'est le pattern natif pour lire un store
// externe mutable (ici matchMedia), pas un contournement de react-hooks/set-state-in-effect.
function useReducedMotion() {
  return useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia(REDUCED_MOTION_QUERY).matches,
    () => false,
  )
}

// IntersectionObserver + transition CSS suffisent ici : ni spring physics ni gestures.
// Les autres composants Magic UI (BorderBeam, HyperText, NumberTicker, WordRotate) restent sur
// framer-motion.
export function MotionItem({ index = 0, className, animate = true, children }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [intersected, setIntersected] = useState(false)
  const reduceMotion = useReducedMotion()
  const revealed = !animate || reduceMotion || intersected

  useEffect(() => {
    if (revealed) return

    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        setIntersected(true)
        observer.disconnect()
      },
      { threshold: VIEWPORT_THRESHOLD },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [revealed])

  if (!animate) return <div className={className}>{children}</div>

  return (
    <div
      ref={ref}
      className={cn(
        'transition-[opacity,translate] ease-out',
        // 0 pour prefers-reduced-motion : le SSR ignore la préférence (rendu masqué par défaut),
        // l'hydratation bascule ensuite vers l'état révélé et animerait la transition sans ce
        // garde-fou, malgré la préférence système.
        reduceMotion ? 'duration-0' : 'duration-[400ms]',
        revealed ? 'translate-y-0 opacity-100' : 'translate-y-5 opacity-0',
        className,
      )}
      style={{
        // Seule valeur réellement calculée au runtime (dépend de index) : reste en style inline,
        // duration/opacity/translate passent par des classes Tailwind toggleables.
        transitionDelay: revealed && !reduceMotion ? `${index * 100}ms` : '0ms',
      }}
    >
      {children}
    </div>
  )
}
