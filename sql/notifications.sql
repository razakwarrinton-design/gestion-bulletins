-- ============================================================================
-- NOTIFICATIONS : prévenir les parents que les notes d'un trimestre sont disponibles
-- À exécuter dans l'éditeur SQL de Supabase APRÈS security-hardening.sql. Additif et ré-exécutable.
--
-- Chaque notification est une ligne par parent et par élève : elle s'affiche dans la cloche de l'application
-- (écran du parent) et sert aussi de file d'envoi pour l'e-mail (colonne emailed_at, remplie par la fonction
-- Edge « notify-parents » : un e-mail n'est jamais envoyé deux fois pour la même notification).
--
-- La notification ne contient ni note ni moyenne : seulement « les notes du trimestre X de {prénom} sont
-- disponibles ». L'accès au bulletin reste soumis aux règles existantes (paiement des frais).
--
-- Garanties :
--   * un compte ne lit que ses propres notifications, et ne peut modifier que read_at (lu / non lu) ;
--   * personne ne crée ni ne supprime de notification par l'API : seule la fonction notify_class_parents,
--     réservée aux administrateurs et professeurs, en crée, et uniquement pour les parents liés (parent_students)
--     aux élèves de la classe — l'appelant ne choisit jamais les destinataires ;
--   * pas de doublon : un parent déjà prévenu pour le même élève et le même trimestre dans les dernières
--     24 heures n'est pas prévenu une seconde fois (double clic, nouvel essai après une correction).
-- ============================================================================

CREATE TABLE IF NOT EXISTS notifications (
  id          BIGSERIAL PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  student_id  BIGINT REFERENCES students(id) ON DELETE CASCADE,
  kind        TEXT NOT NULL DEFAULT 'grades_available' CHECK (kind IN ('grades_available')),
  trimester   TEXT CHECK (trimester IS NULL OR trimester IN ('1', '2', '3')),
  title       TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 120),
  body        TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 400),
  link_view   TEXT CHECK (link_view IS NULL OR char_length(link_view) <= 40),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  read_at     TIMESTAMPTZ,
  emailed_at  TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS notifications_user_idx    ON notifications (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS notifications_dedupe_idx  ON notifications (user_id, student_id, kind, trimester, created_at DESC);
CREATE INDEX IF NOT EXISTS notifications_to_email_idx ON notifications (created_at) WHERE emailed_at IS NULL;

-- ── Accès ───────────────────────────────────────────────────────────────────
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Lecture de ses notifications" ON notifications;
CREATE POLICY "Lecture de ses notifications" ON notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid());
DROP POLICY IF EXISTS "Marquer ses notifications comme lues" ON notifications;
CREATE POLICY "Marquer ses notifications comme lues" ON notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

REVOKE ALL ON notifications FROM anon, authenticated;
GRANT SELECT ON notifications TO authenticated;
GRANT UPDATE (read_at) ON notifications TO authenticated;

-- ── Création : uniquement par cette fonction ────────────────────────────────
CREATE OR REPLACE FUNCTION public.notify_class_parents(p_class_id BIGINT, p_trimester TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_notified   INT := 0;
  v_already    INT := 0;
  v_students   INT := 0;
  v_without    INT := 0;
  v_label      TEXT;
BEGIN
  IF public.get_user_role() NOT IN ('admin', 'professeur') THEN
    RAISE EXCEPTION 'Réservé aux administrateurs et aux professeurs';
  END IF;
  IF p_trimester IS NULL OR p_trimester NOT IN ('1', '2', '3') THEN
    RAISE EXCEPTION 'Trimestre invalide';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.classes WHERE id = p_class_id) THEN
    RAISE EXCEPTION 'Classe introuvable';
  END IF;

  v_label := CASE p_trimester WHEN '1' THEN '1er trimestre' WHEN '2' THEN '2e trimestre' ELSE '3e trimestre' END;

  SELECT count(*) INTO v_students FROM public.students WHERE class_id = p_class_id;
  SELECT count(*) INTO v_without
    FROM public.students s
   WHERE s.class_id = p_class_id
     AND NOT EXISTS (SELECT 1 FROM public.parent_students ps WHERE ps.student_id = s.id);

  -- Parents liés aux élèves de la classe, hors ceux déjà prévenus pour ce trimestre dans les dernières 24 h
  WITH targets AS (
    SELECT ps.parent_id, s.id AS student_id, s.first_name
      FROM public.parent_students ps
      JOIN public.students s ON s.id = ps.student_id
     WHERE s.class_id = p_class_id
  ),
  fresh AS (
    SELECT t.* FROM targets t
     WHERE NOT EXISTS (
       SELECT 1 FROM public.notifications n
        WHERE n.user_id = t.parent_id AND n.student_id = t.student_id
          AND n.kind = 'grades_available' AND n.trimester = p_trimester
          AND n.created_at > NOW() - INTERVAL '24 hours')
  ),
  inserted AS (
    INSERT INTO public.notifications (user_id, student_id, kind, trimester, title, body, link_view)
    SELECT f.parent_id, f.student_id, 'grades_available', p_trimester,
           'Notes du ' || v_label || ' disponibles',
           'Les notes du ' || v_label || ' de ' || COALESCE(NULLIF(btrim(f.first_name), ''), 'votre enfant') || ' sont disponibles.',
           'parents'
      FROM fresh f
    RETURNING 1
  )
  SELECT (SELECT count(*) FROM inserted),
         (SELECT count(*) FROM targets) - (SELECT count(*) FROM inserted)
    INTO v_notified, v_already;

  RETURN jsonb_build_object(
    'notified', v_notified,
    'already', v_already,
    'students', v_students,
    'studentsWithoutParent', v_without
  );
END;
$$;
REVOKE ALL ON FUNCTION public.notify_class_parents(BIGINT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.notify_class_parents(BIGINT, TEXT) TO authenticated;

-- ── Conservation : purge des notifications de plus de 90 jours (administrateurs) ──
CREATE OR REPLACE FUNCTION public.purge_notifications(p_older_than_days INT DEFAULT 90)
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
  IF p_older_than_days IS NULL OR p_older_than_days < 1 THEN
    RAISE EXCEPTION 'Durée invalide';
  END IF;
  DELETE FROM public.notifications WHERE created_at < NOW() - make_interval(days => p_older_than_days);
  GET DIAGNOSTICS deleted = ROW_COUNT;
  RETURN deleted;
END;
$$;
REVOKE ALL ON FUNCTION public.purge_notifications(INT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.purge_notifications(INT) TO authenticated;
