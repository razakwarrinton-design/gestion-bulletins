// Données de démonstration (sql/demo-data.sql) et leur nettoyage (sql/demo-data-cleanup.sql) sur un vrai PostgreSQL :
// classes de 20 élèves, notes cohérentes avec la formule de l'application, aucun mélange avec les vraies données.
import { describe, it, expect, afterEach } from 'vitest';
import { createDatabase, readScript } from './harness';

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

let db;
afterEach(async () => { await db?.close(); db = null; });

const fresh = async (setup = '') => {
  db = await createDatabase(SCRIPTS);
  if (setup) await db.exec(setup);
  return db;
};
const install = () => db.exec(readScript('demo-data.sql'));
const cleanup = () => db.exec(readScript('demo-data-cleanup.sql'));
const count = async (table, where = 'TRUE') => Number((await db.query(`SELECT count(*) AS n FROM ${table} WHERE ${where}`)).rows[0].n);
const names = async (sql) => (await db.query(sql)).rows.map((r) => Object.values(r)[0]);

// Base d'un établissement réel : matières propres à l'école, classe TA4 avec deux élèves déjà notés au 1er trimestre
const REAL_SUBJECTS = ['Francais', 'Anglais', 'Philos', 'Allemand', 'SVT', 'Mathematiques', 'Science-Physiques', 'ECM', 'Espagnol', 'EPS'];
const REAL_SCHOOL = `
  INSERT INTO classes (name, level) VALUES ('TA4', 'TA4');
  INSERT INTO subjects (name, coefficient) VALUES ${REAL_SUBJECTS.map((n) => `('${n}', 2)`).join(', ')};
  INSERT INTO students (first_name, last_name, class_id) SELECT 'Diallo', n, (SELECT id FROM classes WHERE name = 'TA4') FROM (VALUES ('KOUASSI'), ('Malam')) AS v(n);
  INSERT INTO grades (student_id, subject_id, trimester, academic_year, value, interro, devoir, composition)
    SELECT st.id, su.id, '1', '2026-2027', 12, 12, 12, 12 FROM students st CROSS JOIN subjects su;
  INSERT INTO app_data (key, value) VALUES ('academicYears', '[{"year":"2024-2025","isActive":true}]')
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
`;

describe('installation sur une base vide', () => {
  it('crée 4 classes de 20 élèves, 8 matières et 3 trimestres de notes', async () => {
    await fresh();
    await install();
    expect(await count('classes')).toBe(4);
    expect(await count('students')).toBe(80);
    expect(await names('SELECT count(*) FROM students GROUP BY class_id')).toEqual([20, 20, 20, 20]);
    expect(await count('subjects')).toBe(8);
    expect(await count('grades')).toBe(80 * 8 * 3);
    expect(await names('SELECT DISTINCT trimester FROM grades ORDER BY 1')).toEqual(['1', '2', '3']);
  }, 120000);

  it('chaque note respecte la formule de l\'application (×1 / ×2 / ×3 + bonus, plafonnée à 20) et les limites de la base', async () => {
    await fresh();
    await install();
    expect(await count('grades', 'value NOT BETWEEN 0 AND 20 OR interro NOT BETWEEN 0 AND 20 OR devoir NOT BETWEEN 0 AND 20 OR composition NOT BETWEEN 0 AND 20')).toBe(0);
    expect(await count('grades', 'bonus IS NOT NULL AND bonus NOT BETWEEN 0 AND 5')).toBe(0);
    expect(await count('grades',
      'value <> least(20, round((interro + 2 * devoir + 3 * composition) / 6 + COALESCE(bonus, 0), 2))')).toBe(0);
    expect(await count('grades', 'appreciation IS NULL OR teacher_name IS NULL')).toBe(0);
  }, 120000);

  it('les moyennes sont réalistes : des élèves en difficulté et d\'autres très bons, pas une classe uniforme', async () => {
    await fresh();
    await install();
    const { rows: [stats] } = await db.query(`
      WITH per_student AS (SELECT student_id, avg(value) AS m FROM grades WHERE trimester = '1' GROUP BY student_id)
      SELECT min(m)::float AS lowest, max(m)::float AS highest, avg(m)::float AS mean FROM per_student`);
    expect(stats.mean).toBeGreaterThan(9);
    expect(stats.mean).toBeLessThan(15);
    expect(stats.highest - stats.lowest).toBeGreaterThan(4);
  }, 120000);

  it('aucun élève en double (prénom + nom) et des fiches complètes', async () => {
    await fresh();
    await install();
    expect(await count('(SELECT first_name, last_name FROM students GROUP BY 1, 2 HAVING count(*) > 1) d')).toBe(0);
    expect(await count('students', "first_name = '' OR last_name = '' OR gender NOT IN ('M', 'F') OR birth_date IS NULL")).toBe(0);
  }, 120000);

  it('sans rien d\'enregistré, utilise l\'année en cours', async () => {
    await fresh();
    await install();
    const years = await names('SELECT DISTINCT academic_year FROM grades');
    expect(years).toHaveLength(1);
    const [a, b] = years[0].split('-').map(Number);
    expect(b).toBe(a + 1);
  }, 120000);

  it('ne duplique pas une matière déjà présente (casse et accents ignorés) et ne la modifie pas', async () => {
    await fresh(`INSERT INTO subjects (name, coefficient) VALUES ('mathematiques', 5)`);
    await install();
    expect(await count('subjects')).toBe(8);
    expect((await db.query(`SELECT coefficient::float AS c FROM subjects WHERE lower(name) = 'mathematiques'`)).rows[0].c).toBe(5);
  }, 120000);

  it('se lance deux fois sans rien doubler', async () => {
    await fresh();
    await install();
    await install();
    expect(await count('classes')).toBe(4);
    expect(await count('students')).toBe(80);
    expect(await count('grades')).toBe(80 * 8 * 3);
  }, 120000);

  it('refuse de se mêler à une classe réelle du même nom : rien n\'est créé', async () => {
    await fresh(`INSERT INTO classes (name) VALUES ('4ème A')`);
    await expect(install()).rejects.toThrow(/4ème A/);
    expect(await count('classes')).toBe(1);
    expect(await count('students')).toBe(0);
    expect(await count('app_data', "key = 'demoSeed'")).toBe(0);
  }, 120000);

  it('n\'encombre pas le journal d\'audit, qui reste actif ensuite', async () => {
    await fresh();
    await install();
    expect(await count('audit_logs', "table_name IN ('grades', 'students', 'classes', 'subjects')")).toBe(0);
    const { rows } = await db.query(`SELECT tgname, tgenabled FROM pg_trigger WHERE tgname IN ('audit_grades', 'audit_students', 'audit_classes', 'audit_subjects') ORDER BY 1`);
    expect(rows).toHaveLength(4);
    expect(rows.every((r) => r.tgenabled === 'O')).toBe(true);
    // une écriture ultérieure est bien journalisée
    await db.exec(`UPDATE classes SET level = 'Test' WHERE name = '6ème A'`);
    expect(await count('audit_logs', "table_name = 'classes'")).toBeGreaterThan(0);
  }, 120000);
});

describe('année scolaire retenue', () => {
  const years = (value) => `INSERT INTO app_data (key, value) VALUES ('academicYears', '${value}') ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`;
  const oneGrade = (year) => `
    INSERT INTO classes (id, name) VALUES (900, 'Autre'); INSERT INTO subjects (id, name) VALUES (900, 'X');
    INSERT INTO students (id, first_name, last_name, class_id) VALUES (900, 'A', 'B', 900);
    INSERT INTO grades (student_id, subject_id, trimester, academic_year, value) VALUES (900, 900, '1', '${year}', 10);`;
  const demoYears = () => names(`SELECT DISTINCT academic_year FROM grades WHERE student_id <> 900`);

  it('année active (tableau posé par un script SQL) quand aucune note n\'existe encore', async () => {
    await fresh(years('[{"year":"2024-2025","isActive":false},{"year":"2025-2026","isActive":true}]'));
    await install();
    expect(await demoYears()).toEqual(['2025-2026']);
  }, 120000);

  it('année active écrite par l\'application (chaîne JSON dans la colonne jsonb)', async () => {
    await fresh(`INSERT INTO app_data (key, value) VALUES ('academicYears', to_jsonb('[{"year":"2025-2026","isActive":true}]'::text))
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`);
    expect((await db.query(`SELECT jsonb_typeof(value) AS t FROM app_data WHERE key = 'academicYears'`)).rows[0].t).toBe('string');
    await install();
    expect(await demoYears()).toEqual(['2025-2026']);
  }, 120000);

  it('l\'année active a déjà des notes : c\'est elle', async () => {
    await fresh(`${years('[{"year":"2025-2026","isActive":true}]')}; ${oneGrade('2025-2026')}; INSERT INTO grades (student_id, subject_id, trimester, academic_year, value) VALUES (900, 900, '2', '2026-2027', 10)`);
    await install();
    expect(await demoYears()).toEqual(['2025-2026']);
  }, 120000);

  it('l\'année active n\'a aucune note mais d\'autres années en ont : la plus récente (l\'application relit mal l\'année active)', async () => {
    await fresh(`${years('[{"year":"2024-2025","isActive":true}]')}; ${oneGrade('2026-2027')}`);
    await install();
    expect(await demoYears()).toEqual(['2026-2027']);
  }, 120000);
});

describe('classe existante complétée à 20 élèves (TA4)', () => {
  it('ajoute seulement les élèves manquants, avec les matières de l\'école, sans toucher aux élèves ni aux notes d\'origine', async () => {
    await fresh(REAL_SCHOOL);
    const before = (await db.query('SELECT id, value, interro, devoir, composition, updated_at FROM grades ORDER BY id')).rows;
    await install();
    expect(await count('students', 'class_id = 1')).toBe(20);
    expect(await count('students')).toBe(100); // 4 classes neuves + TA4
    expect(await count('classes')).toBe(5);
    expect(await count('subjects')).toBe(10); // aucune matière ajoutée : celles de l'école sont notées
    expect(await names('SELECT first_name FROM students WHERE id IN (1, 2) ORDER BY id')).toEqual(['Diallo', 'Diallo']);
    // les 20 notes d'origine (1er trimestre) sont identiques, octet pour octet
    expect((await db.query(`SELECT id, value, interro, devoir, composition, updated_at FROM grades WHERE trimester = '1' AND student_id IN (1, 2) ORDER BY id`)).rows).toEqual(before);
  }, 120000);

  it("remplit les trimestres 2 et 3 des élèves d'origine, dans leurs matières, autour de leurs notes existantes", async () => {
    await fresh(REAL_SCHOOL);
    await install();
    expect(await count('grades', 'student_id IN (1, 2)')).toBe(2 * 10 * 3);
    expect(await names(`SELECT DISTINCT trimester FROM grades WHERE student_id IN (1, 2) ORDER BY 1`)).toEqual(['1', '2', '3']);
    expect(await count('grades', `student_id IN (1, 2) AND trimester <> '1' AND academic_year <> '2026-2027'`)).toBe(0);
    // leurs notes d'origine valaient 12 : les nouvelles restent dans une fourchette plausible
    expect(await count('grades', `student_id IN (1, 2) AND trimester <> '1' AND value BETWEEN 7 AND 17`)).toBeGreaterThan(30);
    expect(await count('grades', `student_id IN (1, 2) AND value <> round((interro + 2 * devoir + 3 * composition) / 6, 2) + COALESCE(bonus, 0) AND trimester <> '1'`)).toBe(0);
  }, 120000);

  it("ne remplace jamais une note déjà saisie et ne rajoute pas de matière que l'élève n'a pas", async () => {
    await fresh(`${REAL_SCHOOL}
      INSERT INTO grades (student_id, subject_id, trimester, academic_year, value) VALUES (1, 1, '2', '2026-2027', 5.25);
      DELETE FROM grades WHERE student_id = 2 AND subject_id = (SELECT id FROM subjects WHERE name = 'Espagnol');`);
    await install();
    expect(await names(`SELECT value FROM grades WHERE student_id = 1 AND subject_id = 1 AND trimester = '2'`)).toEqual(['5.25']);
    expect(await count('grades', `student_id = 2 AND subject_id = (SELECT id FROM subjects WHERE name = 'Espagnol')`)).toBe(0);
    expect(await count('grades', 'student_id = 2')).toBe(9 * 3);
  }, 120000);

  it('les nouveaux élèves de TA4 ont 3 trimestres de notes, dans l\'année où se trouvent déjà les notes de l\'école', async () => {
    await fresh(REAL_SCHOOL); // année « active » enregistrée : 2024-2025 ; notes existantes : 2026-2027
    await install();
    expect(await names(`SELECT DISTINCT academic_year FROM grades WHERE student_id > 2`)).toEqual(['2026-2027']);
    expect(await names(`SELECT count(DISTINCT trimester) FROM grades WHERE student_id > 2 AND student_id IN (SELECT id FROM students WHERE class_id = 1)`)).toEqual([3]);
    expect(await count('grades', `student_id IN (SELECT id FROM students WHERE class_id = 1 AND id > 2)`)).toBe(18 * 10 * 3);
  }, 120000);

  it('philosophie seulement en TA4 ; pas de LV2 (allemand, espagnol) en 6ème ; matières communes partout', async () => {
    await fresh(REAL_SCHOOL);
    await install();
    const bySubject = async (className, subject) => count(
      'grades g JOIN students s ON s.id = g.student_id JOIN classes c ON c.id = s.class_id JOIN subjects su ON su.id = g.subject_id',
      `c.name = '${className}' AND su.name = '${subject}'`);
    expect(await bySubject('6ème A', 'Philos')).toBe(0);
    expect(await bySubject('2nde A', 'Philos')).toBe(0);
    expect(await bySubject('TA4', 'Philos')).toBeGreaterThan(0);
    expect(await bySubject('6ème A', 'Allemand')).toBe(0);
    expect(await bySubject('6ème A', 'Espagnol')).toBe(0);
    expect(await bySubject('4ème A', 'Allemand')).toBe(20 * 3);
    expect(await bySubject('6ème A', 'Francais')).toBe(20 * 3);
  }, 120000);

  it('une classe déjà à 20 élèves n\'est pas modifiée', async () => {
    await fresh(`${REAL_SCHOOL}
      INSERT INTO students (first_name, last_name, class_id) SELECT 'E' || g, 'N' || g, 1 FROM generate_series(1, 18) g;`);
    await install();
    expect(await count('students', 'class_id = 1')).toBe(20);
    expect(await count('students')).toBe(100);
  }, 120000);

  it('sans classe TA4 : seules les 4 classes neuves sont créées', async () => {
    await fresh(`INSERT INTO classes (name) VALUES ('Terminale D')`);
    await install();
    expect(await count('classes')).toBe(5);
    expect(await count('students')).toBe(80);
  }, 120000);
});

describe('nettoyage de la démonstration', () => {
  it('supprime la démonstration et rien d\'autre : TA4 garde ses deux élèves d\'origine et leurs notes', async () => {
    await fresh(REAL_SCHOOL);
    await install();
    await cleanup();
    expect(await count('classes')).toBe(1);
    expect(await count('students')).toBe(2);
    expect(await count('grades')).toBe(20); // les notes ajoutées aux deux élèves partent aussi
    expect(await count('grades', "trimester <> '1'")).toBe(0);
    expect(await count('subjects')).toBe(10);
    expect(await count('app_data', "key = 'demoSeed'")).toBe(0);
  }, 120000);

  it('supprime les matières que la démonstration a ajoutées, sauf si une vraie note les utilise', async () => {
    await fresh();
    await install();
    const { rows: [subject] } = await db.query(`SELECT id FROM subjects WHERE name = 'Anglais'`);
    await db.exec(`
      INSERT INTO classes (id, name) VALUES (900, 'TA4');
      INSERT INTO students (id, first_name, last_name, class_id) VALUES (900, 'Vrai', 'ÉLÈVE', 900);
      INSERT INTO grades (student_id, subject_id, trimester, academic_year, value) VALUES (900, ${subject.id}, '1', '2025-2026', 12);`);
    await cleanup();
    expect(await names('SELECT name FROM subjects')).toEqual(['Anglais']);
    expect(await count('students')).toBe(1);
  }, 120000);

  it('ne fait rien quand aucune démonstration n\'est installée', async () => {
    await fresh(REAL_SCHOOL);
    await cleanup();
    expect(await count('classes')).toBe(1);
    expect(await count('students')).toBe(2);
    expect(await count('grades')).toBe(20);
  }, 120000);

  it('permet de refaire la démonstration après le nettoyage, avec le même résultat', async () => {
    await fresh(REAL_SCHOOL);
    await install();
    const first = await count('grades');
    await cleanup();
    await install();
    expect(await count('classes')).toBe(5);
    expect(await count('students')).toBe(100);
    expect(await count('grades')).toBe(first);
  }, 120000);

  it('n\'encombre pas non plus le journal d\'audit et le laisse actif', async () => {
    await fresh();
    await install();
    await cleanup();
    expect(await count('audit_logs', "table_name IN ('grades', 'students', 'classes', 'subjects')")).toBe(0);
    expect(await count('pg_trigger', "tgname LIKE 'audit_%' AND tgenabled <> 'O'")).toBe(0);
  }, 120000);
});
