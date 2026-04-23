import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { TagBadge } from './TagBadge'

type TagIconInput = { name: string; icon: string | null }

function renderTag(tag: TagIconInput) {
  return render(<TagBadge tag={tag} />)
}

describe('TagBadge — icon resolver', () => {
  it('icon null → affiche uniquement le nom sans SVG', () => {
    const { container } = renderTag({ name: 'Custom Tech', icon: null })
    expect(container).toHaveTextContent('Custom Tech')
    expect(container.querySelector('svg')).toBeNull()
  })

  it('simple-icons:<slug> existant → affiche SVG + nom', () => {
    const { container } = renderTag({ name: 'React', icon: 'simple-icons:react' })
    expect(container).toHaveTextContent('React')
    expect(container.querySelector('svg')).not.toBeNull()
  })

  it('lucide:<slug> existant → affiche SVG + nom (resolve forwardRef)', () => {
    const { container } = renderTag({ name: 'Agents IA', icon: 'lucide:brain-circuit' })
    expect(container).toHaveTextContent('Agents IA')
    expect(container.querySelector('svg')).not.toBeNull()
  })

  it('simple-icons:<slug> inconnu → affiche uniquement le nom (fallback silencieux)', () => {
    const { container } = renderTag({
      name: 'Unknown Tech',
      icon: 'simple-icons:ceci-nexiste-pas-dans-simple-icons',
    })
    expect(container).toHaveTextContent('Unknown Tech')
    expect(container.querySelector('svg')).toBeNull()
  })

  it('lib inconnue (ex heroicons:) → affiche uniquement le nom', () => {
    const { container } = renderTag({ name: 'Other', icon: 'heroicons:react' })
    expect(container).toHaveTextContent('Other')
    expect(container.querySelector('svg')).toBeNull()
  })

  it('icon malformé sans colon → affiche uniquement le nom', () => {
    const { container } = renderTag({ name: 'Malformed', icon: 'reactsimpleicons' })
    expect(container).toHaveTextContent('Malformed')
    expect(container.querySelector('svg')).toBeNull()
  })

  it('icon avec colon seul (ex "simple-icons:") → affiche uniquement le nom', () => {
    const { container } = renderTag({ name: 'Empty Slug', icon: 'simple-icons:' })
    expect(container).toHaveTextContent('Empty Slug')
    expect(container.querySelector('svg')).toBeNull()
  })

  it('slug kebab-case multi-segments (ex "brain-circuit") → PascalCase lookup réussit', () => {
    const { container } = renderTag({ name: 'Multi-Segment', icon: 'lucide:brain-circuit' })
    expect(container.querySelector('svg')).not.toBeNull()
  })

  it('case-insensitive prefix (uppercase lib) → rejette, garde seulement le nom', () => {
    const { container } = renderTag({ name: 'Case Sensitive', icon: 'Simple-Icons:react' })
    expect(container).toHaveTextContent('Case Sensitive')
    expect(container.querySelector('svg')).toBeNull()
  })
})
