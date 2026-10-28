---
paths:
  - "src/**/*.test.tsx"
---

# Vitest : tests de composants React (Testing Library)

## À faire
- Attendre qu'un élément **apparaisse** par **`findBy*`** et un **changement d'état** sur un élément déjà présent (bouton qui devient `disabled`) par **`waitFor(() => expect(...))`** : `findBy` n'attend que la présence, pas l'état
- Appeler **`userEvent.setup()`** AVANT chaque `render()` puis préférer `userEvent` à `fireEvent`, qui envoie des événements DOM bruts sans la séquence complète (focus → keydown → input → keyup)
- Wrapper les renders dans un **custom render** réutilisable pour injecter les providers (`NextIntlClientProvider`…) sans répéter le boilerplate

## À éviter
- Utiliser `react-test-renderer` : **déprécié** React 19, utiliser `@testing-library/react`

## Exemples
```typescript
// ✅ userEvent.setup avant render, findBy pour ce qui apparaît
const user = userEvent.setup()
render(<Form />)

await user.click(screen.getByRole('button', { name: /submit/i }))

expect(await screen.findByText(/success/i)).toBeInTheDocument()

// ❌ fireEvent : événement DOM brut, sans focus ni pointer event
fireEvent.click(button)
```
