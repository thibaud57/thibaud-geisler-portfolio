'use client'

import { motion, useReducedMotion } from 'motion/react'

type Props = {
  index?: number
  className?: string
  children: React.ReactNode
}

export function MotionItem({ index = 0, className, children }: Props) {
  const reduceMotion = useReducedMotion()

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
