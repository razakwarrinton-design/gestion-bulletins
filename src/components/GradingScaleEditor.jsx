import React, { useState } from 'react';
import { Award } from 'lucide-react';
import { DEFAULT_SCALE, getScale, validateScale } from '../utils/gradingScale';

const LABELS = ['Excellent', 'Très Bien', 'Bien', 'Assez Bien', 'Passable'];

const toDraft = (scale) => ({
    cutoffs: scale.cutoffs.map(String),
    difficulty: String(scale.difficulty),
    admission: String(scale.admission),
});

const toScale = (draft) => {
    const num = (v) => (String(v).trim() === '' ? NaN : Number(String(v).replace(',', '.')));
    return { cutoffs: draft.cutoffs.map(num), difficulty: num(draft.difficulty), admission: num(draft.admission) };
};

/**
 * Réglage du barème de l'école (administrateur) : seuils de mention, d'admission et de difficulté.
 * Les libellés ne sont pas modifiables. Le barème n'est enregistré que s'il est cohérent.
 */
export default function GradingScaleEditor({ schoolInfo, updateSchoolInfo }) {
    const saved = schoolInfo?.gradingScale ? getScale() : DEFAULT_SCALE;
    const [draft, setDraft] = useState(() => toDraft(saved));
    const error = validateScale(toScale(draft));
    const changed = JSON.stringify(toScale(draft)) !== JSON.stringify(saved);

    const setCutoff = (i, value) => setDraft(d => ({ ...d, cutoffs: d.cutoffs.map((c, j) => (j === i ? value : c)) }));
    const input = (value, onChange, label) => (
        <input
            type="text" inputMode="decimal" value={value} aria-label={label}
            onChange={(e) => onChange(e.target.value)}
            className="w-20 p-2 border border-gray-300 rounded-lg text-center focus:ring-2 focus:ring-blue-500"
        />
    );

    return (
        <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-xl font-bold mb-2 flex items-center">
                <Award className="w-6 h-6 mr-2 text-amber-600" />
                Barème de l'établissement
            </h3>
            <p className="text-sm text-gray-600 mb-4">
                Moyennes (sur 20) à partir desquelles chaque mention est attribuée. Ces seuils s'appliquent aux
                bulletins, aux tableaux de bord et au portail des parents. Suivez le règlement intérieur de votre école.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
                {LABELS.map((label, i) => (
                    <div key={label} className="flex items-center justify-between gap-3">
                        <span className="text-sm font-medium">{label} à partir de</span>
                        {input(draft.cutoffs[i], (v) => setCutoff(i, v), `Seuil ${label}`)}
                    </div>
                ))}
                <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-medium">« En difficulté » en dessous de</span>
                    {input(draft.difficulty, (v) => setDraft(d => ({ ...d, difficulty: v })), 'Seuil en difficulté')}
                </div>
                <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-medium">« ADMIS(E) » à partir de</span>
                    {input(draft.admission, (v) => setDraft(d => ({ ...d, admission: v })), "Seuil d'admission")}
                </div>
            </div>

            {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}

            <div className="mt-4 flex gap-3">
                <button
                    type="button"
                    disabled={Boolean(error) || !changed}
                    onClick={() => updateSchoolInfo('gradingScale', toScale(draft))}
                    className="px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold disabled:opacity-40"
                >
                    Enregistrer le barème
                </button>
                <button
                    type="button"
                    onClick={() => { setDraft(toDraft(DEFAULT_SCALE)); updateSchoolInfo('gradingScale', null); }}
                    className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700"
                >
                    Rétablir le barème par défaut
                </button>
            </div>
        </div>
    );
}
