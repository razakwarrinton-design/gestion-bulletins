import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

export function useStudents() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .order('last_name');
    if (!error) {
      // Mapper snake_case → camelCase pour compatibilité avec le code existant
      setStudents(data.map(s => ({
        ...s,
        firstName: s.first_name,
        lastName: s.last_name,
        classId: s.class_id,
      })));
    }
    setLoading(false);
  };

  const addStudent = async (firstName, lastName, classId) => {
    const { data, error } = await supabase
      .from('students')
      .insert({ first_name: firstName, last_name: lastName, class_id: classId })
      .select()
      .single();
    if (error) throw error;
    const mapped = { ...data, firstName: data.first_name, lastName: data.last_name, classId: data.class_id };
    setStudents(prev => [...prev, mapped]);
    return mapped;
  };

  const updateStudent = async (id, firstName, lastName, classId) => {
    const { data, error } = await supabase
      .from('students')
      .update({ first_name: firstName, last_name: lastName, class_id: classId })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    const mapped = { ...data, firstName: data.first_name, lastName: data.last_name, classId: data.class_id };
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