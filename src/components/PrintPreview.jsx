import React, { useState, useEffect, useRef } from 'react';
import { Printer, X, Users, ChevronDown } from 'lucide-react';
import { supabase } from '../config/supabase';
import { prepareBulletinHtml } from '../utils/printSecurity';
import { buildBulletinContext, renderBulletin } from '../utils/bulletin';

function PrintPreviewInner({
  printStudent, setShowPrintPreview, selectedTrimester,
  calculateAverage, grades, subjects, classes, students,
  appColors, schoolLogo, schoolInfo, handlePrint, getMention,
  bulletinTemplate = 'model1'
}) {
  const [generalAppreciation, setGeneralAppreciation] = useState('');
  const [batchTemplate, setBatchTemplate] = useState('model1');
  const [isBatchLoading, setIsBatchLoading] = useState(false);
  const [absencesByStudent, setAbsencesByStudent] = useState({});

  const student = printStudent;
  const [serverRank, setServerRank] = useState(null);

  // Absences de l'élève imprimé et de ses camarades de classe (impression de toute la classe) :
  // une seule requête, regroupée par élève
  const classId = student?.classId || student?.class_id;
  const absenceIds = [...new Set([student?.id, ...(students || [])
    .filter(s => (s.classId || s.class_id) === classId).map(s => s.id)].filter(id => id != null))];
  const absenceKey = absenceIds.join(',');
  useEffect(() => {
    if (!absenceKey) return undefined;
    let cancelled = false;
    Promise.resolve(supabase.from('absences')
      .select('student_id, type, justified')
      .in('student_id', absenceKey.split(',')))
      .then(({ data }) => {
        if (!data || cancelled) return;
        const grouped = {};
        for (const a of data) {
          const entry = (grouped[a.student_id] ??= { absents: 0, retards: 0, injustifies: 0 });
          if (a.type === 'absent') entry.absents++;
          if (a.type === 'retard') entry.retards++;
          if (!a.justified) entry.injustifies++;
        }
        setAbsencesByStudent(grouped);
      });
    return () => { cancelled = true; };
  }, [absenceKey]);

  // Rang et statistiques de classe calculés par la base (fonction child_class_rank) : un parent ne
  // lit que ses propres enfants et ne peut pas les calculer à partir des notes de la classe.
  useEffect(() => {
    if (!student?.id) return undefined;
    let cancelled = false;
    Promise.resolve(supabase.rpc('child_class_rank', { p_student: student.id, p_trimester: selectedTrimester, p_year: schoolInfo?.year }))
      .then(({ data, error }) => {
        const row = Array.isArray(data) ? data[0] : data;
        if (!cancelled) setServerRank(!error && row ? row : null);
      })
      .catch(() => { if (!cancelled) setServerRank(null); });
    return () => { cancelled = true; };
  }, [student?.id, selectedTrimester, schoolInfo?.year]);

  const c = buildBulletinContext({
    printStudent, selectedTrimester, calculateAverage, getMention,
    grades, subjects, classes, students, schoolLogo, schoolInfo,
    absencesByStudent, generalAppreciation, serverRank,
  });
  const {
    studentGrades, average, mention, studentRank, studentStatus, totalCoef, totalPoints,
    classInfo, classStudents, classTotal, trimLabel, fmtAvg,
  } = c;

  const openPrint = (html) => {
    const win = window.open('', '_blank', 'width=960,height=800');
    if (!win) { alert('Autorisez les pop-ups pour imprimer.'); return; }
    win.document.write(prepareBulletinHtml(html));
    win.document.close();
    setTimeout(() => { win.print(); setTimeout(() => win.close(), 600); }, 450);
  };

  // ── Générateur selon modèle ───────────────────────────────────────────────
  const buildHtml = (tmpl, s, sGrades, sAvg, sRank, sStatus, sMention, sTotalCoef, sTotalPts) =>
    renderBulletin(tmpl, c, s, sGrades, sAvg, sRank, sStatus, sMention, sTotalCoef, sTotalPts);

  // Bulletin de l'élève sélectionné
  const renderSelected = (tmpl) =>
    buildHtml(tmpl, student, studentGrades, average, studentRank, studentStatus, mention, totalCoef, totalPoints);

  // ── Batch print — tous les élèves de la classe ────────────────────────────
  const openBatchPrint = () => {
    if (!classStudents.length) return;
    setIsBatchLoading(true);
    const htmls = classStudents.map(s => {
      const sAvg = parseFloat(calculateAverage(s.id, selectedTrimester)) || 0;
      const sGrades = grades.filter(g => (g.studentId || g.student_id) === s.id && g.trimester === selectedTrimester);
      const sRank = c.rankOf(s.id);
      const sMention = getMention(sAvg);
      const sStatus = sAvg >= 12 ? { text: 'ADMIS(E)', color: '#059669' } : sAvg >= 8 ? { text: 'À SUIVRE', color: '#d97706' } : { text: 'EN DIFFICULTÉ', color: '#dc2626' };
      const sTotalCoef = sGrades.reduce((sum, g) => sum + (subjects.find(sub => sub.id === (g.subjectId || g.subject_id))?.coefficient || 0), 0);
      const sTotalPts = sGrades.reduce((sum, g) => {
        const coef = subjects.find(sub => sub.id === (g.subjectId || g.subject_id))?.coefficient || 0;
        return sum + ((g.value || 0) * coef);
      }, 0);
      return buildHtml(batchTemplate, s, sGrades, sAvg, sRank, sStatus, sMention, sTotalCoef, sTotalPts);
    });
    const pages = htmls.map(html => {
      const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
      return bodyMatch ? `<div style="page-break-after:always;">${bodyMatch[1]}</div>` : '';
    }).join('');

    // La feuille de style est la même pour tous les élèves (les couleurs propres à chacun sont en ligne)
    const cssMatch = htmls[0].match(/<style>([\s\S]*?)<\/style>/i);
    const css = cssMatch ? cssMatch[1] : '';

    const batchHtml = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
<title>Bulletins — Classe ${classInfo?.name} — ${trimLabel}</title>
<style>${css} @page{size:A4 portrait;margin:0;} body{padding:0;} div[style*="page-break"]:last-child{page-break-after:auto!important;}</style>
</head><body>${pages}</body></html>`;

    const win = window.open('', '_blank', 'width=960,height=800');
    if (!win) { alert('Autorisez les pop-ups pour imprimer.'); setIsBatchLoading(false); return; }
    win.document.write(prepareBulletinHtml(batchHtml));
    win.document.close();
    setTimeout(() => { win.print(); setTimeout(() => win.close(), 600); setIsBatchLoading(false); }, 600);
    setShowPrintPreview(false);
  };

  // ── Bugfix useEffect ──────────────────────────────────────────────────────
  // L'écouteur est enregistré une seule fois mais appelle toujours la version la plus récente de
  // la fonction d'impression : sinon il imprimait avec les valeurs du premier rendu (rang et
  // statistiques de classe encore absents, appréciation générale pas encore saisie).
  const printLatest = useRef(null);
  useEffect(() => {
    printLatest.current = (template) => {
      const html = renderSelected(template || bulletinTemplate);
      if (html) openPrint(html);
    };
  });
  useEffect(() => {
    const handler = (e) => printLatest.current?.(e?.detail?.template);
    window.addEventListener('print-bulletin', handler);
    return () => window.removeEventListener('print-bulletin', handler);
  }, []);

  // ════════════════════════════════════════════════════════════════════════════
  // UI MODAL
  // ════════════════════════════════════════════════════════════════════════════
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(3px)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-screen overflow-y-auto">

        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Imprimer le bulletin</h3>
            <p className="text-sm text-gray-500">{student.firstName} {student.lastName} — {classInfo?.name} — {trimLabel}</p>
          </div>
          <button onClick={() => setShowPrintPreview(false)} className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 py-4 bg-gray-50 border-b border-gray-100">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-white rounded-xl p-3 shadow-sm">
              <div className="text-2xl font-black text-blue-600">{fmtAvg(average)}</div>
              <div className="text-xs text-gray-400 uppercase font-semibold">Moyenne</div>
            </div>
            <div className="bg-white rounded-xl p-3 shadow-sm">
              <div className="text-2xl font-black text-indigo-600">{studentRank}/{classTotal}</div>
              <div className="text-xs text-gray-400 uppercase font-semibold">Rang</div>
            </div>
            <div className="bg-white rounded-xl p-3 shadow-sm">
              <div className="text-lg font-black" style={{ color: mention.color || '#2563eb' }}>{mention.text || 'N/A'}</div>
              <div className="text-xs text-gray-400 uppercase font-semibold">Mention</div>
            </div>
          </div>
        </div>

        <div className="px-5 pt-4 pb-1">
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
            📝 Appréciation du conseil de classe <span className="text-gray-300 normal-case font-normal">(optionnel)</span>
          </label>
          <textarea
            value={generalAppreciation}
            onChange={e => setGeneralAppreciation(e.target.value)}
            placeholder="Ex: Bon trimestre. Des efforts à poursuivre en mathématiques…"
            rows={2}
            className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none text-gray-700 placeholder-gray-300"
          />
        </div>

        <div className="p-5 space-y-3">
          <p className="text-sm font-semibold text-gray-700 mb-3">Choisissez un modèle :</p>

          <div className="border-2 border-gray-200 rounded-xl p-4 hover:border-blue-400 hover:bg-blue-50 transition-all group">
            <div className="flex items-center gap-2 mb-1"><span className="text-lg">📋</span><h4 className="font-bold text-gray-800 group-hover:text-blue-700">Modèle Officiel</h4></div>
            <p className="text-xs text-gray-500 mb-3">Style ministère · Interro/Devoir/Compo/Bonus · Moy. classe par matière · Absences · Signatures · QR Code</p>
            <button onClick={() => { openPrint(renderSelected('model1')); setShowPrintPreview(false); }}
              className="w-full bg-blue-600 text-white px-4 py-2.5 rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2">
              <Printer className="w-4 h-4" /> Imprimer ce modèle
            </button>
          </div>

          <div className="border-2 border-gray-200 rounded-xl p-4 hover:border-emerald-400 hover:bg-emerald-50 transition-all group">
            <div className="flex items-center gap-2 mb-1"><span className="text-lg">📊</span><h4 className="font-bold text-gray-800 group-hover:text-emerald-700">Modèle Moderne</h4></div>
            <p className="text-xs text-gray-500 mb-3">Gradient bleu · Barres de progression · Moy. classe par matière · Points forts/faibles · Absences · QR Code</p>
            <button onClick={() => { openPrint(renderSelected('model2')); setShowPrintPreview(false); }}
              className="w-full bg-emerald-600 text-white px-4 py-2.5 rounded-lg font-semibold hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2">
              <Printer className="w-4 h-4" /> Imprimer ce modèle
            </button>
          </div>

          <div className="border-2 border-gray-200 rounded-xl p-4 hover:border-purple-400 hover:bg-purple-50 transition-all group">
            <div className="flex items-center gap-2 mb-1"><span className="text-lg">🏆</span><h4 className="font-bold text-gray-800 group-hover:text-purple-700">Modèle Premium</h4></div>
            <p className="text-xs text-gray-500 mb-3">Couverture dégradée · KPIs + Absences · Évolution 3 trimestres · Points forts/faibles · Moy. classe par matière · QR Code</p>
            <button onClick={() => { openPrint(renderSelected('model3')); setShowPrintPreview(false); }}
              className="w-full bg-purple-600 text-white px-4 py-2.5 rounded-lg font-semibold hover:bg-purple-700 transition-colors flex items-center justify-center gap-2">
              <Printer className="w-4 h-4" /> Imprimer ce modèle
            </button>
          </div>

          <div className="border-2 border-orange-200 bg-orange-50 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Users className="w-4 h-4 text-orange-600" />
              </div>
              <div>
                <h4 className="font-bold text-orange-800 text-sm">Imprimer toute la classe</h4>
                <p className="text-xs text-orange-500">{classStudents.length} bulletins en 1 clic — choisissez le modèle</p>
              </div>
            </div>
            <div className="mb-2.5 relative">
              <select value={batchTemplate} onChange={e => setBatchTemplate(e.target.value)}
                className="w-full border border-orange-300 rounded-lg px-3 py-2 text-sm font-medium text-orange-800 bg-white appearance-none focus:outline-none focus:ring-2 focus:ring-orange-400">
                <option value="model1">📋 Modèle Officiel</option>
                <option value="model2">📊 Modèle Moderne</option>
                <option value="model3">🏆 Modèle Premium</option>
              </select>
              <ChevronDown className="absolute right-2 top-2.5 w-4 h-4 text-orange-400 pointer-events-none" />
            </div>
            <button onClick={openBatchPrint} disabled={isBatchLoading}
              className="w-full bg-orange-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-orange-600 transition-colors flex items-center justify-center gap-2 text-sm disabled:opacity-60 disabled:cursor-not-allowed">
              {isBatchLoading
                ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Génération en cours…</>
                : <><Printer className="w-4 h-4" /> Imprimer {classStudents.length} bulletins</>}
            </button>
          </div>
        </div>

        <div className="px-5 pb-5 space-y-2">
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-700">
            💡 Autorisez les pop-ups dans votre navigateur si la fenêtre d'impression ne s'ouvre pas.
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-xs text-blue-700">
            🌍 Pour afficher la République et le Ministère, renseignez <code className="bg-blue-100 px-1 rounded">republic</code>, <code className="bg-blue-100 px-1 rounded">countryMotto</code>, <code className="bg-blue-100 px-1 rounded">ministry</code> et <code className="bg-blue-100 px-1 rounded">devise</code> dans <strong>Paramètres → Infos établissement</strong>.
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PrintPreview(props) {
  if (!props.printStudent) return null;
  return <PrintPreviewInner {...props} />;
}
