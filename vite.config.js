import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    // Le premier test d'un fichier paie le chargement de tout l'écran (jsdom, composants, PostgreSQL en
    // WebAssembly pour les tests SQL) : sur une machine chargée il dépassait les 5 s par défaut et la suite
    // échouait au hasard. Quatre fichiers à la fois évitent aussi de saturer la machine au démarrage.
    testTimeout: 30000,
    hookTimeout: 120000,
    maxWorkers: 4,
  },
});
