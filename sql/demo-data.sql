-- ============================================================================
-- DONNÉES DE DÉMONSTRATION : 5 classes de 20 élèves, avec leurs notes des 3 trimestres
-- À exécuter dans l'éditeur SQL de Supabase (rôle postgres). À réserver à une base de démonstration.
--
-- Ce que le script crée :
--   • 4 classes neuves : 6ème A, 4ème A, 3ème A, 2nde A (20 élèves chacune, noms fictifs) ;
--   • la classe existante « TA4 » (variable v_complete_class) complétée à 20 élèves : ses élèves actuels et leurs notes
--     ne sont pas touchés, seuls les élèves manquants sont ajoutés (mettre NULL pour ne compléter aucune classe) ;
--   • pour chaque nouvel élève, chaque matière et chaque trimestre : interrogation, devoir, composition (0 à 20, avec la
--     pondération de l'application ×1 / ×2 / ×3), parfois un bonus, la note finale et une appréciation.
-- Matières : si la base en contient déjà 5 ou plus, ce sont elles qui sont notées (rien n'est ajouté, aucun doublon) ;
-- sinon les 8 matières courantes qui manquent sont créées. Pas de philosophie avant la classe de TA4, pas de LV2
-- (allemand, espagnol) en 6ème : ces cases restent vides, comme dans un vrai emploi du temps.
-- Année scolaire : celle de l'application. L'application relit mal l'année « active » de app_data dans certaines bases, donc :
-- l'année active si elle a déjà des notes, sinon l'année la plus récente qui en a, sinon l'année active, sinon l'année en cours.
-- Le message affiché à la fin donne l'année retenue.
--
-- Sécurité :
--   • s'arrête sans rien créer si l'une des 4 classes neuves existe déjà (aucun mélange avec vos vraies données) ;
--   • s'arrête sans rien faire si la démo est déjà installée ; pour la refaire : sql/demo-data-cleanup.sql d'abord ;
--   • tout est annulé en bloc si une erreur survient ;
--   • le journal d'audit n'enregistre pas ces ~2 000 lignes (il resterait illisible) : il n'enregistre que ce que font les utilisateurs.
-- Les identifiants créés sont conservés dans app_data (clé « demoSeed ») pour que le nettoyage ne supprime que la démo.
-- Les résultats sont tirés au hasard à graine fixe : on obtient les mêmes élèves et les mêmes notes à chaque installation.
-- ============================================================================

DO $$
DECLARE
  v_complete_class TEXT  := 'TA4'; -- classe existante à compléter à 20 élèves (NULL : aucune)
  v_classes   TEXT[]    := ARRAY['6ème A', '4ème A', '3ème A', '2nde A'];
  v_levels    TEXT[]    := ARRAY['6ème', '4ème', '3ème', '2nde'];
  v_ages      INT[]     := ARRAY[11, 13, 14, 15];
  v_complete_age INT    := 17;
  v_class_size INT      := 20;
  v_male      TEXT[]    := ARRAY['Kokou', 'Yao', 'Kodjo', 'Komla', 'Kossi', 'Koffi', 'Mawuli', 'Edem', 'Senam', 'Selom',
                                 'Daniel', 'Samuel', 'Emmanuel', 'Joseph', 'David', 'Prince', 'Ismaël', 'Fabrice', 'Wilfried', 'Yannick'];
  v_female    TEXT[]    := ARRAY['Afi', 'Akossiwa', 'Ama', 'Abla', 'Adjoa', 'Esso', 'Mawussi', 'Sika', 'Dzifa', 'Elom',
                                 'Grace', 'Esther', 'Ruth', 'Sarah', 'Marie', 'Rachel', 'Nadège', 'Chantal', 'Estelle', 'Prisca'];
  v_last      TEXT[]    := ARRAY['AGBODJAN', 'AMEGAN', 'ATTIOGBE', 'KPOMEGNI', 'ADJOVI', 'DOSSEH', 'GBEDEMAH', 'MENSAH', 'TCHALLA', 'ALIDOU',
                                 'AKAKPO', 'LAWSON', 'SOKPOH', 'KOUDJO', 'ASSOGBA', 'AZIAGBA', 'DJOBO', 'EKLOU', 'FOLLY', 'HOUNKPATI',
                                 'KODJO', 'LAMBONI', 'MAWUENA', 'NOMEDJI', 'PALANGA', 'SANVEE', 'TOGNON', 'WOLOU', 'YAWO', 'ZINSOU'];
  v_std_name  TEXT[]    := ARRAY['Mathématiques', 'Français', 'Anglais', 'Histoire-Géographie', 'SVT', 'Physique-Chimie', 'EPS', 'Éducation civique et morale'];
  v_std_coef  NUMERIC[] := ARRAY[4, 4, 3, 2, 2, 2, 1, 1];
  v_teachers  TEXT[]    := ARRAY['M. ATTIOGBE', 'Mme DOSSEH', 'M. LAWSON', 'M. KODJO', 'Mme AKAKPO', 'M. TOGNON', 'M. AMEGAN', 'Mme SANVEE'];

  v_year        TEXT;
  v_active      TEXT;
  v_start       INT;
  v_subj_ids    BIGINT[] := ARRAY[]::BIGINT[];
  v_subj_norm   TEXT[]   := ARRAY[]::TEXT[];
  v_new_subjs   BIGINT[] := ARRAY[]::BIGINT[];
  v_class_ids   BIGINT[] := ARRAY[]::BIGINT[];
  v_added       BIGINT[] := ARRAY[]::BIGINT[];
  v_id          BIGINT;
  v_name        TEXT;
  v_complete_id BIGINT;
  v_existing    INT;
  v_class_id    BIGINT;
  v_student_id  BIGINT;
  v_k           INT := 0;
  v_ability     DOUBLE PRECISION;
  v_offset      DOUBLE PRECISION;
  v_mean        DOUBLE PRECISION;
  v_i           DOUBLE PRECISION;
  v_d           DOUBLE PRECISION;
  v_c           DOUBLE PRECISION;
  v_bonus       NUMERIC;
  v_value       NUMERIC;
  v_grades      INT := 0;
  v_students    INT := 0;
  v_audit       TEXT;
  v_audited     TEXT[] := ARRAY[]::TEXT[];
  v_years       JSONB;
  c INT; j INT; s INT; t INT; tri INT;

BEGIN
  IF EXISTS (SELECT 1 FROM app_data WHERE key = 'demoSeed') THEN
    RAISE NOTICE 'La démonstration est déjà installée : lancez sql/demo-data-cleanup.sql avant de la refaire.';
    RETURN;
  END IF;

  FOR c IN 1..4 LOOP
    IF EXISTS (SELECT 1 FROM classes WHERE name = v_classes[c]) THEN
      RAISE EXCEPTION 'La classe « % » existe déjà : renommez-la (ou supprimez-la) avant d''installer la démonstration.', v_classes[c];
    END IF;
  END LOOP;

  IF v_complete_class IS NOT NULL THEN
    SELECT id INTO v_complete_id FROM classes WHERE name = v_complete_class ORDER BY id LIMIT 1;
    IF v_complete_id IS NOT NULL THEN
      SELECT count(*) INTO v_existing FROM students WHERE class_id = v_complete_id;
    END IF;
  END IF;

  -- ── Année scolaire ───────────────────────────────────────────────────────────
  -- app_data.value est une chaîne JSON quand l'application l'a écrite, un tableau JSON quand un script SQL l'a posé
  SELECT CASE WHEN jsonb_typeof(value) = 'string' THEN (value #>> '{}')::JSONB ELSE value END INTO v_years
    FROM app_data WHERE key = 'academicYears';
  IF v_years IS NOT NULL AND jsonb_typeof(v_years) = 'array' THEN
    SELECT elem->>'year' INTO v_active
      FROM jsonb_array_elements(v_years) AS elem
     WHERE COALESCE((elem->>'isActive')::BOOLEAN, FALSE) LIMIT 1;
  END IF;
  IF v_active IS NOT NULL AND v_active !~ '^\d{4}-\d{4}$' THEN v_active := NULL; END IF;

  IF v_active IS NOT NULL AND EXISTS (SELECT 1 FROM grades WHERE academic_year = v_active) THEN
    v_year := v_active;
  ELSE
    SELECT max(academic_year) INTO v_year FROM grades WHERE academic_year ~ '^\d{4}-\d{4}$';
  END IF;
  IF v_year IS NULL THEN v_year := v_active; END IF;
  IF v_year IS NULL THEN
    v_start := CASE WHEN EXTRACT(MONTH FROM CURRENT_DATE) >= 9 THEN EXTRACT(YEAR FROM CURRENT_DATE) ELSE EXTRACT(YEAR FROM CURRENT_DATE) - 1 END;
    v_year := v_start || '-' || (v_start + 1);
  END IF;
  v_start := LEFT(v_year, 4)::INT;

  -- Journal d'audit suspendu le temps de l'installation (rétabli en fin de bloc)
  FOREACH v_audit IN ARRAY ARRAY['grades', 'students', 'classes', 'subjects'] LOOP
    IF to_regclass('public.' || v_audit) IS NOT NULL AND EXISTS (
         SELECT 1 FROM pg_trigger WHERE tgname = 'audit_' || v_audit AND tgrelid = ('public.' || v_audit)::regclass AND tgenabled <> 'D') THEN
      EXECUTE format('ALTER TABLE public.%I DISABLE TRIGGER %I', v_audit, 'audit_' || v_audit);
      v_audited := v_audited || v_audit;
    END IF;
  END LOOP;

  PERFORM setseed(0.2026);

  -- ── Matières ─────────────────────────────────────────────────────────────────
  -- Comparaison sans casse ni accents (« Francais » = « Français »)
  IF (SELECT count(*) FROM subjects) >= 5 THEN
    FOR v_id, v_name IN SELECT id, name FROM subjects ORDER BY id LOOP
      v_subj_ids := v_subj_ids || v_id;
      v_subj_norm := v_subj_norm || translate(lower(v_name), 'éèêëàâîïôûùç', 'eeeeaaiiouuc');
    END LOOP;
  ELSE
    FOR s IN 1..8 LOOP
      SELECT id INTO v_id FROM subjects
       WHERE translate(lower(name), 'éèêëàâîïôûùç', 'eeeeaaiiouuc') = translate(lower(v_std_name[s]), 'éèêëàâîïôûùç', 'eeeeaaiiouuc')
       ORDER BY id LIMIT 1;
      IF v_id IS NULL THEN
        INSERT INTO subjects (name, coefficient) VALUES (v_std_name[s], v_std_coef[s]) RETURNING id INTO v_id;
        v_new_subjs := v_new_subjs || v_id;
      END IF;
      v_subj_ids := v_subj_ids || v_id;
      v_subj_norm := v_subj_norm || translate(lower(v_std_name[s]), 'éèêëàâîïôûùç', 'eeeeaaiiouuc');
    END LOOP;
  END IF;

  -- ── Élèves et notes : 4 classes neuves (c = 1…4), puis la classe à compléter (c = 5) ─────────────────
  FOR c IN 1..5 LOOP
    IF c <= 4 THEN
      INSERT INTO classes (name, level) VALUES (v_classes[c], v_levels[c]) RETURNING id INTO v_class_id;
      v_class_ids := v_class_ids || v_class_id;
      s := v_class_size; -- nombre d'élèves à créer
    ELSIF v_complete_id IS NOT NULL AND v_existing < v_class_size THEN
      v_class_id := v_complete_id;
      s := v_class_size - v_existing;
    ELSE
      EXIT;
    END IF;

    FOR j IN 1..s LOOP
      -- 0 à 99 : le couple prénom / nom ne se répète pas avant 120
      INSERT INTO students (first_name, last_name, class_id, gender, birth_date)
      VALUES (
        CASE WHEN v_k % 2 = 0 THEN v_male[(v_k / 2) % 20 + 1] ELSE v_female[(v_k / 2) % 20 + 1] END,
        v_last[(v_k * 7) % 30 + 1],
        v_class_id,
        CASE WHEN v_k % 2 = 0 THEN 'M' ELSE 'F' END,
        make_date(v_start - CASE WHEN c <= 4 THEN v_ages[c] ELSE v_complete_age END - floor(random() * 2)::INT,
                  1 + floor(random() * 12)::INT, 1 + floor(random() * 28)::INT)
      ) RETURNING id INTO v_student_id;
      v_k := v_k + 1;
      v_students := v_students + 1;
      IF c = 5 THEN v_added := v_added || v_student_id; END IF;

      -- niveau de l'élève (8 à 16) avec quelques très bons et quelques élèves en difficulté
      v_ability := 8 + 8 * random()
                   + CASE WHEN random() < 0.08 THEN 2 WHEN random() < 0.08 THEN -2.5 ELSE 0 END;

      FOR t IN 1..array_length(v_subj_ids, 1) LOOP
        v_offset := (random() - 0.5) * 5; -- chacun a ses matières fortes et faibles
        -- matières qui n'existent pas encore dans ce niveau : la case reste vide
        CONTINUE WHEN (v_subj_norm[t] LIKE 'philo%' AND c <> 5)
                   OR ((v_subj_norm[t] LIKE 'allemand%' OR v_subj_norm[t] LIKE 'espagnol%') AND c = 1);
        FOR tri IN 1..3 LOOP
          v_mean := v_ability + v_offset + (tri - 1) * 0.3 + (random() - 0.5) * 1.5;
          v_i := greatest(0, least(20, round((v_mean + (random() - 0.5) * 6)::NUMERIC * 2) / 2));
          v_d := greatest(0, least(20, round((v_mean + (random() - 0.5) * 4)::NUMERIC * 2) / 2));
          v_c := greatest(0, least(20, round((v_mean + (random() - 0.5) * 4)::NUMERIC * 2) / 2));
          v_bonus := CASE WHEN random() < 0.05 THEN 0.5 * (1 + floor(random() * 3)) ELSE NULL END;
          -- même formule que src/utils/finalGrade.js : (interro×1 + devoir×2 + composition×3) / 6, plus le bonus, plafonné à 20
          v_value := least(20, round(((v_i + 2 * v_d + 3 * v_c) / 6)::NUMERIC + COALESCE(v_bonus, 0), 2));

          INSERT INTO grades (student_id, subject_id, trimester, academic_year, value, appreciation,
                              interro, devoir, composition, bonus, teacher_name)
          VALUES (
            v_student_id, v_subj_ids[t], tri::TEXT, v_year, v_value,
            CASE WHEN v_value >= 16 THEN 'Excellent travail'
                 WHEN v_value >= 14 THEN 'Très bon travail'
                 WHEN v_value >= 12 THEN 'Bon travail'
                 WHEN v_value >= 10 THEN 'Résultats satisfaisants'
                 ELSE 'Doit fournir plus d''efforts' END,
            v_i, v_d, v_c, v_bonus, v_teachers[(t - 1) % 8 + 1]
          );
          v_grades := v_grades + 1;
        END LOOP;
      END LOOP;
    END LOOP;
  END LOOP;

  INSERT INTO app_data (key, value)
  VALUES ('demoSeed', jsonb_build_object('classIds', to_jsonb(v_class_ids), 'newSubjectIds', to_jsonb(v_new_subjs),
                                         'addedStudentIds', to_jsonb(v_added), 'completedClassId', v_complete_id,
                                         'academicYear', v_year, 'createdAt', now()));

  FOREACH v_audit IN ARRAY v_audited LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE TRIGGER %I', v_audit, 'audit_' || v_audit);
  END LOOP;

  RAISE NOTICE 'Démonstration installée pour l''année % : % classes neuves, % élèves ajoutés (dont % dans « % »), % notes.',
    v_year, array_length(v_class_ids, 1), v_students, COALESCE(array_length(v_added, 1), 0), v_complete_class, v_grades;
END $$;
