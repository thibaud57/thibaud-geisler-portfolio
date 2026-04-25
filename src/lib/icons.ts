import * as SimpleIcons from '@icons-pack/react-simple-icons'
import * as LucideIcons from 'lucide-react'

export type IconComponent = React.ComponentType<{ size?: number; className?: string }>

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
