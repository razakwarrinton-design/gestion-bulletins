-- ============================================================================
-- Accès des parents au bulletin (selon le paiement des frais)
-- À exécuter dans l'éditeur SQL de Supabase, APRÈS payments-online.sql et AVANT
-- security-hardening.sql. Additif et ré-exécutable.
--
-- Le portail parents lit students.bulletin_access et payments.amount_due, mais aucun
-- script du dépôt ne créait ces colonnes : la lecture échouait et tous les parents
-- restaient bloqués sur « Dû », même après un paiement réussi.
--
-- Règle : un paiement « completed » débloque le bulletin de l'élève lorsque le total
-- encaissé couvre le total dû (amount_due, 0 par défaut = frais sans solde à régler).
-- Le déblocage est automatique ; le verrouillage reste une décision manuelle du staff.
-- Un parent ne peut pas modifier students (aucune politique d'écriture pour lui).
-- ============================================================================

ALTER TABLE students
  ADD COLUMN IF NOT EXISTS bulletin_access BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS amount_due NUMERIC(12,2) NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.unlock_bulletin_on_payment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_paid NUMERIC;
  v_due  NUMERIC;
BEGIN
  IF NEW.status IS DISTINCT FROM 'completed' OR NEW.student_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(SUM(amount_paid) FILTER (WHERE status = 'completed'), 0),
         COALESCE(SUM(amount_due), 0)
    INTO v_paid, v_due
    FROM payments
   WHERE student_id = NEW.student_id;

  IF v_paid > 0 AND v_paid >= v_due THEN
    UPDATE students SET bulletin_access = true
     WHERE id = NEW.student_id AND bulletin_access = false;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS payments_unlock_bulletin ON payments;
CREATE TRIGGER payments_unlock_bulletin
  AFTER INSERT OR UPDATE OF status, amount_paid, amount_due ON payments
  FOR EACH ROW EXECUTE FUNCTION public.unlock_bulletin_on_payment();
