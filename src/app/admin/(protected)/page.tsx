import { getCurrentUser } from "@/lib/get-current-user"

export default async function AdminHomePage() {
  // Next rend la page en parallèle de son layout : sans cette garde, son payload RSC part au
  // client même quand celle du layout lève unauthorized()
  await getCurrentUser()

  return (
    <main className="p-8">
      <h1 className="font-sans text-2xl font-semibold tracking-tight">Espace admin</h1>
    </main>
  )
}
