---
paths:
  - "src/app/**/*.tsx"
  - "src/components/**/*.tsx"
  - "src/hooks/**/*.ts"
  - "src/hooks/**/*.tsx"
---

# React 19 — Hooks (Client Components)

## À faire
- Respecter les **Rules of Hooks** : appel uniquement au **top-level** d'un composant ou custom hook, jamais dans `if`, `for`, `try/catch`, callback
- Lister **toutes** les deps utilisées dans `useEffect`/`useMemo`/`useCallback` (règle `exhaustive-deps` via `eslint-plugin-react-hooks@6+`)
- Retourner une fonction de cleanup depuis `useEffect` pour subscriptions, timers, sockets (sinon cassé par StrictMode double-invoke)
- Utiliser un flag `let ignore = false` dans un `useEffect` qui fait un fetch async pour éviter les race conditions (drop si une réponse obsolète arrive)
- Utiliser `useEffectEvent` (R19.2 stable) pour extraire la logique non-réactive d'un Effect (ex : lire `theme` sans le mettre en dep)
- Nommer les custom hooks en `useXxx` (convention qui active les règles lint)
- Passer `ref` directement comme prop des function components (R19) au lieu de `forwardRef`
- Appeler `useRef(null)` avec un argument initial explicite en TypeScript (pas `useRef()` sans arg)
- Wrapper la `value` d'un Context Provider avec `useMemo` si c'est un objet/array inline, pour éviter le re-render de tous les consumers
- Utiliser `useId()` pour les IDs accessibility (`htmlFor`/`aria-describedby`), jamais pour des keys de listes
- Utiliser `useActionState` (de `react`) pour les Server Actions, `useFormStatus` pour lire l'état du form dans un **composant enfant**
- Utiliser `useOptimistic` pour les updates UI instantanés avec rollback auto en cas d'échec

## À éviter
- Utiliser `forwardRef` : **déprécié** React 19, passer `ref` en prop normale (codemod dispo)
- Utiliser `<Context.Provider>` : **déprécié** React 19, utiliser `<Context value={...}>` directement (codemod dispo)
- Utiliser `element.ref` : **déprécié** React 19, utiliser `element.props.ref`
- Utiliser `useFormState` de `react-dom` : **déprécié** R19, remplacé par `useActionState` de `react`
- Utiliser `propTypes` ou `defaultProps` sur les function components : **retirés définitivement** en R19
- Utiliser `ReactDOM.render` : **supprimé**, utiliser `createRoot`
- Utiliser `useRef()` sans argument en TypeScript : **interdit** en R19
- Omettre des deps dans `useEffect` "parce que ça cause des re-renders" : utiliser `useEffectEvent` ou revoir le design
- Appeler `useFormStatus()` dans le même composant qui rend le `<form>` : doit être dans un **enfant** du form
- Créer une Promise dans le corps du render pour la passer à `use()` : boucle infinie de suspension, la Promise doit venir d'un parent (ou d'un cache)
- Utiliser `useMemo`/`useCallback` partout sans raison : overhead pire que sans si deps mal listées

## Gotchas
- React Compiler v1.0 (stable octobre 2025) activable via `reactCompiler: true` dans `next.config.ts` : mémoïse automatiquement à la compilation, supprimer les `useMemo`/`useCallback` manuels sauf cas exotiques
- Peer dep pour le Compiler : `babel-plugin-react-compiler`, augmente les temps de compilation
- `eslint-plugin-react-hooks@6+` bundle les règles Compiler (remplace `eslint-plugin-react-compiler` déprécié)
- `useDeferredValue` n'est **pas** un debounce : accélère via concurrent rendering (interruptible), les deux peuvent se combiner
- `dispatch` de `useReducer` a une identité stable entre renders (jamais besoin de `useCallback` pour le passer en prop)
- Les hooks ne fonctionnent **que** dans les Client Components (`'use client'`) et les custom hooks, jamais dans les Server Components
- **Piège JSX `cond && <X />` avec nombre** : `{count && <Badge />}` rend littéralement `0` si `count === 0`. Forcer en booléen : `{count > 0 && <Badge />}` ou `{!!count && <Badge />}`
- **Piège `value={undefined}`** dans un input : switche silencieusement en non contrôlé, puis rebascule en contrôlé au prochain render (React log un warning). Toujours initialiser avec `''` pour les strings : `useState('')`

## Exemples
```typescript
// ✅ useEffect avec cleanup + race condition flag
function Profile({ userId }: { userId: string }) {
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    let ignore = false
    fetchUser(userId).then(data => {
      if (!ignore) setUser(data)
    })
    return () => { ignore = true }
  }, [userId])
}
```

```typescript
// ✅ useEffectEvent : theme hors deps
function ChatRoom({ roomId, theme }: { roomId: string; theme: Theme }) {
  const onConnected = useEffectEvent(() => {
    showNotification(`Connected to ${roomId}`, theme)
  })

  useEffect(() => {
    const connection = createConnection(roomId)
    connection.on('connected', onConnected)
    connection.connect()
    return () => connection.disconnect()
  }, [roomId]) // theme absent grâce à useEffectEvent
}
```

```typescript
// ✅ Ref as prop (R19) — plus de forwardRef
type InputProps = {
  ref?: RefObject<HTMLInputElement | null>
  label: string
}

function Input({ ref, label }: InputProps) {
  return (
    <label>
      {label}
      <input ref={ref} />
    </label>
  )
}
```

```typescript
// ✅ useFormStatus dans un ENFANT du form
function SubmitButton() {
  const { pending } = useFormStatus()
  return <button disabled={pending}>{pending ? 'Envoi...' : 'Envoyer'}</button>
}

export function ContactForm() {
  const [state, formAction] = useActionState(submitForm, { message: '' })
  return (
    <form action={formAction}>
      <input name="email" />
      <SubmitButton />
    </form>
  )
}
```
