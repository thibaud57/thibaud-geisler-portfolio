---
paths:
  - "src/{app,components}/**/*.tsx"
  - "src/hooks/**/*.ts"
  - "src/lib/theme.ts"
---

# React 19 — Hooks et effets (Client Components)

## À faire
- Respecter les **Rules of Hooks** : appel uniquement au **top-level** d'un composant ou custom hook, jamais dans `if`, `for`, `try/catch`, callback
- Lister **toutes** les deps utilisées dans `useEffect`/`useMemo`/`useCallback` (règle `exhaustive-deps` via `eslint-plugin-react-hooks@6+`)
- Retourner une fonction de cleanup depuis `useEffect` pour subscriptions, timers, sockets : StrictMode monte, démonte puis remonte chaque Effect en dev, à l'hydratation aussi depuis React 19.3
- Poser un flag `let ignore = false` dans un `useEffect` qui fait un fetch async : une réponse obsolète arrivée après coup est ignorée
- Utiliser `useEffectEvent` (stable depuis React 19.2) pour sortir d'un Effect la logique non réactive (lire `theme` sans le mettre en dep)
- S'abonner à un store externe (media query, URL, thème) par **`useSyncExternalStore`**, avec un `getServerSnapshot` dédié au SSR
- Nommer les custom hooks `useXxx` (convention qui active les règles lint)

## À éviter
- Omettre des deps dans `useEffect` « parce que ça cause des re-renders » : utiliser `useEffectEvent` ou revoir le design
- Créer une Promise dans le corps du render pour la passer à `use()` : boucle infinie de suspension, la Promise doit venir d'un parent ou d'un cache
- Poser `useMemo`/`useCallback` partout sans raison : overhead pire que sans si les deps sont mal listées

## Gotchas
- **React Compiler n'est pas activé dans ce projet** (`reactCompiler` absent de `next.config.ts`) : les `useMemo`/`useCallback` manuels existants restent utiles, ne pas les retirer en supposant le Compiler actif. Activé un jour, il mémoïse à la compilation et exige `babel-plugin-react-compiler`
- `eslint-plugin-react-hooks@6+` embarque les règles du Compiler (remplace `eslint-plugin-react-compiler`, déprécié)
- `useDeferredValue` n'est **pas** un debounce : il accélère par le rendu concurrent (interruptible), les deux peuvent se combiner
- `dispatch` de `useReducer` a une identité stable entre renders : jamais besoin de `useCallback` pour le passer en prop
- Les hooks ne fonctionnent **que** dans les Client Components (`'use client'`) et les custom hooks
- Refs, Context, formulaires et pièges JSX : voir `react/components.md`

## Exemples
```typescript
// ✅ useEffect avec cleanup + flag de course
useEffect(() => {
  let ignore = false
  fetchUser(userId).then((data) => { if (!ignore) setUser(data) })
  return () => { ignore = true }
}, [userId])

// ✅ Store externe avec snapshot serveur
const isMobile = useSyncExternalStore(subscribe, () => query.matches, () => false)

// ❌ Dep omise pour éviter un re-render
useEffect(() => { notify(roomId, theme) }, [roomId])
```
