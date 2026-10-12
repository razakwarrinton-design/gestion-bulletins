import { useState, useEffect, useRef } from 'react';
import { Lock } from 'lucide-react';
import { gradeInputProblem } from '../utils/finalGrade';

// Vue « tableau » de la saisie des notes : un élève par ligne, une matière par colonne, la note finale dans chaque case.
// Faite pour les classes nombreuses (40 élèves × 10 matières tiennent en un seul tableau) : Entrée ou ↓ passe à l'élève
// suivant, Tab à la matière suivante, et l'enregistrement est automatique comme dans la vue « cartes ».
//
// Une case dont la note a un détail (interrogation / devoir / composition / bonus) est en lecture seule ici : la modifier
// en note simple effacerait ce détail. Elle se modifie dans la vue « cartes ».

const DEBOUNCE_MS = 700;
const NO_DETAIL = { interro: null, devoir: null, composition: null, bonus: null };

const hasDetail = (grade) => Boolean(grade) && (
  grade.interro != null || grade.devoir != null || grade.composition != null || (grade.bonus || 0) > 0
);

const baseValue = (grade) => (grade?.value == null ? '' : String(Math.round((grade.value - (grade.bonus || 0)) * 100) / 100));

function useDebounced(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

const tone = (v) => {
  const n = parseFloat(v);
  if (v === '' || Number.isNaN(n)) return { bg: '#F8FAFF', border: '#E2E8F0' };
  if (n < 8) return { bg: '#FFF7ED', border: '#FDBA74' };
  if (n < 10) return { bg: '#FEFCE8', border: '#FCD34D' };
  if (n < 14) return { bg: '#EFF6FF', border: '#93C5FD' };
  return { bg: '#F0FDF4', border: '#6EE7B7' };
};

function Cell({ student, subject, trimester, grade, onSave, row, col }) {
  const locked = hasDetail(grade);
  const [value, setValue] = useState(baseValue(grade));
  const [status, setStatus] = useState({ saved: false, error: '' });
  const first = useRef(true);
  const debounced = useDebounced(value, DEBOUNCE_MS);

  // La note change depuis l'extérieur (vue « cartes », import Excel, autre utilisateur). Recopiée seulement si elle diffère de
  // ce qui est affiché, pour ne pas écraser une saisie en cours.
  // eslint-disable-next-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps
  useEffect(() => { setValue((current) => (current === baseValue(grade) ? current : baseValue(grade))); }, [grade?.value, grade?.bonus]);

  useEffect(() => {
    if (first.current) { first.current = false; return undefined; }
    if (locked) return undefined;
    if (gradeInputProblem({ simple: debounced })) return undefined; // hors limites : la base la refuserait, on ne l'envoie pas
    let cancelled = false;
    let timer;
    Promise.resolve(onSave(student.id, subject.id, trimester, debounced === '' ? '' : parseFloat(debounced), undefined, NO_DETAIL))
      .then((result) => {
        if (cancelled) return;
        if (result && result.success === false) { setStatus({ saved: false, error: result.error || 'Échec de la sauvegarde' }); return; }
        setStatus({ saved: true, error: '' });
        timer = setTimeout(() => setStatus((s) => ({ ...s, saved: false })), 1400);
      });
    return () => { cancelled = true; clearTimeout(timer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  const move = (event, dRow) => {
    event.preventDefault();
    const next = document.querySelector(`[data-cell="${row + dRow}-${col}"]`);
    if (next) { next.focus(); next.select?.(); }
  };

  const label = `${student.firstName} ${student.lastName}, ${subject.name}`;
  if (locked) {
    return (
      <td className="px-1 py-1 text-center">
        <span
          title="Cette note a un détail (interrogation, devoir, composition ou bonus) : modifiez-la dans la vue « Cartes »."
          aria-label={`${label} : ${grade.value}, détail à modifier dans la vue Cartes`}
          className="inline-flex items-center justify-center gap-1 w-full rounded-lg text-sm font-semibold text-gray-600"
          style={{ minWidth: 64, padding: '6px 4px', background: '#F1F5F9', border: '1.5px dashed #CBD5E1' }}
        >
          <Lock size={11} aria-hidden="true" />{Number(grade.value).toFixed(2)}
        </span>
      </td>
    );
  }

  // Hors limites : signalé tout de suite (sans attendre l'enregistrement) ; sinon, l'éventuel refus de la base
  const message = gradeInputProblem({ simple: value }) || status.error;
  const invalid = Boolean(message);
  const colors = invalid ? { bg: '#FEF2F2', border: '#EF4444' } : tone(value);
  return (
    <td className="px-1 py-1 text-center">
      <input
        type="number" inputMode="decimal" min="0" max="20" step="0.25"
        data-cell={`${row}-${col}`}
        aria-label={label} aria-invalid={invalid || undefined}
        title={invalid ? message : status.saved ? 'Enregistré' : undefined}
        value={value}
        onChange={(e) => { setValue(e.target.value); setStatus({ saved: false, error: '' }); }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === 'ArrowDown') move(e, 1);
          else if (e.key === 'ArrowUp') move(e, -1);
        }}
        placeholder="—"
        className="text-center text-sm font-semibold rounded-lg outline-none focus:ring-2 focus:ring-blue-400"
        style={{ width: 64, padding: '6px 4px', background: colors.bg, border: `1.5px solid ${status.saved ? '#22C55E' : colors.border}` }}
      />
      {invalid && <div role="alert" className="text-[10px] text-red-600 leading-tight max-w-[80px] mx-auto">{message}</div>}
    </td>
  );
}

export default function GradesTable({ students, subjects, trimester, getGrade, onSave, calculateAverage, getMention }) {
  return (
    <div className="bg-white rounded-2xl border border-blue-100 overflow-x-auto" style={{ boxShadow: '0 2px 8px rgba(37,99,235,0.06)' }}>
      <table className="border-collapse text-sm" style={{ minWidth: '100%' }}>
        <thead>
          <tr className="bg-blue-50 text-gray-600">
            <th
              scope="col"
              className="text-left px-3 py-2 text-xs font-bold uppercase tracking-wide sticky left-0 z-10 bg-blue-50"
              style={{ minWidth: 150 }}
            >
              Élève
            </th>
            {subjects.map((subject) => (
              <th key={subject.id} scope="col" className="px-1 py-2 text-xs font-bold text-center align-bottom" style={{ minWidth: 72 }} title={subject.name}>
                <div className="truncate" style={{ maxWidth: 84 }}>{subject.name}</div>
                <div className="font-medium text-gray-500">coef {subject.coefficient}</div>
              </th>
            ))}
            <th scope="col" className="px-3 py-2 text-xs font-bold text-center align-bottom">Moyenne</th>
          </tr>
        </thead>
        <tbody>
          {students.map((student, row) => {
            const average = calculateAverage(student.id, trimester);
            const mention = getMention(average);
            return (
              <tr key={student.id} className="border-t border-blue-50">
                <th scope="row" className="text-left px-3 py-1 font-semibold text-gray-900 whitespace-nowrap sticky left-0 z-10 bg-white">
                  {student.lastName} {student.firstName}
                </th>
                {subjects.map((subject, col) => (
                  <Cell
                    key={subject.id} student={student} subject={subject} trimester={trimester}
                    grade={getGrade(student.id, subject.id, trimester)} onSave={onSave} row={row} col={col}
                  />
                ))}
                <td className="px-3 py-1 text-center whitespace-nowrap">
                  <div className="font-black" style={{ color: mention.color }}>{average}/20</div>
                  <div className="text-[11px] font-semibold" style={{ color: mention.color }}>{mention.text}</div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
