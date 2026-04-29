-- ============================================
-- SCHÉMA SUPABASE POUR GESTION DE BULLETINS
-- Version simplifiée et corrigée
-- ============================================

-- 1. Créer la table principale app_data
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
ALTER TABLE app_data ENABLE ROW LEVEL SECURITY;

-- Supprimer les anciennes politiques si elles existent
DROP POLICY IF EXISTS "Permettre lecture pour tous" ON app_data;
DROP POLICY IF EXISTS "Permettre écriture pour tous" ON app_data;
DROP POLICY IF EXISTS "Permettre mise à jour pour tous" ON app_data;
DROP POLICY IF EXISTS "Permettre suppression pour tous" ON app_data;

-- Créer les nouvelles politiques
CREATE POLICY "Permettre lecture pour tous" ON app_data FOR SELECT USING (true);
CREATE POLICY "Permettre écriture pour tous" ON app_data FOR INSERT WITH CHECK (true);
CREATE POLICY "Permettre mise à jour pour tous" ON app_data FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Permettre suppression pour tous" ON app_data FOR DELETE USING (true);

-- 4. INSERTION DE DONNÉES PAR DÉFAUT

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
  ('appreciations', '[]'::jsonb),
  ('currentUser', 'null'::jsonb),
  ('schoolLogo', 'null'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- ============================================
-- FIN DU SCHÉMA PRINCIPAL
-- ============================================

-- Vérification : afficher toutes les données insérées
SELECT 
  key, 
  jsonb_typeof(value) as type,
  length(value::text) as taille_caracteres
FROM app_data 
ORDER BY key;
