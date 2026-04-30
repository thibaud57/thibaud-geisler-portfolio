import 'server-only'

import { promises as fs } from 'fs'
import path from 'path'

import { cacheLife, cacheTag } from 'next/cache'
import type { Locale } from 'next-intl'

type LegalSlug = 'mentions' | 'confidentialite-intro' | 'confidentialite-cookies'

export async function loadLegalContent(
  locale: Locale,
  slug: LegalSlug,
): Promise<string> {
  'use cache'
  cacheLife('days')
  cacheTag('legal-content')
  const filePath = path.join(
    process.cwd(),
    'content',
    'legal',
    locale,
    `${slug}.md`,
  )
  return fs.readFile(filePath, 'utf-8')
}
