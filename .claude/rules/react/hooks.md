---
paths:
  - "src/{app,components}/**/*.tsx"
  - "src/hooks/**/*.ts"
  - "src/components/**/use*.ts"
  - "src/lib/theme.ts"
---

# React 19 : hooks et effets (Client Components)

## À faire
- Retourner une fonction de cleanup depuis `useEffect` pour subscriptions, timers, sockets : StrictMode monte, démonte puis remonte chaque Effect en dev, à l'hydratation aussi depuis React 19.3
- Poser un flag `let ignore = false` dans un `useEffect` qui fait un fetch async : une réponse obsolète arrivée après coup est ignorée
- Utiliser `useEffectEvent` (stable depuis React 19.2) pour sortir d'un Effect la logique non réactive (lire `theme` sans le mettre en dep)
- S'abonner à un store externe (media query, URL, thème) par **`useSyncExternalStore`**, avec un `getServerSnapshot` dédié au SSR

## À éviter
- Créer une Promise dans le corps du render pour la passer à `use()` : boucle infinie de suspension, la Promise doit venir d'un parent ou d'un cache
- Poser `useMemo`/`useCallback` partout sans raison : overhead pire que sans si les deps sont mal listées

## Gotchas
- **React Compiler n'est pas activé dans ce projet** (`reactCompiler` absent de `next.config.ts`) : les `useMemo`/`useCallback` manuels existants restent utiles, ne pas les retirer en supposant le Compiler actif. Activé un jour, il mémoïse à la compilation et exige `babel-plugin-react-compiler`
- `useDeferredValue` n'est **pas** un debounce : il accélère par le rendu concurrent (interruptible), les deux peuvent se combiner
- `dispatch` de `useReducer` a une identité stable entre renders : jamais besoin de `useCallback` pour le passer en prop
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
```
