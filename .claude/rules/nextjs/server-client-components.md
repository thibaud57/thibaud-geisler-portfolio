---
paths:
  - "src/app/**/*.tsx"
  - "src/components/**/*.tsx"
---

# Next.js — Server & Client Components

## À faire
- Par défaut, laisser les composants comme Server Components (RSC) : accès direct DB Prisma, env vars privées, zéro bundle client
- Déclarer `'use client'` uniquement quand le composant a besoin de hooks interactifs (`useState`, `useEffect`, `useRef`), event handlers, ou APIs navigateur (`window`, `localStorage`)
- Placer `'use client'` le plus bas possible dans l'arbre (pattern "leaf client component") pour minimiser le bundle JS client
- Passer un Server Component en `children` d'un Client Component pour le maintenir côté serveur tout en ayant de l'interactivité autour
- Faire des Server Components `async` et `await` directement dans le corps du composant, sans `useEffect` ni state de chargement
- Wrapper les zones async lentes dans `<Suspense fallback={...}>` pour afficher des fallbacks granulaires pendant le streaming
- Installer le package `server-only` sur les modules qui accèdent à la DB/secrets, `client-only` sur ceux qui utilisent `window`/`document`
- Activer `experimental: { taint: true }` et tainter les objets sensibles (user avec `passwordHash`, tokens) avec `experimental_taintObjectReference` / `experimental_taintUniqueValue`
- S'assurer que les props passées d'un Server vers Client Component sont sérialisables (`string`, `number`, `Date`, `Map`, `Set`, `Promise`, `FormData`, Server Actions)

## À éviter
- Utiliser `useState`, `useEffect`, `useRef`, `useContext`, `onClick` dans un Server Component : lève une erreur à l'exécution
- Importer un Server Component directement dans un Client Component : l'import le convertit en client, casse le pattern RSC (passer en props depuis un parent Server à la place)
- Passer une fonction locale, une instance de classe ou une `RegExp` en prop d'un Server vers un Client Component (non sérialisable, erreur runtime)
- Passer une variable d'environnement serveur en prop à un Client Component, même si le bundler la filtre (peut fuiter via le RSC payload)
- Compter sur le Taint API seul pour la sécurité : c'est une couche de défense, toujours combiner avec `server-only` et filtrage des données en amont
- Faire un spread `{...user}` ou restructurer `{ name: user.name }` sur un objet tainted : crée un nouvel objet non tainted

## Gotchas
- Next 16 (hard error) : `params` et `searchParams` sont `Promise`, `await` obligatoire, l'accès synchrone est une erreur bloquante
- Context React ne traverse pas la frontière RSC (pas de runtime React global côté serveur) : `useContext` et `<Context>` ne fonctionnent pas dans les Server Components
- Un Client Component est quand même pré-rendu en HTML côté serveur (SSR), `'use client'` ne désactive pas le SSR
- Le Taint API protège uniquement l'instance exacte : les transformations (`.toUpperCase()`, base64) créent des valeurs non tainted

## Exemples
```typescript
// ✅ Server Component async — accès direct DB
async function Page() {
  const items = await getItems()
  return <List items={items} />
}

// ❌ useState/useEffect dans un Server Component (lève une erreur)
async function Page() {
  const [count, setCount] = useState(0)
  const items = await getItems()
  return <List items={items} />
}
```

```typescript
// ✅ Pattern children : Server Component passé en children d'un Client Component
'use client'
export function Wrapper({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  return <>{open && <div>{children}</div>}</>
}

async function Page() {
  const items = await getItems()
  return <Wrapper><ServerList items={items} /></Wrapper>
}
```

```typescript
// ❌ Anti-pattern : 'use client' au niveau page entière
'use client'
export function Page() { ... } // tout devient client

// ✅ Leaf client : seul le bouton est client
'use client'
export function InteractiveButton({ id }: { id: string }) {
  return <button onClick={() => handleClick(id)}>Action</button>
}
```
