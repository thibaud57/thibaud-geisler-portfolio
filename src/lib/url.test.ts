import { describe, expect, it } from 'vitest'

import { safeExternalUrl } from './url'

describe('safeExternalUrl', () => {
  it.each(['https://example.com/demo', 'http://example.com'])(
    'laisse passer %s',
    (url) => {
      const result = safeExternalUrl(url)

      expect(result).toBe(url)
    },
  )

  it.each([
    'javascript:alert(document.cookie)',
    'JavaScript:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'vbscript:msgbox(1)',
    'file:///etc/passwd',
  ])('rejette %s', (url) => {
    const result = safeExternalUrl(url)

    expect(result).toBeNull()
  })

  it.each([null, undefined, '', 'pas-une-url'])('rejette %s', (url) => {
    const result = safeExternalUrl(url)

    expect(result).toBeNull()
  })
})
