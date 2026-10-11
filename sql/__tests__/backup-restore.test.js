// Preuve de restauration : une base installée avec les scripts du dépôt et remplie de données est sauvegardée
// (copie complète du répertoire de données de PostgreSQL), restaurée dans une base NEUVE, puis comparée :
// mêmes lignes dans chaque table, mêmes règles d'accès, et le RLS fonctionne encore sur la base restaurée.
// Ce test prouve que la procédure « sauvegarde → restauration → contrôle » est correcte et que nos scripts
// produisent une base qui survit à ce cycle ; il ne remplace pas un exercice de restauration sur le vrai projet
// Supabase (voir README, « Sauvegardes »).
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { createDatabase, asUser } from './harness';
import { readAll, buildManifest, verifyManifest, TABLES } from '../../scripts/backup-data.mjs';

const SCRIPTS = [
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
  'client-errors.sql',
];

const ADMIN = '00000000-0000-0000-0000-00000000000a';
const PARENT = '00000000-0000-0000-0000-0000000000d1';
const OTHER_PARENT = '00000000-0000-0000-0000-0000000000d2';

let source;
let restored;

/** Nombre de lignes de chaque table du schéma public. */
async function countRows(db) {
  const { rows: tables } = await db.query(`SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`);
  const counts = {};
  for (const { tablename } of tables) {
    counts[tablename] = (await db.query(`SELECT count(*)::int AS n FROM public."${tablename}"`)).rows[0].n;
  }
  return counts;
}

beforeAll(async () => {
  source = await createDatabase(SCRIPTS);
  for (const [id, email] of [[ADMIN, 'admin@ecole.test'], [PARENT, 'p1@parents.test'], [OTHER_PARENT, 'p2@parents.test']]) {
    await source.exec(`INSERT INTO auth.users (id, email) VALUES ('${id}', '${email}')`);
  }
  await source.exec(`
    UPDATE user_profiles SET role = 'admin' WHERE id = '${ADMIN}';
    UPDATE user_profiles SET role = 'parent' WHERE id IN ('${PARENT}', '${OTHER_PARENT}');
    INSERT INTO classes (id, name) VALUES (1, '6ème A'), (2, '5ème B');
    INSERT INTO subjects (id, name, coefficient) VALUES (1, 'Maths', 2), (2, 'Français', 3);
    INSERT INTO students (id, first_name, last_name, class_id) VALUES (1, 'Koffi', 'Mensah', 1), (2, 'Ama', 'Dossou', 2);
    INSERT INTO parent_students (parent_id, student_id) VALUES ('${PARENT}', 1), ('${OTHER_PARENT}', 2);
    INSERT INTO grades (id, student_id, subject_id, trimester, academic_year, value)
      VALUES ('g1', 1, 1, '1', '2025-2026', 12), ('g2', 1, 2, '1', '2025-2026', 14), ('g3', 2, 1, '1', '2025-2026', 9);
  `);
  const dump = await source.dumpDataDir('none');
  restored = await PGlite.create({ loadDataDir: dump });
}, 180000);

afterAll(async () => {
  await source?.close();
  await restored?.close();
});

describe("restauration d'une sauvegarde complète dans une base neuve", () => {
  it('retrouve exactement les mêmes lignes dans chaque table', async () => {
    const before = await countRows(source);
    const after = await countRows(restored);
    expect(before.grades).toBe(3);
    expect(before.students).toBe(2);
    expect(after).toEqual(before);
  });

  it('retrouve les mêmes données (pas seulement les mêmes effectifs)', async () => {
    const sql = `SELECT id, student_id, subject_id, value FROM grades ORDER BY id`;
    expect((await restored.query(sql)).rows).toEqual((await source.query(sql)).rows);
  });

  it("retrouve les mêmes règles d'accès et les mêmes fonctions", async () => {
    const policies = `SELECT tablename, policyname, cmd FROM pg_policies WHERE schemaname = 'public' ORDER BY tablename, policyname`;
    const before = (await source.query(policies)).rows;
    expect(before.length).toBeGreaterThan(20);
    expect((await restored.query(policies)).rows).toEqual(before);

    const functions = `SELECT proname FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' ORDER BY proname`;
    expect((await restored.query(functions)).rows).toEqual((await source.query(functions)).rows);
  });

  it('le RLS fonctionne sur la base restaurée : chaque parent ne voit que son enfant', async () => {
    const seen = (userId) => asUser(restored, userId, async () =>
      (await restored.query(`SELECT student_id FROM grades ORDER BY id`)).rows.map((r) => r.student_id));
    expect(await seen(PARENT)).toEqual([1, 1]);
    expect(await seen(OTHER_PARENT)).toEqual([2]);
    expect(await seen(null)).toEqual([]);
  });

  it("la base restaurée accepte de nouvelles écritures et déclenche toujours le journal d'audit", async () => {
    await restored.exec(`INSERT INTO grades (id, student_id, subject_id, trimester, academic_year, value) VALUES ('g4', 2, 2, '1', '2025-2026', 11)`);
    const { rows } = await restored.query(`SELECT count(*)::int AS n FROM audit_logs WHERE table_name = 'grades' AND record_id = 'g4'`);
    expect(rows[0].n).toBe(1);
  });
});

describe('script de sauvegarde des données (scripts/backup-data.mjs)', () => {
  it('lit une table en entier même si le serveur renvoie des pages plus courtes que demandé', async () => {
    const data = Array.from({ length: 10 }, (_, i) => ({ id: i + 1 }));
    const fetchPage = async (offset) => ({ rows: data.slice(offset, offset + 3), total: data.length }); // plafond serveur : 3 lignes
    expect(await readAll(fetchPage, { pageSize: 1000 })).toEqual(data);
  });

  it("sans total connu, s'arrête à la première page incomplète", async () => {
    const data = Array.from({ length: 5 }, (_, i) => ({ id: i }));
    const fetchPage = async (offset, limit) => ({ rows: data.slice(offset, offset + limit), total: null });
    expect(await readAll(fetchPage, { pageSize: 2 })).toEqual(data);
    expect(await readAll(async () => ({ rows: [], total: 0 }))).toEqual([]);
  });

  it('refuse une lecture tronquée plutôt que de la livrer en silence', async () => {
    const fetchPage = async (offset) => ({ rows: offset === 0 ? [{ id: 1 }, { id: 2 }] : [], total: 5 });
    await expect(readAll(fetchPage)).rejects.toThrow(/2 lignes lues sur 5/);
  });

  it('le manifeste détecte un fichier manquant ou incomplet', () => {
    const manifest = buildManifest([
      { name: 'students', rows: [1, 2, 3] },
      { name: 'grades', rows: [1] },
      { name: 'client_errors', error: '404 table absente' },
    ], new Date('2026-10-11T10:00:00Z'));
    expect(manifest.tables).toEqual({ students: { rows: 3 }, grades: { rows: 1 }, client_errors: { error: '404 table absente' } });

    const files = { students: [1, 2, 3], grades: [] };
    expect(verifyManifest(manifest, (name) => files[name] ?? null)).toEqual(['grades : 0 lignes dans le fichier, 1 attendues']);
    expect(verifyManifest(manifest, () => null)).toEqual([
      'students : fichier manquant ou illisible', 'grades : fichier manquant ou illisible',
    ]);
    expect(verifyManifest(manifest, (name) => ({ students: [1, 2, 3], grades: [9] })[name])).toEqual([]);
  });

  it('chaque table sauvegardée existe dans le schéma installé par les scripts', async () => {
    const { rows } = await source.query(`SELECT tablename FROM pg_tables WHERE schemaname = 'public'`);
    const existing = new Set(rows.map((r) => r.tablename));
    const missing = TABLES.map((t) => t.name).filter((name) => !existing.has(name));
    expect(missing).toEqual([]);
  });
});
