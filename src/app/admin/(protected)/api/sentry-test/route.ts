import { getCurrentUser } from "@/lib/get-current-user"

// Erreur levée dans le code de l'app, et non dans une dépendance : l'issue Sentry qui en résulte
// prouve que la stack trace pointe sur ce fichier, donc que les source maps serveur sont en place.
export async function GET(): Promise<Response> {
  await getCurrentUser()

  throw new Error("Test Sentry déclenché depuis l'espace admin")
}
