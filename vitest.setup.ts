import '@testing-library/jest-dom/vitest'

// jsdom n'implémente pas matchMedia : polyfill no-op requis par les libs qui détectent le color-scheme
// (ex: @c15t/react useColorScheme). Voir https://github.com/jsdom/jsdom/issues/3294.
if (typeof window !== 'undefined' && typeof window.matchMedia === 'undefined') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  })
}
