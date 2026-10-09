-- ============================================================================
-- REMISE À ZÉRO DES TABLES MÉTIER D'UNE ANCIENNE INSTALLATION (identifiants uuid)
-- ⚠️ DESTRUCTIF : efface toutes les classes, élèves, matières, notes, absences, paiements,
-- frais, liens parent-élève, conversations, messages et activités de la base.
--
-- À n'utiliser QUE sur une base de démonstration dont les données peuvent être perdues, et dont les
-- tables ont été créées avec des identifiants uuid (au lieu des identifiants numériques que
-- définissent les scripts de ce dépôt). Les scripts font CREATE TABLE IF NOT EXISTS : une table déjà
-- présente avec un autre type d'identifiant est conservée telle quelle, et l'installation échoue
-- ensuite sur les clés étrangères.
--
-- Ce script CONSERVE :
--   * les comptes de connexion (auth.users) et leurs rôles (user_profiles) ;
--   * app_data (réglages de l'école : nom, couleurs, années scolaires).
-- Il supprime aussi l'ancienne table `users` (mots de passe en clair) et les vues v_users et
-- v_parent_dashboard, qui contournaient les règles d'accès : le script de sécurité recrée ce qui
-- est utile.
--
-- Ordre : ce script, puis toute la chaîne d'installation du README (étapes 1 à 10).
-- ============================================================================

DROP VIEW IF EXISTS public.v_parent_dashboard CASCADE;
DROP VIEW IF EXISTS public.v_users CASCADE;

DROP TABLE IF EXISTS
  public.messages,
  public.conversations,
  public.payments,
  public.fee_types,
  public.parent_students,
  public.absences,
  public.appreciations,
  public.grades,
  public.students,
  public.subjects,
  public.classes,
  public.activities,
  public.bonus,
  public.users
  CASCADE;

-- Anciennes versions des fonctions qui prennent un identifiant d'élève : une version « uuid » laissée
-- en place coexisterait avec la version numérique recréée par les scripts.
DO $$
DECLARE
  f RECORD;
BEGIN
  FOR f IN
    SELECT p.oid::regprocedure AS signature
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname IN ('is_parent_of', 'child_class_rank')
  LOOP
    EXECUTE format('DROP FUNCTION %s CASCADE', f.signature);
  END LOOP;
END $$;

-- app_data a été créée sans colonne id : les scripts s'appuient seulement sur l'unicité de `key`
-- (INSERT ... ON CONFLICT (key)).
CREATE UNIQUE INDEX IF NOT EXISTS app_data_key_unique ON public.app_data (key);
