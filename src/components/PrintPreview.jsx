import React, { useState, useEffect } from 'react';
import { Printer, X, Users, ChevronDown } from 'lucide-react';

export default function PrintPreview({
  printStudent, setShowPrintPreview, selectedTrimester,
  calculateAverage, grades, subjects, classes, students,
  appColors, schoolLogo, schoolInfo, handlePrint, getMention,
  bulletinTemplate = 'model1'
}) {
  const [generalAppreciation, setGeneralAppreciation] = useState('');
  const [batchTemplate, setBatchTemplate] = useState('model1');
  const [isBatchLoading, setIsBatchLoading] = useState(false);

  if (!printStudent) return null;

  const student = printStudent;
  const average = parseFloat(calculateAverage(student.id, selectedTrimester)) || 0;
  const studentGrades = grades.filter(g => (g.studentId || g.student_id) === student.id && g.trimester === selectedTrimester);
  const classInfo = classes.find(c => c.id === (student.classId || student.class_id));
  const classStudents = students ? students.filter(s => (s.classId || s.class_id) === classInfo?.id) : [];
  const mention = getMention(average);

  const ranking = classStudents
    .map(s => ({ student: s, average: parseFloat(calculateAverage(s.id, selectedTrimester)) || 0 }))
    .sort((a, b) => b.average - a.average);
  const studentRank = ranking.findIndex(r => r.student.id === student.id) + 1 || '-';

  const classAverages = classStudents.map(s => parseFloat(calculateAverage(s.id, selectedTrimester)) || 0).filter(a => a > 0);
  const classAverage = classAverages.length ? classAverages.reduce((a, b) => a + b, 0) / classAverages.length : 0;
  const classMax = classAverages.length ? Math.max(...classAverages) : 0;
  const classMin = classAverages.length ? Math.min(...classAverages) : 0;

  const totalCoef = studentGrades.reduce((sum, g) => sum + (subjects.find(s => s.id === (g.subjectId || g.subject_id))?.coefficient || 0), 0);
  const totalPoints = studentGrades.reduce((sum, g) => {
    const coef = subjects.find(s => s.id === (g.subjectId || g.subject_id))?.coefficient || 0;
    return sum + ((g.value || 0) * coef);
  }, 0);

  const studentStatus = average >= 12 ? { text: 'ADMIS(E)', color: '#059669' }
    : average >= 8 ? { text: 'À SUIVRE', color: '#d97706' }
      : { text: 'EN DIFFICULTÉ', color: '#dc2626' };

  const schoolName = schoolInfo?.name || 'ÉTABLISSEMENT SCOLAIRE';
  const schoolAddr = schoolInfo?.address || '';
  const schoolPhone = schoolInfo?.phone || '';
  const schoolEmail = schoolInfo?.email || '';
  const trimLabel = `Trimestre ${selectedTrimester}`;
  const yearLabel = schoolInfo?.year || '2024-2025';

  // ── Champs personnalisables pays/ministère (issus de schoolInfo) ──────────
  const republic = schoolInfo?.republic || '';   // ex: "REPUBLIQUE TOGOLAISE"
  const countryMotto = schoolInfo?.countryMotto || '';   // ex: "Travail · Liberté · Patrie"
  const ministry = schoolInfo?.ministry || '';   // ex: "Ministère des Enseignements Primaire et Secondaire"
  const schoolDevise = schoolInfo?.devise || '';   // devise de l'école

  const fmtAvg = (v) => { const n = parseFloat(v); return isNaN(n) ? '-' : n.toFixed(2); };
  const gradeColor = (v) => v >= 15 ? '#059669' : v >= 10 ? '#2563eb' : v >= 8 ? '#d97706' : '#dc2626';
  const gradeLabel = (v) => v >= 16 ? 'Très Bien' : v >= 14 ? 'Bien' : v >= 12 ? 'Assez Bien' : v >= 10 ? 'Passable' : v >= 8 ? 'Insuffisant' : 'Très Insuffisant';

  const t1Avg = parseFloat(calculateAverage(student.id, '1')) || 0;
  const t2Avg = parseFloat(calculateAverage(student.id, '2')) || 0;
  const t3Avg = parseFloat(calculateAverage(student.id, '3')) || 0;

  const sortedGrades = [...studentGrades].filter(g => g.value != null).sort((a, b) => b.value - a.value);
  const half = Math.max(1, Math.floor(sortedGrades.length / 2));
  const strengths = sortedGrades.slice(0, Math.min(3, half)).map(g => ({ name: subjects.find(s => s.id === (g.subjectId || g.subject_id))?.name || '?', value: g.value }));
  const weaknesses = sortedGrades.slice(-Math.min(3, half)).reverse().map(g => ({ name: subjects.find(s => s.id === (g.subjectId || g.subject_id))?.name || '?', value: g.value }));

  const computeFinal = (g) => {
    if (!g) return null;
    if (g.value != null) return Math.min(20, g.value + (g.bonus || 0));
    const parts = [g.interro, g.devoir, g.composition].filter(v => v != null);
    if (!parts.length) return null;
    return Math.min(20, (parts.reduce((a, b) => a + b, 0) / parts.length) + (g.bonus || 0));
  };

  const openPrint = (html) => {
    const win = window.open('', '_blank', 'width=960,height=800');
    if (!win) { alert('Autorisez les pop-ups pour imprimer.'); return; }
    win.document.write(html);
    win.document.close();
    setTimeout(() => { win.print(); setTimeout(() => win.close(), 600); }, 450);
  };

  // ── En-tête officiel pays/ministère (commun aux 3 modèles) ───────────────
  // Inséré au tout début de chaque bulletin HTML si les champs sont renseignés
  const officialTopBar = () => {
    if (!republic && !ministry) return '';
    return `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;font-size:7pt;line-height:1.45;border-bottom:1px solid #bfdbfe;padding-bottom:5px;margin-bottom:6px;">
        <div>
          ${republic ? `<div style="font-weight:800;text-transform:uppercase;color:#1e3a5f;letter-spacing:.4px;">${republic}</div>` : ''}
          ${countryMotto ? `<div style="font-style:italic;color:#374151;">${countryMotto}</div>` : ''}
          ${ministry ? `<div style="font-weight:600;color:#374151;">${ministry}</div>` : ''}
        </div>
        <div style="text-align:right;">
          ${schoolDevise ? `<div style="font-style:italic;color:#1e40af;font-weight:600;">"${schoolDevise}"</div>` : ''}
        </div>
      </div>`;
  };

  // ── QR Code élève (API gratuite) ──────────────────────────────────────────
  const qrCodeImg = (s, avg, rank, total) => {
    const data = `${s.firstName} ${s.lastName} | ${classInfo?.name || ''} | Rang:${rank}/${total} | Moy:${fmtAvg(avg)}/20 | ${trimLabel} ${yearLabel}`;
    const url = `https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent(data)}&color=1e3a5f`;
    return `<img src="${url}" width="80" height="80" alt="QR" style="display:block;">`;
  };

  // ── Signature numérique (inchangée) ──────────────────────────────────────
  const digitalSigBox = (title, name, role = '') => `
    <div style="border:1.5px solid #cbd5e1;border-radius:10px;padding:8px 10px;background:#f8fafc;min-height:80px;display:flex;flex-direction:column;justify-content:space-between;">
      <div style="font-size:7pt;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px;">${title}</div>
      <div style="flex:1;display:flex;align-items:center;justify-content:center;">
        <div style="text-align:center;">
          ${name
      ? `<div style="font-family:'Brush Script MT','Segoe Script',cursive;font-size:13pt;color:#1e3a5f;line-height:1.1;border-bottom:1.5px solid #94a3b8;padding-bottom:3px;min-width:110px;">${name}</div>
         <div style="font-size:7pt;color:#64748b;margin-top:3px;">${role ? role + ' — ' : ''}${new Date().toLocaleDateString('fr-FR')}</div>
         <div style="margin-top:4px;display:inline-block;background:#dbeafe;color:#1d4ed8;font-size:6pt;font-weight:700;padding:1px 6px;border-radius:20px;">✓ Signé numériquement</div>`
      : `<div style="font-size:7.5pt;color:#cbd5e1;font-style:italic;">En attente de signature</div>`}
        </div>
      </div>
    </div>`;

  // ════════════════════════════════════════════════════════════════════════════
  // MODÈLE 1 — OFFICIEL (design original préservé + améliorations)
  // ════════════════════════════════════════════════════════════════════════════
  const generateModel1Html = (s = student, sGrades = studentGrades, sAvg = average, sRank = studentRank, sStatus = studentStatus, sMention = mention, sTotalCoef = totalCoef, sTotalPts = totalPoints) => {
    const directorName = schoolInfo?.directorName || schoolInfo?.director || '';
    const principalTeacher = schoolInfo?.principalTeacher || '';

    const rows = sGrades.map(g => {
      const subj = subjects.find(sub => sub.id === (g.subjectId || g.subject_id));
      const coef = subj?.coefficient || 1;
      const finalVal = computeFinal(g);
      const color = finalVal != null ? gradeColor(finalVal) : '#374151';
      const interro = g.interro != null ? g.interro.toFixed(2) : '—';
      const devoir = g.devoir != null ? g.devoir.toFixed(2) : '—';
      const compo = g.composition != null ? g.composition.toFixed(2) : '—';
      const bonus = g.bonus != null && g.bonus > 0 ? `+${g.bonus.toFixed(2)}` : '—';
      const teacherName = g.teacherName || subj?.teacher || '';
      const sigCell = teacherName
        ? `<div style="font-family:'Brush Script MT',cursive;font-size:9pt;color:#1e3a5f;">${teacherName}</div>
           <div style="font-size:6pt;color:#2563eb;">✓ Signé</div>`
        : `<span style="color:#d1d5db;font-size:7pt;">—</span>`;
      return `
        <tr>
          <td class="subj-name">${subj?.name || 'N/A'}<br>
            <span style="font-size:6.5pt;color:#94a3b8;font-weight:400;">${teacherName}</span></td>
          <td class="center">${coef}</td>
          <td class="center sub-note">${interro}</td>
          <td class="center sub-note">${devoir}</td>
          <td class="center sub-note">${compo}</td>
          <td class="center sub-note bonus">${bonus}</td>
          <td class="center" style="color:${color};font-weight:800;font-size:10.5pt;">${finalVal != null ? finalVal.toFixed(2) : '—'}</td>
          <td class="center" style="color:${color};font-size:8.5pt;">${finalVal != null ? (finalVal * coef).toFixed(2) : '—'}</td>
          <td class="appreciate">${g.appreciation || ''}</td>
          <td class="center sig-cell">${sigCell}</td>
        </tr>`;
    }).join('');

    return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
<title>Bulletin – ${s.firstName} ${s.lastName}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  /* @page margin:0 masque l'URL et le titre du navigateur lors de l'impression */
  @page { size: A4 portrait; margin: 0; }
  body { font-family: 'Times New Roman', serif; font-size: 9.5pt; color: #111; background: #fff;
         padding: 9mm 10mm 6mm; width: 210mm; min-height: 297mm; }
  @media print { body { padding: 9mm 10mm 6mm; } }
  .header { display: flex; justify-content: space-between; align-items: center;
            border-bottom: 3px double #1e40af; padding-bottom: 7px; margin-bottom: 8px; gap: 8px; }
  .header-left { font-size: 8.5pt; line-height: 1.5; }
  .header-center { text-align: center; flex: 1; }
  .header-center h1 { font-size: 13pt; color: #1e40af; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 1px; }
  .header-center h2 { font-size: 9.5pt; color: #374151; }
  .header-center .devise { font-size: 8pt; color: #1e40af; font-style: italic; margin-top: 2px; }
  .header-right { text-align: right; font-size: 8.5pt; line-height: 1.5; }
  .logo { width: 60px; height: 60px; object-fit: contain; }
  .logo-placeholder { width: 60px; height: 60px; border: 2px solid #1e40af; display: flex; align-items: center; justify-content: center; font-size: 7pt; color: #1e40af; text-align: center; }
  .bulletin-title { background: #1e40af; color: white; text-align: center; padding: 4px; font-size: 11pt; font-weight: bold; letter-spacing: 2px; margin: 7px 0; text-transform: uppercase; }
  .student-box { border: 2px solid #1e40af; padding: 6px 10px; margin-bottom: 8px; display: flex; gap: 8px; align-items: center; }
  .student-fields { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px; flex: 1; }
  .info-row { font-size: 9pt; }
  .info-label { font-weight: bold; color: #1e40af; font-size: 7pt; text-transform: uppercase; }
  .info-value { border-bottom: 1px solid #9ca3af; padding-bottom: 1px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 8px; font-size: 8.5pt; }
  thead tr { background: #1e40af; color: white; }
  th { padding: 4px 5px; text-align: center; font-weight: bold; font-size: 7.5pt; }
  th.left { text-align: left; }
  td { padding: 3px 5px; border-bottom: 1px solid #e5e7eb; vertical-align: middle; }
  tr:nth-child(even) td { background: #f8fafc; }
  .subj-name { font-weight: 600; min-width: 90px; }
  .center { text-align: center; }
  .sub-note { font-size: 8pt; color: #6b7280; background: #f9fafb; }
  .bonus { color: #059669; font-weight: 700; }
  .appreciate { font-style: italic; font-size: 7.5pt; color: #4b5563; max-width: 100px; }
  .sig-cell { min-width: 65px; }
  .results-band { display: grid; grid-template-columns: repeat(5, 1fr); border: 2px solid #1e40af; margin-bottom: 8px; }
  .result-cell { padding: 6px 4px; text-align: center; border-right: 1px solid #1e40af; }
  .result-cell:last-child { border-right: none; }
  .result-label { font-size: 6.5pt; text-transform: uppercase; color: #6b7280; font-weight: bold; }
  .result-value { font-size: 12pt; font-weight: bold; color: #1e40af; margin-top: 1px; }
  .council-box { border: 1.5px solid #1e40af; border-radius: 6px; padding: 7px 12px; margin-bottom: 8px; background: #f8faff; }
  .signatures { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-top: 8px; }
  .footer { text-align: center; font-size: 7pt; color: #9ca3af; margin-top: 8px; border-top: 1px solid #e5e7eb; padding-top: 4px; }
</style></head><body>

  ${officialTopBar()}

  <div class="header">
    <div class="header-left">
      ${schoolLogo ? `<img src="${schoolLogo}" class="logo" alt="Logo">` : `<div class="logo-placeholder">LOGO</div>`}
    </div>
    <div class="header-center">
      <h1>${schoolName}</h1>
      <h2>${schoolAddr}</h2>
      <p style="font-size:8pt;color:#6b7280;">${schoolPhone}${schoolEmail ? ' | ' + schoolEmail : ''}</p>
      ${schoolDevise ? `<p class="devise">"${schoolDevise}"</p>` : ''}
    </div>
    <div class="header-right">
      <p><strong>Année scolaire</strong><br>${yearLabel}</p>
    </div>
  </div>

  <div class="bulletin-title">Bulletin Scolaire &mdash; ${trimLabel}</div>

  <div class="student-box">
    <div class="student-fields">
      <div class="info-row"><div class="info-label">Nom</div><div class="info-value">${s.lastName?.toUpperCase()}</div></div>
      <div class="info-row"><div class="info-label">Prénom</div><div class="info-value">${s.firstName}</div></div>
      <div class="info-row"><div class="info-label">Classe</div><div class="info-value">${classInfo?.name || 'N/A'}</div></div>
      <div class="info-row"><div class="info-label">Effectif</div><div class="info-value">${classStudents.length} élèves</div></div>
      <div class="info-row"><div class="info-label">Rang</div><div class="info-value">${sRank} / ${classStudents.length}</div></div>
      <div class="info-row"><div class="info-label">Trimestre</div><div class="info-value">${trimLabel}</div></div>
    </div>
    <div style="flex-shrink:0;">${qrCodeImg(s, sAvg, sRank, classStudents.length)}</div>
  </div>

  <table>
    <thead>
      <tr>
        <th class="left" style="min-width:95px;">Matière / Professeur</th>
        <th style="width:32px;">Coef.</th>
        <th style="width:40px;">Interro</th>
        <th style="width:40px;">Devoir</th>
        <th style="width:40px;">Compo</th>
        <th style="width:38px;">Bonus</th>
        <th style="width:48px;">Note /20</th>
        <th style="width:48px;">Total pts</th>
        <th class="left">Appréciation du prof</th>
        <th style="width:72px;">Signature</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
      <tr style="background:#1e3a5f !important;">
        <td colspan="6" style="font-weight:bold;color:white;font-size:9pt;">TOTAL GÉNÉRAL</td>
        <td class="center" style="font-weight:bold;color:white;font-size:11pt;">${fmtAvg(sAvg)}/20</td>
        <td class="center" style="color:white;font-size:8.5pt;">${sTotalPts.toFixed(2)}</td>
        <td style="color:rgba(255,255,255,.7);font-size:7.5pt;">Coeff.: ${sTotalCoef}</td>
        <td></td>
      </tr>
    </tbody>
  </table>

  <div class="results-band">
    <div class="result-cell"><div class="result-label">Moy. générale</div><div class="result-value">${fmtAvg(sAvg)}<span style="font-size:8pt;">/20</span></div></div>
    <div class="result-cell"><div class="result-label">Moy. classe</div><div class="result-value" style="font-size:11pt;">${fmtAvg(classAverage)}</div></div>
    <div class="result-cell"><div class="result-label">Rang</div><div class="result-value">${sRank}<span style="font-size:8pt;">/${classStudents.length}</span></div></div>
    <div class="result-cell"><div class="result-label">Mention</div><div class="result-value" style="font-size:9.5pt;color:${sMention.color || '#1e40af'};">${sMention.text}</div></div>
    <div class="result-cell"><div class="result-label">Décision</div><div class="result-value" style="font-size:9.5pt;color:${sStatus.color};">${sStatus.text}</div></div>
  </div>

  <div class="council-box">
    <div style="font-size:7.5pt;font-weight:700;color:#1e40af;text-transform:uppercase;margin-bottom:5px;">Appréciation du conseil de classe / Prof. principal</div>
    <div style="font-family:'Brush Script MT',cursive;font-size:12pt;color:#1e3a5f;min-height:22px;border-bottom:1px solid #cbd5e1;padding-bottom:3px;">
      ${generalAppreciation || principalTeacher || ''}
    </div>
    ${principalTeacher ? `<div style="font-size:6.5pt;color:#2563eb;margin-top:3px;">✓ ${principalTeacher} — ${new Date().toLocaleDateString('fr-FR')}</div>` : ''}
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
  // MODÈLE 2 — MODERNE (design original préservé + améliorations)
  // ════════════════════════════════════════════════════════════════════════════
  const generateModel2Html = (s = student, sGrades = studentGrades, sAvg = average, sRank = studentRank, sStatus = studentStatus, sMention = mention, sTotalCoef = totalCoef) => {
    const directorName = schoolInfo?.directorName || schoolInfo?.director || '';
    const principalTeacher = schoolInfo?.principalTeacher || '';

    const rows = sGrades.map(g => {
      const subj = subjects.find(sub => sub.id === (g.subjectId || g.subject_id));
      const coef = subj?.coefficient || 1;
      const finalVal = computeFinal(g);
      const pct = finalVal != null ? (finalVal / 20) * 100 : 0;
      const color = finalVal != null ? gradeColor(finalVal) : '#9ca3af';
      const lbl = finalVal != null ? gradeLabel(finalVal) : '';
      const teacherName = g.teacherName || subj?.teacher || '';
      const interro = g.interro != null ? g.interro.toFixed(2) : '—';
      const devoir = g.devoir != null ? g.devoir.toFixed(2) : '—';
      const compo = g.composition != null ? g.composition.toFixed(2) : '—';
      const bonus = g.bonus != null && g.bonus > 0 ? `<span style="color:#059669;font-weight:700;">+${g.bonus.toFixed(2)}</span>` : '';
      return `
        <div class="grade-row">
          <div class="grade-left">
            <div>
              <span class="grade-subject">${subj?.name || 'N/A'}</span>
              <span class="grade-coef">×${coef}</span>
              ${teacherName ? `<div style="font-size:6.5pt;color:#94a3b8;margin-top:1px;">${teacherName}</div>` : ''}
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:4px;font-size:7pt;color:#64748b;width:120px;flex-shrink:0;">
            <span style="background:#f1f5f9;border-radius:3px;padding:1px 4px;">I:${interro}</span>
            <span style="background:#f1f5f9;border-radius:3px;padding:1px 4px;">D:${devoir}</span>
            <span style="background:#f1f5f9;border-radius:3px;padding:1px 4px;">C:${compo}</span>
            ${bonus}
          </div>
          <div class="grade-bar-wrap">
            <div class="grade-bar" style="width:${pct}%;background:${color};"></div>
          </div>
          <div class="grade-right">
            <span class="grade-value" style="color:${color};">${finalVal != null ? finalVal.toFixed(2) : '—'}</span>
            <span class="grade-lbl" style="color:${color};">${lbl}</span>
          </div>
          <div style="width:82px;text-align:center;flex-shrink:0;font-size:7.5pt;">
            ${teacherName
          ? `<div style="font-family:'Brush Script MT',cursive;font-size:9pt;color:#1e3a5f;">${teacherName}</div>
             <div style="font-size:5.5pt;color:#2563eb;">✓ Signé</div>`
          : `<span style="font-size:6.5pt;color:#d1d5db;">—</span>`}
          </div>
          <div style="width:80px;font-size:7pt;color:#475569;font-style:italic;flex-shrink:0;">${g.appreciation || ''}</div>
        </div>`;
    }).join('');

    const svgBars = sGrades.slice(0, 8).map((g, i) => {
      const subj = subjects.find(s => s.id === (g.subjectId || g.subject_id));
      const val = computeFinal(g) ?? 0;
      const h = (val / 20) * 110;
      const x = 20 + i * 36;
      const y = 130 - h;
      const color = gradeColor(val);
      const name = (subj?.name || '?').slice(0, 4);
      return `<rect x="${x}" y="${y}" width="22" height="${h}" fill="${color}" rx="3"/>
        <text x="${x + 11}" y="143" text-anchor="middle" font-size="6.5" fill="#6b7280">${name}</text>
        <text x="${x + 11}" y="${y - 3}" text-anchor="middle" font-size="7.5" fill="${color}" font-weight="bold">${val.toFixed(0)}</text>`;
    }).join('');

    const classLine = `<line x1="15" y1="${130 - (classAverage / 20) * 110}" x2="${20 + Math.min(sGrades.length, 8) * 36}" y2="${130 - (classAverage / 20) * 110}" stroke="#94a3b8" stroke-dasharray="4,3" stroke-width="1.5"/>`;

    return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
<title>Bulletin – ${s.firstName} ${s.lastName}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  @page { size: A4 portrait; margin: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; background: #fff; color: #1e293b; font-size: 9pt; }
  .page { width: 210mm; min-height: 297mm; background: white; padding: 0 0 8mm; }
  @media print { .page { padding-bottom: 0; } }
  .official-top { font-size: 6.5pt; padding: 4px 20px; border-bottom: 1px solid #bfdbfe; display: flex; justify-content: space-between; color: #374151; }
  .top-banner { background: linear-gradient(135deg,#1e40af 0%,#3b82f6 50%,#06b6d4 100%); color:white; padding: 14px 20px 12px; }
  .top-row { display: flex; justify-content: space-between; align-items: center; }
  .school-name { font-size: 15pt; font-weight: 700; letter-spacing: .5px; }
  .school-sub  { font-size: 8pt; opacity: .85; margin-top: 1px; }
  .school-devise-m2 { font-size: 7.5pt; opacity: .8; font-style: italic; margin-top: 2px; }
  .trimestre-badge { background: rgba(255,255,255,.2); border: 1px solid rgba(255,255,255,.4); padding: 5px 12px; border-radius: 20px; font-weight: 600; font-size: 9pt; }
  .logo-img { width: 52px; height: 52px; object-fit: contain; border-radius: 8px; background: white; padding: 3px; }
  .student-card { display: flex; align-items: center; gap: 14px; background: white; margin: 0 16px; margin-top: -16px; border-radius: 10px; padding: 10px 16px; box-shadow: 0 4px 14px rgba(0,0,0,.12); }
  .student-avatar { width: 44px; height: 44px; background: linear-gradient(135deg,#3b82f6,#06b6d4); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 14pt; font-weight: 700; flex-shrink: 0; }
  .student-name { font-size: 12pt; font-weight: 700; color: #1e293b; }
  .student-meta { font-size: 8pt; color: #64748b; margin-top: 1px; }
  .student-stats { display: flex; gap: 10px; margin-left: auto; align-items: center; }
  .stat-pill { text-align: center; background: #f1f5f9; padding: 6px 12px; border-radius: 8px; }
  .stat-val { font-size: 12pt; font-weight: 800; color: #1e40af; }
  .stat-lbl { font-size: 6.5pt; color: #94a3b8; text-transform: uppercase; font-weight: 600; }
  .mention-bar { margin: 10px 16px 8px; background: ${sMention.color || '#2563eb'}18; border-left: 5px solid ${sMention.color || '#2563eb'}; border-radius: 0 6px 6px 0; padding: 8px 14px; display: flex; justify-content: space-between; align-items: center; }
  .mention-text { font-size: 11pt; font-weight: 700; color: ${sMention.color || '#2563eb'}; }
  .decision-badge { background: ${sStatus.color}18; color: ${sStatus.color}; border: 1.5px solid ${sStatus.color}; padding: 3px 12px; border-radius: 20px; font-size: 8.5pt; font-weight: 700; }
  .section { margin: 0 16px 10px; }
  .section-title { font-size: 9pt; font-weight: 700; text-transform: uppercase; color: #94a3b8; letter-spacing: 1px; margin-bottom: 7px; }
  .grade-row { display: flex; align-items: center; gap: 8px; padding: 5px 0; border-bottom: 1px solid #f1f5f9; }
  .grade-left { width: 150px; display: flex; align-items: flex-start; gap: 5px; flex-shrink: 0; }
  .grade-subject { font-weight: 600; font-size: 9pt; }
  .grade-coef { font-size: 7.5pt; color: #94a3b8; }
  .grade-bar-wrap { flex: 1; height: 9px; background: #f1f5f9; border-radius: 4px; overflow: hidden; }
  .grade-bar { height: 100%; border-radius: 4px; }
  .grade-right { width: 85px; display: flex; align-items: center; gap: 5px; justify-content: flex-end; }
  .grade-value { font-size: 11pt; font-weight: 800; }
  .grade-lbl { font-size: 7pt; }
  .graph-section { margin: 0 16px 10px; background: #f8fafc; border-radius: 8px; padding: 10px; }
  .class-stats { display: grid; grid-template-columns: repeat(4,1fr); gap: 8px; margin: 0 16px 10px; }
  .cstat { background: #f8fafc; border-radius: 7px; padding: 8px; text-align: center; }
  .cstat-val { font-size: 12pt; font-weight: 800; color: #1e40af; }
  .cstat-lbl { font-size: 6.5pt; color: #94a3b8; text-transform: uppercase; }
  .sigs { display: grid; grid-template-columns: repeat(3,1fr); gap: 8px; margin: 0 16px 12px; }
  .footer { background: #f1f5f9; padding: 6px 16px; font-size: 7pt; color: #94a3b8; display: flex; justify-content: space-between; }
</style></head><body><div class="page">

  <div class="official-top">
    <div>
      ${republic ? `<span style="font-weight:800;text-transform:uppercase;color:#1e3a5f;">${republic}</span>` : ''}
      ${countryMotto ? `<span style="font-style:italic;margin-left:6px;">${countryMotto}</span>` : ''}
      ${ministry ? `<span style="font-weight:600;margin-left:8px;">| ${ministry}</span>` : ''}
    </div>
    <div style="font-style:italic;color:#1e40af;">${schoolDevise ? `"${schoolDevise}"` : ''}</div>
  </div>

  <div class="top-banner">
    <div class="top-row">
      <div>
        <div class="school-name">${schoolName}</div>
        <div class="school-sub">${schoolAddr}${schoolPhone ? ' | ' + schoolPhone : ''}</div>
        ${schoolDevise ? `<div class="school-devise-m2">"${schoolDevise}"</div>` : ''}
      </div>
      ${schoolLogo ? `<img src="${schoolLogo}" class="logo-img" alt="Logo">` : ''}
      <div class="trimestre-badge">${trimLabel} &mdash; ${yearLabel}</div>
    </div>
  </div>

  <div class="student-card">
    <div class="student-avatar">${(s.firstName || '?')[0]}${(s.lastName || '?')[0]}</div>
    <div>
      <div class="student-name">${s.firstName} ${s.lastName?.toUpperCase()}</div>
      <div class="student-meta">Classe: <strong>${classInfo?.name || 'N/A'}</strong> &nbsp;|&nbsp; Effectif: <strong>${classStudents.length}</strong> &nbsp;|&nbsp; ${yearLabel}</div>
    </div>
    <div class="student-stats">
      <div class="stat-pill"><div class="stat-val">${fmtAvg(sAvg)}</div><div class="stat-lbl">Moyenne</div></div>
      <div class="stat-pill"><div class="stat-val">${sRank}</div><div class="stat-lbl">Rang</div></div>
      ${qrCodeImg(s, sAvg, sRank, classStudents.length)}
    </div>
  </div>

  <div class="mention-bar">
    <div>
      <div style="font-size:7.5pt;color:#64748b;text-transform:uppercase;font-weight:700;margin-bottom:1px;">Mention</div>
      <div class="mention-text">${sMention.text || 'N/A'}</div>
    </div>
    <div class="decision-badge">${sStatus.text}</div>
  </div>

  <div class="class-stats">
    <div class="cstat"><div class="cstat-val">${fmtAvg(classAverage)}</div><div class="cstat-lbl">Moy. classe</div></div>
    <div class="cstat"><div class="cstat-val">${fmtAvg(classMax)}</div><div class="cstat-lbl">Meilleure</div></div>
    <div class="cstat"><div class="cstat-val">${fmtAvg(classMin)}</div><div class="cstat-lbl">Plus basse</div></div>
    <div class="cstat"><div class="cstat-val">${sTotalCoef}</div><div class="cstat-lbl">Total coeff.</div></div>
  </div>

  <div class="section">
    <div class="section-title">Résultats par matière</div>
    ${rows}
  </div>

  ${sGrades.length > 0 ? `
  <div class="graph-section">
    <div class="section-title" style="margin-bottom:6px;">Visualisation des notes</div>
    <svg width="100%" height="158" viewBox="0 0 ${Math.max(320, 20 + sGrades.slice(0, 8).length * 36 + 30)} 158">
      ${[0, 5, 10, 15, 20].map(v => `<line x1="15" y1="${130 - (v / 20) * 110}" x2="${20 + Math.min(sGrades.length, 8) * 36}" y2="${130 - (v / 20) * 110}" stroke="#e2e8f0" stroke-width="1"/>
        <text x="10" y="${134 - (v / 20) * 110}" text-anchor="end" font-size="6.5" fill="#94a3b8">${v}</text>`).join('')}
      ${svgBars}${classLine}
    </svg>
    <p style="font-size:6.5pt;color:#94a3b8;margin-top:3px;">— Ligne pointillée = moyenne de classe (${fmtAvg(classAverage)})</p>
  </div>` : ''}

  ${generalAppreciation ? `
  <div style="margin:0 16px 10px;border:1.5px solid #3b82f6;border-radius:8px;padding:8px 14px;background:#eff6ff;">
    <div style="font-size:7.5pt;font-weight:700;color:#1d4ed8;text-transform:uppercase;margin-bottom:5px;">Appréciation du conseil de classe</div>
    <div style="font-size:10pt;color:#1e3a5f;">${generalAppreciation}</div>
  </div>` : ''}

  <div class="sigs">
    ${digitalSigBox('Signature du Directeur', directorName, 'Directeur')}
    ${digitalSigBox('Visa du Prof. Principal', principalTeacher, 'Prof. Principal')}
    ${digitalSigBox('Signature des Parents / Tuteur', '', '')}
  </div>

  <div class="footer">
    <span>${schoolName} — Bulletin scolaire</span>
    <span>${yearLabel} — ${trimLabel}</span>
    <span>Édité le ${new Date().toLocaleDateString('fr-FR')}</span>
  </div>
</div></body></html>`;
  };

  // ════════════════════════════════════════════════════════════════════════════
  // MODÈLE 3 — PREMIUM (design original préservé + améliorations)
  // ════════════════════════════════════════════════════════════════════════════
  const generateModel3Html = (s = student, sGrades = studentGrades, sAvg = average, sRank = studentRank, sStatus = studentStatus, sMention = mention, sTotalCoef = totalCoef, sTotalPts = totalPoints) => {
    const directorName = schoolInfo?.directorName || schoolInfo?.director || '';
    const principalTeacher = schoolInfo?.principalTeacher || '';

    const sT1 = parseFloat(calculateAverage(s.id, '1')) || 0;
    const sT2 = parseFloat(calculateAverage(s.id, '2')) || 0;
    const sT3 = parseFloat(calculateAverage(s.id, '3')) || 0;
    const sSorted = [...sGrades].filter(g => g.value != null).sort((a, b) => b.value - a.value);
    const sHalf = Math.max(1, Math.floor(sSorted.length / 2));
    const sStr = sSorted.slice(0, Math.min(3, sHalf)).map(g => ({ name: subjects.find(sub => sub.id === (g.subjectId || g.subject_id))?.name || '?', value: g.value }));
    const sWeak = sSorted.slice(-Math.min(3, sHalf)).reverse().map(g => ({ name: subjects.find(sub => sub.id === (g.subjectId || g.subject_id))?.name || '?', value: g.value }));

    const rows = sGrades.map(g => {
      const subj = subjects.find(sub => sub.id === (g.subjectId || g.subject_id));
      const coef = subj?.coefficient || 1;
      const finalVal = computeFinal(g);
      const color = finalVal != null ? gradeColor(finalVal) : '#9ca3af';
      const lbl = finalVal != null ? gradeLabel(finalVal) : '-';
      const pct = finalVal != null ? (finalVal / 20) * 100 : 0;
      const interro = g.interro != null ? g.interro.toFixed(2) : '—';
      const devoir = g.devoir != null ? g.devoir.toFixed(2) : '—';
      const compo = g.composition != null ? g.composition.toFixed(2) : '—';
      const bonus = g.bonus != null && g.bonus > 0 ? `+${g.bonus.toFixed(2)}` : '—';
      const teacherName = g.teacherName || subj?.teacher || '';
      const cAvgs = classStudents.map(st => {
        const sg = grades.find(gg => (gg.studentId || gg.student_id) === st.id && (gg.subjectId || gg.subject_id) === (g.subjectId || g.subject_id) && gg.trimester === selectedTrimester);
        return computeFinal(sg) || 0;
      }).filter(v => v > 0);
      const subjClsAvg = cAvgs.length ? cAvgs.reduce((a, b) => a + b, 0) / cAvgs.length : 0;
      return `
        <tr>
          <td class="subj-name">${subj?.name || 'N/A'}<br><span style="font-size:6.5pt;color:#94a3b8;">${teacherName}</span></td>
          <td class="center"><span class="coef-badge">${coef}</span></td>
          <td class="center" style="font-size:7.5pt;color:#64748b;">
            <div style="display:flex;gap:2px;justify-content:center;flex-wrap:wrap;">
              <span style="background:#f1f5f9;border-radius:3px;padding:1px 4px;">I:${interro}</span>
              <span style="background:#f1f5f9;border-radius:3px;padding:1px 4px;">D:${devoir}</span>
              <span style="background:#f1f5f9;border-radius:3px;padding:1px 4px;">C:${compo}</span>
              <span style="background:#d1fae5;border-radius:3px;padding:1px 4px;color:#059669;font-weight:700;">B:${bonus}</span>
            </div>
          </td>
          <td class="center">
            <div style="display:flex;align-items:center;gap:5px;">
              <div style="flex:1;height:7px;background:#f1f5f9;border-radius:3px;overflow:hidden;">
                <div style="width:${pct}%;height:100%;background:${color};border-radius:3px;"></div>
              </div>
              <span style="color:${color};font-weight:800;font-size:10.5pt;min-width:34px;">${finalVal != null ? finalVal.toFixed(2) : '—'}</span>
            </div>
          </td>
          <td class="center" style="font-size:7.5pt;color:#64748b;">${subjClsAvg > 0 ? subjClsAvg.toFixed(2) : '—'}</td>
          <td><span style="color:${color};font-size:7.5pt;font-style:italic;">${lbl}</span></td>
          <td style="font-size:7pt;color:#475569;font-style:italic;">${g.appreciation || ''}</td>
          <td class="center" style="font-size:7.5pt;">
            ${teacherName
          ? `<div style="font-family:'Brush Script MT',cursive;font-size:8.5pt;color:#1e3a5f;">${teacherName}</div>
             <div style="font-size:5.5pt;color:#2563eb;">✓ Signé</div>`
          : `<span style="color:#d1d5db;">—</span>`}
          </td>
        </tr>`;
    }).join('');

    const evol = [[1, sT1], [2, sT2], [3, sT3]].filter(([, v]) => v > 0);
    const evolSvg = evol.length > 1 ? `
      <svg width="270" height="75" viewBox="0 0 270 75">
        ${[0, 10, 20].map(v => `<line x1="28" y1="${60 - (v / 20) * 50}" x2="260" y2="${60 - (v / 20) * 50}" stroke="#f1f5f9" stroke-width="1"/>
          <text x="22" y="${64 - (v / 20) * 50}" text-anchor="end" font-size="6.5" fill="#94a3b8">${v}</text>`).join('')}
        <polyline points="${evol.map(([t, v]) => `${28 + (t - 1) * 115},${60 - (v / 20) * 50}`).join(' ')}" fill="none" stroke="#3b82f6" stroke-width="2.5" stroke-linejoin="round"/>
        ${evol.map(([t, v]) => `
          <circle cx="${28 + (t - 1) * 115}" cy="${60 - (v / 20) * 50}" r="4.5" fill="#3b82f6"/>
          <text x="${28 + (t - 1) * 115}" y="${60 - (v / 20) * 50 - 7}" text-anchor="middle" font-size="8" fill="#1e40af" font-weight="bold">${v.toFixed(2)}</text>
          <text x="${28 + (t - 1) * 115}" y="72" text-anchor="middle" font-size="7" fill="#64748b">T${t}</text>`).join('')}
      </svg>` : '<p style="color:#94a3b8;font-size:8pt;">Données insuffisantes</p>';

    return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
<title>Bulletin Premium – ${s.firstName} ${s.lastName}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  @page { size: A4 portrait; margin: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; background: #fff; color: #1e293b; font-size: 9pt; }
  .page { width: 210mm; background: white; }
  .official-top { font-size: 6.5pt; padding: 4px 18px; background: #f8fafc; display: flex; justify-content: space-between; color: #374151; border-bottom: 1px solid #e2e8f0; }
  .cover { background: linear-gradient(160deg,#0f172a 0%,#1e3a8a 60%,#1e40af 100%); padding: 16px 20px 12px; color: white; position: relative; overflow: hidden; }
  .cover::before { content:''; position:absolute; right:-40px; top:-40px; width:180px; height:180px; background:rgba(255,255,255,.04); border-radius:50%; }
  .cover-row { display: flex; justify-content: space-between; align-items: flex-start; }
  .cover-left { flex: 1; }
  .school-name { font-size: 14pt; font-weight: 800; letter-spacing: .5px; margin-bottom: 1px; }
  .school-info { font-size: 7.5pt; opacity: .7; line-height: 1.5; }
  .school-devise-m3 { font-size: 8pt; opacity: .85; font-style: italic; margin-top: 2px; }
  .cover-badge { background: rgba(255,255,255,.12); border: 1px solid rgba(255,255,255,.25); border-radius: 8px; padding: 8px 14px; text-align: center; }
  .cover-badge-year { font-size: 7.5pt; opacity: .7; }
  .cover-badge-trim { font-size: 11pt; font-weight: 800; margin: 1px 0; }
  .logo-img { width: 50px; height: 50px; object-fit: contain; border-radius: 6px; background: white; padding: 3px; }
  .student-banner { background: #f8fafc; border-left: 6px solid #2563eb; padding: 9px 16px; display: flex; justify-content: space-between; align-items: center; }
  .student-fullname { font-size: 13pt; font-weight: 800; color: #0f172a; }
  .student-class { font-size: 8.5pt; color: #64748b; margin-top: 1px; }
  .avg-display { text-align: center; background: #1e40af; color: white; padding: 8px 16px; border-radius: 8px; }
  .avg-num { font-size: 18pt; font-weight: 900; line-height: 1; }
  .avg-label { font-size: 7pt; opacity: .8; }
  .kpis { display: grid; grid-template-columns: repeat(5,1fr); border: 1.5px solid #e2e8f0; }
  .kpi { padding: 7px; text-align: center; border-right: 1px solid #e2e8f0; }
  .kpi:last-child { border-right: none; }
  .kpi-val { font-size: 11pt; font-weight: 800; color: #1e40af; }
  .kpi-lbl { font-size: 6.5pt; color: #94a3b8; text-transform: uppercase; font-weight: 600; margin-top: 1px; }
  .body-grid { display: grid; grid-template-columns: 3fr 1.5fr; padding: 10px 14px; gap: 12px; }
  table { width: 100%; border-collapse: collapse; font-size: 8.5pt; }
  thead tr { background: #0f172a; color: white; }
  th { padding: 5px 6px; font-size: 7.5pt; text-align: left; font-weight: 600; }
  th.center { text-align: center; }
  td { padding: 4px 5px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
  .subj-name { font-weight: 700; }
  .center { text-align: center; }
  .coef-badge { background: #e0e7ff; color: #3730a3; padding: 1px 5px; border-radius: 8px; font-size: 7.5pt; font-weight: 700; }
  .total-row td { background: #0f172a !important; color: white; font-weight: 700; }
  .side-panel { display: flex; flex-direction: column; gap: 8px; }
  .panel-box { border: 1.5px solid #e2e8f0; border-radius: 8px; padding: 9px; }
  .panel-title { font-size: 8pt; font-weight: 800; text-transform: uppercase; letter-spacing: .7px; color: #64748b; margin-bottom: 6px; }
  .mention-box { background: linear-gradient(135deg,${sMention.color || '#2563eb'}15,${sMention.color || '#2563eb'}08); border: 2px solid ${sMention.color || '#2563eb'}; border-radius: 8px; padding: 9px; text-align: center; }
  .mention-val { font-size: 12pt; font-weight: 900; color: ${sMention.color || '#2563eb'}; }
  .decision-tag { display:inline-block; background:${sStatus.color}18; color:${sStatus.color}; border:1.5px solid ${sStatus.color}; padding:2px 10px; border-radius:20px; font-size:7.5pt; font-weight:800; margin-top:5px; }
  .evol-box { border: 1.5px solid #e2e8f0; border-radius: 8px; padding: 9px; }
  .strength-item { display: flex; justify-content: space-between; align-items: center; padding: 3px 0; border-bottom: 1px dashed #f1f5f9; font-size: 8pt; }
  .sigs { display: grid; grid-template-columns: repeat(3,1fr); gap: 8px; padding: 0 14px 10px; }
  .footer { background: #0f172a; color: #64748b; padding: 5px 14px; font-size: 6.5pt; display: flex; justify-content: space-between; }
</style></head><body><div class="page">

  <div class="official-top">
    <div>
      ${republic ? `<span style="font-weight:800;text-transform:uppercase;color:#1e3a5f;">${republic}</span>` : ''}
      ${countryMotto ? `<span style="font-style:italic;margin-left:6px;">${countryMotto}</span>` : ''}
      ${ministry ? `<span style="font-weight:600;margin-left:8px;">| ${ministry}</span>` : ''}
    </div>
    <div style="font-style:italic;color:#1e40af;">${schoolDevise ? `"${schoolDevise}"` : ''}</div>
  </div>

  <div class="cover">
    <div class="cover-row">
      <div class="cover-left">
        ${schoolLogo ? `<img src="${schoolLogo}" class="logo-img" style="margin-bottom:6px;" alt="Logo">` : ''}
        <div class="school-name">${schoolName}</div>
        <div class="school-info">${schoolAddr}${schoolPhone ? ' | ' + schoolPhone : ''}${schoolEmail ? ' | ' + schoolEmail : ''}</div>
        ${schoolDevise ? `<div class="school-devise-m3">"${schoolDevise}"</div>` : ''}
      </div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:8px;">
        <div class="cover-badge">
          <div class="cover-badge-year">${yearLabel}</div>
          <div class="cover-badge-trim">${trimLabel}</div>
          <div style="font-size:7pt;opacity:.6;margin-top:2px;">Bulletin scolaire</div>
        </div>
        ${qrCodeImg(s, sAvg, sRank, classStudents.length)}
      </div>
    </div>
  </div>

  <div class="student-banner">
    <div>
      <div class="student-fullname">${s.firstName} ${s.lastName?.toUpperCase()}</div>
      <div class="student-class">Classe: <strong>${classInfo?.name || 'N/A'}</strong> &nbsp;·&nbsp; Effectif: <strong>${classStudents.length}</strong> &nbsp;·&nbsp; Rang: <strong>${sRank}/${classStudents.length}</strong></div>
    </div>
    <div class="avg-display">
      <div class="avg-num">${fmtAvg(sAvg)}</div>
      <div class="avg-label">Moy. / 20</div>
    </div>
  </div>

  <div class="kpis">
    <div class="kpi"><div class="kpi-val">${fmtAvg(classAverage)}</div><div class="kpi-lbl">Moy. classe</div></div>
    <div class="kpi"><div class="kpi-val">${fmtAvg(classMax)}</div><div class="kpi-lbl">Max classe</div></div>
    <div class="kpi"><div class="kpi-val">${fmtAvg(classMin)}</div><div class="kpi-lbl">Min classe</div></div>
    <div class="kpi"><div class="kpi-val">${sTotalCoef}</div><div class="kpi-lbl">Coeff. total</div></div>
    <div class="kpi"><div class="kpi-val">${sTotalPts.toFixed(1)}</div><div class="kpi-lbl">Total pts</div></div>
  </div>

  <div class="body-grid">
    <div>
      <table>
        <thead><tr>
          <th>Matière / Prof.</th>
          <th class="center" style="width:32px;">Coef.</th>
          <th class="center" style="width:110px;">I / D / C / Bonus</th>
          <th style="width:120px;">Note /20</th>
          <th class="center" style="width:46px;">Moy.cl.</th>
          <th style="width:52px;">Niveau</th>
          <th>Appréciation</th>
          <th class="center" style="width:68px;">Signature</th>
        </tr></thead>
        <tbody>
          ${rows}
          <tr class="total-row">
            <td>MOYENNE GÉNÉRALE</td>
            <td class="center">${sTotalCoef}</td><td></td>
            <td><strong style="font-size:11pt;">${fmtAvg(sAvg)}/20</strong></td>
            <td class="center">${fmtAvg(classAverage)}</td>
            <td>${sMention.text || ''}</td><td></td><td></td>
          </tr>
        </tbody>
      </table>
      ${generalAppreciation ? `
      <div style="margin-top:8px;border:1.5px solid #3b82f6;border-radius:8px;padding:7px 12px;background:#eff6ff;">
        <div style="font-size:7pt;font-weight:700;color:#1d4ed8;text-transform:uppercase;margin-bottom:4px;">Appréciation du conseil de classe</div>
        <div style="font-size:9.5pt;color:#1e3a5f;">${generalAppreciation}</div>
      </div>` : ''}
    </div>

    <div class="side-panel">
      <div class="mention-box">
        <div style="font-size:7pt;color:#64748b;text-transform:uppercase;font-weight:700;margin-bottom:3px;">Mention</div>
        <div class="mention-val">${sMention.text || 'N/A'}</div>
        <div class="decision-tag">${sStatus.text}</div>
      </div>
      <div class="evol-box">
        <div class="panel-title">📈 Évolution des moyennes</div>
        ${evolSvg}
      </div>
      ${sStr.length > 0 ? `
      <div class="panel-box">
        <div class="panel-title">💪 Points forts</div>
        ${sStr.map(st => `<div class="strength-item"><span style="font-weight:600;">${st.name}</span><span style="font-weight:800;color:#059669;">${st.value.toFixed(2)}</span></div>`).join('')}
      </div>` : ''}
      ${sWeak.length > 0 ? `
      <div class="panel-box">
        <div class="panel-title">⚠️ À renforcer</div>
        ${sWeak.map(st => `<div class="strength-item"><span style="font-weight:600;">${st.name}</span><span style="font-weight:800;color:#dc2626;">${st.value.toFixed(2)}</span></div>`).join('')}
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

</div></body></html>`;
  };

  // ── Générateur selon modèle ───────────────────────────────────────────────
  const buildHtml = (tmpl, s, sGrades, sAvg, sRank, sStatus, sMention, sTotalCoef, sTotalPts) => {
    if (tmpl === 'model2') return generateModel2Html(s, sGrades, sAvg, sRank, sStatus, sMention, sTotalCoef);
    if (tmpl === 'model3') return generateModel3Html(s, sGrades, sAvg, sRank, sStatus, sMention, sTotalCoef, sTotalPts);
    return generateModel1Html(s, sGrades, sAvg, sRank, sStatus, sMention, sTotalCoef, sTotalPts);
  };

  // ── Batch print — tous les élèves de la classe ────────────────────────────
  const openBatchPrint = () => {
    if (!classStudents.length) return;
    setIsBatchLoading(true);
    const pages = classStudents.map(s => {
      const sAvg = parseFloat(calculateAverage(s.id, selectedTrimester)) || 0;
      const sGrades = grades.filter(g => (g.studentId || g.student_id) === s.id && g.trimester === selectedTrimester);
      const sRanking = ranking;
      const sRank = sRanking.findIndex(r => r.student.id === s.id) + 1 || '-';
      const sMention = getMention(sAvg);
      const sStatus = sAvg >= 12 ? { text: 'ADMIS(E)', color: '#059669' } : sAvg >= 8 ? { text: 'À SUIVRE', color: '#d97706' } : { text: 'EN DIFFICULTÉ', color: '#dc2626' };
      const sTotalCoef = sGrades.reduce((sum, g) => sum + (subjects.find(sub => sub.id === (g.subjectId || g.subject_id))?.coefficient || 0), 0);
      const sTotalPts = sGrades.reduce((sum, g) => {
        const coef = subjects.find(sub => sub.id === (g.subjectId || g.subject_id))?.coefficient || 0;
        return sum + ((g.value || 0) * coef);
      }, 0);
      const html = buildHtml(batchTemplate, s, sGrades, sAvg, sRank, sStatus, sMention, sTotalCoef, sTotalPts);
      const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
      return bodyMatch ? `<div style="page-break-after:always;">${bodyMatch[1]}</div>` : '';
    }).join('');

    // Récupérer le CSS du premier bulletin pour le batch
    const firstHtml = buildHtml(batchTemplate, classStudents[0],
      grades.filter(g => (g.studentId || g.student_id) === classStudents[0].id && g.trimester === selectedTrimester),
      parseFloat(calculateAverage(classStudents[0].id, selectedTrimester)) || 0, 1,
      { text: '', color: '' }, getMention(0), 0, 0);
    const cssMatch = firstHtml.match(/<style>([\s\S]*?)<\/style>/i);
    const css = cssMatch ? cssMatch[1] : '';

    const batchHtml = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
<title>Bulletins — Classe ${classInfo?.name} — ${trimLabel}</title>
<style>${css} @page{size:A4 portrait;margin:0;} body{padding:0;} div[style*="page-break"]:last-child{page-break-after:auto!important;}</style>
</head><body>${pages}</body></html>`;

    const win = window.open('', '_blank', 'width=960,height=800');
    if (!win) { alert('Autorisez les pop-ups pour imprimer.'); setIsBatchLoading(false); return; }
    win.document.write(batchHtml);
    win.document.close();
    setTimeout(() => { win.print(); setTimeout(() => win.close(), 600); setIsBatchLoading(false); }, 600);
    setShowPrintPreview(false);
  };

  // ── Bugfix useEffect ──────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      const tmpl = e?.detail?.template || bulletinTemplate;
      const html = buildHtml(tmpl, student, studentGrades, average, studentRank, studentStatus, mention, totalCoef, totalPoints);
      if (html) openPrint(html);
    };
    window.addEventListener('print-bulletin', handler);
    return () => window.removeEventListener('print-bulletin', handler);
  }, [bulletinTemplate, generalAppreciation]);

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
              <div className="text-2xl font-black text-indigo-600">{studentRank}/{classStudents.length}</div>
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
            <p className="text-xs text-gray-500 mb-3">Style ministère · Tableau avec Interro/Devoir/Compo/Bonus · Signatures · QR Code · 1 page A4</p>
            <button onClick={() => { openPrint(generateModel1Html()); setShowPrintPreview(false); }}
              className="w-full bg-blue-600 text-white px-4 py-2.5 rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2">
              <Printer className="w-4 h-4" /> Imprimer ce modèle
            </button>
          </div>

          <div className="border-2 border-gray-200 rounded-xl p-4 hover:border-emerald-400 hover:bg-emerald-50 transition-all group">
            <div className="flex items-center gap-2 mb-1"><span className="text-lg">📊</span><h4 className="font-bold text-gray-800 group-hover:text-emerald-700">Modèle Moderne</h4></div>
            <p className="text-xs text-gray-500 mb-3">Gradient bleu · Barres de progression · Graphique SVG · QR Code · 1 page A4</p>
            <button onClick={() => { openPrint(generateModel2Html()); setShowPrintPreview(false); }}
              className="w-full bg-emerald-600 text-white px-4 py-2.5 rounded-lg font-semibold hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2">
              <Printer className="w-4 h-4" /> Imprimer ce modèle
            </button>
          </div>

          <div className="border-2 border-gray-200 rounded-xl p-4 hover:border-purple-400 hover:bg-purple-50 transition-all group">
            <div className="flex items-center gap-2 mb-1"><span className="text-lg">🏆</span><h4 className="font-bold text-gray-800 group-hover:text-purple-700">Modèle Premium</h4></div>
            <p className="text-xs text-gray-500 mb-3">Couverture dégradée · KPIs · Évolution 3 trimestres · Points forts/faibles · QR Code · 1 page A4</p>
            <button onClick={() => { openPrint(generateModel3Html()); setShowPrintPreview(false); }}
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