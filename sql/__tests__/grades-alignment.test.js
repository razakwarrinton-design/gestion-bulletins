// Vérifie sql/grades-alignment.sql sur un vrai PostgreSQL : partant du schéma du dépôt (table grades
// sans année ni sous-notes), la migration doit permettre exactement les écritures que fait
// src/hooks/useGrades.js, sans perdre les notes existantes.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createDatabase, readScript } from './harness';

let db;

beforeAll(async () => {
  db = await createDatabase(['supabase-schema.sql']);
  await db.exec(`
    INSERT INTO classes (id, name) VALUES (1, '6ème A');
    INSERT INTO subjects (id, name, coefficient) VALUES (1, 'Maths', 2);
    INSERT INTO students (id, first_name, last_name, class_id) VALUES (1, 'Koffi', 'Mensah', 1);
    INSERT INTO grades (id, student_id, subject_id, trimester, value) VALUES ('ancienne', 1, 1, '1', 15);
  `);
  await db.exec(readScript('grades-alignment.sql'));
}, 120000);

afterAll(async () => { await db?.close(); });

// Même requête que l'upsert de useGrades.updateGrade
const upsert = (year, value, extra = {}) => db.query(
  `INSERT INTO grades (student_id, subject_id, trimester, academic_year, value, interro, devoir, composition, bonus)
   VALUES (1, 1, '2', $1, $2, $3, $4, $5, $6)
   ON CONFLICT (student_id, subject_id, trimester, academic_year)
   DO UPDATE SET value = EXCLUDED.value, bonus = EXCLUDED.bonus
   RETURNING id, value, bonus`,
  [year, value, extra.interro ?? null, extra.devoir ?? null, extra.composition ?? null, extra.bonus ?? null],
);

describe('sql/grades-alignment.sql', () => {
  it('rattache les notes existantes à 2024-2025 sans les perdre', async () => {
    const { rows } = await db.query(`SELECT academic_year, value FROM grades WHERE id = 'ancienne'`);
    expect(rows).toEqual([{ academic_year: '2024-2025', value: '15.00' }]);
  });

  it("génère l'identifiant quand le client n'en fournit pas", async () => {
    const { rows } = await upsert('2025-2026', 12);
    expect(rows[0].id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('met à jour la même note au lieu de la dupliquer, et enregistre le bonus', async () => {
    await upsert('2025-2026', 13, { bonus: 1.5 });
    const { rows } = await db.query(
      `SELECT value, bonus FROM grades WHERE academic_year = '2025-2026' AND trimester = '2'`);
    expect(rows).toEqual([{ value: '13.00', bonus: '1.50' }]);
  });

  it('autorise la même note sur deux années scolaires', async () => {
    await upsert('2026-2027', 9);
    const { rows } = await db.query(`SELECT count(*)::int AS n FROM grades WHERE trimester = '2'`);
    expect(rows[0].n).toBe(2);
  });

  it('autorise une note effacée (valeur vide)', async () => {
    const { rows } = await upsert('2025-2026', null);
    expect(rows[0].value).toBeNull();
  });

  it('refuse une note hors 0-20 et un bonus supérieur à 5', async () => {
    await expect(upsert('2027-2028', 25)).rejects.toThrow(/grades_value_range/);
    await expect(upsert('2027-2028', 10, { bonus: 6 })).rejects.toThrow(/grades_bonus_range/);
    await expect(upsert('2027-2028', 10, { devoir: -1 })).rejects.toThrow(/grades_subnotes_range/);
  });

  it('est ré-exécutable', async () => {
    await expect(db.exec(readScript('grades-alignment.sql'))).resolves.not.toThrow();
  });
});
