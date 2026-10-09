---
paths:
  - "src/{app,components}/**/*.tsx"
---

# Next.js — Server & Client Components

## À faire
- Par défaut, laisser les composants comme Server Components (RSC) : accès direct DB Prisma, env vars privées, zéro bundle client
- Déclarer `'use client'` uniquement quand le composant a besoin de hooks interactifs (`useState`, `useEffect`, `useRef`), event handlers, ou APIs navigateur (`window`, `localStorage`)
- Placer `'use client'` le plus bas possible dans l'arbre (pattern "leaf client component") pour minimiser le bundle JS client
- Passer un Server Component en `children` d'un Client Component pour le maintenir côté serveur tout en ayant de l'interactivité autour
- Faire des Server Components `async` et `await` directement dans le corps du composant, sans `useEffect` ni state de chargement
- Wrapper dans `<Suspense fallback={...}>` UNIQUEMENT les Server Components async qui accèdent à des runtime APIs (`cookies()`, `headers()`, `searchParams`, `connection()`, `io()`) ou font des fetches non cachés. Pour les composants entièrement en `'use cache'`, le `<Suspense>` est redondant : le contenu est inclus dans le static shell au prerender (cf. règle XOR dans `nextjs/rendering-caching.md`)
- Ouvrir par `import 'server-only'` les modules qui accèdent à la DB ou aux secrets, par `import 'client-only'` ceux qui utilisent `window`/`document`. Next gère ces imports en interne : le paquet ne s'installe que si le lint signale une dépendance absente
- Activer `experimental: { taint: true }` et tainter les objets sensibles (user avec `passwordHash`, tokens) avec `experimental_taintObjectReference` / `experimental_taintUniqueValue`. API expérimentale que la doc Next ne recommande pas seule en production : revérifier à chaque montée de Next et de React que l'option et ses exports existent encore
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
- Un Server Component ne crée ni ne lit un Context (`createContext`, `useContext`). Depuis React 19.3, il peut en revanche rendre `<Ctx value={...}>` d'un Context importé d'un module `'use client'`
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
