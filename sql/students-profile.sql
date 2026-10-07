-- ============================================================================
-- Profil élève : date de naissance, sexe, photo, contact d'urgence
-- À exécuter dans l'éditeur SQL de Supabase. Additif et ré-exécutable.
--
-- Le formulaire d'élève (StudentModal) collectait déjà ces informations, mais la
-- table students n'avait pas de colonnes pour les stocker : elles étaient perdues.
-- Le numéro de contact sert notamment à l'envoi des résultats par WhatsApp.
-- ============================================================================

ALTER TABLE students
  ADD COLUMN IF NOT EXISTS birth_date         DATE,
  ADD COLUMN IF NOT EXISTS gender             TEXT,
  ADD COLUMN IF NOT EXISTS photo_url          TEXT,
  ADD COLUMN IF NOT EXISTS emergency_name     TEXT,
  ADD COLUMN IF NOT EXISTS emergency_phone    TEXT,
  ADD COLUMN IF NOT EXISTS emergency_relation TEXT;
