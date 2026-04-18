import { setupLocalePage } from '@/i18n/locale-guard'

export default async function AProposPage({ params }: PageProps<'/[locale]/a-propos'>) {
  await setupLocalePage(params)

  return (
    <main>
      <h1>À propos</h1>
      <p>TODO: implement about page</p>
    </main>
  )
}
