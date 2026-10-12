// Tests de bout en bout (navigateur réel). Hermétiques : l'application est construite avec une adresse Supabase
// factice et toutes les requêtes vers Supabase sont simulées (e2e/support/mockSupabase.js) ; aucun compte ni aucune
// clé réels ne sont utilisés.
//
//   npm run e2e                       (Chromium : `npx playwright install chromium` une fois)
//   PW_CHANNEL=msedge npm run e2e     (utilise Microsoft Edge déjà installé, sans téléchargement)
import { defineConfig } from '@playwright/test';

const PORT = 4173;

export default defineConfig({
  testDir: 'e2e',
  timeout: 90_000,
  expect: { timeout: 15_000 },
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    channel: process.env.PW_CHANNEL || undefined,
  },
  webServer: {
    command: `npm run build && npm run preview -- --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
    env: {
      VITE_SUPABASE_URL: 'https://e2e.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'e2e-anon-key',
    },
  },
});
