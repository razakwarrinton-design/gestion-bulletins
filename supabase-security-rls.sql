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
  role TEXT CHECK (role IN ('admin', 'professeur', 'secretaire')) DEFAULT 'secretaire',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

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
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, first_name, last_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'secretaire')
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

CREATE POLICY "Les utilisateurs peuvent modifier leur propre profil" 
  ON user_profiles FOR UPDATE 
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Les admins peuvent tout modifier" 
  ON user_profiles FOR UPDATE 
  USING (public.get_user_role() = 'admin')
  WITH CHECK (public.get_user_role() = 'admin');

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
-- FIN DU SCRIPT DE SÉCURITÉ
-- ============================================
