import "@testing-library/jest-dom/vitest"

// jsdom n'implémente pas matchMedia : polyfill no-op requis par les libs qui détectent le color-scheme
// (ex: @c15t/react useColorScheme). Voir https://github.com/jsdom/jsdom/issues/3294.
if (typeof window !== "undefined" && typeof window.matchMedia === "undefined") {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
    }),
  })
}

// jsdom n'implémente pas IntersectionObserver, requis par le `whileInView` de Motion (MotionItem).
// Voir https://github.com/jsdom/jsdom/issues/2032.
if (typeof window !== "undefined" && typeof window.IntersectionObserver === "undefined") {
  Object.defineProperty(window, "IntersectionObserver", {
    writable: true,
    value: class {
      observe = () => undefined
      unobserve = () => undefined
      disconnect = () => undefined
    },
  })
}
