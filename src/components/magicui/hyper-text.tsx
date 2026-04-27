"use client"

/**
 * Composant Magic UI `HyperText` modifié localement (philosophie copy-paste shadcn).
 * Diffs vs upstream (https://magicui.design/docs/components/hyper-text) :
 *   1. `font-mono` appliqué uniquement pendant `isAnimating` (au lieu de toujours)
 *      → la police héritée du parent reprend après l'animation, pas de switch visuel à la fin.
 *   2. `letter.toUpperCase()` retiré → respect de la casse originale du texte source.
 *   3. Support `\n` rendu en `<br>` → permet un texte multi-ligne dans un seul HyperText.
 *   4. Prop `revealOrder?: 'sequential' | 'random'` ajoutée
 *      → 'random' synchronise la fin de scramble entre lignes d'un texte multi-ligne
 *        (sinon en 'sequential' la ligne 1 finit avant la ligne 2).
 */

import {
  useEffect,
  useRef,
  useState,
  type ComponentType,
  type RefAttributes,
} from "react"
import {
  AnimatePresence,
  motion,
  type DOMMotionComponents,
  type HTMLMotionProps,
  type MotionProps,
} from "motion/react"

import { cn } from "@/lib/utils"

type CharacterSet = string[] | readonly string[]
type RevealOrder = "sequential" | "random"

const motionElements = {
  article: motion.article,
  div: motion.div,
  h1: motion.h1,
  h2: motion.h2,
  h3: motion.h3,
  h4: motion.h4,
  h5: motion.h5,
  h6: motion.h6,
  li: motion.li,
  p: motion.p,
  section: motion.section,
  span: motion.span,
} as const

type MotionElementType = Extract<
  keyof DOMMotionComponents,
  keyof typeof motionElements
>
type HyperTextMotionComponent = ComponentType<
  Omit<HTMLMotionProps<"div">, "ref"> & RefAttributes<HTMLElement>
>

interface HyperTextProps extends Omit<MotionProps, "children"> {
  /** The text content to be animated */
  children: string
  /** Optional className for styling */
  className?: string
  /** Duration of the animation in milliseconds */
  duration?: number
  /** Delay before animation starts in milliseconds */
  delay?: number
  /** Component to render as - defaults to div */
  as?: MotionElementType
  /** Whether to start animation when element comes into view */
  startOnView?: boolean
  /** Whether to trigger animation on hover */
  animateOnHover?: boolean
  /** Custom character set for scramble effect. Defaults to uppercase alphabet */
  characterSet?: CharacterSet
  /**
   * Reveal order : 'sequential' (left-to-right, défaut Magic UI) ou 'random'
   * (chars résolus dans un ordre aléatoire — utile pour synchroniser la fin
   * de scramble sur un texte multi-ligne).
   */
  revealOrder?: RevealOrder
}

const DEFAULT_CHARACTER_SET = Object.freeze(
  "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("")
) as readonly string[]

const getRandomInt = (max: number): number => Math.floor(Math.random() * max)

export function HyperText({
  children,
  className,
  duration = 800,
  delay = 0,
  as: Component = "div",
  startOnView = false,
  animateOnHover = true,
  characterSet = DEFAULT_CHARACTER_SET,
  revealOrder = "sequential",
  ...props
}: HyperTextProps) {
  const MotionComponent = motionElements[Component] as HyperTextMotionComponent

  const [displayText, setDisplayText] = useState<string[]>(() =>
    children.split("")
  )
  const [isAnimating, setIsAnimating] = useState(false)
  const iterationCount = useRef(0)
  const elementRef = useRef<HTMLElement | null>(null)
  // Recalculé à chaque trigger pour générer un nouveau pattern random à chaque hover.
  const revealPositionByIndexRef = useRef<Map<number, number>>(new Map())

  const handleAnimationTrigger = () => {
    if (animateOnHover && !isAnimating) {
      iterationCount.current = 0
      setIsAnimating(true)
    }
  }

  useEffect(() => {
    if (!startOnView) {
      const startTimeout = setTimeout(() => {
        setIsAnimating(true)
      }, delay)
      return () => clearTimeout(startTimeout)
    }

    const intersectionTimeoutRef: { current: ReturnType<typeof setTimeout> | null } = { current: null }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          intersectionTimeoutRef.current = setTimeout(() => {
            setIsAnimating(true)
          }, delay)
          observer.disconnect()
        }
      },
      { threshold: 0.1, rootMargin: "-30% 0px -30% 0px" }
    )

    if (elementRef.current) {
      observer.observe(elementRef.current)
    }

    return () => {
      observer.disconnect()
      if (intersectionTimeoutRef.current !== null) clearTimeout(intersectionTimeoutRef.current)
    }
  }, [delay, startOnView])

  useEffect(() => {
    const animationFrameRef: { current: number | null } = { current: null }

    if (isAnimating) {
      const maxIterations = children.length
      const startTime = performance.now()

      if (revealOrder === "sequential") {
        revealPositionByIndexRef.current = new Map(
          Array.from({ length: maxIterations }, (_, i) => [i, i]),
        )
      } else {
        const shuffled = Array.from({ length: maxIterations }, (_, i) => i)
        for (let i = maxIterations - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1))
          ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
        }
        revealPositionByIndexRef.current = new Map(
          shuffled.map((charIndex, position) => [charIndex, position]),
        )
      }

      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime
        const progress = Math.min(elapsed / duration, 1)

        iterationCount.current = progress * maxIterations

        setDisplayText((currentText) =>
          currentText.map((letter, index) => {
            if (letter === " " || letter === "\n") return letter
            const revealPosition = revealPositionByIndexRef.current.get(index) ?? index
            return revealPosition <= iterationCount.current
              ? children[index]
              : characterSet[getRandomInt(characterSet.length)]
          })
        )

        if (progress < 1) {
          animationFrameRef.current = requestAnimationFrame(animate)
        } else {
          setIsAnimating(false)
        }
      }

      animationFrameRef.current = requestAnimationFrame(animate)
    }

    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [children, duration, isAnimating, characterSet, revealOrder])

  return (
    <MotionComponent
      ref={elementRef}
      className={cn("overflow-hidden py-2 text-4xl font-bold", className)}
      onMouseEnter={handleAnimationTrigger}
      {...props}
    >
      <AnimatePresence>
        {displayText.map((letter, index) =>
          letter === "\n" ? (
            <br key={index} />
          ) : (
            <motion.span
              key={index}
              className={cn(
                isAnimating && "font-mono",
                letter === " " ? "w-3" : "",
              )}
            >
              {letter}
            </motion.span>
          ),
        )}
      </AnimatePresence>
    </MotionComponent>
  )
}
