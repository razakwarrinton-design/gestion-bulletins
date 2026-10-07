import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from '../config/supabase';

// Colonnes de la table grades (voir sql/grades-alignment.sql pour la colonne `bonus`)
const GRADE_COLUMNS =
  "id, student_id, subject_id, trimester, academic_year, value, appreciation, interro, devoir, composition, bonus, teacher_name";

// ── Mapper Supabase → état local ──────────────────────────────────────────
const mapGrade = (g) => ({
  ...g,
  studentId: g.student_id,
  subjectId: g.subject_id,
  // sous-notes
  interro: g.interro ?? null,
  devoir: g.devoir ?? null,
  composition: g.composition ?? null,
  bonus: g.bonus ?? null,
  teacherName: g.teacher_name ?? "",
});

const toNumberOrNull = (v) =>
  v !== "" && v != null && !Number.isNaN(parseFloat(v)) ? parseFloat(v) : null;

export function useGrades(academicYear = null) {
  const [grades, setGrades] = useState([]);
  const [loading, setLoading] = useState(false);
  // Message d'erreur du dernier chargement (null si tout va bien) : à afficher par l'écran appelant
  const [error, setError] = useState(null);

  const fetchGrades = useCallback(async () => {
    if (!academicYear) return;

    setLoading(true);
    // Sélectionne seulement les colonnes nécessaires
    const { data, error: fetchError } = await supabase
      .from("grades")
      .select(GRADE_COLUMNS)
      .eq("academic_year", academicYear);

    if (fetchError) {
      console.error("Chargement des notes impossible:", fetchError);
      setError(fetchError.message || "Chargement des notes impossible");
    } else {
      setError(null);
      setGrades(data.map(mapGrade));
    }
    setLoading(false);
  }, [academicYear]);

  useEffect(() => {
    // Ne charge QUE si academicYear est fourni
    fetchGrades();
  }, [fetchGrades]);

  // Dernières notes connues : permet de conserver les champs que l'appelant ne fournit pas
  const gradesRef = useRef(grades);
  useEffect(() => { gradesRef.current = grades; }, [grades]);

  /**
   * Enregistre une note. Renvoie { success: true } ou { success: false, error } :
   * l'appelant doit vérifier le résultat pour ne pas annoncer une sauvegarde qui a échoué.
   * `extra` : { interro, devoir, composition, bonus, teacherName }
   *
   * Un champ NON fourni (undefined) garde sa valeur actuelle ; pour l'effacer, passer null / ''.
   * Sans cela, enregistrer une appréciation ou importer un fichier Excel effaçait les sous-notes.
   */
  const updateGrade = useCallback(
    async (studentId, subjectId, trimester, valueArg, appreciationArg, extraArg = {}) => {
      if (!academicYear) return { success: false, error: "Aucune année scolaire sélectionnée" };

      const current = gradesRef.current.find(
        (g) => g.student_id === studentId && g.subject_id === subjectId && g.trimester === trimester,
      );
      const keep = (provided, existing) => (provided === undefined ? existing ?? null : provided);
      const value = valueArg;
      const appreciation = keep(appreciationArg, current?.appreciation);
      const extra = {
        interro: keep(extraArg.interro, current?.interro),
        devoir: keep(extraArg.devoir, current?.devoir),
        composition: keep(extraArg.composition, current?.composition),
        bonus: keep(extraArg.bonus, current?.bonus),
        teacherName: keep(extraArg.teacherName, current?.teacherName),
      };

      const { data, error: saveError } = await supabase
        .from("grades")
        .upsert(
          {
            student_id: studentId,
            subject_id: subjectId,
            trimester,
            academic_year: academicYear,
            // note globale
            value: toNumberOrNull(value),
            appreciation: appreciation || null,
            // sous-notes
            interro: toNumberOrNull(extra.interro),
            devoir: toNumberOrNull(extra.devoir),
            composition: toNumberOrNull(extra.composition),
            bonus: toNumberOrNull(extra.bonus),
            teacher_name: extra.teacherName || null,
          },
          {
            onConflict: "student_id,subject_id,trimester,academic_year",
          },
        )
        .select(GRADE_COLUMNS)
        .single();

      if (saveError) {
        console.error("updateGrade error:", saveError);
        return { success: false, error: saveError.message || "Enregistrement impossible" };
      }

      const mapped = mapGrade(data);
      setGrades((prev) => {
        const exists = prev.find(
          (g) =>
            g.student_id === studentId &&
            g.subject_id === subjectId &&
            g.trimester === trimester,
        );
        return exists
          ? prev.map((g) => (g.id === exists.id ? mapped : g))
          : [...prev, mapped];
      });
      return { success: true };
    },
    [academicYear],
  );

  // ── getGrade — retourne aussi interro/devoir/composition/bonus ────────────
  const getGrade = useCallback(
    (studentId, subjectId, trimester) => {
      return (
        grades.find(
          (g) =>
            g.student_id === studentId &&
            g.subject_id === subjectId &&
            g.trimester === trimester,
        ) || null
      );
    },
    [grades],
  );

  return { grades, loading, error, updateGrade, getGrade, refetch: fetchGrades };
}
