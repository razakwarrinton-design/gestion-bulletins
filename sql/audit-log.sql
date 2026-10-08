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
--     d'un an, en supprime (durée de conservation / droit à l'oubli) ;
--   * pas de clé étrangère : supprimer un élève ou un compte n'efface pas son historique ;
--   * seules les colonnes modifiées sont conservées (pas de copie complète des lignes), et les données
--     volumineuses (photos, contenu des réglages) ne sont pas copiées : le journal note « (modifié) » ;
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
      ('students',      'photo_url'),
      ('classes',       ''),
      ('subjects',      ''),
      ('absences',      ''),
      ('user_profiles', ''),
      ('payments',      ''),
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
        CASE WHEN t.skipped = '' THEN '' ELSE quote_literal(t.skipped) END
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
