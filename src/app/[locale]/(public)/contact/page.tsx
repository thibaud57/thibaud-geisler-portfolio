import { setupLocalePage } from '@/i18n/locale-guard'

export default async function ContactPage({ params }: PageProps<'/[locale]/contact'>) {
  await setupLocalePage(params)

  return (
    <main>
      <h1>Contact</h1>
      <p>TODO: implement contact form</p>
    </main>
  )
}
