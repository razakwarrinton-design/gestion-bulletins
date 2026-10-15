// Ce que fait la fonction Edge create-parent-account côté base : créer l'utilisateur Auth (le déclencheur crée le profil
// « en_attente »), puis, avec la clé de service (aucun utilisateur connecté dans la base), passer son rôle à « parent »
// et le lier à un élève. Un échec ici laisse un compte « en_attente » orphelin (cas observé en production).
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createDatabase } from './harness';

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
  'notifications.sql',
  'announcements.sql',
];

const PARENT = '00000000-0000-0000-0000-0000000000e1';
let db;

beforeAll(async () => {
  db = await createDatabase(SCRIPTS);
  await db.exec(`
    INSERT INTO classes (id, name) VALUES (1, 'TA4');
    INSERT INTO students (id, first_name, last_name, class_id) VALUES (1, 'Kouassi', 'Diallo', 1);
    INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES ('${PARENT}', 'parent@example.com', '{"first_name":"Razak","last_name":"Diallo"}');
  `);
}, 120000);

afterAll(async () => { await db?.close(); });

describe('création d\'un compte parent par la clé de service', () => {
  it('le déclencheur crée un profil « en_attente » à partir des métadonnées', async () => {
    const { rows } = await db.query(`SELECT role, first_name, last_name FROM user_profiles WHERE id = '${PARENT}'`);
    expect(rows).toEqual([{ role: 'en_attente', first_name: 'Razak', last_name: 'Diallo' }]);
  });

  it('le rôle passe à « parent » (mise à jour sans utilisateur connecté, comme la clé de service)', async () => {
    await db.exec(`UPDATE user_profiles SET role = 'parent', first_name = 'Razak', last_name = 'Diallo' WHERE id = '${PARENT}'`);
    const { rows } = await db.query(`SELECT role FROM user_profiles WHERE id = '${PARENT}'`);
    expect(rows).toEqual([{ role: 'parent' }]);
  });

  it('le lien avec l\'élève s\'enregistre', async () => {
    await db.exec(`INSERT INTO parent_students (parent_id, student_id) VALUES ('${PARENT}', 1)`);
    const { rows } = await db.query(`SELECT count(*)::int AS n FROM parent_students WHERE parent_id = '${PARENT}'`);
    expect(rows[0].n).toBe(1);
  });
});
