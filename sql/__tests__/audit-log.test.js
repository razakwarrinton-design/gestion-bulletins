// Journal d'audit (sql/audit-log.sql) sur un vrai PostgreSQL, avec les scripts du dépôt dans l'ordre
// d'installation : qui a modifié quoi, qui peut le lire, et ce que personne ne peut falsifier.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createDatabase, asUser, readScript } from './harness';

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
];

const ADMIN = '00000000-0000-0000-0000-00000000000a';
const PROF = '00000000-0000-0000-0000-0000000000b1';
const SECRE = '00000000-0000-0000-0000-0000000000c1';
const PARENT = '00000000-0000-0000-0000-0000000000d1';

let db;
const rows = (userId, sql) => asUser(db, userId, async () => (await db.query(sql)).rows);
const run = (userId, sql) => asUser(db, userId, () => db.query(sql));
// Entrées du journal pour un enregistrement (lues avec les droits du propriétaire de la base)
const logsFor = async (table, recordId) =>
  (await db.query(
    `SELECT action, actor_id, actor_role, old_value, new_value FROM audit_logs
     WHERE table_name = $1 AND record_id = $2 ORDER BY id`, [table, String(recordId)])).rows;

beforeAll(async () => {
  db = await createDatabase(SCRIPTS);
  for (const [id, email] of [[ADMIN, 'admin@ecole.test'], [PROF, 'prof@ecole.test'], [SECRE, 'secre@ecole.test'], [PARENT, 'p@parents.test']]) {
    await db.exec(`INSERT INTO auth.users (id, email) VALUES ('${id}', '${email}')`);
  }
  await db.exec(`
    UPDATE user_profiles SET role = 'admin' WHERE id = '${ADMIN}';
    UPDATE user_profiles SET role = 'professeur' WHERE id = '${PROF}';
    UPDATE user_profiles SET role = 'secretaire' WHERE id = '${SECRE}';
    UPDATE user_profiles SET role = 'parent' WHERE id = '${PARENT}';
    INSERT INTO classes (id, name) VALUES (1, '6ème A');
    INSERT INTO subjects (id, name, coefficient) VALUES (1, 'Maths', 2);
    INSERT INTO students (id, first_name, last_name, class_id, photo_url) VALUES (1, 'Koffi', 'Mensah', 1, 'data:image/png;base64,AAAA');
    INSERT INTO parent_students (parent_id, student_id) VALUES ('${PARENT}', 1);
  `);
}, 120000);

afterAll(async () => { await db?.close(); });

describe('contenu du journal', () => {
  it('une note saisie par un professeur est journalisée avec son auteur', async () => {
    await run(PROF, `INSERT INTO grades (id, student_id, subject_id, trimester, academic_year, value)
                     VALUES ('g1', 1, 1, '1', '2025-2026', 12)`);
    const [entry] = await logsFor('grades', 'g1');
    expect(entry).toMatchObject({ action: 'INSERT', actor_id: PROF, actor_role: 'professeur', old_value: null });
    expect(entry.new_value).toMatchObject({ student_id: 1, value: 12 });
  });

  it('une modification ne conserve que les colonnes changées (ancienne et nouvelle valeur)', async () => {
    await run(PROF, `UPDATE grades SET value = 15, appreciation = 'Bien' WHERE id = 'g1'`);
    const entries = await logsFor('grades', 'g1');
    const update = entries.at(-1);
    expect(update.action).toBe('UPDATE');
    expect(update.old_value).toEqual({ value: 12, appreciation: null });
    expect(update.new_value).toEqual({ value: 15, appreciation: 'Bien' });
  });

  it('une écriture identique ne crée aucune entrée', async () => {
    const before = (await logsFor('grades', 'g1')).length;
    await run(PROF, `UPDATE grades SET value = 15 WHERE id = 'g1'`);
    expect((await logsFor('grades', 'g1')).length).toBe(before);
  });

  it('une suppression garde ce qui a été supprimé', async () => {
    await run(ADMIN, `DELETE FROM grades WHERE id = 'g1'`);
    const entry = (await logsFor('grades', 'g1')).at(-1);
    expect(entry).toMatchObject({ action: 'DELETE', actor_id: ADMIN, actor_role: 'admin', new_value: null });
    expect(entry.old_value).toMatchObject({ value: 15, appreciation: 'Bien' });
  });

  it('un changement de rôle est journalisé', async () => {
    await run(ADMIN, `UPDATE user_profiles SET role = 'professeur' WHERE id = '${SECRE}'`);
    const entry = (await logsFor('user_profiles', SECRE)).at(-1);
    expect(entry.old_value).toEqual({ role: 'secretaire' });
    expect(entry.new_value).toEqual({ role: 'professeur' });
    expect(entry.actor_id).toBe(ADMIN);
    await db.exec(`UPDATE user_profiles SET role = 'secretaire' WHERE id = '${SECRE}'`);
  });

  it('une modification sans utilisateur (éditeur SQL, webhook de paiement) est attribuée au « system »', async () => {
    await db.exec(`INSERT INTO payments (id, student_id, amount_paid, status, provider)
                   VALUES ('00000000-0000-0000-0000-0000000000f1', 1, 5000, 'pending', 'fedapay')`);
    await db.exec(`UPDATE payments SET status = 'completed' WHERE id = '00000000-0000-0000-0000-0000000000f1'`);
    const entry = (await logsFor('payments', '00000000-0000-0000-0000-0000000000f1')).at(-1);
    expect(entry).toMatchObject({ actor_id: null, actor_role: 'system' });
    expect(entry.old_value).toEqual({ status: 'pending' });
    expect(entry.new_value).toEqual({ status: 'completed' });
  });

  it('ne copie pas les données volumineuses (photo, contenu des réglages)', async () => {
    await run(ADMIN, `UPDATE students SET first_name = 'Kofi', photo_url = 'data:image/png;base64,BBBB' WHERE id = 1`);
    const student = (await logsFor('students', 1)).at(-1);
    expect(student.new_value).toEqual({ first_name: 'Kofi', photo_url: '(modifié)' });

    await run(ADMIN, `INSERT INTO app_data (key, value) VALUES ('schoolLogo', '"data:image/png;base64,CCCC"')`);
    await run(ADMIN, `UPDATE app_data SET value = '"data:image/png;base64,DDDD"' WHERE key = 'schoolLogo'`);
    const settings = await logsFor('app_data', 'schoolLogo');
    expect(JSON.stringify(settings)).not.toContain('base64');
    expect(settings.map((e) => e.action)).toEqual(['INSERT', 'UPDATE']);
  });

  it('ne copie jamais les données personnelles de contact : ni à la création, ni à la suppression', async () => {
    await db.exec(`INSERT INTO students (id, first_name, last_name, class_id, birth_date, emergency_name, emergency_phone, emergency_relation)
                   VALUES (60, 'Yao', 'Agbo', 1, '2013-05-06', 'Mme Agbo', '+22890112233', 'mère')`);
    await db.exec("UPDATE students SET emergency_phone = '+22890998877' WHERE id = 60");
    await db.exec('DELETE FROM students WHERE id = 60');
    const entries = await logsFor('students', 60);
    const text = JSON.stringify(entries);
    expect(text).not.toMatch(/22890112233|22890998877|2013-05-06|Mme Agbo|mère/);
    // le nom reste, pour qu'une suppression soit compréhensible
    expect(entries.at(-1).old_value).toMatchObject({ first_name: 'Yao', last_name: 'Agbo' });
    // et le changement du téléphone est noté sans sa valeur
    expect(entries.find((e) => e.action === 'UPDATE').new_value).toEqual({ emergency_phone: '(modifié)' });
  });

  it("ne copie pas l'e-mail d'un compte, ni le téléphone du payeur, ni les notes d'absence", async () => {
    const [created] = await logsFor('user_profiles', PARENT);
    expect(JSON.stringify(created)).not.toContain('parents.test');
    await db.exec(`INSERT INTO payments (id, student_id, amount_paid, status, provider, payer_phone)
                   VALUES ('00000000-0000-0000-0000-0000000000f2', 1, 100, 'pending', 'fedapay', '+22890000000')`);
    expect(JSON.stringify(await logsFor('payments', '00000000-0000-0000-0000-0000000000f2'))).not.toContain('22890000000');
    await db.exec(`INSERT INTO absences (id, student_id, notes) VALUES ('00000000-0000-0000-0000-0000000000a1', 1, 'rendez-vous médical')`);
    expect(JSON.stringify(await logsFor('absences', '00000000-0000-0000-0000-0000000000a1'))).not.toContain('médical');
  });

  it('la liaison parent-élève est identifiable', async () => {
    const entry = (await logsFor('parent_students', `${PARENT}:1`))[0];
    expect(entry.action).toBe('INSERT');
  });

  it('supprimer l\'élève n\'efface pas son historique', async () => {
    await db.exec(`INSERT INTO students (id, first_name, last_name, class_id) VALUES (50, 'Ephemere', 'Test', 1)`);
    await db.exec('DELETE FROM students WHERE id = 50');
    const entries = await logsFor('students', 50);
    expect(entries.map((e) => e.action)).toEqual(['INSERT', 'DELETE']);
  });
});

describe('accès au journal', () => {
  it('seul l\'administrateur le lit', async () => {
    expect((await rows(ADMIN, 'SELECT id FROM audit_logs')).length).toBeGreaterThan(0);
    for (const who of [PROF, SECRE, PARENT, null]) {
      expect(await rows(who, 'SELECT id FROM audit_logs')).toEqual([]);
    }
  });

  it('personne ne peut y écrire, le modifier ou le vider par l\'API, administrateur compris', async () => {
    for (const sql of [
      `INSERT INTO audit_logs (action, table_name) VALUES ('INSERT', 'faux')`,
      `UPDATE audit_logs SET actor_role = 'admin'`,
      `DELETE FROM audit_logs`,
      `TRUNCATE audit_logs`,
    ]) {
      await expect(run(ADMIN, sql)).rejects.toThrow();
      await expect(run(PROF, sql)).rejects.toThrow();
    }
    expect((await rows(ADMIN, 'SELECT id FROM audit_logs')).length).toBeGreaterThan(0);
  });

  it('un utilisateur ne peut pas journaliser à la place d\'un autre (l\'auteur vient de la session)', async () => {
    await run(PROF, `INSERT INTO grades (id, student_id, subject_id, trimester, academic_year, value)
                     VALUES ('g2', 1, 1, '2', '2025-2026', 10)`);
    expect((await logsFor('grades', 'g2'))[0].actor_id).toBe(PROF);
  });
});

describe('conservation', () => {
  it('la purge est réservée aux administrateurs', async () => {
    await expect(rows(PROF, 'SELECT purge_audit_logs(365)')).rejects.toThrow(/administrateurs/);
    await expect(rows(null, 'SELECT purge_audit_logs(365)')).rejects.toThrow();
  });

  it('la purge refuse de supprimer moins d\'un an d\'historique', async () => {
    await expect(rows(ADMIN, 'SELECT purge_audit_logs(30)')).rejects.toThrow(/365/);
  });

  it('la purge ne supprime que les entrées de plus d\'un an', async () => {
    await db.exec(`INSERT INTO audit_logs (created_at, action, table_name, record_id)
                   VALUES (NOW() - INTERVAL '400 days', 'UPDATE', 'ancienne', 'x')`);
    const [{ purge_audit_logs: deleted }] = await rows(ADMIN, 'SELECT purge_audit_logs(365)');
    expect(Number(deleted)).toBe(1);
    expect(await logsFor('ancienne', 'x')).toEqual([]);
    expect((await rows(ADMIN, 'SELECT id FROM audit_logs')).length).toBeGreaterThan(0);
  });
});

describe('script', () => {
  it('est ré-exécutable sans doublon de déclencheur', async () => {
    await db.exec(readScript('audit-log.sql'));
    await db.exec(`INSERT INTO classes (id, name) VALUES (9, 'Test')`);
    expect((await logsFor('classes', 9)).length).toBe(1);
  });
});
