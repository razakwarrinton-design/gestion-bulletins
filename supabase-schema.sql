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
CREATE POLICY "Permettre lecture pour tous" ON app_data
  FOR SELECT
  USING (true);

-- Politique : Écriture publique (tous les utilisateurs authentifiés)
CREATE POLICY "Permettre écriture pour tous" ON app_data
  FOR INSERT
  WITH CHECK (true);

-- Politique : Mise à jour publique
CREATE POLICY "Permettre mise à jour pour tous" ON app_data
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Politique : Suppression publique
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

-- Table des utilisateurs
CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  role TEXT CHECK (role IN ('admin', 'professeur', 'secretaire')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

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
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

-- Politiques pour toutes les tables (accès public pour le moment)
DO $$ 
DECLARE
  t TEXT;
BEGIN
  FOR t IN 
    SELECT tablename FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename IN ('classes', 'students', 'subjects', 'grades', 'users', 'activities')
  LOOP
    EXECUTE format('CREATE POLICY "Permettre tout pour %I" ON %I FOR ALL USING (true) WITH CHECK (true)', t, t);
  END LOOP;
END $$;

-- 6. INSERTION DE DONNÉES PAR DÉFAUT

-- Insérer l'utilisateur admin par défaut
INSERT INTO users (email, password, first_name, last_name, role)
VALUES ('admin@ecole.com', 'admin123', 'Admin', 'Système', 'admin')
ON CONFLICT (email) DO NOTHING;

-- Insérer les données initiales dans app_data
INSERT INTO app_data (key, value)
VALUES 
  ('classes', '[]'::jsonb),
  ('students', '[]'::jsonb),
  ('subjects', '[]'::jsonb),
  ('grades', '[]'::jsonb),
  ('users', '[{"id":1,"email":"admin@ecole.com","password":"admin123","role":"admin","firstName":"Admin","lastName":"Système"}]'::jsonb),
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
