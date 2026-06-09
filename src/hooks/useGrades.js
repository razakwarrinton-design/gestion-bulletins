import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabaseClient";

export function useGrades(academicYear = null) {
  const [grades, setGrades] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // ✅ OPTIMISATION : Ne charge QUE si academicYear est fourni
    if (academicYear) {
      fetchGrades();
    }
  }, [academicYear]);

  const fetchGrades = async () => {
    if (!academicYear) return;
    
    setLoading(true);
    // ✅ OPTIMISATION : sélectionne SEULEMENT les colonnes nécessaires
    const { data, error } = await supabase
      .from("grades")
      .select("id, student_id, subject_id, trimester, academic_year, value, appreciation, interro, devoir, composition, teacher_name")
      .eq("academic_year", academicYear);
    
    if (!error) {
      setGrades(data.map(mapGrade));
    }
    setLoading(false);
  };

  // ── Mapper Supabase → état local ──────────────────────────────────────────
  const mapGrade = (g) => ({
    ...g,
    studentId: g.student_id,
    subjectId: g.subject_id,
    // nouveaux champs sous-notes
    interro: g.interro ?? null,
    devoir: g.devoir ?? null,
    composition: g.composition ?? null,
    teacherName: g.teacher_name ?? "",
  });

  // ── updateGrade — accepte maintenant un 6ème paramètre `extra` ────────────
  const updateGrade = useCallback(
    async (
      studentId,
      subjectId,
      trimester,
      value,
      appreciation,
      extra = {}, // { interro, devoir, composition, teacherName }
    ) => {
      if (!academicYear) return;

      const { data, error } = await supabase
        .from("grades")
        .upsert(
          {
            student_id: studentId,
            subject_id: subjectId,
            trimester,
            academic_year: academicYear,
            // note globale
            value: value !== "" && value != null ? parseFloat(value) : null,
            appreciation: appreciation || null,
            // sous-notes
            interro: extra.interro != null ? parseFloat(extra.interro) : null,
            devoir: extra.devoir != null ? parseFloat(extra.devoir) : null,
            composition:
              extra.composition != null ? parseFloat(extra.composition) : null,
            teacher_name: extra.teacherName || null,
          },
          {
            onConflict: "student_id,subject_id,trimester,academic_year",
          },
        )
        .select("id, student_id, subject_id, trimester, academic_year, value, appreciation, interro, devoir, composition, teacher_name")
        .single();

      if (error) {
        console.error("updateGrade error:", error);
        return;
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
          ? prev.map((g) => (g.id === mapped.id ? mapped : g))
          : [...prev, mapped];
      });
    },
    [academicYear],
  );

  // ── getGrade — retourne maintenant aussi interro/devoir/composition ────────
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

  return { grades, loading, updateGrade, getGrade, refetch: fetchGrades };
}