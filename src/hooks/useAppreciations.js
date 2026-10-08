import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../config/supabase';

const COLUMNS = 'id, student_id, subject_id, trimester, academic_year, type, body, author_id, created_at';

const mapRow = (row) => ({
    id: row.id,
    studentId: row.student_id,
    subjectId: row.subject_id,
    trimester: row.trimester,
    academicYear: row.academic_year,
    type: row.type, // 'teacher' (par matière) ou 'council' (conseil de classe)
    text: row.body,
    authorId: row.author_id,
    createdAt: row.created_at,
});

/**
 * Appréciations de l'année scolaire demandée (table appreciations, voir sql/appreciations-activities.sql).
 * Une ligne par appréciation : deux professeurs qui enregistrent en même temps ne s'écrasent plus.
 * Passer `null` pour ne rien charger (écran non affiché).
 *
 * `add` et `remove` renvoient { success: true } ou { success: false, error }.
 */
export function useAppreciations(academicYear) {
    const [appreciations, setAppreciations] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!academicYear) return undefined;
        let cancelled = false;
        (async () => {
            setLoading(true);
            const { data, error: loadError } = await supabase
                .from('appreciations')
                .select(COLUMNS)
                .eq('academic_year', academicYear)
                .order('created_at', { ascending: true });
            if (cancelled) return;
            if (loadError) {
                console.error('Chargement des appréciations impossible:', loadError);
                setError('Impossible de charger les appréciations.');
            } else {
                setError('');
                setAppreciations((data || []).map(mapRow));
            }
            setLoading(false);
        })();
        return () => { cancelled = true; };
    }, [academicYear]);

    const add = useCallback(async ({ studentId, subjectId, trimester, type, text }) => {
        if (!academicYear) return { success: false, error: 'Aucune année scolaire sélectionnée' };
        const { data, error: insertError } = await supabase
            .from('appreciations')
            .insert({
                student_id: studentId,
                subject_id: type === 'teacher' ? subjectId : null,
                trimester,
                academic_year: academicYear,
                type,
                body: text.trim(),
            })
            .select(COLUMNS)
            .single();
        if (insertError) {
            console.error('Enregistrement de l\'appréciation impossible:', insertError);
            return { success: false, error: insertError.message || 'Enregistrement impossible' };
        }
        setAppreciations(prev => [...prev, mapRow(data)]);
        return { success: true };
    }, [academicYear]);

    const remove = useCallback(async (id) => {
        // .select() renvoie les lignes réellement supprimées : la base peut refuser sans erreur (droits)
        const { data, error: deleteError } = await supabase
            .from('appreciations')
            .delete()
            .eq('id', id)
            .select('id');
        if (deleteError) {
            console.error('Suppression de l\'appréciation impossible:', deleteError);
            return { success: false, error: deleteError.message || 'Suppression impossible' };
        }
        if (!data || data.length === 0) {
            return { success: false, error: 'Vous ne pouvez supprimer que vos propres appréciations' };
        }
        setAppreciations(prev => prev.filter(a => a.id !== id));
        return { success: true };
    }, []);

    return { appreciations, loading, error, add, remove };
}
