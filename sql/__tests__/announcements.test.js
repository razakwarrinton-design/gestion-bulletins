// Infos de l'établissement (sql/announcements.sql) sur un vrai PostgreSQL : qui publie, qui lit quoi, auteur non falsifiable,
// avis dans la cloche.
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
  'announcements.sql',
];

const ADMIN = '00000000-0000-0000-0000-00000000000a';
const PROF = '00000000-0000-0000-0000-0000000000b1';
const PROF2 = '00000000-0000-0000-0000-0000000000b2';
const SECRETAIRE = '00000000-0000-0000-0000-0000000000c1';
const PARENT_A = '00000000-0000-0000-0000-0000000000d1'; // enfant en classe 1
const PARENT_B = '00000000-0000-0000-0000-0000000000d2'; // enfant en classe 2
const PENDING = '00000000-0000-0000-0000-0000000000f1';   // compte « en attente »

let db;
const run = (userId, sql, params) => asUser(db, userId, () => db.query(sql, params));
const publish = (userId, over = {}) => run(userId,
  `INSERT INTO announcements (title, body, category, amount_fcfa, class_id, author_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
  [over.title ?? 'Relevé de notes', over.body ?? 'Le relevé de notes coûte 1 500 FCFA, payable au secrétariat.', over.category ?? 'frais',
    'amount' in over ? over.amount : 1500, over.class_id ?? null, over.author_id ?? userId]);
const titlesFor = async (userId) => (await run(userId, `SELECT title FROM announcements ORDER BY id`)).rows.map((r) => r.title);

beforeAll(async () => {
  db = await createDatabase(SCRIPTS);
  for (const [id, email] of [[ADMIN, 'admin@ecole.test'], [PROF, 'prof@ecole.test'], [PROF2, 'prof2@ecole.test'], [SECRETAIRE, 'sec@ecole.test'],
    [PARENT_A, 'a@parents.test'], [PARENT_B, 'b@parents.test'], [PENDING, 'wait@ecole.test']]) {
    await db.exec(`INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES ('${id}', '${email}', '{"first_name":"Prénom","last_name":"${email.split('@')[0]}"}')`);
  }
  await db.exec(`
    UPDATE user_profiles SET role = 'admin' WHERE id = '${ADMIN}';
    UPDATE user_profiles SET role = 'professeur' WHERE id IN ('${PROF}', '${PROF2}');
    UPDATE user_profiles SET role = 'secretaire' WHERE id = '${SECRETAIRE}';
    UPDATE user_profiles SET role = 'parent' WHERE id IN ('${PARENT_A}', '${PARENT_B}');
    INSERT INTO classes (id, name) VALUES (1, '6ème A'), (2, '5ème B');
    INSERT INTO students (id, first_name, last_name, class_id) VALUES (1, 'Koffi', 'Mensah', 1), (2, 'Esi', 'Zinsou', 2);
    INSERT INTO parent_students (parent_id, student_id) VALUES ('${PARENT_A}', 1), ('${PARENT_B}', 2);
  `);
}, 120000);

afterAll(async () => { await db?.close(); });

describe('publication', () => {
  it("l'administrateur et un professeur publient ; l'auteur et son rôle viennent de la base", async () => {
    await publish(ADMIN, { title: 'Frais de scolarité 2e trimestre', category: 'frais', amount: 25000 });
    await publish(PROF, { title: 'Nouvelle règle : uniforme', category: 'reglement', amount: null, body: "L'uniforme est obligatoire dès lundi." });
    const { rows } = await db.query(`SELECT title, author_role, author_name FROM announcements ORDER BY id`);
    expect(rows.map((r) => r.author_role)).toEqual(['admin', 'professeur']);
    expect(rows[1].author_name).toBe('Prénom prof');
  });

  it("le secrétariat publie aussi, signé « secretaire » ; un parent, un compte en attente et un visiteur sont refusés", async () => {
    const { rows: [created] } = await publish(SECRETAIRE, { title: 'Ouverture du secrétariat', category: 'autre', amount: null, body: 'Du lundi au vendredi, 8 h - 16 h.' });
    const { rows: [row] } = await db.query(`SELECT author_id, author_role FROM announcements WHERE id = ${created.id}`);
    expect(row).toEqual({ author_id: SECRETAIRE, author_role: 'secretaire' });
    await db.exec(`DELETE FROM announcements WHERE id = ${created.id}`);
    await expect(publish(PARENT_A)).rejects.toThrow(/row-level security/);
    await expect(publish(PENDING)).rejects.toThrow(/row-level security/);
    await expect(publish(null)).rejects.toThrow();
  });

  it("une publication écrite au nom d'un collègue est signée de son vrai auteur", async () => {
    const { rows: [created] } = await publish(PROF, { title: 'Usurpation', category: 'autre', amount: null, author_id: ADMIN });
    const { rows: [row] } = await db.query(`SELECT author_id, author_role FROM announcements WHERE id = ${created.id}`);
    expect(row).toEqual({ author_id: PROF, author_role: 'professeur' });
    await db.exec(`DELETE FROM announcements WHERE id = ${created.id}`);
  });

  it("l'auteur affiché ne se change pas, même par une mise à jour", async () => {
    const { rows: [first] } = await db.query(`SELECT id FROM announcements WHERE author_role = 'professeur'`);
    await run(PROF, `UPDATE announcements SET author_name = 'Directeur', author_role = 'admin', author_id = '${ADMIN}', body = 'corrigé' WHERE id = ${first.id}`);
    const { rows: [after] } = await db.query(`SELECT author_name, author_role, author_id, body FROM announcements WHERE id = ${first.id}`);
    expect(after).toEqual({ author_name: 'Prénom prof', author_role: 'professeur', author_id: PROF, body: 'corrigé' });
  });

  it('refuse un texte vide ou démesuré, une catégorie inconnue, un montant sur autre chose qu\'un frais', async () => {
    await expect(publish(ADMIN, { title: '   ' })).rejects.toThrow(/check/i);
    await expect(publish(ADMIN, { body: 'x'.repeat(4001) })).rejects.toThrow(/check/i);
    await expect(publish(ADMIN, { category: 'pub' })).rejects.toThrow(/check/i);
    await expect(publish(ADMIN, { category: 'reglement', amount: 500 })).rejects.toThrow(/check/i);
    await expect(publish(ADMIN, { amount: -5 })).rejects.toThrow(/check/i);
  });
});

describe('qui lit quoi', () => {
  it('une info de classe n\'est lue que par les parents de cette classe', async () => {
    await publish(ADMIN, { title: 'Sortie de la 6ème A', category: 'autre', amount: null, class_id: 1, body: 'Sortie jeudi.' });
    expect(await titlesFor(PARENT_A)).toContain('Sortie de la 6ème A');
    expect(await titlesFor(PARENT_B)).not.toContain('Sortie de la 6ème A');
  });

  it("les infos de tout l'établissement sont lues par tous les parents", async () => {
    for (const parent of [PARENT_A, PARENT_B]) {
      expect(await titlesFor(parent)).toEqual(expect.arrayContaining(['Frais de scolarité 2e trimestre', 'Nouvelle règle : uniforme']));
    }
  });

  it('le personnel lit tout ; un compte en attente et un visiteur ne lisent rien', async () => {
    for (const staff of [ADMIN, PROF, PROF2, SECRETAIRE]) expect((await titlesFor(staff)).length).toBe(3);
    expect(await titlesFor(PENDING)).toEqual([]);
    await expect(run(null, `SELECT id FROM announcements`)).rejects.toThrow(/permission denied/);
  });

  it('un parent ne peut ni publier, ni modifier, ni supprimer', async () => {
    expect((await run(PARENT_A, `UPDATE announcements SET title = 'x' RETURNING id`)).rows).toEqual([]);
    expect((await run(PARENT_A, `DELETE FROM announcements RETURNING id`)).rows).toEqual([]);
    expect((await db.query(`SELECT count(*)::int AS n FROM announcements`)).rows[0].n).toBe(3);
  });
});

describe('modification et suppression', () => {
  it('le secrétariat ne touche pas aux publications des autres, mais gère les siennes', async () => {
    const { rows: [mine] } = await publish(SECRETAIRE, { title: 'Reçus de paiement', category: 'frais', amount: 500, body: 'Un reçu coûte 500 FCFA.' });
    expect((await run(SECRETAIRE, `UPDATE announcements SET title = 'piraté' WHERE author_id <> '${SECRETAIRE}' RETURNING id`)).rows).toEqual([]);
    expect((await run(SECRETAIRE, `DELETE FROM announcements WHERE author_id <> '${SECRETAIRE}' RETURNING id`)).rows).toEqual([]);
    expect((await run(PROF, `UPDATE announcements SET title = 'piraté' WHERE id = ${mine.id} RETURNING id`)).rows).toEqual([]);
    expect((await run(SECRETAIRE, `UPDATE announcements SET amount_fcfa = 600 WHERE id = ${mine.id} RETURNING id`)).rows.length).toBe(1);
    expect((await run(SECRETAIRE, `DELETE FROM announcements WHERE id = ${mine.id} RETURNING id`)).rows.length).toBe(1);
  });

  it('un professeur ne touche pas à la publication d\'un collègue ni à celle de l\'administrateur', async () => {
    expect((await run(PROF2, `UPDATE announcements SET title = 'piraté' RETURNING id`)).rows).toEqual([]);
    expect((await run(PROF, `UPDATE announcements SET title = 'piraté' WHERE author_role = 'admin' RETURNING id`)).rows).toEqual([]);
    expect((await run(PROF2, `DELETE FROM announcements RETURNING id`)).rows).toEqual([]);
  });

  it('un professeur modifie et supprime les siennes ; l\'administrateur toutes', async () => {
    expect((await run(PROF, `UPDATE announcements SET title = 'Uniforme (corrigé)' WHERE author_id = '${PROF}' RETURNING id`)).rows.length).toBe(1);
    expect((await run(ADMIN, `UPDATE announcements SET title = 'Frais 2e trimestre (corrigé)' WHERE author_role = 'admin' RETURNING id`)).rows.length).toBeGreaterThan(0);
    expect((await run(PROF, `DELETE FROM announcements WHERE author_id = '${PROF}' RETURNING id`)).rows.length).toBe(1);
  });

  it('mettre à jour renouvelle updated_at ; created_at ne peut pas être réécrit', async () => {
    const { rows: [before] } = await db.query(`SELECT id, created_at, updated_at FROM announcements WHERE author_role = 'admin' ORDER BY id LIMIT 1`);
    await new Promise((r) => setTimeout(r, 30));
    await run(ADMIN, `UPDATE announcements SET body = 'montant corrigé', created_at = NOW() - INTERVAL '2 days' WHERE id = ${before.id}`);
    const { rows: [after] } = await db.query(`SELECT created_at, updated_at FROM announcements WHERE id = ${before.id}`);
    expect(new Date(after.created_at).getTime()).toBe(new Date(before.created_at).getTime());
    expect(new Date(after.updated_at).getTime()).toBeGreaterThan(new Date(before.updated_at).getTime());
  });

  it('le journal d\'audit garde la trace des changements de montant', async () => {
    const { rows } = await db.query(`SELECT action FROM audit_logs WHERE table_name = 'announcements' ORDER BY id`);
    expect(rows.length).toBeGreaterThan(3);
    expect(rows.map((r) => r.action)).toEqual(expect.arrayContaining(['INSERT', 'UPDATE', 'DELETE']));
  });
});

describe('avis dans la cloche (notify_announcement)', () => {
  let schoolWide;
  let classOne;
  beforeAll(async () => {
    schoolWide = (await publish(ADMIN, { title: 'Frais de duplicata', body: 'Un duplicata de bulletin coûte 2 000 FCFA.', amount: 2000 })).rows[0].id;
    classOne = (await publish(PROF, { title: 'Réunion 6ème A', category: 'autre', amount: null, class_id: 1, body: 'Samedi 9 h.' })).rows[0].id;
  });

  it("prévient tous les parents pour une info d'établissement, une seule fois chacun", async () => {
    const { rows: [r] } = await run(ADMIN, `SELECT notify_announcement($1) AS r`, [schoolWide]);
    expect(r.r).toEqual({ notified: 2, already: 0, parents: 2 });
    const { rows: [again] } = await run(ADMIN, `SELECT notify_announcement($1) AS r`, [schoolWide]);
    expect(again.r).toEqual({ notified: 0, already: 2, parents: 2 });
    const { rows } = await run(PARENT_A, `SELECT title, body, kind, link_view FROM notifications`);
    expect(rows).toEqual([{ title: 'Frais : Frais de duplicata', body: 'Un duplicata de bulletin coûte 2 000 FCFA.', kind: 'announcement', link_view: 'parents' }]);
  });

  it("ne prévient que les parents de la classe visée", async () => {
    const { rows: [r] } = await run(PROF, `SELECT notify_announcement($1) AS r`, [classOne]);
    expect(r.r).toMatchObject({ notified: 1, parents: 1 });
    expect((await run(PARENT_B, `SELECT title FROM notifications WHERE announcement_id = ${classOne}`)).rows).toEqual([]);
  });

  it("le secrétariat prévient les parents pour sa propre publication seulement", async () => {
    const { rows: [mine] } = await publish(SECRETAIRE, { title: 'Reçus', category: 'frais', amount: 500, body: 'Un reçu : 500 FCFA.' });
    const { rows: [r] } = await run(SECRETAIRE, `SELECT notify_announcement($1) AS r`, [mine.id]);
    expect(r.r).toMatchObject({ notified: 2, parents: 2 });
    await expect(run(SECRETAIRE, `SELECT notify_announcement($1)`, [schoolWide])).rejects.toThrow(/Réservé/);
    await db.exec(`DELETE FROM announcements WHERE id = ${mine.id}`);
  });

  it("réservé à l'auteur et à l'administrateur", async () => {
    await expect(run(PROF2, `SELECT notify_announcement($1)`, [classOne])).rejects.toThrow(/Réservé/);
    await expect(run(PROF, `SELECT notify_announcement($1)`, [schoolWide])).rejects.toThrow(/Réservé/);
    await expect(run(PARENT_A, `SELECT notify_announcement($1)`, [schoolWide])).rejects.toThrow(/Réservé/);
    await expect(run(ADMIN, `SELECT notify_announcement(999999)`)).rejects.toThrow(/introuvable/);
  });

  it('supprimer la publication supprime ses avis', async () => {
    await run(PROF, `DELETE FROM announcements WHERE id = ${classOne}`);
    expect((await db.query(`SELECT count(*)::int AS n FROM notifications WHERE announcement_id = ${classOne}`)).rows[0].n).toBe(0);
  });

  it('les avis de notes (notifications.sql) fonctionnent toujours', async () => {
    const { rows: [r] } = await run(ADMIN, `SELECT notify_class_parents(1, '1') AS r`);
    expect(r.r.notified).toBe(1);
  });
});

describe('ré-exécution', () => {
  it('le script peut être relancé sans erreur ni doublon de règle', async () => {
    await db.exec(readScript('announcements.sql'));
    await db.exec(readScript('announcements.sql'));
    const { rows } = await db.query(`SELECT count(*)::int AS n FROM pg_policies WHERE tablename = 'announcements'`);
    expect(rows[0].n).toBe(5);
  });
});
