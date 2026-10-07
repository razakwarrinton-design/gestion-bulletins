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
ALTER TABLE grades DROP CONSTRAINT IF EXISTS grades_student_id_subject_id_trimester_key;
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
