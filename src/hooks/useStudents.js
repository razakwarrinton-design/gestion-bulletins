import { useState, useEffect } from 'react';
import { supabase } from '../config/supabase';
import { mapStudentRow, buildStudentProfilePayload } from '../utils/studentProfile';

export function useStudents() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    setLoading(true);
    // select('*') : renvoie aussi les colonnes de profil (contact d'urgence…) quand
    // sql/students-profile.sql a été appliqué, sans casser la liste s'il ne l'est pas.
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .order('last_name');
    if (!error) {
      // Mapper snake_case → camelCase pour compatibilité avec le code existant
      setStudents(data.map(mapStudentRow));
    }
    setLoading(false);
  };

  /** profile : birthDate, gender, photoUrl, emergencyName, emergencyPhone, emergencyRelation */
  const addStudent = async (firstName, lastName, classId, profile = {}) => {
    const { data, error } = await supabase
      .from('students')
      .insert({
        first_name: firstName,
        last_name: lastName,
        class_id: classId,
        ...buildStudentProfilePayload(profile),
      })
      .select('*')
      .single();
    if (error) throw error;
    const mapped = mapStudentRow(data);
    setStudents(prev => [...prev, mapped]);
    return mapped;
  };

  const updateStudent = async (id, firstName, lastName, classId, profile = {}) => {
    const existing = students.find(s => s.id === id) || null;
    const { data, error } = await supabase
      .from('students')
      .update({
        first_name: firstName,
        last_name: lastName,
        class_id: classId,
        ...buildStudentProfilePayload(profile, existing),
      })
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;
    const mapped = mapStudentRow(data);
    setStudents(prev => prev.map(s => s.id === id ? mapped : s));
    return mapped;
  };

  const deleteStudent = async (id) => {
    const { error } = await supabase
      .from('students')
      .delete()
      .eq('id', id);
    if (error) throw error;
    setStudents(prev => prev.filter(s => s.id !== id));
  };

  return { students, loading, addStudent, updateStudent, deleteStudent, refetch: fetchStudents };
}
