import { useState, useEffect } from 'react';
import { supabase } from '../config/supabase';

export function useClasses() {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    setLoading(true);
    // ✅ Optimisation : sélectionne SEULEMENT les colonnes nécessaires
    const { data, error } = await supabase
      .from('classes')
      .select('id, name, level')
      .order('name');
    if (!error) setClasses(data);
    setLoading(false);
  };

  const addClass = async (name) => {
    const { data, error } = await supabase
      .from('classes')
      .insert({ name, level: name })
      .select('id, name, level')
      .single();
    if (error) throw error;
    setClasses(prev => [...prev, data]);
    return data;
  };

  const deleteClass = async (id) => {
    const { error } = await supabase
      .from('classes')
      .delete()
      .eq('id', id);
    if (error) throw error;
    setClasses(prev => prev.filter(c => c.id !== id));
  };

  return { classes, loading, addClass, deleteClass, refetch: fetchClasses };
}