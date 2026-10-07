import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  // migrate-to-supabase.js : script de migration ponctuel, exécuté à la main dans la console
  globalIgnores(['dist', 'migrate-to-supabase.js']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      // Variables inutilisées = erreur. Les paramètres (props de composants) et les
      // `catch (e)` sans usage ne sont pas signalés : trop de bruit pour peu d'intérêt.
      'no-unused-vars': ['error', {
        varsIgnorePattern: '^[A-Z_]',
        args: 'none',
        caughtErrors: 'none',
      }],
      // Règles « React Compiler » très strictes : elles signalent des choix de conception
      // (charger des données dans un effet, appeler une fonction déclarée plus bas dans un
      // effet…) plutôt que des bugs. Gardées visibles en avertissement ; un vrai accès avant
      // déclaration pendant le rendu est de toute façon détecté par le test de rendu des écrans.
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/immutability': 'warn',
      'react-hooks/purity': 'warn',
      // Concerne uniquement le rechargement à chaud en développement (hook exporté avec son contexte)
      'react-refresh/only-export-components': 'warn',
    },
  },
  {
    // Fichiers de test : variables globales de Node (process, etc.)
    files: ['**/*.test.{js,jsx}'],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
  },
])
