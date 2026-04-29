import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Save, CheckCircle } from 'lucide-react';

// ─── Hook debounce ────────────────────────────────────────────────────────────
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

// ─── Champ de note individuel avec debounce ───────────────────────────────────
function GradeInput({ studentId, subject, trimester, initialGrade, onSave }) {
  const [value, setValue] = useState(initialGrade?.value ?? '');
  const [appreciation, setApprec] = useState(initialGrade?.appreciation ?? '');
  const [saved, setSaved] = useState(false);
  const isFirstRender = useRef(true);

  const debouncedValue = useDebounce(value, 600);
  const debouncedApprec = useDebounce(appreciation, 600);

  // Sync si la note change depuis l'extérieur (ex: import Excel)
  useEffect(() => {
    setValue(initialGrade?.value ?? '');
    setApprec(initialGrade?.appreciation ?? '');
  }, [initialGrade?.value, initialGrade?.appreciation]);

  // Déclencher la sauvegarde après le debounce
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    if (debouncedValue === '' && debouncedApprec === '') return;

    onSave(studentId, subject.id, trimester, debouncedValue, debouncedApprec);
    setSaved(true);
    const t = setTimeout(() => setSaved(false), 1500);
    return () => clearTimeout(t);
  }, [debouncedValue, debouncedApprec]);

  const noteNum = parseFloat(value);
  const noteColor =
    value === '' ? 'border-gray-300' :
      isNaN(noteNum) ? 'border-red-400' :
        noteNum < 10 ? 'border-orange-400' :
          noteNum < 14 ? 'border-blue-400' :
            'border-green-400';

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700">
          {subject.name}
          <span className="ml-1 text-xs text-gray-400">(Coef: {subject.coefficient})</span>
        </label>
        {saved && (
          <span className="flex items-center text-xs text-green-600 gap-1">
            <CheckCircle className="w-3 h-3" /> Enregistré
          </span>
        )}
      </div>

      {/* Champ note */}
      <input
        type="number"
        min="0"
        max="20"
        step="0.5"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className={`w-full p-2 border-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${noteColor}`}
        placeholder="Note /20"
      />

      {/* Champ appréciation */}
      <input
        type="text"
        value={appreciation}
        onChange={(e) => setApprec(e.target.value)}
        className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        placeholder="Appréciation (optionnel)"
      />
    </div>
  );
}

// ─── Composant principal GradesForm ──────────────────────────────────────────
export default function GradesForm({
  classes,
  students,
  subjects,
  selectedClass,
  setSelectedClass,
  selectedTrimester,
  setSelectedTrimester,
  getGrade,
  updateGrade,
  calculateAverage,
  getMention
}) {
  const classStudents = selectedClass
    ? students.filter(s => s.classId === selectedClass)
    : [];

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Saisie des notes</h2>

      {/* Filtres */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium mb-2">Classe:</label>
          <select
            value={selectedClass || ''}
            onChange={(e) => setSelectedClass(e.target.value || null)}
            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Sélectionner une classe</option>
            {classes.map(cls => (
              <option key={cls.id} value={cls.id}>{cls.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Trimestre:</label>
          <select
            value={selectedTrimester}
            onChange={(e) => setSelectedTrimester(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="1">Trimestre 1</option>
            <option value="2">Trimestre 2</option>
            <option value="3">Trimestre 3</option>
          </select>
        </div>
      </div>

      {/* Info debounce */}
      {selectedClass && (
        <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
          <Save className="w-3 h-3" />
          Les notes sont sauvegardées automatiquement après 0.6s
        </div>
      )}

      {/* Liste des élèves */}
      {selectedClass && classStudents.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          Aucun élève dans cette classe
        </div>
      )}

      {selectedClass && classStudents.map(student => {
        const average = calculateAverage(student.id, selectedTrimester);
        const mention = getMention(average);

        return (
          <div key={student.id} className="bg-white rounded-lg shadow-md p-6 border-l-4" style={{ borderColor: mention.color }}>
            {/* En-tête élève */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-800">
                {student.firstName} {student.lastName}
              </h3>
              <div className="text-right">
                <span className="text-2xl font-bold text-blue-600">{average}/20</span>
                <span
                  className="ml-2 px-2 py-0.5 rounded-full text-xs font-medium text-white"
                  style={{ backgroundColor: mention.color }}
                >
                  {mention.text}
                </span>
              </div>
            </div>

            {/* Grille des matières */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {subjects.map(subject => (
                <GradeInput
                  key={subject.id}
                  studentId={student.id}
                  subject={subject}
                  trimester={selectedTrimester}
                  initialGrade={getGrade(student.id, subject.id, selectedTrimester)}
                  onSave={updateGrade}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}