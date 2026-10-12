import React, { useState, useEffect, useRef } from 'react';
import { Save, CheckCircle, ChevronDown, ChevronUp, User, Pen, Star, Bell, Send } from 'lucide-react';
import { supabase } from '../config/supabase';
import { getMentionLevel } from '../utils/mentions';
import { weightedBase, applyBonus, gradeInputProblem, MAX_BONUS, MAX_GRADE } from '../utils/finalGrade';
import { notifyParents, describeOutcome } from '../utils/notifyParents';
import GradesTable from './GradesTable';

// ─── Hook debounce ────────────────────────────────────────────────────────────
function useDebounce(value, delay) {
  const [dv, setDv] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDv(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return dv;
}

// ─── Couleur selon la note ────────────────────────────────────────────────────
const noteColor = v => v === '' ? '#E2E8F0' : isNaN(+v) ? '#FCA5A5' : +v < 8 ? '#FCA5A5' : +v < 10 ? '#FCD34D' : +v < 14 ? '#93C5FD' : '#6EE7B7';
const noteTxtCol = v => +v < 8 ? '#DC2626' : +v < 10 ? '#D97706' : +v < 14 ? '#2563EB' : '#059669';
const mention = v => getMentionLevel(v)?.short ?? '';

// ─── Calcul note finale depuis interro/devoir/compo (sans bonus) ─────────────
// Pondération : Interro ×1 · Devoir ×2 · Composition ×3 (voir utils/finalGrade.js, partagé avec les bulletins)
const computeFinal = (interro, devoir, compo) => {
  const base = weightedBase({ interro, devoir, composition: compo });
  return base === null ? '' : base.toFixed(2);
};

// ─── Petit champ numérique réutilisable ───────────────────────────────────────
function NoteField({ label, value, onChange, disabled, isBonus = false }) {
  const v = parseFloat(value);
  // Hors limites (la base refuserait l'enregistrement) : signalé tout de suite en rouge
  const outOfRange = value !== '' && (isNaN(v) || v < 0 || v > (isBonus ? MAX_BONUS : MAX_GRADE));
  const bg = outOfRange ? '#FEF2F2' : isBonus
    ? (value === '' ? '#F0FDF4' : '#DCFCE7')
    : (value === '' ? '#F8FAFF' : isNaN(v) ? '#FFF1F1' : v < 8 ? '#FFF7ED' : v < 10 ? '#FEFCE8' : v < 14 ? '#EFF6FF' : '#F0FDF4');
  const brd = outOfRange ? '#EF4444' : isBonus
    ? (value === '' ? '#BBF7D0' : '#4ADE80')
    : (value === '' ? '#E2E8F0' : isNaN(v) ? '#FCA5A5' : v < 8 ? '#FCD34D' : v < 10 ? '#FCD34D' : v < 14 ? '#93C5FD' : '#6EE7B7');
  return (
    <div style={{ flex: 1 }}>
      <div style={{
        fontSize: 9.5, fontWeight: 700, color: isBonus ? '#059669' : '#94A3B8',
        textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 4,
        display: 'flex', alignItems: 'center', gap: 3,
      }}>
        {isBonus && <Star size={9} color="#059669" />}
        {label}
      </div>
      <input
        type="number" min="0" max={isBonus ? '5' : '20'} step="0.25"
        value={value}
        onChange={e => onChange(e.target.value)}
        disabled={disabled}
        style={{
          width: '100%', padding: '7px 10px', borderRadius: 8,
          border: `1.5px solid ${brd}`, background: bg,
          fontSize: 13, fontWeight: 600, color: isBonus ? '#059669' : '#0F172A',
          outline: 'none', textAlign: 'center',
          fontFamily: 'inherit', transition: 'border-color .15s',
          opacity: disabled ? .5 : 1,
        }}
        placeholder="—"
      />
    </div>
  );
}

// ─── Ligne de saisie par matière ──────────────────────────────────────────────
// La note stockée inclut le bonus : en saisie simple on réaffiche la note SANS le bonus,
// sinon il serait ajouté une seconde fois à chaque rechargement.
const baseValueOf = (grade) =>
  grade?.value == null ? '' : Math.round((grade.value - (grade.bonus || 0)) * 100) / 100;

function GradeRow({ studentId, subject, trimester, initialGrade, onSave }) {
  // Une note sans sous-notes (saisie simple ou import Excel) s'ouvre en mode simple, sinon elle paraîtrait vide
  const [mode, setMode] = useState(() =>
    initialGrade?.value != null &&
    initialGrade.interro == null && initialGrade.devoir == null && initialGrade.composition == null
      ? 'simple' : 'detail'); // 'simple' | 'detail'
  const [noteSimple, setSimple] = useState(baseValueOf(initialGrade));
  const [interro, setInterro] = useState(initialGrade?.interro ?? '');
  const [devoir, setDevoir] = useState(initialGrade?.devoir ?? '');
  const [compo, setCompo] = useState(initialGrade?.composition ?? '');
  const [bonus, setBonus] = useState(initialGrade?.bonus ?? '');
  const [teacherName, setTeacher] = useState(initialGrade?.teacherName ?? '');
  const [apprecVal, setApprec] = useState(initialGrade?.appreciation ?? '');
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState('');
  const isFirst = useRef(true);

  // Note finale calculée (avant bonus)
  const baseNote = mode === 'detail' ? computeFinal(interro, devoir, compo) : noteSimple;
  // Note finale avec bonus (plafonnée à 20)
  const finalNoteValue = applyBonus(baseNote, bonus);
  const bonusVal = bonus !== '' && !isNaN(+bonus) ? +bonus : 0; // affichage du bonus appliqué
  const finalNote = finalNoteValue === null ? '' : finalNoteValue.toFixed(2);

  // Sync si données externes changent (import Excel)
  useEffect(() => {
    setSimple(baseValueOf(initialGrade));
    setInterro(initialGrade?.interro ?? '');
    setDevoir(initialGrade?.devoir ?? '');
    setCompo(initialGrade?.composition ?? '');
    setBonus(initialGrade?.bonus ?? '');
    setTeacher(initialGrade?.teacherName ?? '');
    setApprec(initialGrade?.appreciation ?? '');
  }, [
    initialGrade?.value, initialGrade?.interro, initialGrade?.devoir,
    initialGrade?.composition, initialGrade?.bonus,
    initialGrade?.teacherName, initialGrade?.appreciation,
  ]);

  const dbInterro = useDebounce(interro, 700);
  const dbDevoir = useDebounce(devoir, 700);
  const dbCompo = useDebounce(compo, 700);
  const dbSimple = useDebounce(noteSimple, 700);
  const dbBonus = useDebounce(bonus, 700);
  const dbTeacher = useDebounce(teacherName, 800);
  const dbApprec = useDebounce(apprecVal, 800);

  useEffect(() => {
    if (isFirst.current) { isFirst.current = false; return; }
    // Tout ce qui part vers la base doit être dans les limites, sinon elle refuse (« Non sauvegardé »)
    const problem = gradeInputProblem({
      interro: dbInterro, devoir: dbDevoir, composition: dbCompo, bonus: dbBonus, simple: dbSimple,
    });
    if (problem) {
      setSaved(false);
      setSaveError(problem);
      return;
    }
    const base = mode === 'detail' ? computeFinal(dbInterro, dbDevoir, dbCompo) : dbSimple;
    const finalN = applyBonus(base, dbBonus) ?? '';
    let cancelled = false;
    let timer;
    Promise.resolve(onSave(studentId, subject.id, trimester, finalN === '' ? '' : parseFloat(finalN), dbApprec, {
      interro: dbInterro === '' ? null : parseFloat(dbInterro),
      devoir: dbDevoir === '' ? null : parseFloat(dbDevoir),
      composition: dbCompo === '' ? null : parseFloat(dbCompo),
      bonus: dbBonus === '' ? null : parseFloat(dbBonus),
      teacherName: dbTeacher,
    })).then((result) => {
      if (cancelled) return;
      // « Sauvegardé » seulement si la base a confirmé l'écriture
      if (result && result.success === false) {
        setSaved(false);
        setSaveError(result.error || 'Échec de la sauvegarde');
        return;
      }
      setSaveError('');
      setSaved(true);
      timer = setTimeout(() => setSaved(false), 1600);
    });
    return () => { cancelled = true; clearTimeout(timer); };
  }, [dbInterro, dbDevoir, dbCompo, dbSimple, dbBonus, dbTeacher, dbApprec]);

  const fv = finalNote !== '' && !isNaN(+finalNote) ? +finalNote : null;

  return (
    <div style={{
      background: '#FAFBFF', borderRadius: 12,
      border: `1.5px solid ${fv != null ? noteColor(fv) : '#E8EFFE'}`,
      padding: '12px 14px', transition: 'border-color .2s',
    }}>
      {/* ── Header matière ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <div style={{
            width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
            background: fv != null ? noteTxtCol(fv) : '#CBD5E1',
          }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>{subject.name}</span>
          <span style={{ fontSize: 11, color: '#64748B', fontWeight: 500 }}>Coef. {subject.coefficient}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          {fv != null && (
            <span style={{
              fontSize: 12, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
              background: noteColor(fv) + '40', color: noteTxtCol(fv),
            }}>
              {fv.toFixed(2)}/20 · {mention(fv)}
            </span>
          )}
          {saved && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#059669' }}>
              <CheckCircle size={13} /> Sauvegardé
            </span>
          )}
          {saveError && (
            <span role="alert" title={saveError} style={{ fontSize: 11, fontWeight: 700, color: '#DC2626' }}>
              ⚠ Non sauvegardé · {saveError}
            </span>
          )}
          <button
            onClick={() => setMode(m => m === 'detail' ? 'simple' : 'detail')}
            style={{
              display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600,
              color: '#2563EB', background: '#EFF6FF', border: '1px solid #BFDBFE',
              borderRadius: 7, padding: '3px 8px', cursor: 'pointer',
            }}
          >
            {mode === 'detail' ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            {mode === 'detail' ? 'Mode simple' : 'I / D / C'}
          </button>
        </div>
      </div>

      {/* ── Sous-notes ── */}
      {mode === 'detail' ? (
        <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
          <NoteField label="Interrogation" value={interro} onChange={setInterro} />
          <NoteField label="Devoir" value={devoir} onChange={setDevoir} />
          <NoteField label="Composition" value={compo} onChange={setCompo} />
          <NoteField label="Bonus" value={bonus} onChange={setBonus} isBonus />
          {/* Note finale calculée (lecture seule) */}
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 9.5, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 4 }}>
              Finale (auto)
            </div>
            <div style={{
              width: '100%', padding: '7px 10px', borderRadius: 8,
              border: '1.5px solid ' + (fv != null ? noteColor(fv) : '#E2E8F0'),
              background: fv != null ? noteColor(fv) + '30' : '#F8FAFF',
              fontSize: 14, fontWeight: 800, color: fv != null ? noteTxtCol(fv) : '#CBD5E1',
              textAlign: 'center', minHeight: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {fv != null ? fv.toFixed(2) : '—'}
            </div>
            <div style={{ fontSize: 9, color: '#94A3B8', textAlign: 'center', marginTop: 2 }}>I×1 D×2 C×3 +B</div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          <NoteField label="Note /20" value={noteSimple} onChange={setSimple} />
          <NoteField label="Bonus" value={bonus} onChange={setBonus} isBonus />
          {/* Résultat avec bonus */}
          {bonusVal > 0 && (
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 9.5, fontWeight: 700, color: '#059669', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 4 }}>
                Avec bonus
              </div>
              <div style={{
                padding: '7px 10px', borderRadius: 8, border: '1.5px solid #6EE7B7',
                background: '#F0FDF4', fontSize: 14, fontWeight: 800, color: '#059669',
                textAlign: 'center', minHeight: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {fv != null ? fv.toFixed(2) : '—'}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Appréciation + Nom prof ── */}
      <div style={{ display: 'flex', gap: 8 }}>
        <div style={{ flex: 2 }}>
          <div style={{ fontSize: 9.5, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 4 }}>
            Appréciation
          </div>
          <input
            type="text" value={apprecVal} onChange={e => setApprec(e.target.value)}
            style={{
              width: '100%', padding: '7px 11px', borderRadius: 8,
              border: '1.5px solid #E2E8F0', background: '#F8FAFF',
              fontSize: 12, color: '#374151', fontFamily: 'inherit', outline: 'none',
            }}
            placeholder="Appréciation du professeur..."
          />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 9.5, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 4 }}>
            Nom du professeur
          </div>
          <div style={{ position: 'relative' }}>
            <User size={13} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: '#64748B' }} />
            <input
              type="text" value={teacherName} onChange={e => setTeacher(e.target.value)}
              style={{
                width: '100%', paddingLeft: 26, paddingRight: 10, paddingTop: 7, paddingBottom: 7,
                borderRadius: 8, border: '1.5px solid #E2E8F0', background: '#F8FAFF',
                fontSize: 12, color: '#374151', fontFamily: 'inherit', outline: 'none',
              }}
              placeholder="M. / Mme ..."
            />
          </div>
        </div>
      </div>

      {/* ── Signature numérique si nom prof renseigné ── */}
      {teacherName.trim() && (
        <div style={{
          marginTop: 8, padding: '5px 10px', borderRadius: 8,
          background: '#EFF6FF', border: '1px solid #BFDBFE',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <Pen size={11} color="#2563EB" />
          <span style={{ fontFamily: "'Brush Script MT', cursive", fontSize: 14, color: '#1E3A5F' }}>{teacherName}</span>
          <span style={{
            marginLeft: 'auto', fontSize: 9.5, fontWeight: 700, color: '#1D4ED8',
            background: '#DBEAFE', borderRadius: 20, padding: '1px 7px', border: '1px solid #BFDBFE',
          }}>
            ✓ Signé numériquement · {new Date().toLocaleDateString('fr-FR')}
          </span>
        </div>
      )}

      {/* ── Badge bonus actif ── */}
      {bonusVal > 0 && (
        <div style={{
          marginTop: 6, padding: '4px 10px', borderRadius: 8,
          background: '#F0FDF4', border: '1px solid #BBF7D0',
          display: 'flex', alignItems: 'center', gap: 6, fontSize: 11,
        }}>
          <Star size={11} color="#059669" />
          <span style={{ color: '#059669', fontWeight: 700 }}>
            Bonus de +{bonusVal.toFixed(2)} pt{bonusVal > 1 ? 's' : ''} appliqué
            {baseNote !== '' ? ` · Base : ${baseNote}/20 → Final : ${fv?.toFixed(2)}/20` : ''}
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────
const VIEW_KEY = 'edupulse.gradesView';
const TABLE_FROM_STUDENTS = 10;

export default function GradesForm({
  classes, students, subjects,
  selectedClass, setSelectedClass,
  selectedTrimester, setSelectedTrimester,
  getGrade, updateGrade,
  calculateAverage, getMention,
}) {
  const classStudents = selectedClass
    ? students.filter(s => (s.classId || s.class_id) === selectedClass)
    : [];

  // Vue « cartes » (une carte par élève) ou « tableau » (élèves × matières). Le choix est mémorisé ; sans choix, le
  // tableau est proposé dès qu'une classe dépasse 10 élèves (les cartes obligeraient à défiler très longtemps).
  const [storedView, setStoredView] = useState(() => {
    try { return localStorage.getItem(VIEW_KEY); } catch { return null; }
  });
  const view = storedView === 'cards' || storedView === 'table' ? storedView : (classStudents.length > TABLE_FROM_STUDENTS ? 'table' : 'cards');
  const chooseView = (next) => {
    setStoredView(next);
    try { localStorage.setItem(VIEW_KEY, next); } catch { /* stockage indisponible : le choix vaut pour cette visite */ }
  };

  // ── Notification parents ──────────────────────────────────────────────────
  const [notifState, setNotifState] = useState('idle'); // 'idle' | 'loading' | 'success' | 'error'
  const [notifResult, setNotifResult] = useState(null);

  // Le résultat n'est affiché que pour la classe et le trimestre auxquels il se rapporte
  const notifKey = `${selectedClass}:${selectedTrimester}`;
  const shownResult = notifResult?.key === notifKey ? notifResult : null;
  const shownState = notifState === 'loading' ? 'loading' : shownResult ? notifState : 'idle';

  const sendNotifications = async () => {
    if (!selectedClass || !selectedTrimester) return;
    setNotifState('loading');
    setNotifResult(null);
    try {
      const result = await notifyParents(supabase, { classId: selectedClass, trimester: selectedTrimester });
      setNotifResult({ ...result, key: notifKey });
      setNotifState(result.inApp.notified > 0 || result.inApp.already > 0 ? 'success' : 'error');
    } catch (err) {
      setNotifState('error');
      setNotifResult({ error: err.message, key: notifKey });
    }
  };

  const handleSave = (studentId, subjectId, trimester, value, appreciation, extra = {}) =>
    updateGrade(studentId, subjectId, trimester, value, appreciation, extra);

  return (
    <div className="space-y-5">

      {/* ── Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-gray-900 flex items-center gap-2 whitespace-nowrap">
            <Pen className="w-5 h-5 text-blue-600" /> Saisie des notes
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">Sauvegarde automatique · Interro / Devoir / Composition / Bonus</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {/* Bouton notifier les parents */}
          {selectedClass && classStudents.length > 0 && (
            <div className="flex flex-col items-end gap-1">
              <button
                onClick={sendNotifications}
                disabled={shownState === 'loading'}
                title="Affiche une notification sur l'écran de chaque parent de la classe et lui envoie un e-mail (si le service d'e-mail est configuré) pour lui dire que les notes du trimestre sont disponibles"
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${shownState === 'success' ? 'bg-green-100 text-green-700 border border-green-200' :
                    shownState === 'error' ? 'bg-red-100 text-red-700 border border-red-200' :
                      'bg-purple-600 hover:bg-purple-700 text-white shadow-sm'
                  } disabled:opacity-60`}
              >
                {shownState === 'loading' ? (
                  <><div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> Envoi...</>
                ) : shownState === 'success' ? (
                  <><CheckCircle className="w-4 h-4" /> Parents prévenus</>
                ) : shownState === 'error' ? (
                  <><Bell className="w-4 h-4" /> Envoi impossible</>
                ) : (
                  <><Send className="w-4 h-4" /> Prévenir les parents</>
                )}
              </button>
              {shownState === 'error' && shownResult?.error && (
                <p role="alert" className="text-xs text-red-600 max-w-[260px] text-right">{shownResult.error}</p>
              )}
              {shownResult?.inApp && (
                <ul aria-live="polite" className="text-xs max-w-[260px] text-right space-y-0.5">
                  {describeOutcome(shownResult).map((line, i) => (
                    <li key={i} className={line.tone === 'ok' ? 'text-green-700' : line.tone === 'error' ? 'text-red-600' : 'text-orange-700'}>{line.text}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, fontWeight: 500,
            color: '#2563EB', background: '#EFF6FF', border: '1px solid #DBEAFE',
            borderRadius: 8, padding: '5px 10px',
          }}>
            <Save size={13} /> Auto-sauvegarde activée
          </div>
        </div>
      </div>

      {/* ── Filtres ── */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Classe</label>
          <select
            value={selectedClass || ''}
            onChange={e => setSelectedClass(e.target.value || null)}
            className="w-full p-2.5 border border-blue-100 bg-blue-50 rounded-xl text-sm font-medium text-gray-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            <option value="">Sélectionner une classe</option>
            {classes.map(cls => <option key={cls.id} value={cls.id}>{cls.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Trimestre</label>
          <div style={{ display: 'flex', gap: 6 }}>
            {['1', '2', '3'].map(t => (
              <button key={t} onClick={() => setSelectedTrimester(t)} style={{
                flex: 1, padding: '9px 0', borderRadius: 10,
                fontSize: 13, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer',
                background: selectedTrimester === t ? '#2563EB' : '#EFF6FF',
                color: selectedTrimester === t ? '#fff' : '#2563EB',
                border: `1.5px solid ${selectedTrimester === t ? '#2563EB' : '#BFDBFE'}`,
                transition: 'all .15s',
              }}>T{t}</button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Légende ── */}
      {selectedClass && (
        <div style={{
          background: '#F0F5FF', border: '1px solid #DBEAFE', borderRadius: 10,
          padding: '8px 14px', fontSize: 11.5, color: '#3B82F6', display: 'flex', gap: 16, flexWrap: 'wrap',
        }}>
          <span>📐 <strong>Formule :</strong> (Interro×1 + Devoir×2 + Composition×3) ÷ 6 + Bonus</span>
          <span style={{ color: '#059669' }}>⭐ <strong>Bonus :</strong> Points ajoutés sur la note finale (max +5, plafond 20)</span>
        </div>
      )}

      {selectedClass && classStudents.length > 0 && (
        <div role="group" aria-label="Affichage de la saisie" className="flex items-center gap-2">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Affichage</span>
          {[['cards', 'Cartes'], ['table', 'Tableau']].map(([id, label]) => (
            <button
              key={id} type="button" onClick={() => chooseView(id)} aria-pressed={view === id}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold border ${view === id ? 'bg-blue-600 text-white border-blue-600' : 'bg-blue-50 text-blue-700 border-blue-200'}`}
            >
              {label}
            </button>
          ))}
          {view === 'table' && <span className="hidden sm:inline text-xs text-gray-500">Entrée ou ↓ : élève suivant · Tab : matière suivante</span>}
        </div>
      )}

      {selectedClass && classStudents.length === 0 && (
        <div className="text-center py-16 text-gray-500 text-sm">Aucun élève dans cette classe</div>
      )}

      {/* ── Tableau élèves × matières ── */}
      {selectedClass && classStudents.length > 0 && view === 'table' && (
        <GradesTable
          students={classStudents} subjects={subjects} trimester={selectedTrimester}
          getGrade={getGrade} onSave={handleSave} calculateAverage={calculateAverage} getMention={getMention}
        />
      )}

      {/* ── Cartes élèves ── */}
      {selectedClass && view === 'cards' && classStudents.map(student => {
        const avg = calculateAverage(student.id, selectedTrimester);
        const ment = getMention(avg);

        return (
          <div key={student.id} style={{
            background: '#fff', borderRadius: 16,
            border: `1.5px solid ${ment.color}30`,
            borderLeft: `4px solid ${ment.color}`,
            boxShadow: '0 2px 8px rgba(37,99,235,0.06)',
            overflow: 'hidden',
          }}>
            {/* Header élève */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '14px 18px', borderBottom: '1px solid #EFF6FF',
              background: `linear-gradient(135deg, ${ment.color}08, #fff)`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                  background: `linear-gradient(135deg, ${ment.color}, ${ment.color}bb)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontSize: 13, fontWeight: 800,
                }}>
                  {student.firstName?.[0]}{student.lastName?.[0]}
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: '#0F172A' }}>
                    {student.firstName} {student.lastName}
                  </div>
                  <div style={{ fontSize: 11, color: '#64748B', marginTop: 1 }}>
                    {subjects.length} matière{subjects.length > 1 ? 's' : ''} · {selectedTrimester === '1' ? '1er' : selectedTrimester === '2' ? '2ème' : '3ème'} Trimestre
                  </div>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 24, fontWeight: 900, color: ment.color, lineHeight: 1 }}>
                  {avg}/20
                </div>
                <div style={{
                  fontSize: 11, fontWeight: 700, padding: '2px 9px', borderRadius: 20, marginTop: 3,
                  background: ment.color + '20', color: ment.color, display: 'inline-block',
                }}>
                  {ment.text}
                </div>
              </div>
            </div>

            {/* Grille matières */}
            <div style={{ padding: '14px 18px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(340px, 100%), 1fr))', gap: 10 }}>
              {subjects.map(subject => (
                <GradeRow
                  key={subject.id}
                  studentId={student.id}
                  subject={subject}
                  trimester={selectedTrimester}
                  initialGrade={getGrade(student.id, subject.id, selectedTrimester)}
                  onSave={handleSave}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}