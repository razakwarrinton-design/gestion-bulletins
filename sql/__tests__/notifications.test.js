// Notifications aux parents (sql/notifications.sql) sur un vrai PostgreSQL : qui peut en créer, qui les lit, ce qu'un
// compte peut modifier, et l'absence de doublon.
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
  'notifications.sql',
];

const ADMIN = '00000000-0000-0000-0000-00000000000a';
const PROF = '00000000-0000-0000-0000-0000000000b1';
const SECRETAIRE = '00000000-0000-0000-0000-0000000000c1';
const PARENT_A = '00000000-0000-0000-0000-0000000000d1';
const PARENT_B = '00000000-0000-0000-0000-0000000000d2';
const PARENT_OTHER_CLASS = '00000000-0000-0000-0000-0000000000d3';

let db;
const run = (userId, sql, params) => asUser(db, userId, () => db.query(sql, params));
const notify = async (userId, classId = 1, trimester = '1') =>
  (await run(userId, `SELECT notify_class_parents($1, $2) AS r`, [classId, trimester])).rows[0].r;

beforeAll(async () => {
  db = await createDatabase(SCRIPTS);
  for (const [id, email] of [[ADMIN, 'admin@ecole.test'], [PROF, 'prof@ecole.test'], [SECRETAIRE, 'sec@ecole.test'],
    [PARENT_A, 'a@parents.test'], [PARENT_B, 'b@parents.test'], [PARENT_OTHER_CLASS, 'c@parents.test']]) {
    await db.exec(`INSERT INTO auth.users (id, email) VALUES ('${id}', '${email}')`);
  }
  await db.exec(`
    UPDATE user_profiles SET role = 'admin' WHERE id = '${ADMIN}';
    UPDATE user_profiles SET role = 'professeur' WHERE id = '${PROF}';
    UPDATE user_profiles SET role = 'secretaire' WHERE id = '${SECRETAIRE}';
    UPDATE user_profiles SET role = 'parent' WHERE id IN ('${PARENT_A}', '${PARENT_B}', '${PARENT_OTHER_CLASS}');
    INSERT INTO classes (id, name) VALUES (1, '6ème A'), (2, '5ème B');
    INSERT INTO students (id, first_name, last_name, class_id) VALUES
      (1, 'Koffi', 'Mensah', 1), (2, 'Ama', 'Dossou', 1), (3, 'Yao', 'Agbo', 1), (4, 'Esi', 'Zinsou', 2);
    -- Koffi a deux parents ; Ama un seul ; Yao aucun compte parent ; Esi est dans l'autre classe
    INSERT INTO parent_students (parent_id, student_id) VALUES
      ('${PARENT_A}', 1), ('${PARENT_B}', 1), ('${PARENT_A}', 2), ('${PARENT_OTHER_CLASS}', 4);
  `);
}, 120000);

afterAll(async () => { await db?.close(); });

describe('création', () => {
  it('un professeur prévient les parents liés aux élèves de la classe, et eux seuls', async () => {
    const result = await notify(PROF);
    expect(result).toEqual({ notified: 3, already: 0, students: 3, studentsWithoutParent: 1 });
    const { rows } = await db.query(`SELECT user_id, student_id, title, body, link_view, read_at, emailed_at FROM notifications ORDER BY user_id, student_id`);
    expect(rows.map((r) => `${r.user_id.slice(-2)}:${r.student_id}`)).toEqual(['d1:1', 'd1:2', 'd2:1']);
    expect(rows[0]).toMatchObject({
      title: 'Notes du 1er trimestre disponibles',
      body: 'Les notes du 1er trimestre de Koffi sont disponibles.',
      link_view: 'parents', read_at: null, emailed_at: null,
    });
  });

  it('ne contient ni note ni moyenne', async () => {
    const { rows } = await db.query(`SELECT title || ' ' || body AS text FROM notifications`);
    for (const { text } of rows) expect(text).not.toMatch(/\d+([.,]\d+)?\s*\/\s*20|moyenne/i);
  });

  it('ne prévient pas deux fois le même parent pour le même élève et le même trimestre (24 h)', async () => {
    const again = await notify(ADMIN);
    expect(again).toMatchObject({ notified: 0, already: 3 });
    expect((await db.query(`SELECT count(*)::int AS n FROM notifications`)).rows[0].n).toBe(3);
  });

  it('un autre trimestre, ou une notification plus ancienne que 24 h, prévient de nouveau', async () => {
    expect(await notify(ADMIN, 1, '2')).toMatchObject({ notified: 3, already: 0 });
    await db.exec(`UPDATE notifications SET created_at = NOW() - INTERVAL '25 hours' WHERE trimester = '1'`);
    expect(await notify(ADMIN, 1, '1')).toMatchObject({ notified: 3, already: 0 });
  });

  it('refuse un secrétaire, un parent, un visiteur', async () => {
    await expect(notify(SECRETAIRE)).rejects.toThrow(/Réservé aux administrateurs et aux professeurs/);
    await expect(notify(PARENT_A)).rejects.toThrow(/Réservé/);
    await expect(run(null, `SELECT notify_class_parents(1, '1')`)).rejects.toThrow();
  });

  it('refuse un trimestre ou une classe invalide', async () => {
    await expect(notify(ADMIN, 1, '4')).rejects.toThrow(/Trimestre invalide/);
    await expect(notify(ADMIN, 99, '1')).rejects.toThrow(/Classe introuvable/);
  });

  it('personne ne crée de notification directement par l\'API', async () => {
    await expect(run(ADMIN, `INSERT INTO notifications (user_id, title, body) VALUES ('${PARENT_A}', 't', 'b')`)).rejects.toThrow(/permission denied/);
    await expect(run(PARENT_A, `INSERT INTO notifications (user_id, title, body) VALUES ('${PARENT_A}', 't', 'b')`)).rejects.toThrow(/permission denied/);
  });
});

describe('lecture et lu / non lu', () => {
  it('chaque compte ne lit que ses propres notifications', async () => {
    const a = (await run(PARENT_A, `SELECT user_id FROM notifications`)).rows;
    expect(a.length).toBeGreaterThan(0);
    expect(new Set(a.map((r) => r.user_id))).toEqual(new Set([PARENT_A]));
    expect((await run(PARENT_OTHER_CLASS, `SELECT id FROM notifications`)).rows).toEqual([]);
    // le personnel n'est pas destinataire : il ne voit pas non plus les messages des parents
    expect((await run(ADMIN, `SELECT id FROM notifications`)).rows).toEqual([]);
    await expect(run(null, `SELECT id FROM notifications`)).rejects.toThrow(/permission denied/); // visiteur sans compte
  });

  it('un parent marque ses notifications comme lues', async () => {
    const { rows } = await run(PARENT_A, `UPDATE notifications SET read_at = NOW() RETURNING id`);
    expect(rows.length).toBeGreaterThan(0);
    expect((await run(PARENT_A, `SELECT id FROM notifications WHERE read_at IS NULL`)).rows).toEqual([]);
  });

  it('un parent ne marque pas les notifications d\'un autre', async () => {
    const { rows } = await run(PARENT_OTHER_CLASS, `UPDATE notifications SET read_at = NOW() RETURNING id`);
    expect(rows).toEqual([]);
    expect((await db.query(`SELECT count(*)::int AS n FROM notifications WHERE user_id = '${PARENT_B}' AND read_at IS NULL`)).rows[0].n).toBeGreaterThan(0);
  });

  it('un compte ne modifie que read_at : ni le texte, ni le destinataire, ni l\'état d\'envoi', async () => {
    for (const column of ["body = 'x'", `user_id = '${PARENT_B}'`, 'emailed_at = NOW()', 'title = \'x\'']) {
      await expect(run(PARENT_B, `UPDATE notifications SET ${column}`)).rejects.toThrow(/permission denied/);
    }
  });

  it('personne ne supprime de notification par l\'API', async () => {
    await expect(run(PARENT_B, `DELETE FROM notifications`)).rejects.toThrow(/permission denied/);
    await expect(run(ADMIN, `DELETE FROM notifications`)).rejects.toThrow(/permission denied/);
  });
});

describe('conservation', () => {
  it('la purge est réservée aux administrateurs', async () => {
    await db.exec(`UPDATE notifications SET created_at = NOW() - INTERVAL '100 days' WHERE id IN (SELECT id FROM notifications ORDER BY id LIMIT 2)`);
    await expect(run(PROF, `SELECT purge_notifications(90)`)).rejects.toThrow(/Réservé aux administrateurs/);
    const { rows } = await run(ADMIN, `SELECT purge_notifications(90) AS n`);
    expect(Number(rows[0].n)).toBe(2);
  });

  it('supprimer un élève supprime ses notifications', async () => {
    await db.exec(`DELETE FROM students WHERE id = 2`);
    expect((await db.query(`SELECT count(*)::int AS n FROM notifications WHERE student_id = 2`)).rows[0].n).toBe(0);
  });
});

describe('ré-exécution', () => {
  it('le script peut être relancé sans erreur ni doublon de règle', async () => {
    await db.exec(readScript('notifications.sql'));
    await db.exec(readScript('notifications.sql'));
    const { rows } = await db.query(`SELECT count(*)::int AS n FROM pg_policies WHERE tablename = 'notifications'`);
    expect(rows[0].n).toBe(2);
  });
});
