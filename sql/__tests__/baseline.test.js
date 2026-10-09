// La migration de référence de supabase/migrations est générée à partir des scripts de sql/ : ce test
// échoue si on a modifié un script sans régénérer le fichier (npm run sql:baseline).
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { buildBaseline, BASELINE_PATH, INSTALL_SCRIPTS } from '../../scripts/build-baseline.mjs';
import { createDatabase } from './harness';

const onDisk = () => readFileSync(BASELINE_PATH, 'utf8').replace(/\r\n/g, '\n');

describe('supabase/migrations : migration de référence', () => {
  it('est à jour par rapport aux scripts de sql/ (sinon : npm run sql:baseline)', () => {
    expect(onDisk()).toBe(buildBaseline());
  });

  it("contient chaque script d'installation, et jamais la remise à zéro destructive", () => {
    const text = onDisk();
    for (const name of INSTALL_SCRIPTS) expect(text).toContain(`>>>>>>>>>> ${name} <<<<<<<<<<`);
    expect(text).not.toContain('reset-legacy-schema');
    expect(text).not.toMatch(/DROP TABLE IF EXISTS\s+public\.messages/);
  });

  it("s'exécute d'un seul bloc sur une base vide", async () => {
    const db = await createDatabase([]);
    try {
      await expect(db.exec(onDisk())).resolves.not.toThrow();
      const { rows } = await db.query(`SELECT count(*)::int AS n FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('grades', 'appreciations', 'audit_logs')`);
      expect(rows[0].n).toBe(3);
    } finally {
      await db.close();
    }
  }, 120000);
});
