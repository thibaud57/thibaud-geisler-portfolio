import * as SimpleIcons from '@icons-pack/react-simple-icons'
import * as LucideIcons from 'lucide-react'

export type IconComponent = React.ComponentType<{ size?: number; className?: string }>

// Simple Icons a retiré le logo LinkedIn pour raisons de licence.
export function LinkedinIcon({ className }: { className?: string }) {
  return (
    <svg
      role="img"
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path d="M20.452 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.356V9h3.414v1.561h.046c.477-.9 1.637-1.852 3.37-1.852 3.601 0 4.266 2.37 4.266 5.455v6.288zM5.337 7.433a2.062 2.062 0 1 1 0-4.126 2.063 2.063 0 0 1 0 4.126zM7.119 20.452H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.225 0z" />
    </svg>
  )
}

function toPascalCase(slug: string): string {
  return slug
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('')
}

// Simple Icons v13 et Lucide exportent leurs composants via React.forwardRef (objets, pas fonctions).
// Un check `typeof === 'function'` rejette silencieusement toutes les icônes ; on vérifie "component-like" à la place.
function isComponentLike(value: unknown): value is IconComponent {
  if (typeof value === 'function') return true
  return typeof value === 'object' && value !== null && '$$typeof' in value
}

function resolveSimpleIcon(slug: string): IconComponent | null {
  const componentName = `Si${toPascalCase(slug)}`
  const maybeComponent = (SimpleIcons as unknown as Record<string, unknown>)[componentName]
  return isComponentLike(maybeComponent) ? maybeComponent : null
}

function resolveLucideIcon(slug: string): IconComponent | null {
  const maybeComponent = (LucideIcons as unknown as Record<string, unknown>)[toPascalCase(slug)]
  return isComponentLike(maybeComponent) ? maybeComponent : null
}

export function resolveTagIcon(icon: string | null): IconComponent | null {
  if (!icon) return null
  const colonIdx = icon.indexOf(':')
  if (colonIdx === -1) return null
  const lib = icon.slice(0, colonIdx)
  const slug = icon.slice(colonIdx + 1)
  if (!slug) return null
  if (lib === 'simple-icons') return resolveSimpleIcon(slug)
  if (lib === 'lucide') return resolveLucideIcon(slug)
  return null
}
