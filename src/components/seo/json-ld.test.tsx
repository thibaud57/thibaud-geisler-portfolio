import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { JsonLd } from './json-ld'

describe('JsonLd', () => {
  it('rend un <script type="application/ld+json"> avec le JSON sérialisé', () => {
    const { container } = render(<JsonLd data={{ '@type': 'Person', name: 'X' }} />)
    const script = container.querySelector('script[type="application/ld+json"]')
    expect(script).not.toBeNull()
    expect(JSON.parse(script!.innerHTML)).toEqual({ '@type': 'Person', name: 'X' })
  })

  it('échappe </script> en \\u003c pour bloquer une injection XSS', () => {
    const { container } = render(
      <JsonLd data={{ payload: '</script><script>alert(1)</script>' }} />,
    )
    const html = container.querySelector('script')!.innerHTML
    expect(html).not.toContain('</script>')
    expect(html).toContain('\\u003c')
  })
})
