'use client'

import { motion, useReducedMotion } from 'motion/react'

type Props = {
  index?: number
  className?: string
  animate?: boolean
  children: React.ReactNode
}

// animate={false} pour tout élément above-the-fold : l'état initial opacity 0 n'est levé
// qu'après hydratation et détection d'intersection, ce qui repousse d'autant l'instant où
// le navigateur peut arrêter le LCP sur l'élément.
export function MotionItem({ index = 0, className, animate = true, children }: Props) {
  const reduceMotion = useReducedMotion()

  if (!animate) return <div className={className}>{children}</div>

  return (
    <motion.div
      className={className}
      initial={reduceMotion ? false : { opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{
        duration: reduceMotion ? 0 : 0.4,
        delay: reduceMotion ? 0 : index * 0.1,
        ease: 'easeOut',
      }}
      viewport={{ once: true, amount: 0.2 }}
    >
      {children}
    </motion.div>
  )
}
