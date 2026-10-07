// Tests des règles d'accès (RLS) sur un vrai PostgreSQL, avec les scripts SQL du dépôt dans
// l'ordre d'installation. RLS_BASELINE=1 saute security-hardening.sql pour mesurer l'état
// AVANT durcissement (les tests de fuite échouent alors, ce qui prouve qu'ils détectent bien
// les problèmes).
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createDatabase, asUser, readScript } from './harness';

const BASELINE = process.env.RLS_BASELINE === '1';
const SCRIPTS = [
  'supabase-schema.sql',
  'supabase-security-rls.sql',
  'CHAT_TABLES.sql',
  'students-profile.sql',
  'payments-online.sql',
  'bulletin-access.sql',
  ...(BASELINE ? [] : ['security-hardening.sql']),
];

// Comptes de test (UUID fixes)
const ADMIN = '00000000-0000-0000-0000-00000000000a';
const PROF = '00000000-0000-0000-0000-0000000000b1';
const SECRE = '00000000-0000-0000-0000-0000000000c1';
const PARENT_X = '00000000-0000-0000-0000-0000000000d1'; // parent de l'élève 1
const PARENT_Y = '00000000-0000-0000-0000-0000000000d2'; // parent de l'élève 2
const NEWCOMER = '00000000-0000-0000-0000-0000000000e1'; // vient de s'inscrire seul

let db;
const rows = (userId, sql) => asUser(db, userId, async () => (await db.query(sql)).rows);
const run = (userId, sql) => asUser(db, userId, () => db.query(sql));

beforeAll(async () => {
  db = await createDatabase(SCRIPTS);

  // Inscriptions : le déclencheur handle_new_user crée le profil
  for (const [id, email] of [
    [ADMIN, 'admin@ecole.test'], [PROF, 'prof@ecole.test'], [SECRE, 'secre@ecole.test'],
    [PARENT_X, 'x@parents.test'], [PARENT_Y, 'y@parents.test'], [NEWCOMER, 'inconnu@internet.test'],
  ]) {
    await db.exec(`INSERT INTO auth.users (id, email) VALUES ('${id}', '${email}')`);
  }
  // Rôles attribués par un admin (le déclencheur impose le rôle par défaut à l'inscription)
  await db.exec(`
    UPDATE user_profiles SET role = 'admin' WHERE id = '${ADMIN}';
    UPDATE user_profiles SET role = 'professeur' WHERE id = '${PROF}';
    UPDATE user_profiles SET role = 'secretaire' WHERE id = '${SECRE}';
    UPDATE user_profiles SET role = 'parent' WHERE id IN ('${PARENT_X}', '${PARENT_Y}');
  `);

  await db.exec(`
    INSERT INTO classes (id, name) VALUES (1, '6ème A');
    INSERT INTO subjects (id, name, coefficient) VALUES (1, 'Maths', 2), (2, 'Français', 1);
    INSERT INTO students (id, first_name, last_name, class_id, emergency_phone) VALUES
      (1, 'Koffi', 'Mensah', 1, '+22890000001'),
      (2, 'Ama', 'Dossou', 1, '+22890000002'),
      (3, 'Yao', 'Agbo', 1, NULL);
    INSERT INTO parent_students (parent_id, student_id) VALUES ('${PARENT_X}', 1), ('${PARENT_Y}', 2);
    INSERT INTO grades (id, student_id, subject_id, trimester, value) VALUES
      ('g1', 1, 1, '1', 18), ('g2', 1, 2, '1', 14),
      ('g3', 2, 1, '1', 12), ('g4', 2, 2, '1', 12),
      ('g5', 3, 1, '1', 8);
    INSERT INTO app_data (key, value) VALUES
      ('schoolInfo', '"{}"'), ('appColors', '"{}"'), ('academicYears', '"[]"'),
      ('appreciations', '"[{\\"studentId\\":2,\\"text\\":\\"confidentiel\\"}]"'),
      ('activities', '"[]"')
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
    INSERT INTO activities (user_name, user_role, action) VALUES ('Awa Kossi', 'admin', 'Connexion');
    INSERT INTO payments (student_id, amount_paid, status, provider) VALUES
      (1, 10000, 'completed', 'fedapay'), (2, 20000, 'completed', 'fedapay');
  `);
  if (!BASELINE) {
    await db.exec(`
      INSERT INTO absences (student_id, subject_id, date, type, justified, notes) VALUES
        (1, 1, '2025-01-10', 'absent', false, 'enfant 1'),
        (2, 1, '2025-01-10', 'retard', false, 'enfant 2');
    `);
  }
}, 120000);

afterAll(async () => { await db?.close(); });

const ids = (list, key = 'id') => list.map((r) => Number(r[key])).sort();

describe('un parent ne voit que ses propres enfants', () => {
  it('élèves', async () => {
    expect(ids(await rows(PARENT_X, 'SELECT id FROM students'))).toEqual([1]);
    expect(ids(await rows(PARENT_Y, 'SELECT id FROM students'))).toEqual([2]);
  });

  it('notes', async () => {
    const grades = await rows(PARENT_X, 'SELECT student_id FROM grades');
    expect(new Set(grades.map((g) => Number(g.student_id)))).toEqual(new Set([1]));
  });

  it('absences', async () => {
    const list = await rows(PARENT_X, 'SELECT student_id, notes FROM absences');
    expect(list.map((a) => a.notes)).toEqual(['enfant 1']);
  });

  it('paiements', async () => {
    const list = await rows(PARENT_X, 'SELECT student_id FROM payments');
    expect(list.map((p) => Number(p.student_id))).toEqual([1]);
  });

  it('ne peut pas lire le contact d\'urgence d\'un autre élève', async () => {
    const list = await rows(PARENT_X, 'SELECT emergency_phone FROM students WHERE id = 2');
    expect(list).toEqual([]);
  });

  it('les classes et matières restent lisibles (noms nécessaires à l\'affichage)', async () => {
    expect((await rows(PARENT_X, 'SELECT id FROM classes')).length).toBe(1);
    expect((await rows(PARENT_X, 'SELECT id FROM subjects')).length).toBe(2);
  });
});

describe('données de l\'établissement (app_data) et journal', () => {
  it('un parent lit les réglages publics', async () => {
    const keys = (await rows(PARENT_X, 'SELECT key FROM app_data')).map((r) => r.key);
    expect(keys).toEqual(expect.arrayContaining(['schoolInfo']));
    keys.forEach((k) => expect(['academicYears', 'appColors', 'schoolInfo', 'schoolLogo']).toContain(k));
  });

  it('un parent ne lit ni les appréciations de tous les élèves ni le journal', async () => {
    expect(await rows(PARENT_X, `SELECT key FROM app_data WHERE key IN ('appreciations','activities')`)).toEqual([]);
    expect(await rows(PARENT_X, 'SELECT id FROM activities')).toEqual([]);
  });

  it('le personnel lit tout', async () => {
    for (const user of [ADMIN, PROF, SECRE]) {
      const keys = (await rows(user, 'SELECT key FROM app_data')).map((r) => r.key);
      expect(keys).toEqual(expect.arrayContaining(['schoolInfo', 'appreciations', 'activities']));
    }
  });
});

describe('annuaire des comptes', () => {
  it('un parent ne voit pas les autres parents (e-mails, noms)', async () => {
    const list = await rows(PARENT_X, 'SELECT id, role FROM user_profiles');
    const others = list.filter((p) => p.role === 'parent' && p.id !== PARENT_X);
    expect(others).toEqual([]);
  });

  it('un parent voit son profil et le personnel (pour la messagerie)', async () => {
    const list = await rows(PARENT_X, 'SELECT id, role FROM user_profiles');
    expect(list.map((p) => p.id)).toContain(PARENT_X);
    expect(list.map((p) => p.role)).toContain('professeur');
  });

  it('le personnel voit les parents', async () => {
    const list = await rows(PROF, 'SELECT id FROM user_profiles WHERE role = \'parent\'');
    expect(list.length).toBe(2);
  });
});

describe('inscription publique : un compte inconnu n\'accède à rien', () => {
  it('reçoit le rôle « en_attente » et non un rôle du personnel', async () => {
    const [profile] = await rows(ADMIN, `SELECT role FROM user_profiles WHERE id = '${NEWCOMER}'`);
    expect(profile.role).toBe('en_attente');
  });

  it.each([
    ['students'], ['grades'], ['absences'], ['payments'], ['activities'], ['classes'], ['subjects'],
  ])('ne lit rien dans %s', async (table) => {
    expect(await rows(NEWCOMER, `SELECT * FROM ${table}`)).toEqual([]);
  });

  it('ne lit pas app_data ni l\'annuaire des comptes', async () => {
    expect(await rows(NEWCOMER, 'SELECT key FROM app_data')).toEqual([]);
    const profiles = await rows(NEWCOMER, 'SELECT id FROM user_profiles');
    expect(profiles.map((p) => p.id)).toEqual([NEWCOMER]); // uniquement son propre profil
  });

  it('ne peut pas s\'attribuer un rôle', async () => {
    await run(NEWCOMER, `UPDATE user_profiles SET role = 'admin' WHERE id = '${NEWCOMER}'`);
    const [profile] = await rows(ADMIN, `SELECT role FROM user_profiles WHERE id = '${NEWCOMER}'`);
    expect(profile.role).toBe('en_attente');
  });

  it('un administrateur peut valider le compte', async () => {
    await run(ADMIN, `UPDATE user_profiles SET role = 'secretaire' WHERE id = '${NEWCOMER}'`);
    const [profile] = await rows(ADMIN, `SELECT role FROM user_profiles WHERE id = '${NEWCOMER}'`);
    expect(profile.role).toBe('secretaire');
    // remise à l'état initial pour les autres tests
    await db.exec(`UPDATE user_profiles SET role = 'en_attente' WHERE id = '${NEWCOMER}'`);
  });
});

describe('droits d\'écriture par rôle', () => {
  it('un professeur saisit des notes mais ne modifie pas les élèves', async () => {
    await run(PROF, `UPDATE grades SET value = 19 WHERE id = 'g1'`);
    expect(Number((await rows(ADMIN, `SELECT value FROM grades WHERE id = 'g1'`))[0].value)).toBe(19);
    await run(PROF, `UPDATE students SET first_name = 'Pirate' WHERE id = 1`);
    expect((await rows(ADMIN, 'SELECT first_name FROM students WHERE id = 1'))[0].first_name).toBe('Koffi');
    await db.exec(`UPDATE grades SET value = 18 WHERE id = 'g1'`);
  });

  it('un secrétaire ne modifie aucune note', async () => {
    await run(SECRE, `UPDATE grades SET value = 0 WHERE id = 'g1'`);
    expect(Number((await rows(ADMIN, `SELECT value FROM grades WHERE id = 'g1'`))[0].value)).toBe(18);
  });

  it('un parent ne modifie aucune note ni absence et n\'en crée pas', async () => {
    await run(PARENT_X, `UPDATE grades SET value = 20 WHERE student_id = 1`);
    expect(Number((await rows(ADMIN, `SELECT value FROM grades WHERE id = 'g1'`))[0].value)).toBe(18);
    await expect(run(PARENT_X, `INSERT INTO absences (student_id, date, type) VALUES (1, '2025-02-01', 'absent')`))
      .rejects.toThrow(/row-level security/);
  });

  it('le personnel enregistre des absences', async () => {
    for (const user of [ADMIN, PROF, SECRE]) {
      await run(user, `INSERT INTO absences (student_id, date, type, notes) VALUES (3, '2025-02-01', 'absent', 'test')`);
    }
    await db.exec(`DELETE FROM absences WHERE student_id = 3`);
  });

  it('un utilisateur ne s\'élève pas lui-même au rang d\'admin', async () => {
    await run(SECRE, `UPDATE user_profiles SET role = 'admin' WHERE id = '${SECRE}'`);
    expect((await rows(ADMIN, `SELECT role FROM user_profiles WHERE id = '${SECRE}'`))[0].role).toBe('secretaire');
  });
});

describe('rang d\'un enfant dans sa classe (sans exposer les notes des autres)', () => {
  it('un parent obtient le rang de son enfant', async () => {
    // moyennes pondérées T1 : élève 1 = (18*2+14)/3 = 16.67 ; élève 2 = 12 ; élève 3 = 8
    const [r] = await rows(PARENT_X, `SELECT * FROM child_class_rank(1, '1')`);
    expect(Number(r.rank)).toBe(1);
    expect(Number(r.total)).toBe(3);
    // moyennes de classe : 16.67 (élève 1), 12 (élève 2), 8 (élève 3)
    expect(Number(r.class_max)).toBe(16.67);
    expect(Number(r.class_min)).toBe(8);
    expect(Number(r.class_average)).toBe(12.22);
    const [r2] = await rows(PARENT_Y, `SELECT * FROM child_class_rank(2, '1')`);
    expect(Number(r2.rank)).toBe(2);
  });

  it('un parent n\'obtient rien pour l\'enfant d\'un autre', async () => {
    expect(await rows(PARENT_X, `SELECT * FROM child_class_rank(2, '1')`)).toEqual([]);
  });

  it('un compte non validé n\'obtient rien', async () => {
    expect(await rows(NEWCOMER, `SELECT * FROM child_class_rank(1, '1')`)).toEqual([]);
  });

  it('le personnel obtient le rang de n\'importe quel élève', async () => {
    const [r] = await rows(PROF, `SELECT * FROM child_class_rank(3, '1')`);
    expect(Number(r.rank)).toBe(3);
  });

  it('ne renvoie rien pour un élève sans note', async () => {
    await db.exec(`INSERT INTO students (id, first_name, last_name, class_id) VALUES (9, 'Sans', 'Note', 1)`);
    expect(await rows(PROF, `SELECT * FROM child_class_rank(9, '1')`)).toEqual([]);
    await db.exec('DELETE FROM students WHERE id = 9');
  });
});

describe('durcissement des fonctions et vues', () => {
  it('la vue v_users n\'est lisible par aucun utilisateur de l\'API', async () => {
    await expect(rows(PARENT_X, 'SELECT * FROM v_users')).rejects.toThrow();
    await expect(rows(ADMIN, 'SELECT * FROM v_users')).rejects.toThrow();
  });

  it('create_admin_user (qui révélait quels e-mails existent) n\'existe plus', async () => {
    const found = await rows(ADMIN, `SELECT proname FROM pg_proc WHERE proname = 'create_admin_user'`);
    expect(found).toEqual([]);
  });

  it('les fonctions SECURITY DEFINER fixent leur search_path', async () => {
    const list = await rows(ADMIN, `
      SELECT p.proname, p.proconfig
      FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public' AND p.prosecdef
    `);
    expect(list.length).toBeGreaterThan(0);
    const unsafe = list.filter((f) => !(f.proconfig || []).some((c) => c.startsWith('search_path=')));
    expect(unsafe.map((f) => f.proname)).toEqual([]);
  });

  it('un anonyme (sans connexion) ne lit rien', async () => {
    for (const table of ['students', 'grades', 'absences', 'app_data', 'user_profiles', 'payments']) {
      expect(await rows(null, `SELECT * FROM ${table}`)).toEqual([]);
    }
  });
});

describe('accès au bulletin selon le paiement', () => {
  const access = async (id) => (await rows(ADMIN, `SELECT bulletin_access FROM students WHERE id = ${id}`))[0].bulletin_access;

  it("un paiement terminé débloque le bulletin, l'élève sans paiement reste bloqué", async () => {
    expect(await access(1)).toBe(true);
    expect(await access(3)).toBe(false);
  });

  it('un paiement en attente ou échoué ne débloque rien', async () => {
    await db.exec(`INSERT INTO payments (student_id, amount_paid, status, provider) VALUES
      (3, 5000, 'pending', 'fedapay'), (3, 5000, 'failed', 'fedapay')`);
    expect(await access(3)).toBe(false);
  });

  it("un solde dû non couvert garde le bulletin bloqué, jusqu'au paiement complet", async () => {
    await db.exec(`INSERT INTO payments (student_id, amount_paid, amount_due, status, provider)
      VALUES (3, 4000, 10000, 'completed', 'fedapay')`);
    expect(await access(3)).toBe(false);
    await db.exec(`INSERT INTO payments (student_id, amount_paid, status, provider)
      VALUES (3, 6000, 'completed', 'fedapay')`);
    expect(await access(3)).toBe(true);
  });

  it("un parent lit l'état de son enfant mais ne peut pas se débloquer lui-même", async () => {
    const own = await rows(PARENT_X, 'SELECT id, bulletin_access FROM students');
    expect(own.map((r) => [Number(r.id), r.bulletin_access])).toEqual([[1, true]]);
    await db.exec('UPDATE students SET bulletin_access = false WHERE id = 1');
    await run(PARENT_X, 'UPDATE students SET bulletin_access = true WHERE id = 1');
    expect(await access(1)).toBe(false);
    await db.exec('UPDATE students SET bulletin_access = true WHERE id = 1');
  });
});

describe('script de durcissement', () => {
  it.skipIf(BASELINE)('est ré-exécutable sans erreur et garde les mêmes règles', async () => {
    await db.exec(readScript('security-hardening.sql'));
    expect(ids(await rows(PARENT_X, 'SELECT id FROM students'))).toEqual([1]);
    expect(await rows(NEWCOMER, 'SELECT id FROM students')).toEqual([]);
  });
});
