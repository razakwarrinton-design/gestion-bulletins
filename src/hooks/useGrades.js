import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';

export function useGrades(academicYear = '2024-2025') {
  const [grades, setGrades] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGrades();
  }, [academicYear]);

  const fetchGrades = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('grades')
      .select('*')
      .eq('academic_year', academicYear);
    if (!error) {
      // Mapper pour compatibilité avec le code existant
      setGrades(data.map(g => ({
        ...g,
        studentId: g.student_id,
        subjectId: g.subject_id,
      })));
    }
    setLoading(false);
  };

  const updateGrade = useCallback(async (studentId, subjectId, trimester, value, appreciation) => {
    // Upsert : crée ou met à jour la note
    const { data, error } = await supabase
      .from('grades')
      .upsert({
        student_id: studentId,
        subject_id: subjectId,
        trimester,
        academic_year: academicYear,
        value: value !== '' ? parseFloat(value) : null,
        appreciation: appreciation || null,
      }, {
        onConflict: 'student_id,subject_id,trimester,academic_year'
      })
      .select()
      .single();

    if (error) { console.error(error); return; }

    const mapped = { ...data, studentId: data.student_id, subjectId: data.subject_id };
    setGrades(prev => {
      const exists = prev.find(g =>
        g.student_id === studentId &&
        g.subject_id === subjectId &&
        g.trimester === trimester
      );
      return exists
        ? prev.map(g => g.id === mapped.id ? mapped : g)
        : [...prev, mapped];
    });
  }, [academicYear]);

  const getGrade = useCallback((studentId, subjectId, trimester) => {
    return grades.find(g =>
      g.student_id === studentId &&
      g.subject_id === subjectId &&
      g.trimester === trimester
    ) || null;
  }, [grades]);

  return { grades, loading, updateGrade, getGrade, refetch: fetchGrades };
}