// La version « un seul fichier » de notify-parents (à coller dans le tableau de bord Supabase) doit rester à jour et valide.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { transformSync } from 'esbuild';
import { bundleFunction } from './bundle-function.mjs';

const generated = () => readFileSync('docs/dashboard/notify-parents.ts', 'utf8').replace(/\r\n/g, '\n');

describe('bundle de notify-parents', () => {
  it('le fichier du dépôt est à jour (sinon : npm run functions:bundle)', () => {
    expect(generated()).toBe(bundleFunction('notify-parents'));
  });

  it("n'a plus d'import relatif ni d'export, et garde l'import npm en tête", () => {
    const text = bundleFunction('notify-parents');
    expect(text).not.toMatch(/\.\.\/_shared/);
    expect(text).not.toMatch(/^export /m);
    expect(text.split('\n').filter((l) => l.startsWith('import '))).toEqual(['import { createClient } from "npm:@supabase/supabase-js@2";']);
  });

  it('est du TypeScript valide et utilise toutes les fonctions partagées sans les redéfinir', () => {
    const text = bundleFunction('notify-parents');
    expect(() => transformSync(text, { loader: 'ts' })).not.toThrow();
    for (const name of ['buildParentEmail', 'cleanText', 'groupByParent', 'isEmail', 'NOTIFY_ALLOWED_ROLES', 'parseBrevoResponse', 'parseClassId', 'trimesterLabel']) {
      expect(text.match(new RegExp(`(function|const) ${name}\\b`, 'g'))).toHaveLength(1);
    }
  });
});
