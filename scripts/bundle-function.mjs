// Fabrique une version en UN SEUL fichier d'une fonction Edge, à coller dans l'éditeur du tableau de bord Supabase
// (qui ne résout pas les imports « ../_shared/… » du dépôt). Usage : npm run functions:bundle
// Le fichier du dépôt reste la référence ; le résultat est écrit dans docs/dashboard/<fonction>.ts.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const normalize = (text) => text.replace(/\r\n/g, '\n').replace(/^﻿/, '');

// fonction → fichiers partagés qu'elle importe (dans l'ordre d'insertion)
export const BUNDLES = {
  'notify-parents': ['notify-email.ts'],
};

export function bundleFunction(name) {
  const shared = BUNDLES[name];
  if (!shared) throw new Error(`Fonction inconnue : ${name}`);
  let main = normalize(readFileSync(path.join(root, 'supabase', 'functions', name, 'index.ts'), 'utf8'));
  const parts = [];
  for (const file of shared) {
    // l'import `from "../_shared/<fichier>"` (liste de noms entre accolades, éventuellement sur plusieurs lignes) est retiré
    const importRe = new RegExp(`import\\s*\\{[^}]*\\}\\s*from\\s*["']\\.\\./_shared/${file.replace('.', '\\.')}["'];?\\n?`, 'm');
    if (!importRe.test(main)) throw new Error(`${name} n'importe pas ${file}`);
    main = main.replace(importRe, '');
    const body = normalize(readFileSync(path.join(root, 'supabase', 'functions', '_shared', file), 'utf8'))
      .replace(/^export\s+/gm, ''); // un fichier unique n'a plus besoin d'exporter
    parts.push(`// ───── ${file} (copié de supabase/functions/_shared) ─────\n${body}`);
  }
  // les `import` restants (npm:…) doivent rester en tête du fichier
  const imports = [];
  main = main.replace(/^import .*;\n/gm, (line) => { imports.push(line.trimEnd()); return ''; });
  const header = `// Fichier GÉNÉRÉ par scripts/bundle-function.mjs à partir de supabase/functions/${name}/index.ts : ne pas le modifier ici.\n// À coller dans Supabase → Edge Functions → ${name} → Code.\n`;
  return `${header}${imports.join('\n')}\n\n${parts.join('\n\n')}\n\n${main.replace(/^\n+/, '')}`;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const outDir = path.join(root, 'docs', 'dashboard');
  mkdirSync(outDir, { recursive: true });
  for (const name of Object.keys(BUNDLES)) {
    writeFileSync(path.join(outDir, `${name}.ts`), bundleFunction(name));
    console.log(`Écrit : docs/dashboard/${name}.ts`);
  }
}
