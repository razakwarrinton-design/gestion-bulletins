-- ============================================================================
-- JOURNAL DES INCIDENTS : erreurs rencontrées dans le navigateur des utilisateurs
-- À exécuter dans l'éditeur SQL de Supabase APRÈS security-hardening.sql. Additif et ré-exécutable.
--
-- L'application envoie ici, pour chaque erreur d'affichage ou erreur inattendue, un court rapport : message
-- et pile d'appels tronqués, écran concerné (sans paramètres d'adresse), identifiant du compte. Jamais de
-- notes, de noms d'élèves ni de contenu de formulaire (le client masque aussi adresses e-mail et numéros).
--
-- Garanties :
--   * un compte connecté ne peut écrire qu'une ligne à son propre nom (user_id = auth.uid()) ;
--   * seuls les administrateurs lisent le journal ; personne ne modifie ni ne supprime une ligne par l'API ;
--   * tailles bornées par des contraintes, et au plus 50 rapports par compte et par heure (anti-spam) ;
--   * purge des rapports de plus de 30 jours par un administrateur (purge_client_errors).
-- ============================================================================

CREATE TABLE IF NOT EXISTS client_errors (
  id          BIGSERIAL PRIMARY KEY,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id     UUID NOT NULL,
  source      TEXT NOT NULL DEFAULT 'window' CHECK (source IN ('window', 'promise', 'boundary')),
  route       TEXT CHECK (route IS NULL OR char_length(route) <= 60),
  message     TEXT NOT NULL CHECK (char_length(message) <= 500),
  stack       TEXT CHECK (stack IS NULL OR char_length(stack) <= 4000),
  user_agent  TEXT CHECK (user_agent IS NULL OR char_length(user_agent) <= 300)
);
CREATE INDEX IF NOT EXISTS client_errors_created_at_idx ON client_errors (created_at DESC);
CREATE INDEX IF NOT EXISTS client_errors_user_idx       ON client_errors (user_id, created_at DESC);

-- ── Anti-spam : 50 rapports par compte et par heure ─────────────────────────
CREATE OR REPLACE FUNCTION public.limit_client_errors()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (SELECT count(*) FROM public.client_errors
      WHERE user_id = NEW.user_id AND created_at > NOW() - INTERVAL '1 hour') >= 50 THEN
    RAISE EXCEPTION 'Trop de rapports d''incident pour ce compte';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS client_errors_limit ON client_errors;
CREATE TRIGGER client_errors_limit BEFORE INSERT ON client_errors
  FOR EACH ROW EXECUTE FUNCTION public.limit_client_errors();

-- ── Accès ───────────────────────────────────────────────────────────────────
ALTER TABLE client_errors ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Rapport par le compte connecté" ON client_errors;
CREATE POLICY "Rapport par le compte connecté" ON client_errors FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "Lecture administrateurs" ON client_errors;
CREATE POLICY "Lecture administrateurs" ON client_errors FOR SELECT
  USING (public.get_user_role() = 'admin');
REVOKE UPDATE, DELETE, TRUNCATE ON client_errors FROM anon, authenticated;
REVOKE INSERT ON client_errors FROM anon;

-- ── Conservation : purge des rapports de plus de 30 jours (administrateurs) ──
CREATE OR REPLACE FUNCTION public.purge_client_errors(p_older_than_days INT DEFAULT 30)
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
  DELETE FROM public.client_errors WHERE created_at < NOW() - make_interval(days => p_older_than_days);
  GET DIAGNOSTICS deleted = ROW_COUNT;
  RETURN deleted;
END;
$$;
REVOKE ALL ON FUNCTION public.purge_client_errors(INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.purge_client_errors(INT) TO authenticated;
