import { setupLocalePage } from '@/i18n/locale-guard'

export default async function ProjetsPage({ params }: PageProps<'/[locale]/projets'>) {
  await setupLocalePage(params)

  return (
    <main>
      <h1>Projets</h1>
      <p>TODO: implement projects list</p>
    </main>
  )
}
