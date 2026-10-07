-- ============================================================================
-- Paiements en ligne (Mobile Money via FedaPay)
-- À exécuter dans l'éditeur SQL de Supabase APRÈS supabase-security-rls.sql.
-- Script ré-exécutable (IF NOT EXISTS partout) et additif : aucune colonne ni
-- donnée existante n'est modifiée ou supprimée.
-- ============================================================================

-- Colonnes nécessaires au suivi d'un paiement externe
ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS status         TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS provider       TEXT,
  ADD COLUMN IF NOT EXISTS currency       TEXT NOT NULL DEFAULT 'XOF',
  ADD COLUMN IF NOT EXISTS external_id    TEXT,
  ADD COLUMN IF NOT EXISTS payer_name     TEXT,
  ADD COLUMN IF NOT EXISTS payer_phone    TEXT,
  ADD COLUMN IF NOT EXISTS paid_at        TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS failure_reason TEXT,
  ADD COLUMN IF NOT EXISTS updated_at     TIMESTAMPTZ DEFAULT NOW();

-- Un même paiement externe ne peut être rattaché qu'à une seule ligne :
-- protège contre les doublons si le webhook est rejoué.
CREATE UNIQUE INDEX IF NOT EXISTS payments_provider_external_id_key
  ON payments (provider, external_id)
  WHERE external_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS payments_student_id_idx ON payments (student_id);
CREATE INDEX IF NOT EXISTS payments_status_idx ON payments (status);

-- Un parent peut consulter les paiements de ses enfants (lecture seule).
-- Les écritures passent exclusivement par les fonctions Edge (service_role).
DROP POLICY IF EXISTS "Parents lisent les paiements de leurs enfants" ON payments;
CREATE POLICY "Parents lisent les paiements de leurs enfants" ON payments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM parent_students ps
      WHERE ps.parent_id = auth.uid()
        AND ps.student_id = payments.student_id
    )
  );
