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
--    Authentication → Users → Add user
--    Email: admin@ecole.com
--    Password: (choisir un mot de passe fort)
--    User Metadata (JSON):
--    {
--      "first_name": "Admin",
--      "last_name": "Système",
--      "role": "admin"
--    }

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
