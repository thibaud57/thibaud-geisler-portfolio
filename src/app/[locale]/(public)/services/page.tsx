import { setupLocalePage } from '@/i18n/locale-guard'

export default async function ServicesPage({ params }: PageProps<'/[locale]/services'>) {
  await setupLocalePage(params)

  return (
    <main>
      <h1>Services</h1>
      <p>TODO: implement services page</p>
    </main>
  )
}
