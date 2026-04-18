import { setupLocalePage } from '@/i18n/locale-guard'

export default async function ProjetDetailPage({
  params,
}: PageProps<'/[locale]/projets/[slug]'>) {
  const { slug } = await setupLocalePage(params)

  return (
    <main>
      <h1>Projet : {slug}</h1>
      <p>TODO: implement project case study page</p>
    </main>
  )
}
