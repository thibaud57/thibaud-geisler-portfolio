import 'server-only'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

export type OgFont = {
  name: string
  data: ArrayBuffer
  weight: 400 | 700
  style: 'normal'
}

let fontsPromise: Promise<OgFont[]> | null = null

export function loadOgFonts(): Promise<OgFont[]> {
  return (fontsPromise ??= readFontsFromDisk())
}

async function readFontsFromDisk(): Promise<OgFont[]> {
  const fontsDir = join(process.cwd(), 'src', 'lib', 'seo', 'fonts')

  const [sansationBold, geistRegular] = await Promise.all([
    readFile(join(fontsDir, 'Sansation-Bold.ttf')),
    readFile(join(fontsDir, 'Geist-Regular.ttf')),
  ])

  return [
    {
      name: 'Sansation',
      data: sansationBold.buffer.slice(
        sansationBold.byteOffset,
        sansationBold.byteOffset + sansationBold.byteLength,
      ),
      weight: 700,
      style: 'normal',
    },
    {
      name: 'Geist',
      data: geistRegular.buffer.slice(
        geistRegular.byteOffset,
        geistRegular.byteOffset + geistRegular.byteLength,
      ),
      weight: 400,
      style: 'normal',
    },
  ]
}
