import React, { useState, useEffect, useRef } from 'react';
import { Save, CheckCircle, ChevronDown, ChevronUp, User, Pen, Star } from 'lucide-react';

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
const mention = v => +v >= 16 ? 'Très Bien' : +v >= 14 ? 'Bien' : +v >= 12 ? 'Assez Bien' : +v >= 10 ? 'Passable' : +v >= 8 ? 'Insuffisant' : 'Très Insuf.';

// ─── Calcul note finale depuis interro/devoir/compo (sans bonus) ─────────────
// Pondération : Interro ×1 · Devoir ×2 · Composition ×3
const computeFinal = (interro, devoir, compo) => {
  const parts = [];
  if (interro !== '' && !isNaN(+interro)) parts.push({ v: +interro, w: 1 });
  if (devoir !== '' && !isNaN(+devoir)) parts.push({ v: +devoir, w: 2 });
  if (compo !== '' && !isNaN(+compo)) parts.push({ v: +compo, w: 3 });
  if (!parts.length) return '';
  const sumW = parts.reduce((s, p) => s + p.w, 0);
  return (parts.reduce((s, p) => s + p.v * p.w, 0) / sumW).toFixed(2);
};

// ─── Petit champ numérique réutilisable ───────────────────────────────────────
function NoteField({ label, value, onChange, disabled, isBonus = false }) {
  const v = parseFloat(value);
  const bg = isBonus
    ? (value === '' ? '#F0FDF4' : '#DCFCE7')
    : (value === '' ? '#F8FAFF' : isNaN(v) ? '#FFF1F1' : v < 8 ? '#FFF7ED' : v < 10 ? '#FEFCE8' : v < 14 ? '#EFF6FF' : '#F0FDF4');
  const brd = isBonus
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
function GradeRow({ studentId, subject, trimester, initialGrade, onSave }) {
  const [mode, setMode] = useState('detail'); // 'simple' | 'detail'
  const [noteSimple, setSimple] = useState(initialGrade?.value ?? '');
  const [interro, setInterro] = useState(initialGrade?.interro ?? '');
  const [devoir, setDevoir] = useState(initialGrade?.devoir ?? '');
  const [compo, setCompo] = useState(initialGrade?.composition ?? '');
  const [bonus, setBonus] = useState(initialGrade?.bonus ?? '');
  const [teacherName, setTeacher] = useState(initialGrade?.teacherName ?? '');
  const [apprecVal, setApprec] = useState(initialGrade?.appreciation ?? '');
  const [saved, setSaved] = useState(false);
  const isFirst = useRef(true);

  // Note finale calculée (avant bonus)
  const baseNote = mode === 'detail' ? computeFinal(interro, devoir, compo) : noteSimple;
  // Note finale avec bonus (plafonnée à 20)
  const bonusVal = bonus !== '' && !isNaN(+bonus) ? +bonus : 0;
  const finalNote = baseNote !== '' && !isNaN(+baseNote)
    ? Math.min(20, +baseNote + bonusVal).toFixed(2)
    : '';

  // Sync si données externes changent (import Excel)
  useEffect(() => {
    setSimple(initialGrade?.value ?? '');
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
    const base = mode === 'detail' ? computeFinal(dbInterro, dbDevoir, dbCompo) : dbSimple;
    const bonusN = dbBonus !== '' && !isNaN(+dbBonus) ? +dbBonus : 0;
    const finalN = base !== '' && !isNaN(+base) ? Math.min(20, +base + bonusN) : '';
    onSave(studentId, subject.id, trimester, finalN === '' ? '' : parseFloat(finalN), dbApprec, {
      interro: dbInterro === '' ? null : parseFloat(dbInterro),
      devoir: dbDevoir === '' ? null : parseFloat(dbDevoir),
      composition: dbCompo === '' ? null : parseFloat(dbCompo),
      bonus: dbBonus === '' ? null : parseFloat(dbBonus),
      teacherName: dbTeacher,
    });
    setSaved(true);
    const t = setTimeout(() => setSaved(false), 1600);
    return () => clearTimeout(t);
  }, [dbInterro, dbDevoir, dbCompo, dbSimple, dbBonus, dbTeacher, dbApprec]);

  const fv = finalNote !== '' && !isNaN(+finalNote) ? +finalNote : null;

  return (
    <div style={{
      background: '#FAFBFF', borderRadius: 12,
      border: `1.5px solid ${fv != null ? noteColor(fv) : '#E8EFFE'}`,
      padding: '12px 14px', transition: 'border-color .2s',
    }}>
      {/* ── Header matière ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
            background: fv != null ? noteTxtCol(fv) : '#CBD5E1',
          }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>{subject.name}</span>
          <span style={{ fontSize: 11, color: '#94A3B8', fontWeight: 500 }}>Coef. {subject.coefficient}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
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
            <div style={{ fontSize: 9.5, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 4 }}>
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
            <div style={{ fontSize: 9, color: '#CBD5E1', textAlign: 'center', marginTop: 2 }}>I×1 D×2 C×3 +B</div>
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
          <div style={{ fontSize: 9.5, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 4 }}>
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
          <div style={{ fontSize: 9.5, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 4 }}>
            Nom du professeur
          </div>
          <div style={{ position: 'relative' }}>
            <User size={13} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
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

  const handleSave = (studentId, subjectId, trimester, value, appreciation, extra = {}) => {
    updateGrade(studentId, subjectId, trimester, value, appreciation, extra);
  };

  return (
    <div className="space-y-5">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
            <Pen className="w-5 h-5 text-blue-600" /> Saisie des notes
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">Sauvegarde automatique · Interro / Devoir / Composition / Bonus</p>
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, fontWeight: 500,
          color: '#2563EB', background: '#EFF6FF', border: '1px solid #DBEAFE',
          borderRadius: 8, padding: '5px 10px',
        }}>
          <Save size={13} /> Auto-sauvegarde activée
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
                flex: 1, padding: '9px 0', borderRadius: 10, border: 'none',
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

      {selectedClass && classStudents.length === 0 && (
        <div className="text-center py-16 text-gray-300 text-sm">Aucun élève dans cette classe</div>
      )}

      {/* ── Cartes élèves ── */}
      {selectedClass && classStudents.map(student => {
        const avg = calculateAverage(student.id, selectedTrimester);
        const ment = getMention(avg);
        const avgNum = parseFloat(avg) || 0;

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
                  <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 1 }}>
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
            <div style={{ padding: '14px 18px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 10 }}>
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