// Banc d'essai SQL : un vrai PostgreSQL (PGlite, en WebAssembly) avec une simulation minimale de
// l'environnement Supabase (schéma auth, auth.uid(), rôles anon / authenticated).
// Les scripts SQL du dépôt sont exécutés tels quels, dans l'ordre d'installation, puis on
// interroge la base « en tant que » un utilisateur donné pour vérifier ce que le RLS autorise.
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const sqlDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const SUPABASE_STUB = `
  CREATE SCHEMA IF NOT EXISTS auth;
  CREATE TABLE auth.users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email text UNIQUE,
    raw_user_meta_data jsonb DEFAULT '{}'::jsonb,
    last_sign_in_at timestamptz,
    confirmed_at timestamptz
  );
  CREATE PUBLICATION supabase_realtime;
  CREATE ROLE anon NOLOGIN;
  CREATE ROLE authenticated NOLOGIN;
  CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
    SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
  $$;
  GRANT USAGE ON SCHEMA public TO anon, authenticated;
  GRANT USAGE ON SCHEMA auth TO anon, authenticated;
  GRANT EXECUTE ON FUNCTION auth.uid() TO anon, authenticated;
  -- Comme sur Supabase : tout objet créé dans public est accessible aux rôles API ;
  -- c'est le RLS qui décide des lignes visibles.
  ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated;
  ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated;
  ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO anon, authenticated;
`;

export const readScript = (name) => readFileSync(path.join(sqlDir, name), 'utf8');

/** Crée la base et exécute les scripts d'installation, dans l'ordre. */
async function buildDatabase(scripts) {
  const db = new PGlite();
  try {
    await db.exec(SUPABASE_STUB);
    for (const script of scripts) {
      try {
        await db.exec(readScript(script));
      } catch (error) {
        throw new Error(`Échec du script ${script} : ${error.message}`);
      }
    }
    return db;
  } catch (error) {
    await db.close().catch(() => {});
    throw error;
  }
}

/**
 * Le moteur PostgreSQL tourne en WebAssembly : lorsque la machine est très chargée (tous les fichiers de
 * test démarrent en parallèle), son démarrage peut échouer de façon passagère. Une seule nouvelle tentative
 * suffit ; une erreur dans un script SQL, elle, échoue deux fois et reste visible avec son message.
 */
export async function createDatabase(scripts) {
  try {
    return await buildDatabase(scripts);
  } catch (firstError) {
    console.warn(`Création de la base de test échouée (${firstError.message}), nouvelle tentative…`);
    return buildDatabase(scripts);
  }
}

/** Exécute `fn` en tant qu'utilisateur authentifié (ou anonyme si userId est null). */
export async function asUser(db, userId, fn) {
  await db.exec(`SELECT set_config('request.jwt.claim.sub', '${userId ?? ''}', false)`);
  await db.exec(`SET ROLE ${userId ? 'authenticated' : 'anon'}`);
  try {
    return await fn();
  } finally {
    await db.exec('RESET ROLE');
    await db.exec(`SELECT set_config('request.jwt.claim.sub', '', false)`);
  }
}
