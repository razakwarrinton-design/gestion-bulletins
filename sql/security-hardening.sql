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
