import { useState, useEffect } from "react";
import { supabase } from '../config/supabase';
import { calculateAverage as calculateBulletinAverage, hasGrade } from '../utils/grades';

/**
 * Hook pour l'espace parent
 * Récupère les élèves liés au parent connecté + leurs notes de l'année scolaire demandée
 * (sans ce filtre, les notes de plusieurs années se mélangeaient dans les moyennes).
 */
export function useParent(currentUserId, academicYear) {
  const [children, setChildren] = useState([]); // élèves liés
  const [grades, setGrades] = useState([]); // notes de tous les enfants
  const [subjects, setSubjects] = useState([]); // toutes les matières
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // On attend de connaître l'année scolaire pour ne charger qu'une fois
    if (!currentUserId || !academicYear) return;
    fetchParentData();
  }, [currentUserId, academicYear]);

  const fetchParentData = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Récupérer les élèves liés au parent
      const { data: links, error: linksError } = await supabase
        .from("parent_students")
        .select(
          `
          student_id,
          students (
            id, first_name, last_name, class_id,
            classes ( id, name )
          )
        `,
        )
        .eq("parent_id", currentUserId);

      if (linksError) {
        console.error('❌ useParent: Error fetching parent_students:', linksError);
        throw linksError;
      }
      const studentList = (links || []).map((l) => ({
        ...l.students,
        firstName: l.students.first_name,
        lastName: l.students.last_name,
        classId: l.students.class_id,
        className: l.students.classes?.name || "N/A",
      }));
      setChildren(studentList);
      if (studentList.length === 0) {
        setLoading(false);
        return;
      }

      // 2. Récupérer les notes de tous les enfants
      const studentIds = studentList.map((s) => s.id);
      const { data: gradesData, error: gradesError } = await supabase
        .from("grades")
        .select("*")
        .eq("academic_year", academicYear)
        .in("student_id", studentIds);

      if (gradesError) {
        console.error('❌ useParent: Error fetching grades:', gradesError);
        throw gradesError;
      }
      setGrades(
        (gradesData || []).map((g) => ({
          ...g,
          studentId: g.student_id,
          subjectId: g.subject_id,
        })),
      );

      // 3. Récupérer les matières
      const { data: subjectsData, error: subjectsError } = await supabase
        .from("subjects")
        .select("*")
        .order("name");

      if (subjectsError) {
        console.error('❌ useParent: Error fetching subjects:', subjectsError);
        throw subjectsError;
      }
      setSubjects(subjectsData || []);
    } catch (err) {
      console.error("❌ useParent: ERREUR:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Moyenne d'un élève pour un trimestre : même formule que le bulletin (utils/grades)
  const calculateAverage = (studentId, trimester) => {
    if (!hasGrade(studentId, trimester, grades)) return "—";
    const average = calculateBulletinAverage(studentId, trimester, grades, subjects);
    return average === 0 ? "—" : average;
  };

  // Notes d'un élève pour un trimestre, enrichies avec le nom de la matière
  const getStudentGrades = (studentId, trimester) => {
    return grades
      .filter(
        (g) =>
          g.student_id === studentId &&
          g.trimester === trimester &&
          g.value != null,
      )
      .map((g) => ({
        ...g,
        subjectName: subjects.find((s) => s.id === g.subject_id)?.name || "N/A",
        coefficient:
          subjects.find((s) => s.id === g.subject_id)?.coefficient || 1,
      }))
      .sort((a, b) => b.value - a.value);
  };

  return {
    children,
    grades,
    subjects,
    loading,
    error,
    calculateAverage,
    getStudentGrades,
    refetch: fetchParentData,
  };
}
