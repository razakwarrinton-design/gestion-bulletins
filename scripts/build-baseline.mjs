// Génère supabase/migrations/20261009000000_baseline.sql à partir des scripts d'installation de sql/,
// dans l'ordre du README. `npm run sql:baseline` l'écrit ; sql/__tests__/baseline.test.js échoue si le
// fichier n'est plus à jour : il y a ainsi une seule source de vérité (les scripts de sql/).
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// Même ordre que sql/__tests__/rls.test.js ; reset-legacy-schema.sql est volontairement exclu (destructif).
export const INSTALL_SCRIPTS = [
  'supabase-schema.sql',
  'grades-alignment.sql',
  'supabase-security-rls.sql',
  'CHAT_TABLES.sql',
  'students-profile.sql',
  'payments-online.sql',
  'bulletin-access.sql',
  'security-hardening.sql',
  'appreciations-activities.sql',
  'audit-log.sql',
];

export const BASELINE_PATH = path.join(root, 'supabase', 'migrations', '20261009000000_baseline.sql');

const HEADER = `-- Migration de référence : état de la base obtenu en exécutant, dans l'ordre, les scripts de sql/.
-- Fichier GÉNÉRÉ par scripts/build-baseline.mjs (npm run sql:baseline) : ne pas le modifier à la main,
-- modifier les scripts de sql/ puis régénérer. Les évolutions futures vont dans de NOUVELLES migrations.
`;

const normalize = (text) => text.replace(/\r\n/g, '\n').replace(/^﻿/, '');

export function buildBaseline() {
  const parts = INSTALL_SCRIPTS.map(
    (name) => `-- >>>>>>>>>> ${name} <<<<<<<<<<\n${normalize(readFileSync(path.join(root, 'sql', name), 'utf8'))}`,
  );
  return `${HEADER}\n${parts.join('\n\n')}`;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  mkdirSync(path.dirname(BASELINE_PATH), { recursive: true });
  writeFileSync(BASELINE_PATH, buildBaseline());
  console.log(`Écrit : ${path.relative(root, BASELINE_PATH)}`);
}
