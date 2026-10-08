// Appréciations et journal d'activité en tables (sql/appreciations-activities.sql) sur un vrai
// PostgreSQL : reprise des listes JSON de app_data, droits d'accès et auteur imposé par la base.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createDatabase, asUser, readScript } from './harness';

const BEFORE = [
  'supabase-schema.sql',
  'grades-alignment.sql',
  'supabase-security-rls.sql',
  'CHAT_TABLES.sql',
  'students-profile.sql',
  'payments-online.sql',
  'bulletin-access.sql',
  'security-hardening.sql',
];

const ADMIN = '00000000-0000-0000-0000-00000000000a';
const PROF = '00000000-0000-0000-0000-0000000000b1';
const PROF2 = '00000000-0000-0000-0000-0000000000b2';
const SECRE = '00000000-0000-0000-0000-0000000000c1';
const PARENT = '00000000-0000-0000-0000-0000000000d1';
const NEWCOMER = '00000000-0000-0000-0000-0000000000e1';

// Anciennes listes : JSON sérialisé en texte dans une valeur jsonb (voir useSupabaseState)
const stored = (list) => JSON.stringify(JSON.stringify(list)).replace(/'/g, "''");
const legacyAppreciations = [
  { id: 1, studentId: '1', subjectId: '1', trimester: '1', teacherAppreciation: 'Bon travail', councilAppreciation: '', type: 'teacher', createdAt: '2025-11-02T09:00:00.000Z' },
  { id: 2, studentId: '1', subjectId: '', trimester: '2', teacherAppreciation: '', councilAppreciation: 'Félicitations du conseil', type: 'council', createdAt: '2026-02-10T09:00:00.000Z' },
  { id: 3, studentId: '999', subjectId: '1', trimester: '1', teacherAppreciation: 'Élève disparu', councilAppreciation: '', type: 'teacher', createdAt: '2025-11-02T09:00:00.000Z' },
  { id: 4, studentId: '2', subjectId: '', trimester: '1', teacherAppreciation: 'sans matière', councilAppreciation: '', type: 'teacher', createdAt: '2025-11-02T09:00:00.000Z' },
  { id: 5, studentId: '2', subjectId: '', trimester: '3', teacherAppreciation: '', councilAppreciation: '   ', type: 'council', createdAt: 'pas une date' },
];
const legacyActivities = [
  { id: 'b', timestamp: '2026-03-02T10:00:00.000Z', user: 'Awa Kossi', userRole: 'admin', action: 'Ajout de classe', details: 'Classe "6A" créée' },
  { id: 'a', timestamp: '2026-03-01T08:00:00.000Z', user: 'Awa Kossi', userRole: 'admin', action: 'Connexion', details: 'Connexion réussie' },
];

let db;
const rows = (userId, sql) => asUser(db, userId, async () => (await db.query(sql)).rows);
const run = (userId, sql) => asUser(db, userId, () => db.query(sql));

beforeAll(async () => {
  db = await createDatabase(BEFORE);
  for (const [id, email] of [[ADMIN, 'admin@ecole.test'], [PROF, 'prof@ecole.test'], [PROF2, 'prof2@ecole.test'],
    [SECRE, 'secre@ecole.test'], [PARENT, 'p@parents.test'], [NEWCOMER, 'new@internet.test']]) {
    await db.exec(`INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES ('${id}', '${email}', '{"first_name":"Prénom","last_name":"${email.split('@')[0]}"}')`);
  }
  await db.exec(`
    UPDATE user_profiles SET role = 'admin' WHERE id = '${ADMIN}';
    UPDATE user_profiles SET role = 'professeur' WHERE id IN ('${PROF}', '${PROF2}');
    UPDATE user_profiles SET role = 'secretaire' WHERE id = '${SECRE}';
    UPDATE user_profiles SET role = 'parent' WHERE id = '${PARENT}';
    INSERT INTO classes (id, name) VALUES (1, '6ème A');
    INSERT INTO subjects (id, name, coefficient) VALUES (1, 'Maths', 2);
    INSERT INTO students (id, first_name, last_name, class_id) VALUES (1, 'Koffi', 'Mensah', 1), (2, 'Ama', 'Dossou', 1);
    INSERT INTO parent_students (parent_id, student_id) VALUES ('${PARENT}', 1);
    INSERT INTO app_data (key, value) VALUES
      ('appreciations', '${stored(legacyAppreciations)}'),
      ('activities', '${stored(legacyActivities)}'),
      ('academicYears', '${stored([{ year: '2024-2025', isActive: false }, { year: '2025-2026', isActive: true }])}')
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
  `);
  await db.exec(readScript('appreciations-activities.sql'));
}, 120000);

afterAll(async () => { await db?.close(); });

describe('reprise des anciennes listes', () => {
  it('reprend les appréciations valides, rattachées à l\'année scolaire active', async () => {
    const { rows: got } = await db.query('SELECT student_id, subject_id, trimester, academic_year, type, body FROM appreciations ORDER BY id');
    expect(got.map(r => [Number(r.student_id), r.subject_id === null ? null : Number(r.subject_id), r.trimester, r.type, r.body])).toEqual([
      [1, 1, '1', 'teacher', 'Bon travail'],
      [1, null, '2', 'council', 'Félicitations du conseil'],
    ]);
    expect(new Set(got.map(r => r.academic_year))).toEqual(new Set(['2025-2026']));
  });

  it('conserve la date de création d\'origine', async () => {
    const { rows: [first] } = await db.query("SELECT created_at FROM appreciations WHERE body = 'Bon travail'");
    expect(new Date(first.created_at).toISOString()).toBe('2025-11-02T09:00:00.000Z');
  });

  it('reprend le journal d\'activité dans l\'ordre chronologique', async () => {
    const { rows: got } = await db.query('SELECT user_name, user_role, action, details FROM activities ORDER BY id');
    expect(got.map(r => r.action)).toEqual(['Connexion', 'Ajout de classe']);
    expect(got[0]).toMatchObject({ user_name: 'Awa Kossi', user_role: 'admin', details: 'Connexion réussie' });
  });

  it('laisse les anciennes lignes de app_data intactes (retour en arrière possible)', async () => {
    const { rows: got } = await db.query("SELECT key FROM app_data WHERE key IN ('appreciations', 'activities') ORDER BY key");
    expect(got.map(r => r.key)).toEqual(['activities', 'appreciations']);
  });

  it('est ré-exécutable sans doublon', async () => {
    await db.exec(readScript('appreciations-activities.sql'));
    expect((await db.query('SELECT count(*)::int AS n FROM appreciations')).rows[0].n).toBe(2);
    expect((await db.query('SELECT count(*)::int AS n FROM activities')).rows[0].n).toBe(2);
  });
});

describe('appréciations : règles d\'accès', () => {
  const insert = (who, over = '') => run(who, `INSERT INTO appreciations (student_id, subject_id, trimester, academic_year, type, body${over ? ', author_id' : ''})
    VALUES (2, 1, '1', '2025-2026', 'teacher', 'Appréciation test'${over ? `, '${over}'` : ''}) RETURNING id, author_id`);

  it('un professeur en ajoute une : l\'auteur est lui-même', async () => {
    const { rows: [row] } = await insert(PROF);
    expect(row.author_id).toBe(PROF);
  });

  it('personne ne peut signer au nom d\'un autre', async () => {
    await expect(insert(PROF, PROF2)).rejects.toThrow();
  });

  it('le secrétaire, le parent et un compte en attente ne peuvent pas en ajouter', async () => {
    for (const who of [SECRE, PARENT, NEWCOMER]) await expect(insert(who)).rejects.toThrow();
  });

  it('le personnel les lit ; ni les parents ni un compte en attente', async () => {
    for (const who of [ADMIN, PROF, SECRE]) expect((await rows(who, 'SELECT id FROM appreciations')).length).toBeGreaterThan(0);
    for (const who of [PARENT, NEWCOMER, null]) expect(await rows(who, 'SELECT id FROM appreciations')).toEqual([]);
  });

  it('un professeur modifie et supprime les siennes, pas celles d\'un collègue', async () => {
    const { rows: [mine] } = await insert(PROF);
    await run(PROF, `UPDATE appreciations SET body = 'corrigée' WHERE id = ${mine.id}`);
    expect((await rows(ADMIN, `SELECT body FROM appreciations WHERE id = ${mine.id}`))[0].body).toBe('corrigée');

    // un autre professeur : aucune ligne modifiée / supprimée
    await run(PROF2, `UPDATE appreciations SET body = 'piratée' WHERE id = ${mine.id}`);
    await run(PROF2, `DELETE FROM appreciations WHERE id = ${mine.id}`);
    expect((await rows(ADMIN, `SELECT body FROM appreciations WHERE id = ${mine.id}`))[0].body).toBe('corrigée');

    // l'admin peut tout
    await run(ADMIN, `DELETE FROM appreciations WHERE id = ${mine.id}`);
    expect(await rows(ADMIN, `SELECT id FROM appreciations WHERE id = ${mine.id}`)).toEqual([]);
  });

  it('les appréciations reprises de l\'ancienne liste (sans auteur) restent modifiables par les professeurs', async () => {
    const [legacy] = await rows(ADMIN, "SELECT id, author_id FROM appreciations WHERE body = 'Bon travail'");
    expect(legacy.author_id).toBeNull();
    await run(PROF2, `UPDATE appreciations SET body = 'Bon travail (relu)' WHERE id = ${legacy.id}`);
    expect((await rows(ADMIN, `SELECT body FROM appreciations WHERE id = ${legacy.id}`))[0].body).toBe('Bon travail (relu)');
    await run(PROF2, `UPDATE appreciations SET body = 'Bon travail' WHERE id = ${legacy.id}`);
    // mais jamais celles qu'un collègue a signées
    const { rows: [signed] } = await insert(PROF);
    await run(PROF2, `DELETE FROM appreciations WHERE id = ${signed.id}`);
    expect(await rows(ADMIN, `SELECT id FROM appreciations WHERE id = ${signed.id}`)).toHaveLength(1);
  });

  it('refuse une appréciation d\'enseignant sans matière, une du conseil avec matière, un texte vide', async () => {
    await expect(run(ADMIN, `INSERT INTO appreciations (student_id, trimester, academic_year, type, body) VALUES (1, '1', '2025-2026', 'teacher', 'x')`)).rejects.toThrow(/subject_matches_type/);
    await expect(run(ADMIN, `INSERT INTO appreciations (student_id, subject_id, trimester, academic_year, type, body) VALUES (1, 1, '1', '2025-2026', 'council', 'x')`)).rejects.toThrow(/subject_matches_type/);
    await expect(run(ADMIN, `INSERT INTO appreciations (student_id, trimester, academic_year, type, body) VALUES (1, '1', '2025-2026', 'council', '   ')`)).rejects.toThrow();
  });

  it('deux professeurs qui enregistrent en même temps ne s\'écrasent plus', async () => {
    await Promise.all([insert(PROF), insert(PROF2)]);
    const authors = (await rows(ADMIN, `SELECT DISTINCT author_id FROM appreciations WHERE body = 'Appréciation test'`)).map(r => r.author_id);
    expect(authors).toEqual(expect.arrayContaining([PROF, PROF2]));
  });

  it('supprimer l\'élève supprime ses appréciations', async () => {
    await db.exec(`INSERT INTO students (id, first_name, last_name, class_id) VALUES (77, 'Ephemere', 'Test', 1)`);
    await db.exec(`INSERT INTO appreciations (student_id, trimester, academic_year, type, body) VALUES (77, '1', '2025-2026', 'council', 'x')`);
    await db.exec('DELETE FROM students WHERE id = 77');
    expect((await db.query('SELECT count(*)::int AS n FROM appreciations WHERE student_id = 77')).rows[0].n).toBe(0);
  });
});

describe('journal d\'activité : auteur imposé par la base', () => {
  it('le personnel enregistre une activité ; nom, rôle et heure viennent de son profil, pas du navigateur', async () => {
    await run(PROF, `INSERT INTO activities (user_name, user_role, action, details, timestamp)
                     VALUES ('Awa Kossi', 'admin', 'Suppression de classe', 'faux', '2000-01-01')`);
    const [row] = await rows(ADMIN, `SELECT user_name, user_role, timestamp FROM activities WHERE action = 'Suppression de classe'`);
    expect(row.user_role).toBe('professeur');
    expect(row.user_name).toBe('Prénom prof');
    expect(new Date(row.timestamp).getFullYear()).toBeGreaterThan(2000);
  });

  it('un parent et un compte en attente ne peuvent pas écrire', async () => {
    for (const who of [PARENT, NEWCOMER]) {
      await expect(run(who, `INSERT INTO activities (action) VALUES ('x')`)).rejects.toThrow();
    }
  });

  it('le personnel le lit, pas les parents ; seul l\'admin supprime', async () => {
    expect((await rows(SECRE, 'SELECT id FROM activities')).length).toBeGreaterThan(0);
    expect(await rows(PARENT, 'SELECT id FROM activities')).toEqual([]);
    await run(SECRE, `DELETE FROM activities`);
    expect((await rows(ADMIN, 'SELECT id FROM activities')).length).toBeGreaterThan(0);
  });
});
