import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        // Bibliothèques qui changent rarement, séparées du code de l'application : le navigateur les garde en cache
        // d'un déploiement à l'autre (seul le code de l'application est retéléchargé) et les télécharge en parallèle.
        manualChunks: {
          react: ['react', 'react-dom'],
          supabase: ['@supabase/supabase-js'],
        },
      },
    },
  },
  test: {
    // Les tests de bout en bout (Playwright, dossier e2e/) ont leur propre commande : npm run e2e
    exclude: ['**/node_modules/**', '**/dist/**', 'e2e/**'],
    // Le premier test d'un fichier paie le chargement de tout l'écran (jsdom, composants, PostgreSQL en
    // WebAssembly pour les tests SQL) : sur une machine chargée il dépassait les 5 s par défaut et la suite
    // échouait au hasard. Quatre fichiers à la fois évitent aussi de saturer la machine au démarrage.
    testTimeout: 30000,
    hookTimeout: 120000,
    maxWorkers: 4,
  },
});
