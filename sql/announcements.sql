-- ============================================================================
-- INFOS DE L'ÉTABLISSEMENT : frais et règles publiés par la direction et les professeurs, lus par les parents
-- À exécuter dans l'éditeur SQL de Supabase APRÈS notifications.sql (et audit-log.sql). Additif et ré-exécutable.
--
-- Pourquoi : un élève peut mal rapporter à sa famille le montant d'un frais (relevé de notes, document…) ou une règle
-- nouvelle. La direction et les professeurs publient l'information une fois ; le parent la lit lui-même dans son espace.
-- Le montant d'un frais est une INFORMATION, pas une facture : le solde dû reste celui de la gestion des paiements.
--
-- Garanties :
--   * seuls l'administrateur et les professeurs publient ; un professeur ne modifie ni ne supprime que ses propres
--     publications (l'administrateur toutes) ; l'auteur et son rôle sont fixés par la base, pas par le navigateur ;
--   * le personnel (dont le secrétariat) lit tout ; un parent lit les infos de tout l'établissement et celles de la
--     classe de l'un de ses enfants, jamais celles d'une autre classe ; un compte « en attente » ne lit rien ;
--   * le texte est stocké brut : l'application l'affiche comme du texte, jamais comme du HTML ;
--   * notify_announcement prévient les parents concernés dans la cloche (un seul avis par parent et par publication).
-- ============================================================================

CREATE TABLE IF NOT EXISTS announcements (
  id          BIGSERIAL PRIMARY KEY,
  title       TEXT NOT NULL CHECK (char_length(btrim(title)) BETWEEN 1 AND 150),
  body        TEXT NOT NULL CHECK (char_length(btrim(body)) BETWEEN 1 AND 4000),
  category    TEXT NOT NULL DEFAULT 'autre' CHECK (category IN ('frais', 'reglement', 'autre')),
  amount_fcfa INTEGER CHECK (amount_fcfa IS NULL OR amount_fcfa BETWEEN 0 AND 100000000),
  deadline    DATE,
  class_id    BIGINT REFERENCES classes(id) ON DELETE CASCADE,   -- vide : tout l'établissement
  author_id   UUID DEFAULT auth.uid(),
  author_name TEXT,
  author_role TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- un montant n'a de sens que pour un frais
  CONSTRAINT announcements_amount_only_for_fees CHECK (amount_fcfa IS NULL OR category = 'frais')
);
CREATE INDEX IF NOT EXISTS announcements_created_idx ON announcements (created_at DESC);
CREATE INDEX IF NOT EXISTS announcements_class_idx   ON announcements (class_id);

-- L'auteur vient de la base : il ne peut être ni falsifié à la création, ni changé ensuite
CREATE OR REPLACE FUNCTION public.announcements_set_author()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  profile RECORD;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF auth.uid() IS NOT NULL THEN
      SELECT first_name, last_name, role INTO profile FROM public.user_profiles WHERE id = auth.uid();
      NEW.author_id := auth.uid();
      NEW.author_name := NULLIF(btrim(COALESCE(profile.first_name, '') || ' ' || COALESCE(profile.last_name, '')), '');
      NEW.author_role := profile.role;
    END IF;
  ELSE
    NEW.author_id := OLD.author_id;
    NEW.author_name := OLD.author_name;
    NEW.author_role := OLD.author_role;
    NEW.created_at := OLD.created_at;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS announcements_set_author ON announcements;
CREATE TRIGGER announcements_set_author
  BEFORE INSERT OR UPDATE ON announcements
  FOR EACH ROW EXECUTE FUNCTION public.announcements_set_author();

DROP TRIGGER IF EXISTS update_announcements_updated_at ON announcements;
CREATE TRIGGER update_announcements_updated_at
  BEFORE UPDATE ON announcements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── Accès ───────────────────────────────────────────────────────────────────
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Lecture personnel" ON announcements;
DROP POLICY IF EXISTS "Lecture parents" ON announcements;
DROP POLICY IF EXISTS "Publication admin et professeur" ON announcements;
DROP POLICY IF EXISTS "Modification par l'auteur ou l'admin" ON announcements;
DROP POLICY IF EXISTS "Suppression par l'auteur ou l'admin" ON announcements;

CREATE POLICY "Lecture personnel" ON announcements FOR SELECT
  USING (public.is_staff());
CREATE POLICY "Lecture parents" ON announcements FOR SELECT
  USING (
    public.get_user_role() = 'parent'
    AND (
      class_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.parent_students ps
        JOIN public.students s ON s.id = ps.student_id
        WHERE ps.parent_id = auth.uid() AND s.class_id = announcements.class_id
      )
    )
  );
CREATE POLICY "Publication admin et professeur" ON announcements FOR INSERT
  WITH CHECK (public.get_user_role() IN ('admin', 'professeur') AND author_id = auth.uid());
CREATE POLICY "Modification par l'auteur ou l'admin" ON announcements FOR UPDATE
  USING (public.get_user_role() = 'admin' OR (public.get_user_role() = 'professeur' AND author_id = auth.uid()))
  WITH CHECK (public.get_user_role() = 'admin' OR (public.get_user_role() = 'professeur' AND author_id = auth.uid()));
CREATE POLICY "Suppression par l'auteur ou l'admin" ON announcements FOR DELETE
  USING (public.get_user_role() = 'admin' OR (public.get_user_role() = 'professeur' AND author_id = auth.uid()));

REVOKE ALL ON announcements FROM anon;
REVOKE TRUNCATE ON announcements FROM authenticated;

-- ── Journal d'audit (si audit-log.sql est installé) : qui a publié ou changé quel montant ────────────────────
DO $$
BEGIN
  IF to_regproc('public.audit_row_change') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS audit_announcements ON public.announcements;
    CREATE TRIGGER audit_announcements AFTER INSERT OR UPDATE OR DELETE ON public.announcements
      FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();
  END IF;
END $$;

-- ── Avis dans la cloche : un par parent concerné et par publication ────────────────────────────────────────
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS announcement_id BIGINT REFERENCES announcements(id) ON DELETE CASCADE;
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_kind_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_kind_check CHECK (kind IN ('grades_available', 'announcement'));
CREATE INDEX IF NOT EXISTS notifications_announcement_idx ON notifications (announcement_id) WHERE announcement_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.notify_announcement(p_announcement_id BIGINT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  a          public.announcements%ROWTYPE;
  v_role     TEXT := public.get_user_role();
  v_prefix   TEXT;
  v_notified INT;
  v_already  INT;
  v_parents  INT;
BEGIN
  SELECT * INTO a FROM public.announcements WHERE id = p_announcement_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Information introuvable';
  END IF;
  -- l'administrateur, ou le professeur qui l'a publiée
  IF NOT (v_role = 'admin' OR (v_role = 'professeur' AND a.author_id = auth.uid())) THEN
    RAISE EXCEPTION 'Réservé à l''auteur de la publication et aux administrateurs';
  END IF;

  v_prefix := CASE a.category WHEN 'frais' THEN 'Frais : ' WHEN 'reglement' THEN 'Règlement : ' ELSE 'Info de l''école : ' END;

  WITH targets AS (
    SELECT DISTINCT ps.parent_id
      FROM public.parent_students ps
      JOIN public.students s ON s.id = ps.student_id
      JOIN public.user_profiles up ON up.id = ps.parent_id AND up.role = 'parent'
     WHERE a.class_id IS NULL OR s.class_id = a.class_id
  ),
  inserted AS (
    INSERT INTO public.notifications (user_id, kind, announcement_id, title, body, link_view)
    SELECT t.parent_id, 'announcement', a.id,
           left(v_prefix || btrim(a.title), 120),
           left(btrim(a.body), 400),
           'parents'
      FROM targets t
     WHERE NOT EXISTS (
       SELECT 1 FROM public.notifications n WHERE n.user_id = t.parent_id AND n.announcement_id = a.id)
    RETURNING 1
  )
  SELECT (SELECT count(*) FROM inserted), (SELECT count(*) FROM targets)
    INTO v_notified, v_parents;
  v_already := v_parents - v_notified;

  RETURN jsonb_build_object('notified', v_notified, 'already', v_already, 'parents', v_parents);
END;
$$;
REVOKE ALL ON FUNCTION public.notify_announcement(BIGINT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.notify_announcement(BIGINT) TO authenticated;
