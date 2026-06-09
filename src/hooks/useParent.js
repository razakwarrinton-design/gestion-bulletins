import { useState, useEffect } from "react";
import { supabase } from '../config/supabase';

/**
 * Hook pour l'espace parent
 * Récupère les élèves liés au parent connecté + leurs notes
 */
export function useParent(currentUserId) {
  const [children, setChildren] = useState([]); // élèves liés
  const [grades, setGrades] = useState([]); // notes de tous les enfants
  const [subjects, setSubjects] = useState([]); // toutes les matières
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!currentUserId) return;
    fetchParentData();
  }, [currentUserId]);

  const fetchParentData = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('📚 useParent: Fetching parent data for ID:', currentUserId);
      
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
      
      console.log('✅ useParent: Found', links?.length || 0, 'linked students');

      const studentList = (links || []).map((l) => ({
        ...l.students,
        firstName: l.students.first_name,
        lastName: l.students.last_name,
        classId: l.students.class_id,
        className: l.students.classes?.name || "N/A",
      }));
      setChildren(studentList);
      console.log('✅ useParent: Mapped', studentList.length, 'students:', studentList);

      if (studentList.length === 0) {
        setLoading(false);
        return;
      }

      // 2. Récupérer les notes de tous les enfants
      const studentIds = studentList.map((s) => s.id);
      console.log('📝 useParent: Fetching grades for students:', studentIds);
      
      const { data: gradesData, error: gradesError } = await supabase
        .from("grades")
        .select("*")
        .in("student_id", studentIds);

      if (gradesError) {
        console.error('❌ useParent: Error fetching grades:', gradesError);
        throw gradesError;
      }
      
      console.log('✅ useParent: Found', gradesData?.length || 0, 'grades');
      
      setGrades(
        (gradesData || []).map((g) => ({
          ...g,
          studentId: g.student_id,
          subjectId: g.subject_id,
        })),
      );

      // 3. Récupérer les matières
      console.log('📚 useParent: Fetching subjects...');
      
      const { data: subjectsData, error: subjectsError } = await supabase
        .from("subjects")
        .select("*")
        .order("name");

      if (subjectsError) {
        console.error('❌ useParent: Error fetching subjects:', subjectsError);
        throw subjectsError;
      }
      
      console.log('✅ useParent: Found', subjectsData?.length || 0, 'subjects');
      setSubjects(subjectsData || []);
    } catch (err) {
      console.error("❌ useParent: ERREUR:", err);
      console.error("Error details:", {
        message: err.message,
        code: err.code,
        status: err.status,
        details: err.details,
      });
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Calcul de la moyenne d'un élève pour un trimestre
  const calculateAverage = (studentId, trimester) => {
    const studentGrades = grades.filter(
      (g) =>
        g.student_id === studentId &&
        g.trimester === trimester &&
        g.value != null,
    );
    if (studentGrades.length === 0) return "—";
    let totalPoints = 0;
    let totalCoef = 0;
    studentGrades.forEach((g) => {
      const subj = subjects.find((s) => s.id === g.subject_id);
      const coef = subj?.coefficient || 1;
      totalPoints += g.value * coef;
      totalCoef += coef;
    });
    return totalCoef > 0 ? (totalPoints / totalCoef).toFixed(2) : "—";
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
