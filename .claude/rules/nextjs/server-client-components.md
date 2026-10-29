---
paths:
  - "src/{app,components}/**/*.tsx"
---

# Next.js : Server et Client Components

## À faire
- Laisser les composants en Server Components par défaut et lire les données côté serveur par les fonctions de `src/server/queries/` (cf. `nextjs/data-fetching.md`), jamais par un fetch client
- Wrapper dans `<Suspense fallback={...}>` UNIQUEMENT les Server Components async qui accèdent à des runtime APIs (`cookies()`, `headers()`, `searchParams`, `connection()`, `io()`) ou font des fetches non cachés. Pour les composants entièrement en `'use cache'`, le `<Suspense>` est redondant : le contenu est inclus dans le static shell au prerender (cf. règle XOR dans `nextjs/rendering-caching.md`)
- Ouvrir par `import 'server-only'` les modules qui accèdent à la DB ou aux secrets, par `import 'client-only'` ceux qui utilisent `window`/`document`. Next gère ces imports en interne : le paquet ne s'installe que si le lint signale une dépendance absente
- Activer `experimental: { taint: true }` et tainter les objets sensibles (user avec `passwordHash`, tokens) avec `experimental_taintObjectReference` / `experimental_taintUniqueValue`. API expérimentale que la doc Next ne recommande pas seule en production : revérifier à chaque montée de Next et de React que l'option et ses exports existent encore

## À éviter
- Passer une variable d'environnement serveur en prop à un Client Component, même si le bundler la filtre (peut fuiter via le RSC payload)
- Compter sur le Taint API seul pour la sécurité : c'est une couche de défense, toujours combiner avec `server-only` et filtrage des données en amont
- Faire un spread `{...user}` ou restructurer `{ name: user.name }` sur un objet tainted : crée un nouvel objet non tainted

## Gotchas
- Un Server Component ne crée ni ne lit un Context (`createContext`, `useContext`). Depuis React 19.3, il peut en revanche rendre `<Ctx value={...}>` d'un Context importé d'un module `'use client'`
- Le Taint API protège uniquement l'instance exacte : les transformations (`.toUpperCase()`, base64) créent des valeurs non tainted

## Exemples
```typescript
// ✅ Server Component passé en children d'un Client Component : il reste côté serveur
'use client'
export function Wrapper({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  return <>{open && <div>{children}</div>}</>
}

async function Page() {
  const items = await getItems()
  return <Wrapper><ServerList items={items} /></Wrapper>
}

// ❌ Spread d'un objet tainted : la copie n'est plus protégée
<ClientCard user={{ ...user }} />
```
