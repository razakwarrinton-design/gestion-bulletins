import React, { useState, useEffect, useMemo } from 'react';
import { Printer, X, Users, AlertCircle } from 'lucide-react';

export default function PrintPreview({
  printStudent,
  setShowPrintPreview,
  selectedTrimester,
  calculateAverage,
  grades,
  subjects,
  classes,
  students,
  appColors,
  schoolLogo,
  schoolInfo,
  handlePrint,
  getMention,
  bulletinTemplate = 'model1'
}) {
  const [generalAppreciation, setGeneralAppreciation] = useState('');
  const [isBatchLoading, setIsBatchLoading] = useState(false);

  if (!printStudent) return null;

  // ── Données calculées ────────────────────────────────────────────────────────
  const student = printStudent;
  const average = parseFloat(calculateAverage(student.id, selectedTrimester)) || 0;
  const studentGrades = grades.filter(
    g => (g.studentId || g.student_id) === student.id && g.trimester === selectedTrimester
  );
  const classInfo = classes.find(c => c.id === (student.classId || student.class_id));
  const classStudents = students ? students.filter(s => (s.classId || s.class_id) === classInfo?.id) : [];
  const mention = getMention(average);

  const ranking = classStudents
    .map(s => ({ student: s, average: parseFloat(calculateAverage(s.id, selectedTrimester)) || 0 }))
    .sort((a, b) => b.average - a.average);
  const studentRank = ranking.findIndex(r => r.student.id === student.id) + 1 || '-';

  const classAverages = classStudents.map(s => parseFloat(calculateAverage(s.id, selectedTrimester)) || 0).filter(a => a > 0);
  const classAverage = classAverages.length ? (classAverages.reduce((a, b) => a + b, 0) / classAverages.length) : 0;
  const classMax = classAverages.length ? Math.max(...classAverages) : 0;
  const classMin = classAverages.length ? Math.min(...classAverages) : 0;

  const totalCoef = studentGrades.reduce((sum, g) => sum + (subjects.find(s => s.id === (g.subjectId || g.subject_id))?.coefficient || 0), 0);
  const totalPoints = studentGrades.reduce((sum, g) => {
    const coef = subjects.find(s => s.id === (g.subjectId || g.subject_id))?.coefficient || 0;
    return sum + ((g.value || 0) * coef);
  }, 0);

  const studentStatus = average >= 12
    ? { text: 'ADMIS(E)', color: '#059669' }
    : average >= 8
      ? { text: 'À SUIVRE', color: '#d97706' }
      : { text: 'EN DIFFICULTÉ', color: '#dc2626' };

  const schoolName = schoolInfo?.name || 'ÉTABLISSEMENT SCOLAIRE';
  const schoolAddr = schoolInfo?.address || '';
  const schoolPhone = schoolInfo?.phone || '';
  const schoolEmail = schoolInfo?.email || '';
  const trimLabel = `Trimestre ${selectedTrimester}`;
  const yearLabel = schoolInfo?.year || '2024-2025';

  const fmtAvg = (v) => { const n = parseFloat(v); return isNaN(n) ? '-' : n.toFixed(2); };
  const gradeColor = (v) => v >= 15 ? '#059669' : v >= 10 ? '#2563eb' : v >= 8 ? '#d97706' : '#dc2626';
  const gradeLabel = (v) => v >= 16 ? 'Très Bien' : v >= 14 ? 'Bien' : v >= 12 ? 'Assez Bien' : v >= 10 ? 'Passable' : v >= 8 ? 'Insuffisant' : 'Très Insuffisant';

  // ── Points forts/faibles (sans doublons) ──────────────────────────────────
  const sortedGrades = [...studentGrades].filter(g => g.value != null).sort((a, b) => b.value - a.value);
  const half = Math.floor(sortedGrades.length / 2);
  const strengths = sortedGrades.slice(0, Math.min(3, half)).map(g => ({
    name: subjects.find(s => s.id === (g.subjectId || g.subject_id))?.name || '?',
    value: g.value
  }));
  const weaknesses = sortedGrades.slice(-Math.min(3, half)).reverse().map(g => ({
    name: subjects.find(s => s.id === (g.subjectId || g.subject_id))?.name || '?',
    value: g.value
  }));

  // ── Évolution trimestrielle + flèche ──────────────────────────────────────
  const t1Avg = parseFloat(calculateAverage(student.id, '1')) || 0;
  const t2Avg = parseFloat(calculateAverage(student.id, '2')) || 0;
  const t3Avg = parseFloat(calculateAverage(student.id, '3')) || 0;

  const prevTrimAvg = selectedTrimester === '1' ? 0 : selectedTrimester === '2' ? t1Avg : t2Avg;
  const trend = prevTrimAvg > 0
    ? average > prevTrimAvg + 0.5 ? '↑'
      : average < prevTrimAvg - 0.5 ? '↓'
        : '→'
    : null;
  const trendColor = trend === '↑' ? '#059669' : trend === '↓' ? '#dc2626' : '#d97706';

  // ── Signature numérique HTML ───────────────────────────────────────────────
  const digitalSigBox = (title, name, role = '') => `
    <div style="border:1.5px solid #cbd5e1;border-radius:10px;padding:10px 12px;background:#f8fafc;min-height:90px;display:flex;flex-direction:column;justify-content:space-between;">
      <div style="font-size:7.5pt;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px;">${title}</div>
      <div style="flex:1;display:flex;align-items:center;justify-content:center;">
        <div style="text-align:center;">
          ${name
      ? `<div style="font-family:'Brush Script MT','Segoe Script',cursive;font-size:15pt;color:#1e3a5f;line-height:1.1;border-bottom:1.5px solid #94a3b8;padding-bottom:4px;min-width:120px;">${name}</div>
             <div style="font-size:7.5pt;color:#64748b;margin-top:4px;font-weight:600;">${role ? role + ' — ' : ''}${new Date().toLocaleDateString('fr-FR')}</div>
             <div style="margin-top:5px;display:inline-block;background:#dbeafe;color:#1d4ed8;font-size:6.5pt;font-weight:700;padding:2px 7px;border-radius:20px;border:1px solid #bfdbfe;">✓ Signé numériquement</div>`
      : `<div style="font-size:8pt;color:#cbd5e1;font-style:italic;">En attente de signature</div>`
    }
        </div>
      </div>
    </div>`;

  // ── Calcul note finale ─────────────────────────────────────────────────────
  const computeFinal = (g) => {
    if (!g) return null;
    if (g.value != null) return g.value;
    const parts = [g.interro, g.devoir, g.composition].filter(v => v != null);
    if (!parts.length) return null;
    return parts.reduce((a, b) => a + b, 0) / parts.length;
  };

  // ── Ouverture d'une fenêtre d'impression ──────────────────────────────────
  const openPrint = (html) => {
    const win = window.open('', '_blank', 'width=920,height=750');
    if (!win) { alert('Autorisez les pop-ups pour imprimer.'); return; }
    win.document.write(html);
    win.document.close();
    setTimeout(() => { win.print(); setTimeout(() => win.close(), 500); }, 400);
  };

  // ── Batch Print (toute la classe) ─────────────────────────────────────────
  const openBatchPrint = () => {
    if (!classStudents.length) return;
    setIsBatchLoading(true);

    const allPages = classStudents.map(s => {
      const sAvg = parseFloat(calculateAverage(s.id, selectedTrimester)) || 0;
      const sGrades = grades.filter(g => (g.studentId || g.student_id) === s.id && g.trimester === selectedTrimester);
      const sMention = getMention(sAvg);
      const sTotalCoef = sGrades.reduce((sum, g) => sum + (subjects.find(sub => sub.id === (g.subjectId || g.subject_id))?.coefficient || 0), 0);
      const sTotalPts = sGrades.reduce((sum, g) => {
        const coef = subjects.find(sub => sub.id === (g.subjectId || g.subject_id))?.coefficient || 0;
        return sum + ((g.value || 0) * coef);
      }, 0);
      const sStatus = sAvg >= 12 ? { text: 'ADMIS(E)', color: '#059669' }
        : sAvg >= 8 ? { text: 'À SUIVRE', color: '#d97706' }
          : { text: 'EN DIFFICULTÉ', color: '#dc2626' };
      const sRank = ranking.findIndex(r => r.student.id === s.id) + 1;

      const rows = sGrades.map(g => {
        const subj = subjects.find(sub => sub.id === (g.subjectId || g.subject_id));
        const coef = subj?.coefficient || 1;
        const finalVal = computeFinal(g);
        const color = finalVal != null ? gradeColor(finalVal) : '#374151';
        return `<tr>
          <td class="subj-name">${subj?.name || 'N/A'}</td>
          <td class="center">${coef}</td>
          <td class="center">${g.interro != null ? g.interro.toFixed(2) : '-'}</td>
          <td class="center">${g.devoir != null ? g.devoir.toFixed(2) : '-'}</td>
          <td class="center">${g.composition != null ? g.composition.toFixed(2) : '-'}</td>
          <td class="center" style="color:${color};font-weight:800;">${finalVal != null ? finalVal.toFixed(2) : '-'}</td>
          <td class="center">${finalVal != null ? (finalVal * coef).toFixed(2) : '-'}</td>
          <td class="appreciate">${g.appreciation || ''}</td>
        </tr>`;
      }).join('');

      return `
        <div class="page-break">
          <div class="header">
            <div>${schoolLogo ? `<img src="${schoolLogo}" class="logo" alt="Logo">` : `<div class="logo-placeholder">LOGO</div>`}</div>
            <div class="header-center">
              <h1>${schoolName}</h1>
              <h2>${schoolAddr}</h2>
              <p style="font-size:9pt;color:#6b7280;">${schoolPhone} ${schoolEmail ? '| ' + schoolEmail : ''}</p>
            </div>
            <div style="text-align:right;font-size:9pt;"><strong>Année scolaire</strong><br>${yearLabel}</div>
          </div>
          <div class="bulletin-title">Bulletin Scolaire — ${trimLabel}</div>
          <div class="student-box">
            <div class="info-row"><div class="info-label">Nom</div><div class="info-value">${s.lastName?.toUpperCase()}</div></div>
            <div class="info-row"><div class="info-label">Prénom</div><div class="info-value">${s.firstName}</div></div>
            <div class="info-row"><div class="info-label">Classe</div><div class="info-value">${classInfo?.name || 'N/A'}</div></div>
            <div class="info-row"><div class="info-label">Effectif</div><div class="info-value">${classStudents.length} élèves</div></div>
            <div class="info-row"><div class="info-label">Rang</div><div class="info-value">${sRank} / ${classStudents.length}</div></div>
            <div class="info-row"><div class="info-label">Trimestre</div><div class="info-value">${trimLabel}</div></div>
          </div>
          <table>
            <thead><tr>
              <th class="left" style="min-width:110px;">Matière</th>
              <th style="width:36px;">Coef.</th>
              <th style="width:46px;">Interro</th>
              <th style="width:46px;">Devoir</th>
              <th style="width:46px;">Compo</th>
              <th style="width:52px;">Note /20</th>
              <th style="width:52px;">Total pts</th>
              <th class="left">Appréciation</th>
            </tr></thead>
            <tbody>
              ${rows}
              <tr style="background:#1e3a5f !important;">
                <td colspan="5" style="font-weight:bold;color:white;">TOTAL GÉNÉRAL</td>
                <td class="center" style="font-weight:bold;color:white;font-size:12pt;">${fmtAvg(sAvg)}/20</td>
                <td class="center" style="color:white;">${sTotalPts.toFixed(2)}</td>
                <td style="color:rgba(255,255,255,0.7);font-size:8pt;">Coeff.: ${sTotalCoef}</td>
              </tr>
            </tbody>
          </table>
          <div class="results-band">
            <div class="result-cell"><div class="result-label">Moyenne générale</div><div class="result-value">${fmtAvg(sAvg)}<span style="font-size:9pt;">/20</span></div></div>
            <div class="result-cell"><div class="result-label">Moy. classe</div><div class="result-value" style="font-size:13pt;">${fmtAvg(classAverage)}</div></div>
            <div class="result-cell"><div class="result-label">Rang</div><div class="result-value">${sRank}<span style="font-size:9pt;">/${classStudents.length}</span></div></div>
            <div class="result-cell"><div class="result-label">Mention</div><div class="result-value" style="font-size:10pt;color:${sMention.color || '#1e40af'};">${sMention.text}</div></div>
            <div class="result-cell"><div class="result-label">Décision</div><div class="result-value" style="font-size:10pt;color:${sStatus.color};">${sStatus.text}</div></div>
          </div>
          ${generalAppreciation ? `
          <div style="border:1.5px solid #1e40af;border-radius:8px;padding:10px 14px;margin-bottom:12px;background:#f8faff;">
            <div style="font-size:8pt;font-weight:700;color:#1e40af;text-transform:uppercase;margin-bottom:6px;">Appréciation du conseil de classe</div>
            <div style="font-size:11pt;color:#1e3a5f;">${generalAppreciation}</div>
          </div>` : ''}
          <div class="signatures">
            ${digitalSigBox('Signature du Directeur', schoolInfo?.directorName || schoolInfo?.director || '', 'Directeur')}
            ${digitalSigBox('Visa du Prof. Principal', schoolInfo?.principalTeacher || '', 'Prof. Principal')}
            ${digitalSigBox('Signature des Parents / Tuteur', '', '')}
          </div>
          <div class="footer">${schoolName} — Bulletin officiel — ${yearLabel} — ${trimLabel}</div>
        </div>`;
    }).join('');

    const batchHtml = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
    <title>Bulletins classe ${classInfo?.name} — ${trimLabel}</title>
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: 'Times New Roman', serif; font-size: 11pt; color: #111; background: #fff; }
      .page-break { padding: 14mm 12mm; page-break-after: always; }
      .page-break:last-child { page-break-after: auto; }
      .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px double #1e40af; padding-bottom: 8px; margin-bottom: 10px; }
      .header-center { text-align: center; flex: 1; }
      .header-center h1 { font-size: 15pt; color: #1e40af; text-transform: uppercase; }
      .header-center h2 { font-size: 11pt; color: #374151; }
      .logo { width: 70px; height: 70px; object-fit: contain; }
      .logo-placeholder { width: 70px; height: 70px; border: 2px solid #1e40af; display: flex; align-items: center; justify-content: center; font-size: 8pt; color: #1e40af; text-align: center; }
      .bulletin-title { background: #1e40af; color: white; text-align: center; padding: 5px; font-size: 13pt; font-weight: bold; letter-spacing: 2px; margin: 10px 0; text-transform: uppercase; }
      .student-box { border: 2px solid #1e40af; padding: 8px 12px; margin-bottom: 10px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }
      .info-row { font-size: 10pt; }
      .info-label { font-weight: bold; color: #1e40af; font-size: 8pt; text-transform: uppercase; }
      .info-value { border-bottom: 1px solid #9ca3af; padding-bottom: 2px; }
      table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
      thead tr { background: #1e40af; color: white; }
      th { padding: 6px 8px; font-size: 9pt; text-align: center; font-weight: bold; }
      th.left { text-align: left; }
      td { padding: 5px 8px; font-size: 10pt; border-bottom: 1px solid #e5e7eb; vertical-align: middle; }
      tr:nth-child(even) td { background: #f8fafc; }
      .subj-name { font-weight: 600; }
      .center { text-align: center; }
      .appreciate { font-style: italic; font-size: 8.5pt; color: #4b5563; }
      .results-band { display: grid; grid-template-columns: repeat(5, 1fr); border: 2px solid #1e40af; margin-bottom: 10px; }
      .result-cell { padding: 8px; text-align: center; border-right: 1px solid #1e40af; }
      .result-cell:last-child { border-right: none; }
      .result-label { font-size: 7.5pt; text-transform: uppercase; color: #6b7280; font-weight: bold; }
      .result-value { font-size: 14pt; font-weight: bold; color: #1e40af; margin-top: 2px; }
      .signatures { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-top: 12px; margin-bottom: 10px; }
      .footer { text-align: center; font-size: 8pt; color: #9ca3af; margin-top: 14px; border-top: 1px solid #e5e7eb; padding-top: 6px; }
      @page { size: A4; margin: 8mm; }
      @media print { body { padding: 0; } }
    </style></head><body>${allPages}</body></html>`;

    const win = window.open('', '_blank', 'width=920,height=750');
    if (!win) { alert('Autorisez les pop-ups pour imprimer.'); setIsBatchLoading(false); return; }
    win.document.write(batchHtml);
    win.document.close();
    setTimeout(() => {
      win.print();
      setTimeout(() => win.close(), 500);
      setIsBatchLoading(false);
    }, 600);
    setShowPrintPreview(false);
  };

  // ════════════════════════════════════════════════════════════════════════════
  // MODÈLE 1 — OFFICIEL (style ministère)
  // ════════════════════════════════════════════════════════════════════════════
  const generateModel1Html = () => {
    const directorName = schoolInfo?.directorName || schoolInfo?.director || '';
    const principalTeacher = schoolInfo?.principalTeacher || '';

    const rows = studentGrades.map(g => {
      const subj = subjects.find(s => s.id === (g.subjectId || g.subject_id));
      const coef = subj?.coefficient || 1;
      const finalVal = computeFinal(g);
      const color = finalVal != null ? gradeColor(finalVal) : '#374151';
      const interro = g.interro != null ? g.interro.toFixed(2) : '-';
      const devoir = g.devoir != null ? g.devoir.toFixed(2) : '-';
      const compo = g.composition != null ? g.composition.toFixed(2) : '-';
      const teacherName = g.teacherName || subj?.teacher || '';
      const sigCell = teacherName
        ? `<span style="font-family:'Brush Script MT',cursive;font-size:10pt;color:#1e3a5f;">${teacherName}</span>
           <div style="font-size:6pt;color:#2563eb;margin-top:1px;">✓ Signé</div>`
        : `<span style="color:#d1d5db;font-size:8pt;">—</span>`;
      return `
        <tr>
          <td class="subj-name">${subj?.name || 'N/A'}<br>
            <span style="font-size:7pt;color:#94a3b8;font-weight:400;">${teacherName}</span>
          </td>
          <td class="center">${coef}</td>
          <td class="center sub-note">${interro}</td>
          <td class="center sub-note">${devoir}</td>
          <td class="center sub-note">${compo}</td>
          <td class="center" style="color:${color};font-weight:800;font-size:11pt;">${finalVal != null ? finalVal.toFixed(2) : '-'}</td>
          <td class="center" style="color:${color};">${finalVal != null ? (finalVal * coef).toFixed(2) : '-'}</td>
          <td class="appreciate">${g.appreciation || ''}</td>
          <td class="center" style="font-size:8pt;">${sigCell}</td>
        </tr>`;
    }).join('');

    return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
<title>Bulletin – ${student.firstName} ${student.lastName}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Times New Roman', serif; font-size: 11pt; color: #111; background: #fff; padding: 14mm 12mm; }
  .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px double #1e40af; padding-bottom: 8px; margin-bottom: 10px; }
  .header-center { text-align: center; flex: 1; }
  .header-center h1 { font-size: 15pt; color: #1e40af; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 2px; }
  .header-center h2 { font-size: 11pt; color: #374151; }
  .header-right { text-align: right; font-size: 9pt; line-height: 1.6; }
  .logo { width: 70px; height: 70px; object-fit: contain; }
  .logo-placeholder { width: 70px; height: 70px; border: 2px solid #1e40af; display: flex; align-items: center; justify-content: center; font-size: 8pt; color: #1e40af; text-align: center; }
  .bulletin-title { background: #1e40af; color: white; text-align: center; padding: 5px; font-size: 13pt; font-weight: bold; letter-spacing: 2px; margin: 10px 0; text-transform: uppercase; }
  .student-box { border: 2px solid #1e40af; padding: 8px 12px; margin-bottom: 10px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }
  .info-row { font-size: 10pt; }
  .info-label { font-weight: bold; color: #1e40af; font-size: 8pt; text-transform: uppercase; }
  .info-value { border-bottom: 1px solid #9ca3af; padding-bottom: 2px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
  thead tr { background: #1e40af; color: white; }
  th { padding: 6px 8px; font-size: 9pt; text-align: center; font-weight: bold; }
  th.left { text-align: left; }
  td { padding: 5px 8px; font-size: 10pt; border-bottom: 1px solid #e5e7eb; vertical-align: middle; }
  tr:nth-child(even) td { background: #f8fafc; }
  .subj-name { font-weight: 600; }
  .center { text-align: center; }
  .sub-note { font-size: 9pt; color: #6b7280; background: #f9fafb; }
  .appreciate { font-style: italic; font-size: 8.5pt; color: #4b5563; max-width: 120px; }
  .results-band { display: grid; grid-template-columns: repeat(6, 1fr); border: 2px solid #1e40af; margin-bottom: 10px; }
  .result-cell { padding: 8px; text-align: center; border-right: 1px solid #1e40af; }
  .result-cell:last-child { border-right: none; }
  .result-label { font-size: 7.5pt; text-transform: uppercase; color: #6b7280; font-weight: bold; }
  .result-value { font-size: 14pt; font-weight: bold; color: #1e40af; margin-top: 2px; }
  .conseil-box { border: 2px dashed #1e40af; border-radius: 6px; padding: 10px 14px; margin-bottom: 12px; }
  .conseil-label { font-size: 8pt; font-weight: 700; color: #1e40af; text-transform: uppercase; margin-bottom: 6px; }
  .conseil-content { font-size: 11pt; color: #1e3a5f; min-height: 24px; }
  .signatures { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-top: 12px; }
  .footer { text-align: center; font-size: 8pt; color: #9ca3af; margin-top: 14px; border-top: 1px solid #e5e7eb; padding-top: 6px; }
  @page { size: A4; margin: 10mm; }
  @media print { body { padding: 0; } }
</style></head><body>

  <div class="header">
    <div>
      ${schoolLogo ? `<img src="${schoolLogo}" class="logo" alt="Logo">` : `<div class="logo-placeholder">LOGO<br>ÉCOLE</div>`}
    </div>
    <div class="header-center">
      <h1>${schoolName}</h1>
      <h2>${schoolAddr}</h2>
      <p style="font-size:9pt;color:#6b7280;">${schoolPhone} ${schoolEmail ? '| ' + schoolEmail : ''}</p>
    </div>
    <div class="header-right">
      <p><strong>Année scolaire</strong><br>${yearLabel}</p>
    </div>
  </div>

  <div class="bulletin-title">Bulletin Scolaire &mdash; ${trimLabel}</div>

  <div class="student-box">
    <div class="info-row"><div class="info-label">Nom</div><div class="info-value">${student.lastName?.toUpperCase()}</div></div>
    <div class="info-row"><div class="info-label">Prénom</div><div class="info-value">${student.firstName}</div></div>
    <div class="info-row"><div class="info-label">Classe</div><div class="info-value">${classInfo?.name || 'N/A'}</div></div>
    <div class="info-row"><div class="info-label">Effectif</div><div class="info-value">${classStudents.length} élèves</div></div>
    <div class="info-row"><div class="info-label">Rang</div><div class="info-value">${studentRank} / ${classStudents.length}</div></div>
    <div class="info-row"><div class="info-label">Trimestre</div><div class="info-value">${trimLabel}</div></div>
  </div>

  <table>
    <thead>
      <tr>
        <th class="left" style="min-width:110px;">Matière / Professeur</th>
        <th style="width:36px;">Coef.</th>
        <th style="width:46px;">Interro</th>
        <th style="width:46px;">Devoir</th>
        <th style="width:46px;">Compo</th>
        <th style="width:52px;">Note /20</th>
        <th style="width:52px;">Total pts</th>
        <th class="left">Appréciation</th>
        <th style="width:80px;">Signature prof</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
      <tr style="background:#1e3a5f !important;">
        <td colspan="5" style="font-weight:bold;color:white;font-size:10pt;">TOTAL GÉNÉRAL</td>
        <td class="center" style="font-weight:bold;color:white;font-size:12pt;">${fmtAvg(average)}/20</td>
        <td class="center" style="color:white;">${totalPoints.toFixed(2)}</td>
        <td style="color:rgba(255,255,255,0.7);font-size:8pt;">Coeff. total: ${totalCoef}</td>
        <td></td>
      </tr>
    </tbody>
  </table>

  <div class="results-band">
    <div class="result-cell">
      <div class="result-label">Moyenne générale</div>
      <div class="result-value">${fmtAvg(average)}<span style="font-size:9pt;">/20</span></div>
    </div>
    <div class="result-cell">
      <div class="result-label">Moy. classe</div>
      <div class="result-value" style="font-size:13pt;">${fmtAvg(classAverage)}</div>
    </div>
    <div class="result-cell">
      <div class="result-label">Rang</div>
      <div class="result-value">${studentRank}<span style="font-size:9pt;">/${classStudents.length}</span></div>
    </div>
    <div class="result-cell">
      <div class="result-label">Évolution</div>
      <div class="result-value" style="color:${trendColor};">${trend || '—'}</div>
    </div>
    <div class="result-cell">
      <div class="result-label">Mention</div>
      <div class="result-value" style="font-size:10pt;color:${mention.color || '#1e40af'};">${mention.text}</div>
    </div>
    <div class="result-cell">
      <div class="result-label">Décision</div>
      <div class="result-value" style="font-size:10pt;color:${studentStatus.color};">${studentStatus.text}</div>
    </div>
  </div>

  <div class="conseil-box">
    <div class="conseil-label">Appréciation du conseil de classe / Prof. principal</div>
    <div class="conseil-content">${generalAppreciation || ''}</div>
    ${principalTeacher ? `<div style="font-size:7pt;color:#2563eb;margin-top:4px;">✓ ${principalTeacher} — ${new Date().toLocaleDateString('fr-FR')}</div>` : ''}
  </div>

  <div class="signatures">
    ${digitalSigBox('Signature du Directeur', directorName, 'Directeur')}
    ${digitalSigBox('Visa du Prof. Principal', principalTeacher, 'Prof. Principal')}
    ${digitalSigBox('Signature des Parents / Tuteur', '', '')}
  </div>

  <div class="footer">${schoolName} &mdash; Bulletin officiel &mdash; ${yearLabel} &mdash; ${trimLabel}</div>

</body></html>`;
  };

  // ════════════════════════════════════════════════════════════════════════════
  // MODÈLE 2 — MODERNE (barres + SVG)
  // ════════════════════════════════════════════════════════════════════════════
  const generateModel2Html = () => {
    const directorName = schoolInfo?.directorName || schoolInfo?.director || '';
    const principalTeacher = schoolInfo?.principalTeacher || '';

    const rows = studentGrades.map(g => {
      const subj = subjects.find(s => s.id === (g.subjectId || g.subject_id));
      const coef = subj?.coefficient || 1;
      const finalVal = computeFinal(g);
      const pct = finalVal != null ? (finalVal / 20) * 100 : 0;
      const color = finalVal != null ? gradeColor(finalVal) : '#9ca3af';
      const lbl = finalVal != null ? gradeLabel(finalVal) : '';
      const teacherName = g.teacherName || subj?.teacher || '';
      const interro = g.interro != null ? g.interro.toFixed(2) : '—';
      const devoir = g.devoir != null ? g.devoir.toFixed(2) : '—';
      const compo = g.composition != null ? g.composition.toFixed(2) : '—';
      const cAvgs = classStudents.map(s => {
        const sg = grades.find(gg => (gg.studentId || gg.student_id) === s.id && (gg.subjectId || gg.subject_id) === (g.subjectId || g.subject_id) && gg.trimester === selectedTrimester);
        return computeFinal(sg) || 0;
      }).filter(v => v > 0);
      const subjClassAvg = cAvgs.length ? (cAvgs.reduce((a, b) => a + b, 0) / cAvgs.length) : 0;
      const classPct = (subjClassAvg / 20) * 100;

      return `
        <div class="grade-row">
          <div class="grade-left">
            <div>
              <span class="grade-subject">${subj?.name || 'N/A'}</span>
              <span class="grade-coef">×${coef}</span>
              ${teacherName ? `<div style="font-size:7pt;color:#94a3b8;margin-top:1px;">${teacherName}</div>` : ''}
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:6px;font-size:7.5pt;color:#64748b;width:130px;flex-shrink:0;">
            <span style="background:#f1f5f9;border-radius:4px;padding:2px 5px;">I:${interro}</span>
            <span style="background:#f1f5f9;border-radius:4px;padding:2px 5px;">D:${devoir}</span>
            <span style="background:#f1f5f9;border-radius:4px;padding:2px 5px;">C:${compo}</span>
          </div>
          <div style="flex:1;position:relative;">
            <div class="grade-bar-wrap">
              <div class="grade-bar" style="width:${pct}%;background:${color};"></div>
              ${subjClassAvg > 0 ? `<div style="position:absolute;top:0;left:${classPct}%;width:2px;height:100%;background:#94a3b8;opacity:0.8;"></div>` : ''}
            </div>
            <div style="font-size:6pt;color:#94a3b8;margin-top:2px;">Moy. classe: ${subjClassAvg > 0 ? subjClassAvg.toFixed(2) : '—'}</div>
          </div>
          <div class="grade-right">
            <span class="grade-value" style="color:${color};">${finalVal != null ? finalVal.toFixed(2) : '-'}</span>
            <span class="grade-lbl" style="color:${color};">${lbl}</span>
          </div>
          <div style="width:90px;text-align:center;flex-shrink:0;">
            ${teacherName
          ? `<div style="font-family:'Brush Script MT',cursive;font-size:10pt;color:#1e3a5f;">${teacherName}</div>
                 <div style="font-size:6pt;color:#2563eb;">✓ Signé</div>`
          : `<span style="font-size:7pt;color:#d1d5db;">—</span>`}
          </div>
        </div>`;
    }).join('');

    const svgBars = studentGrades.slice(0, 8).map((g, i) => {
      const subj = subjects.find(s => s.id === (g.subjectId || g.subject_id));
      const val = computeFinal(g) ?? 0;
      const h = (val / 20) * 120;
      const x = 20 + i * 38;
      const y = 140 - h;
      const color = gradeColor(val);
      const name = (subj?.name || '?').slice(0, 4);
      return `
        <rect x="${x}" y="${y}" width="24" height="${h}" fill="${color}" rx="3"/>
        <text x="${x + 12}" y="155" text-anchor="middle" font-size="7" fill="#6b7280">${name}</text>
        <text x="${x + 12}" y="${y - 3}" text-anchor="middle" font-size="8" fill="${color}" font-weight="bold">${val.toFixed(0)}</text>`;
    }).join('');

    const classLine = `<line x1="15" y1="${140 - (classAverage / 20) * 120}" x2="${20 + Math.min(studentGrades.length, 8) * 38}" y2="${140 - (classAverage / 20) * 120}" stroke="#94a3b8" stroke-dasharray="4,3" stroke-width="1.5"/>
    <text x="${20 + Math.min(studentGrades.length, 8) * 38 + 2}" y="${140 - (classAverage / 20) * 120 + 4}" font-size="7" fill="#94a3b8">moy.</text>`;

    return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
<title>Bulletin – ${student.firstName} ${student.lastName}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; background: #f8fafc; color: #1e293b; }
  .page { max-width: 210mm; margin: 0 auto; background: white; }
  .top-banner { background: linear-gradient(135deg, #1e40af 0%, #3b82f6 50%, #06b6d4 100%); color: white; padding: 20px 24px; }
  .top-row { display: flex; justify-content: space-between; align-items: center; }
  .school-name { font-size: 18pt; font-weight: 700; letter-spacing: 0.5px; }
  .school-sub { font-size: 9pt; opacity: 0.85; margin-top: 2px; }
  .trimestre-badge { background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.4); padding: 6px 14px; border-radius: 20px; font-weight: 600; font-size: 10pt; }
  .logo-img { width: 60px; height: 60px; object-fit: contain; border-radius: 8px; background: white; padding: 4px; }
  .student-card { display: flex; align-items: center; gap: 16px; background: white; margin: 0 20px; margin-top: -18px; border-radius: 12px; padding: 14px 20px; box-shadow: 0 4px 16px rgba(0,0,0,0.12); }
  .student-avatar { width: 52px; height: 52px; background: linear-gradient(135deg, #3b82f6, #06b6d4); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 18pt; font-weight: 700; flex-shrink: 0; }
  .student-name { font-size: 14pt; font-weight: 700; color: #1e293b; }
  .student-meta { font-size: 9pt; color: #64748b; margin-top: 2px; }
  .student-stats { display: flex; gap: 14px; margin-left: auto; }
  .stat-pill { text-align: center; background: #f1f5f9; padding: 8px 14px; border-radius: 10px; }
  .stat-val { font-size: 14pt; font-weight: 800; color: #1e40af; }
  .stat-lbl { font-size: 7pt; color: #94a3b8; text-transform: uppercase; font-weight: 600; }
  .mention-bar { margin: 16px 20px 12px; background: ${mention.color || '#2563eb'}18; border-left: 5px solid ${mention.color || '#2563eb'}; border-radius: 0 8px 8px 0; padding: 10px 16px; display: flex; justify-content: space-between; align-items: center; }
  .mention-text { font-size: 13pt; font-weight: 700; color: ${mention.color || '#2563eb'}; }
  .decision-badge { background: ${studentStatus.color}18; color: ${studentStatus.color}; border: 1.5px solid ${studentStatus.color}; padding: 4px 14px; border-radius: 20px; font-size: 9pt; font-weight: 700; }
  .section { margin: 0 20px 16px; }
  .section-title { font-size: 10pt; font-weight: 700; text-transform: uppercase; color: #94a3b8; letter-spacing: 1px; margin-bottom: 10px; }
  .grade-row { display: flex; align-items: center; gap: 10px; padding: 7px 0; border-bottom: 1px solid #f1f5f9; }
  .grade-left { width: 170px; display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
  .grade-subject { font-weight: 600; font-size: 10pt; }
  .grade-coef { font-size: 8pt; color: #94a3b8; }
  .grade-bar-wrap { flex: 1; height: 10px; background: #f1f5f9; border-radius: 5px; overflow: hidden; position: relative; }
  .grade-bar { height: 100%; border-radius: 5px; }
  .grade-right { width: 100px; display: flex; align-items: center; gap: 6px; justify-content: flex-end; }
  .grade-value { font-size: 12pt; font-weight: 800; }
  .grade-lbl { font-size: 7.5pt; }
  .graph-section { margin: 0 20px 16px; background: #f8fafc; border-radius: 10px; padding: 14px; }
  .class-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin: 0 20px 16px; }
  .cstat { background: #f8fafc; border-radius: 8px; padding: 10px 12px; text-align: center; }
  .cstat-val { font-size: 14pt; font-weight: 800; color: #1e40af; }
  .cstat-lbl { font-size: 7.5pt; color: #94a3b8; text-transform: uppercase; }
  .sigs { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin: 0 20px 20px; }
  .footer { background: #f1f5f9; padding: 8px 20px; font-size: 7.5pt; color: #94a3b8; display: flex; justify-content: space-between; }
  @page { size: A4; margin: 8mm; }
  @media print { body { background: white; } .page { box-shadow: none; } }
</style></head><body><div class="page">

  <div class="top-banner">
    <div class="top-row">
      <div>
        <div class="school-name">${schoolName}</div>
        <div class="school-sub">${schoolAddr} ${schoolPhone ? '| ' + schoolPhone : ''}</div>
      </div>
      ${schoolLogo ? `<img src="${schoolLogo}" class="logo-img" alt="Logo">` : ''}
      <div class="trimestre-badge">${trimLabel} &mdash; ${yearLabel}</div>
    </div>
  </div>

  <div class="student-card">
    <div class="student-avatar">${(student.firstName || '?')[0]}${(student.lastName || '?')[0]}</div>
    <div>
      <div class="student-name">${student.firstName} ${student.lastName?.toUpperCase()}</div>
      <div class="student-meta">Classe: <strong>${classInfo?.name || 'N/A'}</strong> &nbsp;|&nbsp; Effectif: <strong>${classStudents.length} élèves</strong> &nbsp;|&nbsp; ${yearLabel}</div>
    </div>
    <div class="student-stats">
      <div class="stat-pill">
        <div class="stat-val">${fmtAvg(average)}</div>
        <div class="stat-lbl">Moyenne</div>
      </div>
      <div class="stat-pill">
        <div class="stat-val">${studentRank}</div>
        <div class="stat-lbl">Rang</div>
      </div>
      ${trend ? `<div class="stat-pill"><div class="stat-val" style="color:${trendColor};">${trend}</div><div class="stat-lbl">Évolution</div></div>` : ''}
    </div>
  </div>

  <div class="mention-bar">
    <div>
      <div style="font-size:8pt;color:#64748b;text-transform:uppercase;font-weight:700;margin-bottom:2px;">Mention obtenue</div>
      <div class="mention-text">${mention.text || 'N/A'}</div>
    </div>
    <div class="decision-badge">${studentStatus.text}</div>
  </div>

  <div class="class-stats">
    <div class="cstat"><div class="cstat-val">${fmtAvg(classAverage)}</div><div class="cstat-lbl">Moy. classe</div></div>
    <div class="cstat"><div class="cstat-val">${fmtAvg(classMax)}</div><div class="cstat-lbl">Meilleure</div></div>
    <div class="cstat"><div class="cstat-val">${fmtAvg(classMin)}</div><div class="cstat-lbl">Plus basse</div></div>
    <div class="cstat"><div class="cstat-val">${totalCoef}</div><div class="cstat-lbl">Total coeff.</div></div>
  </div>

  <div class="section">
    <div class="section-title">Résultats par matière <span style="font-size:7pt;color:#cbd5e1;margin-left:8px;">| trait vertical = moy. classe</span></div>
    ${rows}
  </div>

  ${studentGrades.length > 0 ? `
  <div class="graph-section">
    <div class="section-title">Visualisation des notes</div>
    <svg width="100%" height="170" viewBox="0 0 ${Math.max(360, 20 + studentGrades.slice(0, 8).length * 38 + 30)} 170">
      ${[0, 5, 10, 15, 20].map(v => `
        <line x1="15" y1="${140 - (v / 20) * 120}" x2="${20 + Math.min(studentGrades.length, 8) * 38}" y2="${140 - (v / 20) * 120}" stroke="#e2e8f0" stroke-width="1"/>
        <text x="10" y="${144 - (v / 20) * 120}" text-anchor="end" font-size="7" fill="#94a3b8">${v}</text>
      `).join('')}
      ${svgBars}
      ${classLine}
    </svg>
    <p style="font-size:7pt;color:#94a3b8;margin-top:4px;">— Ligne pointillée = moyenne de classe (${fmtAvg(classAverage)})</p>
  </div>` : ''}

  ${generalAppreciation ? `
  <div style="margin:0 20px 16px;border:1.5px solid #3b82f6;border-radius:10px;padding:10px 16px;background:#eff6ff;">
    <div style="font-size:8pt;font-weight:700;color:#1d4ed8;text-transform:uppercase;margin-bottom:6px;">Appréciation du conseil de classe</div>
    <div style="font-size:11pt;color:#1e3a5f;">${generalAppreciation}</div>
  </div>` : ''}

  <div class="sigs">
    ${digitalSigBox('Signature du Directeur', directorName, 'Directeur')}
    ${digitalSigBox('Visa du Prof. Principal', principalTeacher, 'Prof. Principal')}
    ${digitalSigBox('Signature des Parents / Tuteur', '', '')}
  </div>

  <div class="footer">
    <span>${schoolName} — Bulletin scolaire officiel</span>
    <span>${yearLabel} — ${trimLabel}</span>
    <span>Édité le ${new Date().toLocaleDateString('fr-FR')}</span>
  </div>

</div></body></html>`;
  };

  // ════════════════════════════════════════════════════════════════════════════
  // MODÈLE 3 — PREMIUM (analyse complète + évolution)
  // ════════════════════════════════════════════════════════════════════════════
  const generateModel3Html = () => {
    const directorName = schoolInfo?.directorName || schoolInfo?.director || '';
    const principalTeacher = schoolInfo?.principalTeacher || '';

    const alertBanner = average < 10 ? `
      <div style="background:#fef2f2;border:2px solid #fca5a5;border-radius:8px;padding:10px 16px;margin:0 18px 14px;display:flex;align-items:center;gap:10px;">
        <span style="font-size:18pt;">⚠️</span>
        <div>
          <div style="font-weight:800;color:#dc2626;font-size:10pt;">Élève en difficulté — Moyenne insuffisante</div>
          <div style="font-size:8.5pt;color:#b91c1c;margin-top:2px;">Un suivi renforcé est recommandé. Moyenne actuelle : ${fmtAvg(average)}/20</div>
        </div>
      </div>` : '';

    const rows = studentGrades.map(g => {
      const subj = subjects.find(s => s.id === (g.subjectId || g.subject_id));
      const coef = subj?.coefficient || 1;
      const finalVal = computeFinal(g);
      const color = finalVal != null ? gradeColor(finalVal) : '#9ca3af';
      const lbl = finalVal != null ? gradeLabel(finalVal) : '-';
      const pct = finalVal != null ? (finalVal / 20) * 100 : 0;
      const interro = g.interro != null ? g.interro.toFixed(2) : '—';
      const devoir = g.devoir != null ? g.devoir.toFixed(2) : '—';
      const compo = g.composition != null ? g.composition.toFixed(2) : '—';
      const teacherName = g.teacherName || subj?.teacher || '';
      const cAvgs = classStudents.map(s => {
        const sg = grades.find(gg => (gg.studentId || gg.student_id) === s.id && (gg.subjectId || gg.subject_id) === (g.subjectId || g.subject_id) && gg.trimester === selectedTrimester);
        return computeFinal(sg) || 0;
      }).filter(v => v > 0);
      const subjClassAvg = cAvgs.length ? (cAvgs.reduce((a, b) => a + b, 0) / cAvgs.length) : 0;
      return `
        <tr>
          <td class="subj-name">${subj?.name || 'N/A'}<br>
            <span style="font-size:7pt;color:#94a3b8;font-weight:400;">${teacherName}</span>
          </td>
          <td class="center"><span class="coef-badge">${coef}</span></td>
          <td class="center" style="font-size:8pt;color:#64748b;">
            <div style="display:flex;gap:3px;justify-content:center;">
              <span style="background:#f1f5f9;border-radius:4px;padding:1px 5px;">I:${interro}</span>
              <span style="background:#f1f5f9;border-radius:4px;padding:1px 5px;">D:${devoir}</span>
              <span style="background:#f1f5f9;border-radius:4px;padding:1px 5px;">C:${compo}</span>
            </div>
          </td>
          <td class="center">
            <div style="display:flex;align-items:center;gap:6px;">
              <div style="flex:1;height:8px;background:#f1f5f9;border-radius:4px;overflow:hidden;">
                <div style="width:${pct}%;height:100%;background:${color};border-radius:4px;"></div>
              </div>
              <span style="color:${color};font-weight:800;font-size:11pt;min-width:38px;">${finalVal != null ? finalVal.toFixed(2) : '-'}</span>
            </div>
          </td>
          <td class="center" style="font-size:8.5pt;color:#64748b;">${subjClassAvg > 0 ? subjClassAvg.toFixed(2) : '-'}</td>
          <td><span style="color:${color};font-size:8.5pt;font-style:italic;">${lbl}</span></td>
          <td style="font-size:8pt;color:#475569;font-style:italic;">${g.appreciation || ''}</td>
          <td class="center" style="font-size:8pt;">
            ${teacherName
          ? `<div style="font-family:'Brush Script MT',cursive;font-size:9pt;color:#1e3a5f;">${teacherName}</div>
                 <div style="font-size:6pt;color:#2563eb;">✓ Signé</div>`
          : `<span style="color:#d1d5db;">—</span>`}
          </td>
        </tr>`;
    }).join('');

    const evol = [[1, t1Avg], [2, t2Avg], [3, t3Avg]].filter(([, v]) => v > 0);
    const evolSvg = evol.length > 1 ? `
      <svg width="280" height="80" viewBox="0 0 280 80">
        ${[0, 5, 10, 15, 20].map(v => `
          <line x1="30" y1="${65 - (v / 20) * 55}" x2="270" y2="${65 - (v / 20) * 55}" stroke="#f1f5f9" stroke-width="1"/>
          <text x="25" y="${69 - (v / 20) * 55}" text-anchor="end" font-size="7" fill="#94a3b8">${v}</text>`).join('')}
        <polyline points="${evol.map(([t, v]) => `${30 + (t - 1) * 120},${65 - (v / 20) * 55}`).join(' ')}" fill="none" stroke="#3b82f6" stroke-width="2.5" stroke-linejoin="round"/>
        ${evol.map(([t, v]) => `
          <circle cx="${30 + (t - 1) * 120}" cy="${65 - (v / 20) * 55}" r="5" fill="#3b82f6"/>
          <text x="${30 + (t - 1) * 120}" y="${65 - (v / 20) * 55 - 8}" text-anchor="middle" font-size="8.5" fill="#1e40af" font-weight="bold">${v.toFixed(2)}</text>
          <text x="${30 + (t - 1) * 120}" y="76" text-anchor="middle" font-size="7.5" fill="#64748b">T${t}</text>`).join('')}
      </svg>` : '<p style="color:#94a3b8;font-size:8.5pt;">Données insuffisantes pour l\'évolution</p>';

    return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
<title>Bulletin Premium – ${student.firstName} ${student.lastName}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; background: #fff; color: #1e293b; font-size: 10pt; }
  .cover { background: linear-gradient(160deg, #0f172a 0%, #1e3a8a 60%, #1e40af 100%); padding: 22px 24px 18px; color: white; position: relative; overflow: hidden; }
  .cover::before { content: ''; position: absolute; right: -40px; top: -40px; width: 200px; height: 200px; background: rgba(255,255,255,0.04); border-radius: 50%; }
  .cover-row { display: flex; justify-content: space-between; align-items: flex-start; }
  .cover-left { flex: 1; }
  .school-name { font-size: 16pt; font-weight: 800; letter-spacing: 0.5px; margin-bottom: 2px; }
  .school-info { font-size: 8.5pt; opacity: 0.7; line-height: 1.6; }
  .cover-badge { background: rgba(255,255,255,0.12); border: 1px solid rgba(255,255,255,0.25); border-radius: 10px; padding: 10px 16px; text-align: center; }
  .cover-badge-year { font-size: 8pt; opacity: 0.7; }
  .cover-badge-trim { font-size: 13pt; font-weight: 800; margin: 2px 0; }
  .logo-img { width: 56px; height: 56px; object-fit: contain; border-radius: 8px; background: white; padding: 4px; }
  .student-banner { background: #f8fafc; border-left: 6px solid #2563eb; padding: 12px 20px; display: flex; justify-content: space-between; align-items: center; }
  .student-fullname { font-size: 15pt; font-weight: 800; color: #0f172a; }
  .student-class { font-size: 9pt; color: #64748b; margin-top: 1px; }
  .avg-display { text-align: center; background: #1e40af; color: white; padding: 10px 20px; border-radius: 10px; }
  .avg-num { font-size: 20pt; font-weight: 900; line-height: 1; }
  .avg-label { font-size: 7.5pt; opacity: 0.8; }
  .kpis { display: grid; grid-template-columns: repeat(6, 1fr); gap: 0; border: 1.5px solid #e2e8f0; }
  .kpi { padding: 10px; text-align: center; border-right: 1px solid #e2e8f0; }
  .kpi:last-child { border-right: none; }
  .kpi-val { font-size: 13pt; font-weight: 800; color: #1e40af; }
  .kpi-lbl { font-size: 7pt; color: #94a3b8; text-transform: uppercase; font-weight: 600; margin-top: 1px; }
  .body-grid { display: grid; grid-template-columns: 3fr 1.6fr; padding: 14px 18px; gap: 16px; }
  table { width: 100%; border-collapse: collapse; font-size: 9.5pt; }
  thead tr { background: #0f172a; color: white; }
  th { padding: 7px 8px; font-size: 8pt; text-align: left; font-weight: 600; }
  th.center { text-align: center; }
  td { padding: 6px 8px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
  .subj-name { font-weight: 700; }
  .center { text-align: center; }
  .coef-badge { background: #e0e7ff; color: #3730a3; padding: 1px 6px; border-radius: 10px; font-size: 8pt; font-weight: 700; }
  .total-row td { background: #0f172a !important; color: white; font-weight: 700; }
  .side-panel { display: flex; flex-direction: column; gap: 12px; }
  .panel-box { border: 1.5px solid #e2e8f0; border-radius: 10px; padding: 12px; }
  .panel-title { font-size: 8.5pt; font-weight: 800; text-transform: uppercase; letter-spacing: 0.8px; color: #64748b; margin-bottom: 8px; }
  .mention-box { background: linear-gradient(135deg, ${mention.color || '#2563eb'}15, ${mention.color || '#2563eb'}08); border: 2px solid ${mention.color || '#2563eb'}; border-radius: 10px; padding: 12px; text-align: center; }
  .mention-val { font-size: 14pt; font-weight: 900; color: ${mention.color || '#2563eb'}; }
  .decision-tag { display: inline-block; background: ${studentStatus.color}18; color: ${studentStatus.color}; border: 1.5px solid ${studentStatus.color}; padding: 3px 12px; border-radius: 20px; font-size: 8.5pt; font-weight: 800; margin-top: 6px; }
  .evol-box { border: 1.5px solid #e2e8f0; border-radius: 10px; padding: 12px; }
  .strength-item { display: flex; justify-content: space-between; align-items: center; padding: 4px 0; border-bottom: 1px dashed #f1f5f9; font-size: 8.5pt; }
  .strength-name { font-weight: 600; }
  .strength-val { font-weight: 800; }
  .sigs { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; padding: 0 18px 18px; }
  .footer { background: #0f172a; color: #64748b; padding: 7px 18px; font-size: 7.5pt; display: flex; justify-content: space-between; }
  @page { size: A4; margin: 6mm; }
  @media print { body { background: white; } }
</style></head><body>

  <div class="cover">
    <div class="cover-row">
      <div class="cover-left">
        ${schoolLogo ? `<img src="${schoolLogo}" class="logo-img" style="margin-bottom:8px;" alt="Logo">` : ''}
        <div class="school-name">${schoolName}</div>
        <div class="school-info">${schoolAddr}${schoolPhone ? ' | ' + schoolPhone : ''}${schoolEmail ? ' | ' + schoolEmail : ''}</div>
      </div>
      <div class="cover-badge">
        <div class="cover-badge-year">${yearLabel}</div>
        <div class="cover-badge-trim">${trimLabel}</div>
        <div style="font-size:7.5pt;opacity:0.6;margin-top:3px;">Bulletin scolaire</div>
      </div>
    </div>
  </div>

  <div class="student-banner">
    <div>
      <div class="student-fullname">${student.firstName} ${student.lastName?.toUpperCase()}</div>
      <div class="student-class">Classe: <strong>${classInfo?.name || 'N/A'}</strong> &nbsp;·&nbsp; Effectif: <strong>${classStudents.length}</strong> &nbsp;·&nbsp; Rang: <strong>${studentRank}/${classStudents.length}</strong></div>
    </div>
    <div class="avg-display">
      <div class="avg-num">${fmtAvg(average)}</div>
      <div class="avg-label">Moy. / 20</div>
    </div>
  </div>

  <div class="kpis">
    <div class="kpi"><div class="kpi-val">${fmtAvg(classAverage)}</div><div class="kpi-lbl">Moy. classe</div></div>
    <div class="kpi"><div class="kpi-val">${fmtAvg(classMax)}</div><div class="kpi-lbl">Max classe</div></div>
    <div class="kpi"><div class="kpi-val">${fmtAvg(classMin)}</div><div class="kpi-lbl">Min classe</div></div>
    <div class="kpi"><div class="kpi-val">${totalCoef}</div><div class="kpi-lbl">Coeff. total</div></div>
    <div class="kpi"><div class="kpi-val">${totalPoints.toFixed(1)}</div><div class="kpi-lbl">Total points</div></div>
    <div class="kpi"><div class="kpi-val" style="color:${trendColor};">${trend || '—'}</div><div class="kpi-lbl">Évolution</div></div>
  </div>

  ${alertBanner}

  <div class="body-grid">
    <div>
      <table>
        <thead>
          <tr>
            <th>Matière / Prof.</th>
            <th class="center" style="width:36px;">Coef.</th>
            <th class="center" style="width:120px;">I / D / C</th>
            <th style="width:130px;">Note /20</th>
            <th class="center" style="width:50px;">Moy.cl.</th>
            <th style="width:55px;">Niveau</th>
            <th>Appréciation</th>
            <th class="center" style="width:75px;">Signature</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
          <tr class="total-row">
            <td>MOYENNE GÉNÉRALE</td>
            <td class="center">${totalCoef}</td>
            <td></td>
            <td><strong style="font-size:12pt;">${fmtAvg(average)}/20</strong></td>
            <td class="center">${fmtAvg(classAverage)}</td>
            <td>${mention.text || ''}</td>
            <td></td>
            <td></td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="side-panel">
      <div class="mention-box">
        <div style="font-size:7.5pt;color:#64748b;text-transform:uppercase;font-weight:700;margin-bottom:4px;">Mention</div>
        <div class="mention-val">${mention.text || 'N/A'}</div>
        <div class="decision-tag">${studentStatus.text}</div>
        ${trend ? `<div style="margin-top:8px;font-size:12pt;font-weight:900;color:${trendColor};">Évolution ${trend}</div>` : ''}
      </div>

      <div class="evol-box">
        <div class="panel-title">📈 Évolution des moyennes</div>
        ${evolSvg}
      </div>

      ${strengths.length > 0 ? `
      <div class="panel-box">
        <div class="panel-title">💪 Points forts</div>
        ${strengths.map(s => `
          <div class="strength-item">
            <span class="strength-name">${s.name}</span>
            <span class="strength-val" style="color:#059669;">${s.value.toFixed(2)}</span>
          </div>`).join('')}
      </div>` : ''}

      ${weaknesses.length > 0 ? `
      <div class="panel-box">
        <div class="panel-title">⚠️ À renforcer</div>
        ${weaknesses.map(s => `
          <div class="strength-item">
            <span class="strength-name">${s.name}</span>
            <span class="strength-val" style="color:#dc2626;">${s.value.toFixed(2)}</span>
          </div>`).join('')}
      </div>` : ''}

      ${generalAppreciation ? `
      <div class="panel-box">
        <div class="panel-title">📝 Appréciation générale</div>
        <div style="font-size:9pt;color:#1e3a5f;line-height:1.5;">${generalAppreciation}</div>
      </div>` : ''}
    </div>
  </div>

  <div class="sigs">
    ${digitalSigBox('Signature du Directeur', directorName, 'Directeur')}
    ${digitalSigBox('Visa du Prof. Principal', principalTeacher, 'Prof. Principal')}
    ${digitalSigBox('Signature des Parents / Tuteur', '', '')}
  </div>

  <div class="footer">
    <span>${schoolName}</span>
    <span>Document officiel — ${yearLabel} — ${trimLabel}</span>
    <span>Édité le ${new Date().toLocaleDateString('fr-FR')}</span>
  </div>

</body></html>`;
  };

  // ── Écouteur événement externe (BUGFIX: deps array ajouté) ────────────────
  useEffect(() => {
    const handler = (e) => {
      const tmpl = e?.detail?.template || bulletinTemplate;
      const html = tmpl === 'model1' ? generateModel1Html()
        : tmpl === 'model2' ? generateModel2Html()
          : generateModel3Html();
      if (html) openPrint(html);
    };
    window.addEventListener('print-bulletin', handler);
    return () => window.removeEventListener('print-bulletin', handler);
  }, [bulletinTemplate, generalAppreciation]);

  // ── UI du modal ───────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(3px)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Imprimer le bulletin</h3>
            <p className="text-sm text-gray-500">{student.firstName} {student.lastName} — {classInfo?.name} — {trimLabel}</p>
          </div>
          <button onClick={() => setShowPrintPreview(false)} className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Résumé rapide */}
        <div className="px-5 py-4 bg-gray-50 border-b border-gray-100">
          <div className="grid grid-cols-4 gap-3 text-center">
            <div className="bg-white rounded-xl p-3 shadow-sm">
              <div className="text-2xl font-black text-blue-600">{fmtAvg(average)}</div>
              <div className="text-xs text-gray-400 uppercase font-semibold">Moyenne</div>
            </div>
            <div className="bg-white rounded-xl p-3 shadow-sm">
              <div className="text-2xl font-black text-indigo-600">{studentRank}/{classStudents.length}</div>
              <div className="text-xs text-gray-400 uppercase font-semibold">Rang</div>
            </div>
            <div className="bg-white rounded-xl p-3 shadow-sm">
              <div className="text-lg font-black" style={{ color: mention.color || '#2563eb' }}>{mention.text || 'N/A'}</div>
              <div className="text-xs text-gray-400 uppercase font-semibold">Mention</div>
            </div>
            <div className="bg-white rounded-xl p-3 shadow-sm">
              <div className="text-2xl font-black" style={{ color: trend ? trendColor : '#9ca3af' }}>{trend || '—'}</div>
              <div className="text-xs text-gray-400 uppercase font-semibold">Évolution</div>
            </div>
          </div>
        </div>

        {/* Appréciation générale */}
        <div className="px-5 pt-4">
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
            📝 Appréciation générale (optionnel)
          </label>
          <textarea
            value={generalAppreciation}
            onChange={e => setGeneralAppreciation(e.target.value)}
            placeholder="Ex: Bon trimestre, des efforts à poursuivre en mathématiques…"
            rows={2}
            className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none text-gray-700"
          />
        </div>

        {/* Choix du modèle */}
        <div className="p-5 space-y-3">
          <p className="text-sm font-semibold text-gray-700">Choisissez un modèle :</p>

          {/* Modèle 1 */}
          <div className="border-2 border-gray-200 rounded-xl p-4 hover:border-blue-400 hover:bg-blue-50 transition-all group">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center text-lg flex-shrink-0">📋</div>
              <div>
                <h4 className="font-bold text-gray-800 group-hover:text-blue-700 text-sm">Modèle Officiel</h4>
                <p className="text-xs text-gray-500">Style ministère · Tableau complet · Zone décision conseil · Signatures</p>
              </div>
            </div>
            <button
              onClick={() => { openPrint(generateModel1Html()); setShowPrintPreview(false); }}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 text-sm"
            >
              <Printer className="w-4 h-4" /> Imprimer ce modèle
            </button>
          </div>

          {/* Modèle 2 */}
          <div className="border-2 border-gray-200 rounded-xl p-4 hover:border-emerald-400 hover:bg-emerald-50 transition-all group">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center text-lg flex-shrink-0">📊</div>
              <div>
                <h4 className="font-bold text-gray-800 group-hover:text-emerald-700 text-sm">Modèle Moderne</h4>
                <p className="text-xs text-gray-500">Barres de progression · Repère moy. classe · Graphique SVG · Design épuré</p>
              </div>
            </div>
            <button
              onClick={() => { openPrint(generateModel2Html()); setShowPrintPreview(false); }}
              className="w-full bg-emerald-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2 text-sm"
            >
              <Printer className="w-4 h-4" /> Imprimer ce modèle
            </button>
          </div>

          {/* Modèle 3 */}
          <div className="border-2 border-gray-200 rounded-xl p-4 hover:border-purple-400 hover:bg-purple-50 transition-all group">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center text-lg flex-shrink-0">🏆</div>
              <div>
                <h4 className="font-bold text-gray-800 group-hover:text-purple-700 text-sm">Modèle Premium</h4>
                <p className="text-xs text-gray-500">Couverture gradient · Évolution 3T · Alerte si &lt;10 · Points forts/faibles auto</p>
              </div>
            </div>
            <button
              onClick={() => { openPrint(generateModel3Html()); setShowPrintPreview(false); }}
              className="w-full bg-purple-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-purple-700 transition-colors flex items-center justify-center gap-2 text-sm"
            >
              <Printer className="w-4 h-4" /> Imprimer ce modèle
            </button>
          </div>

          {/* Batch Print */}
          <div className="border-2 border-orange-200 bg-orange-50 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Users className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <h4 className="font-bold text-orange-800 text-sm">Imprimer toute la classe</h4>
                <p className="text-xs text-orange-600">{classStudents.length} bulletins générés · Modèle Officiel · 1 élève par page</p>
              </div>
            </div>
            <button
              onClick={openBatchPrint}
              disabled={isBatchLoading}
              className="w-full bg-orange-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-orange-600 transition-colors flex items-center justify-center gap-2 text-sm disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isBatchLoading
                ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" /> Génération en cours...</>
                : <><Printer className="w-4 h-4" /> Imprimer {classStudents.length} bulletins</>
              }
            </button>
          </div>
        </div>

        {/* Tip */}
        <div className="px-5 pb-5">
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-700">
            💡 Autorisez les pop-ups dans votre navigateur si la fenêtre d'impression ne s'ouvre pas.
          </div>
        </div>
      </div>
    </div>
  );
}