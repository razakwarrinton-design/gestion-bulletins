import { useState, useEffect } from 'react';
import { supabase } from '../config/supabase';

export function useSubjects() {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSubjects();
  }, []);

  const fetchSubjects = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('subjects')
      .select('*')
      .order('name');
    if (!error) setSubjects(data);
    setLoading(false);
  };

  const addSubject = async (name, coefficient) => {
    const { data, error } = await supabase
      .from('subjects')
      .insert({ name, coefficient: parseFloat(coefficient) })
      .select()
      .single();
    if (error) throw error;
    setSubjects(prev => [...prev, data]);
    return data;
  };

  const deleteSubject = async (id) => {
    const { error } = await supabase
      .from('subjects')
      .delete()
      .eq('id', id);
    if (error) throw error;
    setSubjects(prev => prev.filter(s => s.id !== id));
  };

  return { subjects, loading, addSubject, deleteSubject, refetch: fetchSubjects };
}