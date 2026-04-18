import { setupLocalePage } from '@/i18n/locale-guard'

export default async function HomePage({ params }: PageProps<'/[locale]'>) {
  await setupLocalePage(params)

  return (
    <main>
      <h1>Accueil</h1>
      <p>TODO: implement home page</p>
    </main>
  )
}
