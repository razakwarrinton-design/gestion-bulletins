// Journal des incidents (sql/client-errors.sql) sur un vrai PostgreSQL : qui peut écrire, qui peut lire,
// et les bornes qui empêchent d'en faire une décharge de données ou un moyen de saturer la base.
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
  'client-errors.sql',
];

const ADMIN = '00000000-0000-0000-0000-00000000000a';
const PROF = '00000000-0000-0000-0000-0000000000b1';
const PARENT = '00000000-0000-0000-0000-0000000000d1';

let db;
const run = (userId, sql, params) => asUser(db, userId, () => db.query(sql, params));
const report = (userId, overrides = {}) => run(userId,
  `INSERT INTO client_errors (user_id, source, route, message, stack) VALUES ($1, $2, $3, $4, $5)`,
  [overrides.user_id ?? userId, overrides.source ?? 'window', overrides.route ?? 'grades', overrides.message ?? 'x is undefined', overrides.stack ?? 'at f (app.js:1:1)']);

beforeAll(async () => {
  db = await createDatabase(SCRIPTS);
  for (const [id, email] of [[ADMIN, 'admin@ecole.test'], [PROF, 'prof@ecole.test'], [PARENT, 'p@parents.test']]) {
    await db.exec(`INSERT INTO auth.users (id, email) VALUES ('${id}', '${email}')`);
  }
  await db.exec(`
    UPDATE user_profiles SET role = 'admin' WHERE id = '${ADMIN}';
    UPDATE user_profiles SET role = 'professeur' WHERE id = '${PROF}';
    UPDATE user_profiles SET role = 'parent' WHERE id = '${PARENT}';
  `);
}, 120000);

afterAll(async () => { await db?.close(); });

describe('écriture', () => {
  it('un compte connecté signale une erreur à son nom', async () => {
    await report(PROF);
    const { rows } = await db.query(`SELECT user_id, route FROM client_errors`);
    expect(rows).toEqual([{ user_id: PROF, route: 'grades' }]);
  });

  it("refuse un rapport écrit au nom d'un autre compte", async () => {
    await expect(report(PROF, { user_id: ADMIN })).rejects.toThrow(/row-level security/);
  });

  it('refuse un visiteur sans compte', async () => {
    await expect(report(null, { user_id: PROF })).rejects.toThrow();
  });

  it('refuse un message ou une pile démesurés, ou une source inconnue', async () => {
    await expect(report(PROF, { message: 'm'.repeat(501) })).rejects.toThrow(/check/i);
    await expect(report(PROF, { stack: 's'.repeat(4001) })).rejects.toThrow(/check/i);
    await expect(report(PROF, { source: 'inconnue' })).rejects.toThrow(/check/i);
  });

  it('limite à 50 rapports par compte et par heure', async () => {
    await db.exec(`DELETE FROM client_errors`);
    for (let i = 0; i < 50; i += 1) await report(PARENT);
    await expect(report(PARENT)).rejects.toThrow(/Trop de rapports/);
    // la limite est propre à chaque compte
    await expect(report(PROF)).resolves.toBeTruthy();
  }, 60000);
});

describe('lecture et conservation', () => {
  it('seuls les administrateurs lisent le journal', async () => {
    expect((await run(ADMIN, `SELECT id FROM client_errors`)).rows.length).toBeGreaterThan(0);
    expect((await run(PROF, `SELECT id FROM client_errors`)).rows).toEqual([]);
    expect((await run(PARENT, `SELECT id FROM client_errors`)).rows).toEqual([]);
    expect((await run(null, `SELECT id FROM client_errors`)).rows).toEqual([]);
  });

  it('personne ne modifie ni ne supprime une ligne par l\'API', async () => {
    await expect(run(ADMIN, `UPDATE client_errors SET message = 'x'`)).rejects.toThrow(/permission denied/);
    await expect(run(ADMIN, `DELETE FROM client_errors`)).rejects.toThrow(/permission denied/);
  });

  it('la purge est réservée aux administrateurs et ne supprime que le plus ancien', async () => {
    await db.exec(`UPDATE client_errors SET created_at = NOW() - INTERVAL '40 days' WHERE id IN (SELECT id FROM client_errors LIMIT 5)`);
    await expect(run(PROF, `SELECT purge_client_errors(30)`)).rejects.toThrow(/Réservé aux administrateurs/);
    const { rows } = await run(ADMIN, `SELECT purge_client_errors(30) AS n`);
    expect(Number(rows[0].n)).toBe(5);
  });
});

describe('ré-exécution', () => {
  it('le script peut être relancé sans erreur ni doublon de règle', async () => {
    await db.exec(readScript('client-errors.sql'));
    await db.exec(readScript('client-errors.sql'));
    const { rows } = await db.query(`SELECT count(*)::int AS n FROM pg_policies WHERE tablename = 'client_errors'`);
    expect(rows[0].n).toBe(2);
  });
});
