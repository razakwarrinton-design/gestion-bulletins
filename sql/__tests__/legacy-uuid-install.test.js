// Installation sur une base existante dont les tables métier ont des identifiants uuid (cas d'une vraie
// installation Supabase créée avant ces scripts). Le schéma de départ ci-dessous reproduit la liste des
// tables et colonnes relevée sur cette base : noms et types seulement, pas les contraintes ni les
// politiques d'origine, qui n'ont pas pu être lues.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createDatabase, readScript } from './harness';

const ADMIN = '00000000-0000-0000-0000-00000000000a';

const LEGACY_SCHEMA = `
  CREATE TABLE user_profiles (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email text UNIQUE NOT NULL, first_name text, last_name text,
    role text CHECK (role IN ('admin', 'professeur', 'secretaire')) DEFAULT 'secretaire',
    created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
  );
  CREATE TABLE app_data (key text, value jsonb, updated_at timestamp DEFAULT now());
  CREATE TABLE classes (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text, created_at timestamp DEFAULT now(), level text);
  CREATE TABLE subjects (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text, created_at timestamp DEFAULT now(), coefficient numeric);
  CREATE TABLE students (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text, class_id uuid REFERENCES classes(id),
    created_at timestamp DEFAULT now(), first_name text, last_name text, bulletin_access boolean, birth_date date,
    gender text, photo_url text, emergency_name text, emergency_phone text, emergency_relation text);
  CREATE TABLE grades (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), student_id uuid REFERENCES students(id),
    subject_id uuid REFERENCES subjects(id), grade numeric, created_at timestamp DEFAULT now(), value numeric,
    appreciation text, trimester text, academic_year text, interro numeric, devoir numeric, composition numeric, teacher_name text);
  CREATE TABLE absences (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), student_id uuid REFERENCES students(id), date date,
    type text, justified boolean, subject_id uuid, notes text, recorded_by uuid, created_at timestamptz DEFAULT now());
  CREATE TABLE activities (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_name text, user_role text, action text,
    details text, created_at timestamp DEFAULT now());
  CREATE TABLE bonus (id bigint PRIMARY KEY, created_at timestamptz DEFAULT now(), bonus real);
  CREATE TABLE conversations (id text PRIMARY KEY, user1_id uuid, user2_id uuid, user1_type text, user2_type text,
    created_at timestamp DEFAULT now(), updated_at timestamp DEFAULT now());
  CREATE TABLE messages (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), conversation_id text, sender_id uuid, sender_type text,
    content text, is_read boolean, created_at timestamp DEFAULT now());
  CREATE TABLE fee_types (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text, amount numeric, description text,
    academic_year text, is_mandatory boolean, created_at timestamptz DEFAULT now());
  CREATE TABLE parent_students (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), parent_id uuid, student_id uuid, created_at timestamptz DEFAULT now());
  CREATE TABLE payments (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), student_id uuid, fee_type_id uuid, amount_paid numeric,
    amount_due numeric, payment_date date, payment_method text, status text, receipt_number text, notes text,
    recorded_by uuid, academic_year text, created_at timestamptz DEFAULT now());
  CREATE TABLE users (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), username text, password text, role text, created_at timestamp DEFAULT now());
  CREATE VIEW v_users AS SELECT id, email, first_name, last_name, role FROM user_profiles;
  CREATE VIEW v_parent_dashboard AS SELECT s.id AS student_id, s.first_name, g.value AS grade_value FROM students s JOIN grades g ON g.student_id = s.id;
  CREATE FUNCTION public.is_parent_of(p_student uuid) RETURNS boolean LANGUAGE sql AS $$ SELECT true $$;
  -- politiques posées par l'ancien script de base
  ALTER TABLE app_data ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "Permettre lecture pour tous" ON app_data FOR SELECT USING (true);
  -- politiques d'une ancienne exécution du script de sécurité (relevées sur la base réelle : « Lecture pour
  -- utilisateurs authentifiés » existait déjà et faisait échouer la création)
  CREATE POLICY "Lecture pour utilisateurs authentifiés" ON app_data FOR SELECT USING (auth.uid() IS NOT NULL);
  CREATE POLICY "Insertion pour admins et professeurs" ON app_data FOR INSERT WITH CHECK (true);
  CREATE POLICY "Mise à jour selon rôle" ON app_data FOR UPDATE USING (true);
  CREATE POLICY "Suppression pour admins seulement" ON app_data FOR DELETE USING (true);
  CREATE POLICY "Permettre tout pour classes" ON classes FOR ALL USING (true) WITH CHECK (true);
  ALTER TABLE classes ENABLE ROW LEVEL SECURITY;

  INSERT INTO auth.users (id, email) VALUES ('${ADMIN}', 'admin@ecole.test');
  INSERT INTO user_profiles (id, email, first_name, last_name, role) VALUES ('${ADMIN}', 'admin@ecole.test', 'Ad', 'Min', 'admin');
  INSERT INTO app_data (key, value) VALUES ('schoolInfo', '{"name":"Mon école"}');
  INSERT INTO classes (name) VALUES ('6ème A');
  INSERT INTO users (username, password, role) VALUES ('admin', 'secret', 'admin');
`;

const INSTALL = [
  'reset-legacy-schema.sql',
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

// Comme l'éditeur SQL de Supabase : tout le texte d'un coup, en une seule requête.
const oneShot = (names) => names.map(readScript).join('\n\n');

let db;

beforeAll(async () => {
  db = await createDatabase([]);
  await db.exec(LEGACY_SCHEMA);
  await db.exec(oneShot(INSTALL));
}, 120000);

afterAll(async () => { await db?.close(); });

describe('installation sur une base aux identifiants uuid', () => {
  it('recrée les tables métier avec les identifiants du dépôt', async () => {
    const { rows } = await db.query(`
      SELECT table_name, data_type FROM information_schema.columns
      WHERE table_schema = 'public' AND column_name = 'id' AND table_name IN ('students', 'classes', 'subjects')
      ORDER BY table_name`);
    expect(rows.map((r) => r.data_type)).toEqual(['bigint', 'bigint', 'bigint']);
    // absences : son identifiant est un uuid dans les scripts, mais elle référence les élèves en numérique
    const { rows: [a] } = await db.query(`
      SELECT data_type FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'absences' AND column_name = 'student_id'`);
    expect(a.data_type).toBe('bigint');
  });

  it('conserve les comptes, leurs rôles et les réglages', async () => {
    const { rows: [p] } = await db.query(`SELECT role FROM user_profiles WHERE id = '${ADMIN}'`);
    expect(p.role).toBe('admin');
    const { rows: [s] } = await db.query(`SELECT value FROM app_data WHERE key = 'schoolInfo'`);
    expect(s.value).toEqual({ name: 'Mon école' });
  });

  it('supprime les données de démonstration, la table users et les anciennes vues', async () => {
    const { rows: [c] } = await db.query(`SELECT count(*)::int AS n FROM classes`);
    expect(c.n).toBe(0);
    const { rows: gone } = await db.query(`
      SELECT relname FROM pg_class WHERE relnamespace = 'public'::regnamespace
        AND relname IN ('users', 'bonus', 'v_parent_dashboard')`);
    expect(gone).toEqual([]);
  });

  it("n'a plus qu'une seule version de is_parent_of (numérique)", async () => {
    const { rows } = await db.query(`
      SELECT pg_get_function_identity_arguments(oid) AS args FROM pg_proc
      WHERE pronamespace = 'public'::regnamespace AND proname = 'is_parent_of'`);
    expect(rows).toEqual([{ args: 'p_student bigint' }]);
  });

  it('crée les tables des nouvelles fonctions (appréciations, audit)', async () => {
    const { rows } = await db.query(`
      SELECT relname FROM pg_class WHERE relnamespace = 'public'::regnamespace AND relkind = 'r'
        AND relname IN ('appreciations', 'audit_logs', 'activities') ORDER BY relname`);
    expect(rows.map((r) => r.relname)).toEqual(['activities', 'appreciations', 'audit_logs']);
  });

  it('supporte une seconde exécution complète, sans la remise à zéro', async () => {
    await expect(db.exec(oneShot(INSTALL.slice(1)))).resolves.not.toThrow();
  }, 120000);

  it('supporte de relancer toute la procédure, remise à zéro comprise (nouvel essai après une erreur)', async () => {
    await expect(db.exec(oneShot(INSTALL))).resolves.not.toThrow();
    const { rows: [p] } = await db.query(`SELECT role FROM user_profiles WHERE id = '${ADMIN}'`);
    expect(p.role).toBe('admin');
  }, 120000);
});
