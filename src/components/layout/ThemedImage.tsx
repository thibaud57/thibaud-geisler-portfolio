import Image from "next/image"

import { cn } from "@/lib/utils"

interface Props {
  lightSrc: string
  darkSrc: string
  alt: string
  width: number
  height: number
  className?: string
  preload?: boolean
}

export function ThemedImage({ lightSrc, darkSrc, alt, className, ...props }: Props) {
  return (
    <>
      <Image src={lightSrc} alt={alt} {...props} className={cn("dark:hidden", className)} />
      <Image src={darkSrc} alt={alt} {...props} className={cn("hidden dark:block", className)} />
    </>
  )
}
