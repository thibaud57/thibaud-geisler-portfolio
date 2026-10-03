---
paths:
  - "src/{app,components}/**/*.tsx"
---

# React 19 — Refs, Context, formulaires et pièges JSX

## À faire
- Passer `ref` directement comme prop des function components, sans `forwardRef`
- Appeler `useRef(null)` avec un argument initial explicite en TypeScript
- Rendre le Context directement, `<Context value={...}>`, et envelopper sa `value` par `useMemo` quand c'est un objet ou un tableau inline : sinon tous les consumers re-rendent
- Utiliser `useId()` pour les IDs d'accessibilité (`htmlFor`, `aria-describedby`), jamais pour des keys de listes
- Brancher une Server Action par `useActionState` (de `react`) et lire l'état du formulaire par `useFormStatus` dans un **composant enfant** du `<form>`
- Utiliser `useOptimistic` pour un retour d'interface immédiat, annulé automatiquement en cas d'échec

## À éviter
- `forwardRef` : **déprécié** en React 19 (codemod disponible)
- `<Context.Provider>` : **déprécié** en React 19 (codemod disponible)
- `element.ref` : **déprécié**, utiliser `element.props.ref`
- `useFormState` de `react-dom` : **déprécié**, remplacé par `useActionState` de `react`
- `propTypes` ou `defaultProps` sur les function components, et `ReactDOM.render` : **supprimés** en React 19 (`createRoot` à la place du second)
- Appeler `useFormStatus()` dans le composant qui rend le `<form>` : il ne voit que le formulaire parent

## Gotchas
- **`{count && <Badge />}` rend `0`** quand `count === 0` : forcer un booléen, `{count > 0 && <Badge />}`
- **`value={undefined}`** sur un input le bascule en non contrôlé, puis de nouveau en contrôlé au render suivant (warning React) : initialiser les chaînes à `''`
- Règles des hooks, effets et stores externes : voir `react/hooks.md`

## Exemples
```typescript
// ✅ ref en prop, plus de forwardRef
function Input({ ref, label }: { ref?: RefObject<HTMLInputElement | null>; label: string }) {
  return <label>{label}<input ref={ref} /></label>
}

// ✅ useFormStatus dans un enfant du form
function SubmitButton() {
  const { pending } = useFormStatus()
  return <button disabled={pending}>Envoyer</button>
}

// ❌ API retirées ou dépréciées
const Input = forwardRef((props, ref) => <input ref={ref} />)
<ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>
```
