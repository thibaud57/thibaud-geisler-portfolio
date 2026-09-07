import { cn } from "@/lib/utils"

interface Props {
  children: React.ReactNode
  className?: string
}

export function LeadParagraph({ children, className }: Props) {
  return (
    <p
      className={cn(
        "border-l-2 border-primary/60 pl-5 text-xl leading-relaxed text-foreground/90",
        className,
      )}
    >
      {children}
    </p>
  )
}
