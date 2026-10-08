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
-- Un professeur ne modifie que ses propres appréciations (avant, il pouvait réécrire celles de tous)
CREATE POLICY "Modification par l'auteur ou l'admin" ON appreciations FOR UPDATE
  USING (public.get_user_role() = 'admin' OR (public.get_user_role() = 'professeur' AND author_id = auth.uid()))
  WITH CHECK (public.get_user_role() = 'admin' OR (public.get_user_role() = 'professeur' AND author_id = auth.uid()));
CREATE POLICY "Suppression par l'auteur ou l'admin" ON appreciations FOR DELETE
  USING (public.get_user_role() = 'admin' OR (public.get_user_role() = 'professeur' AND author_id = auth.uid()));

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
