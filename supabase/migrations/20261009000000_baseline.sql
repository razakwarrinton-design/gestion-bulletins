-- Migration de référence : état de la base obtenu en exécutant, dans l'ordre, les scripts de sql/.
-- Fichier GÉNÉRÉ par scripts/build-baseline.mjs (npm run sql:baseline) : ne pas le modifier à la main,
-- modifier les scripts de sql/ puis régénérer. Les évolutions futures vont dans de NOUVELLES migrations.

-- >>>>>>>>>> supabase-schema.sql <<<<<<<<<<
-- ============================================
-- SCHÉMA SUPABASE POUR GESTION DE BULLETINS
-- ============================================
-- À exécuter dans l'éditeur SQL de Supabase

-- 1. Créer la table principale app_data
-- Cette table stocke toutes les données de l'application
CREATE TABLE IF NOT EXISTS app_data (
  id BIGSERIAL PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_app_data_key ON app_data(key);
CREATE INDEX IF NOT EXISTS idx_app_data_updated_at ON app_data(updated_at);

-- 2. Fonction pour mettre à jour automatiquement updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour mettre à jour automatiquement updated_at
DROP TRIGGER IF EXISTS update_app_data_updated_at ON app_data;
CREATE TRIGGER update_app_data_updated_at
  BEFORE UPDATE ON app_data
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 3. POLITIQUES RLS (Row Level Security)
-- Activer RLS sur la table
ALTER TABLE app_data ENABLE ROW LEVEL SECURITY;

-- Politique : Lecture publique (tous les utilisateurs authentifiés)
DROP POLICY IF EXISTS "Permettre lecture pour tous" ON app_data;
CREATE POLICY "Permettre lecture pour tous" ON app_data
  FOR SELECT
  USING (true);

-- Politique : Écriture publique (tous les utilisateurs authentifiés)
DROP POLICY IF EXISTS "Permettre écriture pour tous" ON app_data;
CREATE POLICY "Permettre écriture pour tous" ON app_data
  FOR INSERT
  WITH CHECK (true);

-- Politique : Mise à jour publique
DROP POLICY IF EXISTS "Permettre mise à jour pour tous" ON app_data;
CREATE POLICY "Permettre mise à jour pour tous" ON app_data
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Politique : Suppression publique
DROP POLICY IF EXISTS "Permettre suppression pour tous" ON app_data;
CREATE POLICY "Permettre suppression pour tous" ON app_data
  FOR DELETE
  USING (true);

-- 4. TABLES ADDITIONNELLES POUR STRUCTURE NORMALISÉE (OPTIONNEL)
-- Si vous souhaitez une structure plus normalisée dans le futur

-- Table des classes
CREATE TABLE IF NOT EXISTS classes (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  level TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table des élèves
CREATE TABLE IF NOT EXISTS students (
  id BIGSERIAL PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  class_id BIGINT REFERENCES classes(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table des matières
CREATE TABLE IF NOT EXISTS subjects (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  coefficient NUMERIC(5,2) DEFAULT 1.0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table des notes
CREATE TABLE IF NOT EXISTS grades (
  id TEXT PRIMARY KEY,
  student_id BIGINT REFERENCES students(id) ON DELETE CASCADE,
  subject_id BIGINT REFERENCES subjects(id) ON DELETE CASCADE,
  trimester TEXT NOT NULL,
  value NUMERIC(5,2) NOT NULL,
  appreciation TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, subject_id, trimester)
);

-- NOTE : pas de table `users` maison ici. L'authentification passe par Supabase Auth
-- (auth.users) + la table `user_profiles` créée dans supabase-security-rls.sql, qui
-- gère les mots de passe de façon sécurisée (hash côté Supabase). Une table `users`
-- avec mot de passe en TEXT en clair existait ici auparavant — supprimée, voir la
-- section 12 de supabase-security-rls.sql pour le nettoyage si tu l'avais déjà créée.

-- Table des activités (logs)
CREATE TABLE IF NOT EXISTS activities (
  id BIGSERIAL PRIMARY KEY,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  user_name TEXT,
  user_role TEXT,
  action TEXT,
  details TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour performances
CREATE INDEX IF NOT EXISTS idx_students_class ON students(class_id);
CREATE INDEX IF NOT EXISTS idx_grades_student ON grades(student_id);
CREATE INDEX IF NOT EXISTS idx_grades_subject ON grades(subject_id);
CREATE INDEX IF NOT EXISTS idx_grades_trimester ON grades(trimester);
CREATE INDEX IF NOT EXISTS idx_activities_timestamp ON activities(timestamp DESC);

-- 5. ACTIVER RLS SUR LES TABLES ADDITIONNELLES
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

-- ⚠️ Politiques temporaires "accès public" pour permettre l'insertion des données de
-- démo ci-dessous juste après la création des tables. Elles sont immédiatement
-- resserrées par supabase-security-rls.sql (section 10) qu'il FAUT exécuter juste
-- après ce script — ne restez jamais en production avec ces policies USING(true).
DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename IN ('classes', 'students', 'subjects', 'grades', 'activities')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Permettre tout pour %I" ON %I', t, t);
    EXECUTE format('CREATE POLICY "Permettre tout pour %I" ON %I FOR ALL USING (true) WITH CHECK (true)', t, t);
  END LOOP;
END $$;

-- 6. INSERTION DE DONNÉES PAR DÉFAUT
-- Le premier compte admin se crée via Supabase Auth (Authentication → Users → Add user),
-- pas ici en clair — voir les instructions post-installation de supabase-security-rls.sql.

-- Insérer les données initiales dans app_data
INSERT INTO app_data (key, value)
VALUES
  ('classes', '[]'::jsonb),
  ('students', '[]'::jsonb),
  ('subjects', '[]'::jsonb),
  ('grades', '[]'::jsonb),
  ('schoolInfo', '{"name":"ÉTABLISSEMENT SCOLAIRE","address":"Adresse de l''établissement","phone":"+33 XXX XXX XXX","email":"contact@ecole.com"}'::jsonb),
  ('appColors', '{"primary":"#2563eb","secondary":"#10b981","accent":"#f59e0b"}'::jsonb),
  ('activities', '[]'::jsonb),
  ('academicYears', '[{"id":1,"year":"2024-2025","startDate":"2024-09-01","endDate":"2025-06-30","trimesters":[{"number":1,"startDate":"2024-09-01","endDate":"2024-12-15"},{"number":2,"startDate":"2025-01-01","endDate":"2025-04-15"},{"number":3,"startDate":"2025-04-16","endDate":"2025-06-30"}],"isActive":true,"createdAt":"2024-08-01T00:00:00.000Z"}]'::jsonb),
  ('appreciations', '[]'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- ============================================
-- FIN DU SCHÉMA
-- ============================================

-- Pour vérifier que tout fonctionne :
SELECT * FROM app_data;


-- >>>>>>>>>> grades-alignment.sql <<<<<<<<<<
-- ============================================================================
-- ALIGNEMENT DE LA TABLE grades SUR LE CODE DE L'APPLICATION
-- À exécuter dans l'éditeur SQL de Supabase. Ré-exécutable (aucun effet si déjà appliqué).
-- À lancer AVANT ou APRÈS sql/security-hardening.sql : ce script ne touche pas aux politiques RLS.
--
-- Pourquoi : src/hooks/useGrades.js lit et écrit les colonnes academic_year, interro, devoir,
-- composition, bonus et teacher_name, et enregistre avec
--   onConflict: student_id, subject_id, trimester, academic_year
-- alors que sql/supabase-schema.sql ne définit aucune de ces colonnes, rend `value` obligatoire
-- (effacer une note échouait) et limite l'unicité à (élève, matière, trimestre) : une même note ne
-- pouvait donc pas exister sur deux années scolaires.
--
-- Les notes déjà présentes sans année sont rattachées à 2024-2025 (année par défaut de
-- l'application jusqu'ici). Changez la valeur ci-dessous si ce n'est pas la bonne.
-- ============================================================================

-- ── 1. Colonnes manquantes ──────────────────────────────────────────────────
ALTER TABLE grades ADD COLUMN IF NOT EXISTS academic_year TEXT;
ALTER TABLE grades ADD COLUMN IF NOT EXISTS interro       NUMERIC(5,2);
ALTER TABLE grades ADD COLUMN IF NOT EXISTS devoir        NUMERIC(5,2);
ALTER TABLE grades ADD COLUMN IF NOT EXISTS composition   NUMERIC(5,2);
ALTER TABLE grades ADD COLUMN IF NOT EXISTS bonus         NUMERIC(5,2);
ALTER TABLE grades ADD COLUMN IF NOT EXISTS teacher_name  TEXT;

UPDATE grades SET academic_year = '2024-2025' WHERE academic_year IS NULL;
ALTER TABLE grades ALTER COLUMN academic_year SET NOT NULL;

-- ── 2. Une note peut être effacée (valeur vide) ─────────────────────────────
ALTER TABLE grades ALTER COLUMN value DROP NOT NULL;

-- ── 3. Identifiant généré par la base si le client n'en fournit pas ─────────
DO $$
DECLARE
  id_type TEXT;
BEGIN
  SELECT data_type INTO id_type
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'grades' AND column_name = 'id';

  IF id_type = 'text' THEN
    ALTER TABLE grades ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;
  END IF;
  -- bigint / uuid : la colonne a déjà (ou doit avoir) son propre générateur, on n'y touche pas.
END $$;

-- ── 4. Unicité par année scolaire (cible de l'upsert de l'application) ──────
-- L'ancienne unicité (élève, matière, trimestre) empêcherait d'enregistrer la même note sur deux années.
-- Elle est supprimée quel que soit son nom (une base modifiée à la main peut l'avoir nommée autrement),
-- qu'elle soit déclarée comme contrainte ou comme simple index unique.
DO $$
DECLARE
  c RECORD;
BEGIN
  FOR c IN
    SELECT con.conname
    FROM pg_constraint con
    WHERE con.conrelid = 'public.grades'::regclass
      AND con.contype = 'u'
      AND (SELECT array_agg(att.attname::text ORDER BY att.attname)
           FROM unnest(con.conkey) AS k
           JOIN pg_attribute att ON att.attrelid = con.conrelid AND att.attnum = k)
          = ARRAY['student_id', 'subject_id', 'trimester']
  LOOP
    EXECUTE format('ALTER TABLE public.grades DROP CONSTRAINT %I', c.conname);
  END LOOP;

  FOR c IN
    SELECT i.indexrelid::regclass AS idx
    FROM pg_index i
    WHERE i.indrelid = 'public.grades'::regclass
      AND i.indisunique AND NOT i.indisprimary AND i.indpred IS NULL
      AND NOT EXISTS (SELECT 1 FROM pg_constraint con WHERE con.conindid = i.indexrelid)
      AND (SELECT array_agg(att.attname::text ORDER BY att.attname)
           FROM unnest(string_to_array(i.indkey::text, ' ')::INT[]) AS k
           JOIN pg_attribute att ON att.attrelid = i.indrelid AND att.attnum = k)
          = ARRAY['student_id', 'subject_id', 'trimester']
  LOOP
    EXECUTE format('DROP INDEX %s', c.idx);
  END LOOP;
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS grades_student_subject_trimester_year_key
  ON grades (student_id, subject_id, trimester, academic_year);
CREATE INDEX IF NOT EXISTS grades_academic_year_idx ON grades (academic_year);

-- ── 5. Notes comprises entre 0 et 20 (bonus : 0 à 5) ────────────────────────
-- NOT VALID : appliqué aux nouvelles écritures sans bloquer le script si d'anciennes lignes sont
-- hors limites. Pour contrôler l'existant, puis valider :
--   SELECT id, value, interro, devoir, composition, bonus FROM grades
--   WHERE value NOT BETWEEN 0 AND 20 OR interro NOT BETWEEN 0 AND 20
--      OR devoir NOT BETWEEN 0 AND 20 OR composition NOT BETWEEN 0 AND 20 OR bonus NOT BETWEEN 0 AND 5;
--   ALTER TABLE grades VALIDATE CONSTRAINT grades_value_range;   (idem pour les autres)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'grades_value_range') THEN
    ALTER TABLE grades ADD CONSTRAINT grades_value_range
      CHECK (value IS NULL OR value BETWEEN 0 AND 20) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'grades_subnotes_range') THEN
    ALTER TABLE grades ADD CONSTRAINT grades_subnotes_range
      CHECK (
        (interro     IS NULL OR interro     BETWEEN 0 AND 20) AND
        (devoir      IS NULL OR devoir      BETWEEN 0 AND 20) AND
        (composition IS NULL OR composition BETWEEN 0 AND 20)
      ) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'grades_bonus_range') THEN
    ALTER TABLE grades ADD CONSTRAINT grades_bonus_range
      CHECK (bonus IS NULL OR bonus BETWEEN 0 AND 5) NOT VALID;
  END IF;
END $$;


-- >>>>>>>>>> supabase-security-rls.sql <<<<<<<<<<
-- ============================================
-- SÉCURITÉ RLS ET AUTHENTIFICATION SUPABASE
-- Gestion de Bulletins Scolaires
-- ============================================

-- 1. ACTIVER L'AUTHENTIFICATION EMAIL DANS SUPABASE
-- Avant d'exécuter ce script :
-- 1. Allez dans Authentication → Providers
-- 2. Activez "Email" provider
-- 3. Configurez les paramètres (confirmation email optionnelle)

-- 2. CRÉER UNE TABLE POUR LES PROFILS UTILISATEURS
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  first_name TEXT,
  last_name TEXT,
  role TEXT CHECK (role IN ('admin', 'professeur', 'secretaire', 'parent')) DEFAULT 'secretaire',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ⚠️ BUG CORRIGÉ : la contrainte CHECK ci-dessus n'incluait pas 'parent' alors que
-- ParentPortal.jsx / useParent.js / ParentAssignModal.jsx supposent tous ce rôle.
-- Si la table existait déjà en base avec l'ancienne contrainte, aucun compte parent
-- n'a jamais pu être créé (rejeté par Postgres). On corrige la contrainte existante :
ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_role_check;
ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_role_check
  CHECK (role IN ('admin', 'professeur', 'secretaire', 'parent'));

-- Index pour performances
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);

-- Trigger pour mettre à jour updated_at
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 3. FONCTION POUR CRÉER AUTOMATIQUEMENT UN PROFIL À L'INSCRIPTION
-- ⚠️ SÉCURITÉ : le rôle N'EST JAMAIS pris depuis raw_user_meta_data.
-- Ce champ est fourni par le client lors de l'inscription (auth.signUp options.data),
-- donc un attaquant pourrait y mettre role: "admin" pour s'auto-promouvoir.
-- Tout nouveau compte est donc forcé à 'secretaire' ; seule une mise à jour
-- ultérieure par un admin (policy "Les admins peuvent tout modifier") peut élever un rôle.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, first_name, last_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    'secretaire'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger pour créer le profil automatiquement
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 4. FONCTION HELPER POUR OBTENIR LE RÔLE DE L'UTILISATEUR CONNECTÉ
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.user_profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- 5. ACTIVER RLS SUR user_profiles
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Politiques pour user_profiles
DROP POLICY IF EXISTS "Les utilisateurs peuvent voir leur propre profil" ON user_profiles;
DROP POLICY IF EXISTS "Les admins peuvent tout voir" ON user_profiles;
DROP POLICY IF EXISTS "Les utilisateurs peuvent modifier leur propre profil" ON user_profiles;
DROP POLICY IF EXISTS "Les admins peuvent tout modifier" ON user_profiles;

CREATE POLICY "Les utilisateurs peuvent voir leur propre profil" 
  ON user_profiles FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Les admins peuvent tout voir"
  ON user_profiles FOR SELECT
  USING (public.get_user_role() = 'admin');

-- Annuaire pour la messagerie (chat) : un parent doit pouvoir lister les
-- professeurs/admin pour démarrer une conversation, un professeur doit pouvoir
-- lister les parents. Cohérent avec le choix déjà fait pour classes/students/subjects
-- ("lecture large pour tout authentifié, écriture restreinte").
DROP POLICY IF EXISTS "Lecture annuaire authentifié" ON user_profiles;
CREATE POLICY "Lecture annuaire authentifié" ON user_profiles FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Les utilisateurs peuvent modifier leur propre profil" 
  ON user_profiles FOR UPDATE 
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Les admins peuvent tout modifier"
  ON user_profiles FOR UPDATE
  USING (public.get_user_role() = 'admin')
  WITH CHECK (public.get_user_role() = 'admin');

-- ⚠️ SÉCURITÉ : la policy "modifier son propre profil" ci-dessus autorise un
-- utilisateur à changer N'IMPORTE QUELLE colonne de sa propre ligne, y compris `role`.
-- RLS ne permet pas de restreindre une policy à certaines colonnes : on verrouille
-- donc `role` avec un trigger qui annule toute tentative de le changer soi-même.
CREATE OR REPLACE FUNCTION public.prevent_self_role_escalation()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role AND public.get_user_role() <> 'admin' THEN
    NEW.role := OLD.role;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS enforce_role_immutable_by_self ON user_profiles;
CREATE TRIGGER enforce_role_immutable_by_self
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_self_role_escalation();

-- 6. POLITIQUES RLS POUR app_data SELON LES RÔLES

-- Supprimer les anciennes politiques permissives
DROP POLICY IF EXISTS "Permettre lecture pour tous" ON app_data;
DROP POLICY IF EXISTS "Permettre écriture pour tous" ON app_data;
DROP POLICY IF EXISTS "Permettre mise à jour pour tous" ON app_data;
DROP POLICY IF EXISTS "Permettre suppression pour tous" ON app_data;

-- (Ces politiques peuvent déjà exister si ce script, ou une ancienne version, a été exécuté.)
DROP POLICY IF EXISTS "Lecture pour utilisateurs authentifiés" ON app_data;
DROP POLICY IF EXISTS "Insertion pour admins et professeurs" ON app_data;
DROP POLICY IF EXISTS "Mise à jour selon rôle" ON app_data;
DROP POLICY IF EXISTS "Suppression pour admins seulement" ON app_data;

-- LECTURE : Tous les utilisateurs authentifiés peuvent lire
CREATE POLICY "Lecture pour utilisateurs authentifiés"
  ON app_data FOR SELECT 
  USING (auth.uid() IS NOT NULL);

-- INSERTION : Admins et Professeurs seulement
CREATE POLICY "Insertion pour admins et professeurs" 
  ON app_data FOR INSERT 
  WITH CHECK (
    public.get_user_role() IN ('admin', 'professeur')
  );

-- MISE À JOUR : Règles par clé
CREATE POLICY "Mise à jour selon rôle" 
  ON app_data FOR UPDATE 
  USING (
    CASE 
      -- Admins peuvent tout modifier
      WHEN public.get_user_role() = 'admin' THEN true
      
      -- Professeurs peuvent modifier : notes, appréciations, activités
      WHEN public.get_user_role() = 'professeur' AND key IN (
        'grades', 'appreciations', 'activities'
      ) THEN true
      
      -- Secrétaires peuvent modifier : activités seulement
      WHEN public.get_user_role() = 'secretaire' AND key IN (
        'activities'
      ) THEN true
      
      ELSE false
    END
  )
  WITH CHECK (
    CASE 
      WHEN public.get_user_role() = 'admin' THEN true
      WHEN public.get_user_role() = 'professeur' AND key IN (
        'grades', 'appreciations', 'activities'
      ) THEN true
      WHEN public.get_user_role() = 'secretaire' AND key IN (
        'activities'
      ) THEN true
      ELSE false
    END
  );

-- SUPPRESSION : Admins seulement
CREATE POLICY "Suppression pour admins seulement" 
  ON app_data FOR DELETE 
  USING (public.get_user_role() = 'admin');

-- 7. CRÉER UN UTILISATEUR ADMIN PAR DÉFAUT
-- IMPORTANT : Changez le mot de passe après la première connexion !

-- Cette fonction permet de créer un admin même sans être connecté
CREATE OR REPLACE FUNCTION public.create_admin_user(
  admin_email TEXT,
  admin_password TEXT,
  admin_first_name TEXT,
  admin_last_name TEXT
)
RETURNS JSON AS $$
DECLARE
  new_user_id UUID;
BEGIN
  -- Vérifier si l'email existe déjà
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = admin_email) THEN
    RETURN json_build_object('error', 'Email déjà utilisé');
  END IF;

  -- Créer l'utilisateur dans auth.users (vous devrez le faire via l'interface Supabase)
  -- Cette fonction est un placeholder - utilisez l'interface Supabase pour créer le premier admin
  
  RETURN json_build_object(
    'message', 'Utilisez l''interface Supabase Authentication pour créer le premier admin',
    'email', admin_email
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. VÉRIFICATION DES POLITIQUES
-- Vérifier que tout est bien configuré
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN ('app_data', 'user_profiles')
ORDER BY tablename, policyname;

-- 9. CRÉER UNE VUE POUR FACILITER LA GESTION DES UTILISATEURS
CREATE OR REPLACE VIEW v_users AS
SELECT 
  up.id,
  up.email,
  up.first_name,
  up.last_name,
  up.role,
  up.created_at,
  au.last_sign_in_at,
  au.confirmed_at
FROM user_profiles up
LEFT JOIN auth.users au ON up.id = au.id;

-- Permission pour que les admins voient cette vue
GRANT SELECT ON v_users TO authenticated;

-- ============================================
-- INSTRUCTIONS POST-INSTALLATION
-- ============================================

-- 1. Activer l'authentification Email dans Supabase :
--    Authentication → Providers → Email (Enable)

-- 2. Créer le premier utilisateur admin via l'interface Supabase :
--    Authentication → Users → Add user (mot de passe fort et unique), puis le promouvoir :
--      UPDATE user_profiles SET role = 'admin' WHERE email = 'votre-adresse@exemple.com';
--    (Les métadonnées d'inscription ne peuvent PAS donner un rôle : le déclencheur le refuse.)
--    Puis exécuter sql/security-hardening.sql.

-- 3. Tester les politiques en vous connectant avec cet utilisateur

-- 4. Pour vérifier le rôle actuel :
SELECT public.get_user_role();

-- 5. Pour voir tous les utilisateurs (en tant qu'admin) :
SELECT * FROM v_users;

-- ============================================
-- 10. REFONTE RLS DES VRAIES TABLES (classes, students, subjects, grades, activities)
-- ============================================
-- supabase-schema.sql / supabase-schema-simple.sql avaient créé ces tables avec des
-- policies "USING (true) WITH CHECK (true)" : n'importe quel utilisateur authentifié
-- pouvait tout lire ET tout écrire/supprimer, quel que soit son rôle.
-- On aligne ici le RLS sur le modèle de permissions déjà défini côté front dans
-- useSupabaseAuth.js (hasPermission) :
--   admin      → tout
--   professeur → lecture de tout, écriture uniquement sur les notes (grades)
--   secretaire → lecture de tout, aucune écriture sur classes/élèves/matières/notes

DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename IN ('classes', 'students', 'subjects', 'grades', 'activities')
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS "Permettre tout pour %I" ON %I', t, t);
  END LOOP;
END $$;

-- classes / students / subjects : structure administrative de l'établissement.
-- Lecture pour tout utilisateur authentifié, écriture réservée à l'admin.
DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY['classes', 'students', 'subjects'])
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Lecture authentifiée" ON %I', t);
    EXECUTE format('CREATE POLICY "Lecture authentifiée" ON %I FOR SELECT USING (auth.uid() IS NOT NULL)', t);

    EXECUTE format('DROP POLICY IF EXISTS "Écriture admin seulement" ON %I', t);
    EXECUTE format(
      'CREATE POLICY "Écriture admin seulement" ON %I FOR INSERT WITH CHECK (public.get_user_role() = ''admin'')',
      t
    );

    EXECUTE format('DROP POLICY IF EXISTS "Modification admin seulement" ON %I', t);
    EXECUTE format(
      'CREATE POLICY "Modification admin seulement" ON %I FOR UPDATE USING (public.get_user_role() = ''admin'') WITH CHECK (public.get_user_role() = ''admin'')',
      t
    );

    EXECUTE format('DROP POLICY IF EXISTS "Suppression admin seulement" ON %I', t);
    EXECUTE format(
      'CREATE POLICY "Suppression admin seulement" ON %I FOR DELETE USING (public.get_user_role() = ''admin'')',
      t
    );
  END LOOP;
END $$;

-- grades : lecture pour tout utilisateur authentifié, écriture admin + professeur,
-- suppression réservée à l'admin (correspond à editGrades côté front).
DROP POLICY IF EXISTS "Lecture authentifiée" ON grades;
CREATE POLICY "Lecture authentifiée" ON grades FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Écriture admin et professeur" ON grades;
CREATE POLICY "Écriture admin et professeur" ON grades FOR INSERT
  WITH CHECK (public.get_user_role() IN ('admin', 'professeur'));

DROP POLICY IF EXISTS "Modification admin et professeur" ON grades;
CREATE POLICY "Modification admin et professeur" ON grades FOR UPDATE
  USING (public.get_user_role() IN ('admin', 'professeur'))
  WITH CHECK (public.get_user_role() IN ('admin', 'professeur'));

DROP POLICY IF EXISTS "Suppression admin seulement" ON grades;
CREATE POLICY "Suppression admin seulement" ON grades FOR DELETE
  USING (public.get_user_role() = 'admin');

-- activities : journal d'audit. Tout utilisateur authentifié peut lire et ajouter une
-- entrée (chaque action de l'appli logue son propre événement) ; un log ne se modifie
-- jamais après coup, et seul l'admin peut purger (RGPD / nettoyage).
DROP POLICY IF EXISTS "Lecture authentifiée" ON activities;
CREATE POLICY "Lecture authentifiée" ON activities FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Écriture authentifiée" ON activities;
CREATE POLICY "Écriture authentifiée" ON activities FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Suppression admin seulement" ON activities;
CREATE POLICY "Suppression admin seulement" ON activities FOR DELETE
  USING (public.get_user_role() = 'admin');

-- ============================================
-- 11. TABLES payments / fee_types (documentées ici, RLS verrouillé)
-- ============================================
-- Ces deux tables sont déjà utilisées par PaymentService.js / AdminPaymentsDashboard.jsx /
-- PaymentHistory.jsx / PaymentManager.jsx mais n'existaient dans AUCUN fichier SQL du
-- repo : impossible de savoir quelles règles d'accès s'y appliquaient réellement.
-- CREATE TABLE IF NOT EXISTS ne touche pas aux données existantes si les tables sont
-- déjà là ; ceci documente la structure et surtout verrouille l'accès (données
-- financières → admin uniquement, aucune permission "payments" n'existe côté
-- professeur/secrétaire dans le modèle actuel de l'appli).

CREATE TABLE IF NOT EXISTS fee_types (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id BIGINT REFERENCES students(id) ON DELETE CASCADE,
  fee_type_id BIGINT REFERENCES fee_types(id) ON DELETE SET NULL,
  amount_paid NUMERIC(12,2) NOT NULL,
  status TEXT CHECK (status IN ('pending', 'processing', 'completed', 'failed')) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE fee_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lecture admin seulement" ON fee_types;
CREATE POLICY "Lecture admin seulement" ON fee_types FOR SELECT
  USING (public.get_user_role() = 'admin');

DROP POLICY IF EXISTS "Écriture admin seulement" ON fee_types;
CREATE POLICY "Écriture admin seulement" ON fee_types FOR ALL
  USING (public.get_user_role() = 'admin')
  WITH CHECK (public.get_user_role() = 'admin');

DROP POLICY IF EXISTS "Lecture admin seulement" ON payments;
CREATE POLICY "Lecture admin seulement" ON payments FOR SELECT
  USING (public.get_user_role() = 'admin');

DROP POLICY IF EXISTS "Écriture admin seulement" ON payments;
CREATE POLICY "Écriture admin seulement" ON payments FOR ALL
  USING (public.get_user_role() = 'admin')
  WITH CHECK (public.get_user_role() = 'admin');

-- ============================================
-- 12. SUPPRESSION DE L'ANCIEN SYSTÈME DE COMPTES EN CLAIR (pré-Supabase Auth)
-- ============================================
-- La table `users` (mots de passe en TEXT en clair) et la clé app_data['users']
-- (même chose dans un blob JSON) sont des reliquats de l'ancien système
-- d'authentification, remplacés depuis par Supabase Auth + user_profiles.
-- Vérifié : aucun code du front (src/) ne lit plus ni l'un ni l'autre
-- (src/utils/supabaseAPI.js, seul fichier qui interrogeait `users`, est mort —
-- jamais importé — et supprimé du repo dans le même commit).
DROP TABLE IF EXISTS users;
DELETE FROM app_data WHERE key = 'users';

-- ============================================
-- 13. TABLE parent_students (liaison parent ↔ élève)
-- ============================================
-- Utilisée par ParentAssignModal.jsx et useParent.js mais jamais créée dans aucun
-- fichier SQL du repo.
CREATE TABLE IF NOT EXISTS parent_students (
  parent_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  student_id BIGINT REFERENCES students(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (parent_id, student_id)
);

ALTER TABLE parent_students ENABLE ROW LEVEL SECURITY;

-- Un parent voit uniquement ses propres liaisons ; admin voit tout.
DROP POLICY IF EXISTS "Lecture parent ou admin" ON parent_students;
CREATE POLICY "Lecture parent ou admin" ON parent_students FOR SELECT
  USING (auth.uid() = parent_id OR public.get_user_role() = 'admin');

-- Seul l'admin crée/supprime des liaisons (via ParentAssignModal, réservé admin).
DROP POLICY IF EXISTS "Écriture admin seulement" ON parent_students;
CREATE POLICY "Écriture admin seulement" ON parent_students FOR INSERT
  WITH CHECK (public.get_user_role() = 'admin');

DROP POLICY IF EXISTS "Suppression admin seulement" ON parent_students;
CREATE POLICY "Suppression admin seulement" ON parent_students FOR DELETE
  USING (public.get_user_role() = 'admin');

-- ============================================
-- FIN DU SCRIPT DE SÉCURITÉ
-- ============================================


-- >>>>>>>>>> CHAT_TABLES.sql <<<<<<<<<<
-- ============================================
-- CHAT_TABLES.sql
-- Tables + RLS pour la messagerie Parent ↔ Professeur ↔ Admin
-- ============================================
-- src/services/ChatService.js interroge déjà "conversations" et "messages" mais ces
-- tables n'existaient dans aucun fichier SQL du repo. Ce script les crée et verrouille
-- leur accès. À exécuter dans l'éditeur SQL Supabase, après supabase-security-rls.sql
-- (dépend de public.get_user_role()).

-- 1. TABLE conversations
-- Une conversation est une paire (user1, user2) — généralement un parent et un
-- professeur. L'admin n'est PAS un participant fixe de chaque conversation : il a un
-- accès transverse en lecture/écriture à toutes les conversations (policies plus bas),
-- ce qui lui permet de "participer" à n'importe quel échange sans changer ce modèle
-- à deux participants.
-- user1_id/user2_id référencent user_profiles (pas auth.users directement) : c'est
-- ce qui permet à ChatService.getUserConversations() d'embarquer
-- "user1:user1_id(id, first_name, last_name, email)" via PostgREST — auth.users n'a
-- pas ces colonnes, user_profiles.id référence de toute façon déjà auth.users(id).
CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  user1_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  user2_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  user1_type TEXT NOT NULL,
  user2_type TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conversations_user1 ON conversations(user1_id);
CREATE INDEX IF NOT EXISTS idx_conversations_user2 ON conversations(user2_id);
CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON conversations(updated_at DESC);

-- 2. TABLE messages
CREATE TABLE IF NOT EXISTS messages (
  id BIGSERIAL PRIMARY KEY,
  conversation_id TEXT REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_unread ON messages(conversation_id, is_read) WHERE is_read = FALSE;

-- 3. RLS
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- conversations : lecture/écriture pour les deux participants + admin (accès transverse)
DROP POLICY IF EXISTS "Lecture participant ou admin" ON conversations;
CREATE POLICY "Lecture participant ou admin" ON conversations FOR SELECT
  USING (
    auth.uid() = user1_id OR auth.uid() = user2_id
    OR public.get_user_role() = 'admin'
  );

DROP POLICY IF EXISTS "Création par un participant" ON conversations;
CREATE POLICY "Création par un participant" ON conversations FOR INSERT
  WITH CHECK (auth.uid() = user1_id OR auth.uid() = user2_id);

DROP POLICY IF EXISTS "Mise à jour participant ou admin" ON conversations;
CREATE POLICY "Mise à jour participant ou admin" ON conversations FOR UPDATE
  USING (
    auth.uid() = user1_id OR auth.uid() = user2_id
    OR public.get_user_role() = 'admin'
  )
  WITH CHECK (
    auth.uid() = user1_id OR auth.uid() = user2_id
    OR public.get_user_role() = 'admin'
  );

DROP POLICY IF EXISTS "Suppression admin seulement" ON conversations;
CREATE POLICY "Suppression admin seulement" ON conversations FOR DELETE
  USING (public.get_user_role() = 'admin');

-- messages : accessibles à qui peut voir la conversation parente (participant ou admin)
DROP POLICY IF EXISTS "Lecture participant ou admin" ON messages;
CREATE POLICY "Lecture participant ou admin" ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = messages.conversation_id
      AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
    )
    OR public.get_user_role() = 'admin'
  );

-- Envoi : l'expéditeur doit être soi-même (pas d'usurpation), et doit être participant
-- de la conversation OU admin (l'admin peut donc bien "participer" à n'importe quel
-- échange sans en être un participant permanent).
DROP POLICY IF EXISTS "Envoi par participant ou admin" ON messages;
CREATE POLICY "Envoi par participant ou admin" ON messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND (
      EXISTS (
        SELECT 1 FROM conversations c
        WHERE c.id = messages.conversation_id
        AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
      )
      OR public.get_user_role() = 'admin'
    )
  );

-- Marquer comme lu : participant ou admin (pas besoin d'être l'expéditeur)
DROP POLICY IF EXISTS "Marquer lu par participant ou admin" ON messages;
CREATE POLICY "Marquer lu par participant ou admin" ON messages FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = messages.conversation_id
      AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
    )
    OR public.get_user_role() = 'admin'
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = messages.conversation_id
      AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
    )
    OR public.get_user_role() = 'admin'
  );

DROP POLICY IF EXISTS "Suppression admin seulement" ON messages;
CREATE POLICY "Suppression admin seulement" ON messages FOR DELETE
  USING (public.get_user_role() = 'admin');

-- 4. Activer Supabase Realtime sur ces deux tables (nécessaire pour
-- ChatService.subscribeToMessages) — sans erreur si déjà fait.
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE messages;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;

-- ============================================
-- FIN
-- ============================================


-- >>>>>>>>>> students-profile.sql <<<<<<<<<<
-- ============================================================================
-- Profil élève : date de naissance, sexe, photo, contact d'urgence
-- À exécuter dans l'éditeur SQL de Supabase. Additif et ré-exécutable.
--
-- Le formulaire d'élève (StudentModal) collectait déjà ces informations, mais la
-- table students n'avait pas de colonnes pour les stocker : elles étaient perdues.
-- Le numéro de contact sert notamment à l'envoi des résultats par WhatsApp.
-- ============================================================================

ALTER TABLE students
  ADD COLUMN IF NOT EXISTS birth_date         DATE,
  ADD COLUMN IF NOT EXISTS gender             TEXT,
  ADD COLUMN IF NOT EXISTS photo_url          TEXT,
  ADD COLUMN IF NOT EXISTS emergency_name     TEXT,
  ADD COLUMN IF NOT EXISTS emergency_phone    TEXT,
  ADD COLUMN IF NOT EXISTS emergency_relation TEXT;


-- >>>>>>>>>> payments-online.sql <<<<<<<<<<
-- ============================================================================
-- Paiements en ligne (Mobile Money via FedaPay)
-- À exécuter dans l'éditeur SQL de Supabase APRÈS supabase-security-rls.sql.
-- Script ré-exécutable (IF NOT EXISTS partout) et additif : aucune colonne ni
-- donnée existante n'est modifiée ou supprimée.
-- ============================================================================

-- Colonnes nécessaires au suivi d'un paiement externe
ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS status         TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS provider       TEXT,
  ADD COLUMN IF NOT EXISTS currency       TEXT NOT NULL DEFAULT 'XOF',
  ADD COLUMN IF NOT EXISTS external_id    TEXT,
  ADD COLUMN IF NOT EXISTS payer_name     TEXT,
  ADD COLUMN IF NOT EXISTS payer_phone    TEXT,
  ADD COLUMN IF NOT EXISTS paid_at        TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS failure_reason TEXT,
  ADD COLUMN IF NOT EXISTS updated_at     TIMESTAMPTZ DEFAULT NOW();

-- Un même paiement externe ne peut être rattaché qu'à une seule ligne :
-- protège contre les doublons si le webhook est rejoué.
CREATE UNIQUE INDEX IF NOT EXISTS payments_provider_external_id_key
  ON payments (provider, external_id)
  WHERE external_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS payments_student_id_idx ON payments (student_id);
CREATE INDEX IF NOT EXISTS payments_status_idx ON payments (status);

-- Un parent peut consulter les paiements de ses enfants (lecture seule).
-- Les écritures passent exclusivement par les fonctions Edge (service_role).
DROP POLICY IF EXISTS "Parents lisent les paiements de leurs enfants" ON payments;
CREATE POLICY "Parents lisent les paiements de leurs enfants" ON payments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM parent_students ps
      WHERE ps.parent_id = auth.uid()
        AND ps.student_id = payments.student_id
    )
  );


-- >>>>>>>>>> bulletin-access.sql <<<<<<<<<<
-- ============================================================================
-- Accès des parents au bulletin (selon le paiement des frais)
-- À exécuter dans l'éditeur SQL de Supabase, APRÈS payments-online.sql et AVANT
-- security-hardening.sql. Additif et ré-exécutable.
--
-- Le portail parents lit students.bulletin_access et payments.amount_due, mais aucun
-- script du dépôt ne créait ces colonnes : la lecture échouait et tous les parents
-- restaient bloqués sur « Dû », même après un paiement réussi.
--
-- Règle : un paiement « completed » débloque le bulletin de l'élève lorsque le total
-- encaissé couvre le total dû (amount_due, 0 par défaut = frais sans solde à régler).
-- Le déblocage est automatique ; le verrouillage reste une décision manuelle du staff.
-- Un parent ne peut pas modifier students (aucune politique d'écriture pour lui).
-- ============================================================================

ALTER TABLE students
  ADD COLUMN IF NOT EXISTS bulletin_access BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS amount_due NUMERIC(12,2) NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.unlock_bulletin_on_payment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_paid NUMERIC;
  v_due  NUMERIC;
BEGIN
  IF NEW.status IS DISTINCT FROM 'completed' OR NEW.student_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(SUM(amount_paid) FILTER (WHERE status = 'completed'), 0),
         COALESCE(SUM(amount_due), 0)
    INTO v_paid, v_due
    FROM payments
   WHERE student_id = NEW.student_id;

  IF v_paid > 0 AND v_paid >= v_due THEN
    UPDATE students SET bulletin_access = true
     WHERE id = NEW.student_id AND bulletin_access = false;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS payments_unlock_bulletin ON payments;
CREATE TRIGGER payments_unlock_bulletin
  AFTER INSERT OR UPDATE OF status, amount_paid, amount_due ON payments
  FOR EACH ROW EXECUTE FUNCTION public.unlock_bulletin_on_payment();


-- >>>>>>>>>> security-hardening.sql <<<<<<<<<<
-- ============================================================================
-- DURCISSEMENT DE LA SÉCURITÉ (RLS)
-- À exécuter dans l'éditeur SQL de Supabase APRÈS tous les autres scripts
-- (supabase-schema, supabase-security-rls, CHAT_TABLES, students-profile, payments-online).
-- Ré-exécutable. Testé sur un vrai PostgreSQL : voir sql/__tests__/rls.test.js.
-- Prérequis : sql/grades-alignment.sql (colonne grades.academic_year, utilisée par child_class_rank).
--
-- Problèmes corrigés (constatés sur les scripts précédents) :
--   1. Tout compte connecté lisait TOUS les élèves, TOUTES les notes et les contacts d'urgence :
--      un parent voyait les enfants des autres familles.
--   2. L'inscription publique donnait le rôle « secrétaire » à n'importe quel internaute,
--      avec lecture de toutes les données. Les nouveaux comptes sont désormais « en_attente »
--      et n'accèdent à rien tant qu'un administrateur ne les a pas validés.
--   3. Un parent lisait toutes les appréciations (app_data), le journal d'activité et l'annuaire
--      complet des autres parents (noms, e-mails).
--   4. La vue v_users était lisible par tous les comptes ; create_admin_user permettait de
--      tester quels e-mails existent ; les fonctions SECURITY DEFINER n'avaient pas de search_path.
--   5. La table absences n'était définie dans aucun script (donc sans règles d'accès connues).
--
-- ⚠️ Ce script SUPPRIME puis recrée toutes les politiques RLS de : user_profiles, app_data,
-- classes, subjects, students, grades, activities, absences. Une politique ajoutée à la main
-- dans le tableau de bord sur l'une de ces tables sera supprimée (une politique permissive
-- oubliée annulerait les restrictions, car les politiques s'additionnent).
--
-- ⚠️ Les comptes DÉJÀ créés gardent leur rôle. Vérifiez la liste des comptes « secretaire »
-- et « professeur » (Paramètres > Utilisateurs) : tout compte que vous ne reconnaissez pas
-- doit être repassé en « en_attente ».
-- ============================================================================

-- ── 1. Rôle « en_attente » pour les inscriptions publiques ───────────────────
ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_role_check;
ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_role_check
  CHECK (role IN ('admin', 'professeur', 'secretaire', 'parent', 'en_attente'));
ALTER TABLE user_profiles ALTER COLUMN role SET DEFAULT 'en_attente';

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Le rôle n'est JAMAIS lu dans les métadonnées fournies par le client.
  INSERT INTO public.user_profiles (id, email, first_name, last_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    'en_attente'
  );
  RETURN NEW;
END;
$$;

-- ── 2. Fonctions : search_path fixé, helpers de contrôle d'accès ─────────────
ALTER FUNCTION public.get_user_role() SET search_path = public;
ALTER FUNCTION public.prevent_self_role_escalation() SET search_path = public;
ALTER FUNCTION public.update_updated_at_column() SET search_path = public;

-- Personnel de l'établissement (comptes validés par un administrateur)
CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT role IN ('admin', 'professeur', 'secretaire') FROM public.user_profiles WHERE id = auth.uid()),
    false
  )
$$;

-- L'utilisateur connecté est-il parent de cet élève ?
CREATE OR REPLACE FUNCTION public.is_parent_of(p_student BIGINT)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.parent_students
    WHERE parent_id = auth.uid() AND student_id = p_student
  )
$$;

-- Personnel ou parent (tout sauf les comptes en attente et les anonymes)
CREATE OR REPLACE FUNCTION public.is_member()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT role IN ('admin', 'professeur', 'secretaire', 'parent') FROM public.user_profiles WHERE id = auth.uid()),
    false
  )
$$;

-- ── 3. Éléments qui n'auraient jamais dû être exposés ────────────────────────
DROP VIEW IF EXISTS public.v_users;                              -- lisible par tous, hors RLS
DROP FUNCTION IF EXISTS public.create_admin_user(TEXT, TEXT, TEXT, TEXT);  -- révélait quels e-mails existent

-- ── 4. Table des absences (absente des scripts précédents) ───────────────────
-- Sans effet si la table existe déjà ; les règles d'accès s'appliquent dans tous les cas.
CREATE TABLE IF NOT EXISTS absences (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id  BIGINT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  subject_id  BIGINT REFERENCES subjects(id) ON DELETE SET NULL,
  date        DATE NOT NULL DEFAULT CURRENT_DATE,
  type        TEXT NOT NULL DEFAULT 'absent',
  justified   BOOLEAN NOT NULL DEFAULT false,
  notes       TEXT,
  recorded_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS absences_student_id_idx ON absences (student_id);
CREATE INDEX IF NOT EXISTS absences_date_idx ON absences (date DESC);

-- ── 5. Politiques RLS : on repart d'une base saine ───────────────────────────
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT tablename, policyname FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('user_profiles', 'app_data', 'classes', 'subjects', 'students',
                        'grades', 'activities', 'absences')
  LOOP
    EXECUTE format('DROP POLICY %I ON public.%I', r.policyname, r.tablename);
  END LOOP;
END $$;

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_data      ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes       ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects      ENABLE ROW LEVEL SECURITY;
ALTER TABLE students      ENABLE ROW LEVEL SECURITY;
ALTER TABLE grades        ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities    ENABLE ROW LEVEL SECURITY;
ALTER TABLE absences      ENABLE ROW LEVEL SECURITY;

-- user_profiles : son propre profil ; le personnel voit tout le monde ; un parent voit le
-- personnel (messagerie) mais PAS les autres parents.
CREATE POLICY "Voir son propre profil" ON user_profiles FOR SELECT
  USING (auth.uid() = id);
CREATE POLICY "Le personnel voit tous les profils" ON user_profiles FOR SELECT
  USING (public.is_staff());
CREATE POLICY "Un parent voit le personnel" ON user_profiles FOR SELECT
  USING (public.get_user_role() = 'parent' AND role <> 'parent');
CREATE POLICY "Modifier son propre profil" ON user_profiles FOR UPDATE
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);   -- le rôle est verrouillé par le déclencheur
CREATE POLICY "Les admins modifient tous les profils" ON user_profiles FOR UPDATE
  USING (public.get_user_role() = 'admin') WITH CHECK (public.get_user_role() = 'admin');

-- app_data : le personnel lit tout ; un parent ne lit que les réglages d'affichage de l'école.
CREATE POLICY "Lecture personnel" ON app_data FOR SELECT
  USING (public.is_staff());
CREATE POLICY "Lecture parents : réglages publics" ON app_data FOR SELECT
  USING (public.get_user_role() = 'parent'
         AND key IN ('schoolInfo', 'appColors', 'schoolLogo', 'academicYears'));
CREATE POLICY "Insertion admin et professeur" ON app_data FOR INSERT
  WITH CHECK (public.get_user_role() IN ('admin', 'professeur'));
CREATE POLICY "Mise à jour selon le rôle" ON app_data FOR UPDATE
  USING (
    CASE
      WHEN public.get_user_role() = 'admin' THEN true
      WHEN public.get_user_role() = 'professeur' THEN key IN ('grades', 'appreciations', 'activities')
      WHEN public.get_user_role() = 'secretaire' THEN key IN ('activities')
      ELSE false
    END
  )
  WITH CHECK (
    CASE
      WHEN public.get_user_role() = 'admin' THEN true
      WHEN public.get_user_role() = 'professeur' THEN key IN ('grades', 'appreciations', 'activities')
      WHEN public.get_user_role() = 'secretaire' THEN key IN ('activities')
      ELSE false
    END
  );
CREATE POLICY "Suppression admin" ON app_data FOR DELETE
  USING (public.get_user_role() = 'admin');

-- classes / matières : noms nécessaires à l'affichage, lecture pour personnel et parents.
CREATE POLICY "Lecture membres" ON classes FOR SELECT USING (public.is_member());
CREATE POLICY "Écriture admin" ON classes FOR INSERT WITH CHECK (public.get_user_role() = 'admin');
CREATE POLICY "Modification admin" ON classes FOR UPDATE
  USING (public.get_user_role() = 'admin') WITH CHECK (public.get_user_role() = 'admin');
CREATE POLICY "Suppression admin" ON classes FOR DELETE USING (public.get_user_role() = 'admin');

CREATE POLICY "Lecture membres" ON subjects FOR SELECT USING (public.is_member());
CREATE POLICY "Écriture admin" ON subjects FOR INSERT WITH CHECK (public.get_user_role() = 'admin');
CREATE POLICY "Modification admin" ON subjects FOR UPDATE
  USING (public.get_user_role() = 'admin') WITH CHECK (public.get_user_role() = 'admin');
CREATE POLICY "Suppression admin" ON subjects FOR DELETE USING (public.get_user_role() = 'admin');

-- élèves : le personnel voit tous les élèves, un parent uniquement ses enfants.
CREATE POLICY "Lecture personnel ou parent de l'élève" ON students FOR SELECT
  USING (public.is_staff() OR public.is_parent_of(id));
CREATE POLICY "Écriture admin" ON students FOR INSERT WITH CHECK (public.get_user_role() = 'admin');
CREATE POLICY "Modification admin" ON students FOR UPDATE
  USING (public.get_user_role() = 'admin') WITH CHECK (public.get_user_role() = 'admin');
CREATE POLICY "Suppression admin" ON students FOR DELETE USING (public.get_user_role() = 'admin');

-- notes : lecture personnel ou parent de l'élève ; saisie admin et professeur.
CREATE POLICY "Lecture personnel ou parent de l'élève" ON grades FOR SELECT
  USING (public.is_staff() OR public.is_parent_of(student_id));
CREATE POLICY "Saisie admin et professeur" ON grades FOR INSERT
  WITH CHECK (public.get_user_role() IN ('admin', 'professeur'));
CREATE POLICY "Modification admin et professeur" ON grades FOR UPDATE
  USING (public.get_user_role() IN ('admin', 'professeur'))
  WITH CHECK (public.get_user_role() IN ('admin', 'professeur'));
CREATE POLICY "Suppression admin" ON grades FOR DELETE USING (public.get_user_role() = 'admin');

-- journal d'activité : réservé au personnel (il contient les noms et actions des utilisateurs).
CREATE POLICY "Lecture personnel" ON activities FOR SELECT USING (public.is_staff());
CREATE POLICY "Écriture personnel" ON activities FOR INSERT WITH CHECK (public.is_staff());
CREATE POLICY "Suppression admin" ON activities FOR DELETE USING (public.get_user_role() = 'admin');

-- absences : lecture personnel ou parent de l'élève ; saisie par le personnel.
CREATE POLICY "Lecture personnel ou parent de l'élève" ON absences FOR SELECT
  USING (public.is_staff() OR public.is_parent_of(student_id));
CREATE POLICY "Saisie personnel" ON absences FOR INSERT WITH CHECK (public.is_staff());
CREATE POLICY "Modification personnel" ON absences FOR UPDATE
  USING (public.is_staff()) WITH CHECK (public.is_staff());
CREATE POLICY "Suppression personnel" ON absences FOR DELETE USING (public.is_staff());

-- ── 6. Rang et statistiques de classe, sans exposer les notes des camarades ──
-- Avant, le portail parents lisait les notes de toute la classe pour calculer le rang ; avec le
-- RLS ci-dessus c'est impossible (et heureux). Cette fonction ne renvoie que le rang, l'effectif et
-- la moyenne / meilleure / plus basse moyenne de la classe, et uniquement au personnel ou à un
-- parent de l'élève. Même formule que les bulletins : somme(note × coefficient) / somme(coefficient),
-- notes vides ignorées.
DROP FUNCTION IF EXISTS public.child_class_rank(BIGINT, TEXT);
DROP FUNCTION IF EXISTS public.child_class_rank(BIGINT, TEXT, TEXT);
-- p_year : année scolaire (ex. '2025-2026'). Sans elle, la dernière année où l'élève a des notes ;
-- sans ce filtre, les notes de plusieurs années se mélangeaient dans le classement.
CREATE FUNCTION public.child_class_rank(p_student BIGINT, p_trimester TEXT, p_year TEXT DEFAULT NULL)
RETURNS TABLE (rank INT, total INT, class_average NUMERIC, class_max NUMERIC, class_min NUMERIC)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  WITH target AS (
    SELECT COALESCE(p_year, (SELECT MAX(academic_year) FROM grades WHERE student_id = p_student)) AS year
  ),
  averages AS (
    SELECT g.student_id,
           SUM(g.value * COALESCE(s.coefficient, 1)) / NULLIF(SUM(COALESCE(s.coefficient, 1)), 0) AS average
    FROM grades g
    JOIN subjects s  ON s.id = g.subject_id
    JOIN students st ON st.id = g.student_id
    WHERE g.trimester = p_trimester
      AND g.academic_year = (SELECT year FROM target)
      AND g.value IS NOT NULL
      AND st.class_id = (SELECT class_id FROM students WHERE id = p_student)
    GROUP BY g.student_id
  )
  SELECT
    (1 + (SELECT COUNT(*) FROM averages a WHERE a.average > (SELECT average FROM averages WHERE student_id = p_student)))::INT,
    (SELECT COUNT(*) FROM averages)::INT,
    (SELECT ROUND(AVG(average), 2) FROM averages),
    (SELECT ROUND(MAX(average), 2) FROM averages),
    (SELECT ROUND(MIN(average), 2) FROM averages)
  WHERE (public.is_staff() OR public.is_parent_of(p_student))
    AND EXISTS (SELECT 1 FROM averages WHERE student_id = p_student)
$$;

-- ── 7. Premier administrateur ────────────────────────────────────────────────
-- Les métadonnées d'inscription ne peuvent pas donner un rôle (c'est voulu). Après avoir créé le
-- compte dans Authentication > Users, promouvez-le ici :
--   UPDATE user_profiles SET role = 'admin' WHERE email = 'votre-adresse@exemple.com';


-- >>>>>>>>>> appreciations-activities.sql <<<<<<<<<<
-- ============================================================================
-- APPRÉCIATIONS ET JOURNAL D'ACTIVITÉ : des tables au lieu d'un bloc JSON partagé
-- À exécuter dans l'éditeur SQL de Supabase APRÈS security-hardening.sql et AVANT audit-log.sql.
-- Additif et ré-exécutable.
--
-- Avant, les appréciations et le journal d'activité étaient deux listes complètes stockées dans une
-- seule ligne de app_data : chaque enregistrement réécrivait toute la liste depuis la copie locale de
-- l'utilisateur. Deux professeurs qui enregistraient en même temps s'écrasaient (le dernier gagnait),
-- et la liste entière était rechargée à chaque ouverture. Maintenant : une ligne par appréciation, une
-- ligne par événement.
--
-- Reprise des données : les listes actuelles de app_data sont copiées dans les nouvelles tables (une
-- seule fois, si elles sont vides). Les lignes de app_data ne sont PAS supprimées : retour en arrière
-- possible. Les appréciations reprises sont rattachées à l'année scolaire active.
-- ============================================================================

-- ── 1. Appréciations ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS appreciations (
  id            BIGSERIAL PRIMARY KEY,
  student_id    BIGINT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  subject_id    BIGINT REFERENCES subjects(id) ON DELETE CASCADE,
  trimester     TEXT NOT NULL CHECK (trimester IN ('1', '2', '3')),
  academic_year TEXT NOT NULL,
  type          TEXT NOT NULL CHECK (type IN ('teacher', 'council')),
  body          TEXT NOT NULL CHECK (length(btrim(body)) > 0),
  author_id     UUID DEFAULT auth.uid(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- une appréciation d'enseignant porte sur une matière, celle du conseil de classe sur l'élève
  CONSTRAINT appreciations_subject_matches_type CHECK ((type = 'teacher') = (subject_id IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS appreciations_student_idx ON appreciations (student_id, academic_year, trimester);

DROP TRIGGER IF EXISTS update_appreciations_updated_at ON appreciations;
CREATE TRIGGER update_appreciations_updated_at
  BEFORE UPDATE ON appreciations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE appreciations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Lecture personnel" ON appreciations;
DROP POLICY IF EXISTS "Saisie admin et professeur" ON appreciations;
DROP POLICY IF EXISTS "Modification par l'auteur ou l'admin" ON appreciations;
DROP POLICY IF EXISTS "Suppression par l'auteur ou l'admin" ON appreciations;

-- Les parents n'y ont pas accès (comme avant : la clé « appreciations » de app_data leur était fermée)
CREATE POLICY "Lecture personnel" ON appreciations FOR SELECT
  USING (public.is_staff());
CREATE POLICY "Saisie admin et professeur" ON appreciations FOR INSERT
  WITH CHECK (public.get_user_role() IN ('admin', 'professeur') AND author_id = auth.uid());
-- Un professeur modifie ses propres appréciations (avant, il pouvait réécrire celles de tous). Les
-- appréciations reprises de l'ancienne liste n'ont pas d'auteur connu (author_id vide) : tout professeur
-- peut encore les modifier ou les supprimer, comme avant la migration. Les nouvelles appréciations
-- portent leur auteur et ne sont modifiables que par lui (ou l'administrateur).
CREATE POLICY "Modification par l'auteur ou l'admin" ON appreciations FOR UPDATE
  USING (public.get_user_role() = 'admin'
         OR (public.get_user_role() = 'professeur' AND (author_id = auth.uid() OR author_id IS NULL)))
  WITH CHECK (public.get_user_role() = 'admin'
         OR (public.get_user_role() = 'professeur' AND (author_id = auth.uid() OR author_id IS NULL)));
CREATE POLICY "Suppression par l'auteur ou l'admin" ON appreciations FOR DELETE
  USING (public.get_user_role() = 'admin'
         OR (public.get_user_role() = 'professeur' AND (author_id = auth.uid() OR author_id IS NULL)));

-- ── 2. Journal d'activité (la table existe déjà dans supabase-schema.sql) ───
CREATE TABLE IF NOT EXISTS activities (
  id         BIGSERIAL PRIMARY KEY,
  timestamp  TIMESTAMPTZ DEFAULT NOW(),
  user_name  TEXT,
  user_role  TEXT,
  action     TEXT,
  details    TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_activities_timestamp ON activities (timestamp DESC);

-- L'auteur et l'heure viennent de la base, pas du navigateur : un compte ne peut pas écrire une
-- activité au nom d'un collègue. (Les règles d'accès de la table sont dans security-hardening.sql.)
CREATE OR REPLACE FUNCTION public.activities_set_author()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  profile RECORD;
BEGIN
  IF auth.uid() IS NOT NULL THEN
    SELECT first_name, last_name, role INTO profile FROM public.user_profiles WHERE id = auth.uid();
    NEW.user_name := NULLIF(btrim(COALESCE(profile.first_name, '') || ' ' || COALESCE(profile.last_name, '')), '');
    NEW.user_role := profile.role;
    NEW.timestamp := NOW();
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS activities_set_author ON activities;
CREATE TRIGGER activities_set_author
  BEFORE INSERT ON activities
  FOR EACH ROW EXECUTE FUNCTION public.activities_set_author();

-- ── 3. Reprise des listes actuelles de app_data ─────────────────────────────
-- app_data.value contient du JSON sérialisé en texte (valeur jsonb de type chaîne) : « #>> '{}' » le
-- dépouille avant de le relire en jsonb. Une valeur illisible est ignorée sans bloquer le script.
DO $$
DECLARE
  active_year TEXT;
  legacy      JSONB;
BEGIN
  -- Année scolaire active : celle de academicYears, sinon la plus récente des notes, sinon l'année civile
  BEGIN
    SELECT y ->> 'year' INTO active_year
    FROM app_data a, jsonb_array_elements((a.value #>> '{}')::jsonb) y
    WHERE a.key = 'academicYears' AND (y ->> 'isActive')::boolean IS TRUE
    LIMIT 1;
  EXCEPTION WHEN OTHERS THEN active_year := NULL;
  END;
  IF active_year IS NULL THEN
    SELECT MAX(academic_year) INTO active_year FROM grades;
  END IF;
  IF active_year IS NULL THEN
    active_year := CASE WHEN EXTRACT(MONTH FROM NOW()) >= 9
                        THEN EXTRACT(YEAR FROM NOW())::INT || '-' || (EXTRACT(YEAR FROM NOW())::INT + 1)
                        ELSE (EXTRACT(YEAR FROM NOW())::INT - 1) || '-' || EXTRACT(YEAR FROM NOW())::INT END;
  END IF;

  -- Appréciations
  IF NOT EXISTS (SELECT 1 FROM appreciations) THEN
    BEGIN
      SELECT (value #>> '{}')::jsonb INTO legacy FROM app_data WHERE key = 'appreciations';
    EXCEPTION WHEN OTHERS THEN legacy := NULL;
    END;
    IF legacy IS NOT NULL AND jsonb_typeof(legacy) = 'array' THEN
      INSERT INTO appreciations (student_id, subject_id, trimester, academic_year, type, body, created_at)
      SELECT (e ->> 'studentId')::BIGINT,
             CASE WHEN e ->> 'type' = 'teacher' THEN (e ->> 'subjectId')::BIGINT END,
             e ->> 'trimester',
             active_year,
             e ->> 'type',
             COALESCE(NULLIF(btrim(CASE WHEN e ->> 'type' = 'teacher' THEN e ->> 'teacherAppreciation'
                                        ELSE e ->> 'councilAppreciation' END), ''), ''),
             CASE WHEN e ->> 'createdAt' ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}' THEN (e ->> 'createdAt')::TIMESTAMPTZ ELSE NOW() END
      FROM jsonb_array_elements(legacy) e
      WHERE e ->> 'type' IN ('teacher', 'council')
        AND e ->> 'trimester' IN ('1', '2', '3')
        AND e ->> 'studentId' ~ '^[0-9]+$'
        AND EXISTS (SELECT 1 FROM students s WHERE s.id = (e ->> 'studentId')::BIGINT)
        AND (e ->> 'type' = 'council'
             OR (e ->> 'subjectId' ~ '^[0-9]+$' AND EXISTS (SELECT 1 FROM subjects s WHERE s.id = (e ->> 'subjectId')::BIGINT)))
        AND length(btrim(CASE WHEN e ->> 'type' = 'teacher' THEN COALESCE(e ->> 'teacherAppreciation', '')
                              ELSE COALESCE(e ->> 'councilAppreciation', '') END)) > 0;
    END IF;
  END IF;

  -- Journal d'activité
  IF NOT EXISTS (SELECT 1 FROM activities) THEN
    legacy := NULL;
    BEGIN
      SELECT (value #>> '{}')::jsonb INTO legacy FROM app_data WHERE key = 'activities';
    EXCEPTION WHEN OTHERS THEN legacy := NULL;
    END;
    IF legacy IS NOT NULL AND jsonb_typeof(legacy) = 'array' THEN
      -- du plus ancien au plus récent, pour que les identifiants suivent l'ordre chronologique
      INSERT INTO activities (timestamp, user_name, user_role, action, details)
      SELECT ts, e ->> 'user', e ->> 'userRole', e ->> 'action', e ->> 'details'
      FROM (
        SELECT e, n,
               CASE WHEN e ->> 'timestamp' ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}' THEN (e ->> 'timestamp')::TIMESTAMPTZ ELSE NOW() END AS ts
        FROM jsonb_array_elements(legacy) WITH ORDINALITY AS t(e, n)
      ) dated
      ORDER BY ts ASC, n DESC;
    END IF;
  END IF;
END $$;


-- >>>>>>>>>> audit-log.sql <<<<<<<<<<
-- ============================================================================
-- JOURNAL D'AUDIT : qui a modifié quoi, et quand
-- À exécuter dans l'éditeur SQL de Supabase APRÈS security-hardening.sql. Additif et ré-exécutable.
--
-- Enregistre chaque création, modification et suppression sur les tables sensibles (notes, élèves,
-- classes, matières, absences, comptes utilisateurs, paiements, réglages). Le journal est tenu par la
-- base elle-même (déclencheurs) : il ne dépend pas du navigateur, donc ne peut être ni oublié ni
-- falsifié par un client. Il remplace le journal « activities » du navigateur, limité à 200 lignes.
--
-- Garanties :
--   * seuls les administrateurs lisent le journal ;
--   * personne ne peut y écrire, le modifier ou le supprimer par l'API (aucune règle d'écriture) ;
--     seule la fonction purge_audit_logs, réservée aux administrateurs et limitée aux entrées de plus
--     d'un an, en supprime (durée de conservation) ;
--   * pas de clé étrangère : supprimer un élève ou un compte n'efface pas son historique ;
--   * seules les colonnes modifiées sont conservées (pas de copie complète des lignes). Les données
--     volumineuses (photos, contenu des réglages) et les données personnelles de contact (téléphones,
--     date de naissance, e-mail, notes d'absence) ne sont jamais copiées : le journal note seulement
--     « (modifié) » quand l'une d'elles change. Les noms des élèves restent, pour qu'une suppression soit
--     compréhensible ;
--   * ce journal n'est PAS un outil d'effacement : la purge ne descend pas sous un an. Pour effacer plus
--     tôt les traces d'une personne (demande d'effacement), un administrateur de la base doit supprimer
--     les lignes concernées par une requête SQL ciblée (DELETE FROM audit_logs WHERE ...).
--   * l'auteur est auth.uid() ; une modification faite sans utilisateur (éditeur SQL, fonctions
--     serveur comme le webhook de paiement) est enregistrée avec le rôle « system ».
-- ============================================================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id          BIGSERIAL PRIMARY KEY,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actor_id    UUID,
  actor_role  TEXT,
  action      TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  table_name  TEXT NOT NULL,
  record_id   TEXT,
  old_value   JSONB,
  new_value   JSONB
);
CREATE INDEX IF NOT EXISTS audit_logs_created_at_idx ON audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS audit_logs_record_idx     ON audit_logs (table_name, record_id);
CREATE INDEX IF NOT EXISTS audit_logs_actor_idx      ON audit_logs (actor_id);

-- ── Déclencheur ─────────────────────────────────────────────────────────────
-- Arguments du déclencheur : colonnes à ne pas copier dans le journal.
CREATE OR REPLACE FUNCTION public.audit_row_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  skip        TEXT[] := ARRAY['updated_at'] || TG_ARGV;
  old_j       JSONB;
  new_j       JSONB;
  old_diff    JSONB := '{}'::jsonb;
  new_diff    JSONB := '{}'::jsonb;
  col         TEXT;
  actor       UUID := auth.uid();
  actor_r     TEXT;
  rec_id      TEXT;
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE') THEN old_j := to_jsonb(OLD); END IF;
  IF TG_OP IN ('INSERT', 'UPDATE') THEN new_j := to_jsonb(NEW); END IF;

  IF TG_OP = 'UPDATE' THEN
    FOR col IN SELECT jsonb_object_keys(new_j) LOOP
      CONTINUE WHEN col = 'updated_at';
      IF old_j -> col IS DISTINCT FROM new_j -> col THEN
        IF col = ANY (TG_ARGV) THEN
          -- colonne volumineuse : on note qu'elle a changé sans la copier
          old_diff := old_diff || jsonb_build_object(col, '(modifié)');
          new_diff := new_diff || jsonb_build_object(col, '(modifié)');
        ELSE
          old_diff := old_diff || jsonb_build_object(col, old_j -> col);
          new_diff := new_diff || jsonb_build_object(col, new_j -> col);
        END IF;
      END IF;
    END LOOP;
    -- Mise à jour sans changement réel (ex. écriture identique) : rien à journaliser
    IF new_diff = '{}'::jsonb THEN RETURN NULL; END IF;
  ELSIF TG_OP = 'INSERT' THEN
    FOR col IN SELECT jsonb_object_keys(new_j) LOOP
      CONTINUE WHEN col = ANY (skip);
      new_diff := new_diff || jsonb_build_object(col, new_j -> col);
    END LOOP;
  ELSE
    FOR col IN SELECT jsonb_object_keys(old_j) LOOP
      CONTINUE WHEN col = ANY (skip);
      old_diff := old_diff || jsonb_build_object(col, old_j -> col);
    END LOOP;
  END IF;

  -- identifiant de la ligne : clé du réglage (app_data) sinon id, sinon couple parent:élève (liaison)
  rec_id := COALESCE(
    COALESCE(new_j, old_j) ->> 'key',
    COALESCE(new_j, old_j) ->> 'id',
    (COALESCE(new_j, old_j) ->> 'parent_id') || ':' || (COALESCE(new_j, old_j) ->> 'student_id')
  );
  IF actor IS NULL THEN
    actor_r := 'system';
  ELSE
    SELECT role INTO actor_r FROM public.user_profiles WHERE id = actor;
  END IF;

  INSERT INTO public.audit_logs (actor_id, actor_role, action, table_name, record_id, old_value, new_value)
  VALUES (
    actor, actor_r, TG_OP, TG_TABLE_NAME, rec_id,
    CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE old_diff END,
    CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE new_diff END
  );

  RETURN NULL; -- déclencheur AFTER : la valeur de retour est ignorée
END;
$$;

-- ── Tables suivies ──────────────────────────────────────────────────────────
-- (table, colonnes non copiées). Une table absente de cette installation est ignorée.
DO $$
DECLARE
  t RECORD;
BEGIN
  FOR t IN
    SELECT * FROM (VALUES
      ('grades',        ''),
      ('students',      'photo_url,birth_date,emergency_name,emergency_phone,emergency_relation'),
      ('classes',       ''),
      ('subjects',      ''),
      ('appreciations', ''),
      ('absences',      'notes'),
      ('user_profiles', 'email'),
      ('payments',      'payer_phone'),
      ('parent_students', ''),
      ('app_data',      'value')
    ) AS v(table_name, skipped)
  LOOP
    IF to_regclass('public.' || t.table_name) IS NOT NULL THEN
      EXECUTE format('DROP TRIGGER IF EXISTS audit_%1$s ON public.%1$I', t.table_name);
      EXECUTE format(
        'CREATE TRIGGER audit_%1$s AFTER INSERT OR UPDATE OR DELETE ON public.%1$I '
        'FOR EACH ROW EXECUTE FUNCTION public.audit_row_change(%2$s)',
        t.table_name,
        -- une chaîne par colonne : « a,b » devient 'a', 'b'
        COALESCE((SELECT string_agg(quote_literal(col), ', ') FROM unnest(string_to_array(NULLIF(t.skipped, ''), ',')) AS col), '')
      );
    END IF;
  END LOOP;
END $$;

-- ── Accès : lecture réservée aux administrateurs, aucune écriture par l'API ──
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Lecture administrateurs" ON audit_logs;
CREATE POLICY "Lecture administrateurs" ON audit_logs FOR SELECT
  USING (public.get_user_role() = 'admin');
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON audit_logs FROM anon, authenticated;

-- ── Conservation : purge des entrées de plus d'un an (administrateurs) ───────
CREATE OR REPLACE FUNCTION public.purge_audit_logs(p_older_than_days INT DEFAULT 365)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted BIGINT;
BEGIN
  IF public.get_user_role() IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Réservé aux administrateurs';
  END IF;
  IF p_older_than_days IS NULL OR p_older_than_days < 365 THEN
    RAISE EXCEPTION 'Le journal d''audit se conserve au moins 365 jours';
  END IF;
  DELETE FROM public.audit_logs WHERE created_at < NOW() - make_interval(days => p_older_than_days);
  GET DIAGNOSTICS deleted = ROW_COUNT;
  RETURN deleted;
END;
$$;
REVOKE ALL ON FUNCTION public.purge_audit_logs(INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.purge_audit_logs(INT) TO authenticated;
