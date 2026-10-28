-- ============================================================================
-- SUPPRESSION DES DONNÉES DE DÉMONSTRATION créées par sql/demo-data.sql
-- À exécuter dans l'éditeur SQL de Supabase. Ne supprime que ce que le script de démonstration a créé
-- (classes neuves avec leurs élèves et leurs notes, élèves ajoutés à une classe existante comme « TA4 » avec leurs notes,
-- et matières ajoutées), repéré par la clé « demoSeed » de app_data. Vos autres classes, élèves et notes ne sont pas
-- touchés : la classe complétée reste, avec ses élèves d'origine. Sans « demoSeed », le script ne fait rien.
--
-- Attention : si vous avez saisi des notes, des paiements ou des liens parents sur les élèves de démonstration, ils
-- sont supprimés avec eux. Une matière ajoutée par la démonstration n'est supprimée que si plus aucune note ne l'utilise.
-- ============================================================================

DO $$
DECLARE
  v_seed      JSONB;
  v_class_ids BIGINT[];
  v_subj_ids  BIGINT[];
  v_added_ids BIGINT[];
  v_audit     TEXT;
  v_audited   TEXT[] := ARRAY[]::TEXT[];
  v_students  INT;
BEGIN
  SELECT value INTO v_seed FROM app_data WHERE key = 'demoSeed';
  IF v_seed IS NULL THEN
    RAISE NOTICE 'Aucune démonstration à supprimer (clé demoSeed absente).';
    RETURN;
  END IF;

  SELECT COALESCE(array_agg(x::BIGINT), ARRAY[]::BIGINT[]) INTO v_class_ids FROM jsonb_array_elements_text(v_seed->'classIds') AS x;
  SELECT COALESCE(array_agg(x::BIGINT), ARRAY[]::BIGINT[]) INTO v_subj_ids FROM jsonb_array_elements_text(v_seed->'newSubjectIds') AS x;
  SELECT COALESCE(array_agg(x::BIGINT), ARRAY[]::BIGINT[]) INTO v_added_ids FROM jsonb_array_elements_text(COALESCE(v_seed->'addedStudentIds', '[]'::JSONB)) AS x;

  -- Journal d'audit suspendu le temps de la suppression (rétabli ensuite)
  FOREACH v_audit IN ARRAY ARRAY['grades', 'students', 'classes', 'subjects'] LOOP
    IF to_regclass('public.' || v_audit) IS NOT NULL AND EXISTS (
         SELECT 1 FROM pg_trigger WHERE tgname = 'audit_' || v_audit AND tgrelid = ('public.' || v_audit)::regclass AND tgenabled <> 'D') THEN
      EXECUTE format('ALTER TABLE public.%I DISABLE TRIGGER %I', v_audit, 'audit_' || v_audit);
      v_audited := v_audited || v_audit;
    END IF;
  END LOOP;

  SELECT count(*) INTO v_students FROM students WHERE class_id = ANY (v_class_ids) OR id = ANY (v_added_ids);

  -- les élèves et leurs notes partent avec la classe (ON DELETE CASCADE) ; les élèves ajoutés à une classe existante
  -- sont supprimés un par un, pas la classe
  DELETE FROM classes WHERE id = ANY (v_class_ids);
  DELETE FROM students WHERE id = ANY (v_added_ids);
  DELETE FROM subjects s WHERE s.id = ANY (v_subj_ids) AND NOT EXISTS (SELECT 1 FROM grades g WHERE g.subject_id = s.id);
  DELETE FROM app_data WHERE key = 'demoSeed';

  FOREACH v_audit IN ARRAY v_audited LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE TRIGGER %I', v_audit, 'audit_' || v_audit);
  END LOOP;

  RAISE NOTICE 'Démonstration supprimée : % classes, % élèves.', COALESCE(array_length(v_class_ids, 1), 0), v_students;
END $$;
