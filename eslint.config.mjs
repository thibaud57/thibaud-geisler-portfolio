import { defineConfig, globalIgnores } from "eslint/config"
import nextVitals from "eslint-config-next/core-web-vitals"
import nextTs from "eslint-config-next/typescript"
import prettier from "eslint-config-prettier/flat"
import tseslint from "typescript-eslint"

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["**/*.ts", "**/*.tsx"],
    extends: [tseslint.configs.strictTypeChecked, tseslint.configs.stylisticTypeChecked],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // Un nombre interpole dans un template n'a qu'un seul rendu possible, contrairement
      // a un objet ("[object Object]") ou a un nullish ("undefined") qui restent interdits.
      // Sans ca, chaque `${size}px` d'une valeur CSS demanderait un String() autour.
      "@typescript-eslint/restrict-template-expressions": ["error", { allowNumber: true }],
    },
  },
  {
    // Un mock se lit par reference (`expect(transporter.sendMail)`, `vi.mocked(transporter.sendMail)`),
    // jamais appele : il n'y a aucun `this` a perdre. `vi.mocked()` ne suffit pas a satisfaire la regle,
    // la lecture de `transporter.sendMail` est deja la reference non liee. La regle reste armee sur src/.
    files: ["**/*.test.ts", "**/*.test.tsx", "vitest.setup.ts"],
    rules: {
      "@typescript-eslint/unbound-method": "off",
      // Un double de test remplace une API absente de jsdom : ses methodes sont vides par nature
      "@typescript-eslint/no-empty-function": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Historique local VSCode (deja gitignore, jamais du code source)
    ".history/**",
  ]),
  // En dernier : il desactive des regles de style, tout bloc place apres les retablirait
  prettier,
])

export default eslintConfig
