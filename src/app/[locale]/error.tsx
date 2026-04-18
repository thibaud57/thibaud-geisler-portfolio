'use client'

type Props = {
  error: Error & { digest?: string }
  reset: () => void
}

export default function Error({ error, reset }: Props) {
  return (
    <main>
      <h1>Erreur</h1>
      <p>TODO: implement error page (translated)</p>
      <button onClick={reset}>Réessayer</button>
    </main>
  )
}
