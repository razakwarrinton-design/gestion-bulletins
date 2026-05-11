import React, { useState, useEffect } from 'react';
import { Printer, X, Users, ChevronDown } from 'lucide-react';

// ════════════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════════════
const fmtAvg = (v) => { const n = parseFloat(v); return isNaN(n) || n === 0 ? '-' : n.toFixed(2); };
const gradeColor = (v) => v >= 15 ? '#059669' : v >= 12 ? '#2563eb' : v >= 10 ? '#0891b2' : v >= 8 ? '#d97706' : '#dc2626';
const gradeBg = (v) => v >= 15 ? '#d1fae5' : v >= 12 ? '#dbeafe' : v >= 10 ? '#cffafe' : v >= 8 ? '#fef3c7' : '#fee2e2';
const gradeLabel = (v) => v >= 16 ? 'Très Bien' : v >= 14 ? 'Bien' : v >= 12 ? 'Assez Bien' : v >= 10 ? 'Passable' : v >= 8 ? 'Insuffisant' : 'Très Insuff.';

const computeFinal = (g, bonus = 0) => {
  if (!g) return null;
  let val = null;
  if (g.value != null) val = g.value;
  else {
    const parts = [g.interro, g.devoir, g.composition].filter(v => v != null);
    if (!parts.length) return null;
    val = parts.reduce((a, b) => a + b, 0) / parts.length;
  }
  return Math.min(20, val + (bonus || 0));
};

// QR code via API gratuite (fonctionne sans internet local)
const qrUrl = (data) =>
  `https://api.qrserver.com/v1/create-qr-code/?size=90x90&data=${encodeURIComponent(data)}&color=1e3a5f&bgcolor=ffffff`;

// ════════════════════════════════════════════════════════════════════
// GÉNÉRATEUR D'EN-TÊTE OFFICIEL (commun aux 3 modèles)
// ════════════════════════════════════════════════════════════════════
const officialHeader = (schoolName, schoolAddr, schoolPhone, schoolEmail, schoolLogo, yearLabel, trimLabel, devise) => `
  <div class="official-header">
    <div class="republic-bar">
      <div class="republic-col left-col">
        <div class="republic-name">REPUBLIQUE TOGOLAISE</div>
        <div class="republic-motto">Travail &nbsp;·&nbsp; Liberté &nbsp;·&nbsp; Patrie</div>
        <div class="ministry-name">Ministère des Enseignements<br>Primaire et Secondaire</div>
      </div>
      <div class="republic-col center-col">
        ${schoolLogo
    ? `<img src="${schoolLogo}" class="school-logo" alt="Logo">`
    : `<div class="school-logo-placeholder">LOGO</div>`}
        <div class="school-main-name">${schoolName}</div>
        <div class="school-contact">${schoolAddr}</div>
        ${schoolPhone || schoolEmail ? `<div class="school-contact">${schoolPhone}${schoolEmail ? ' | ' + schoolEmail : ''}</div>` : ''}
        ${devise ? `<div class="school-devise">"${devise}"</div>` : ''}
      </div>
      <div class="republic-col right-col">
        <div class="year-badge">${yearLabel}</div>
        <div class="trim-badge">${trimLabel}</div>
      </div>
    </div>
    <div class="bulletin-title-bar">BULLETIN SCOLAIRE — ${trimLabel.toUpperCase()} — ANNÉE ${yearLabel}</div>
  </div>`;

// ════════════════════════════════════════════════════════════════════
// BLOC INFOS ÉLÈVE + QR CODE (commun aux 3 modèles)
// ════════════════════════════════════════════════════════════════════
const studentInfoBlock = (student, classInfo, classStudents, studentRank, trimLabel, yearLabel) => {
  const qrData = `Élève: ${student.firstName} ${student.lastName} | Classe: ${classInfo?.name || ''} | Rang: ${studentRank}/${classStudents.length} | ${trimLabel} | ${yearLabel}`;
  return `
  <div class="student-info-block">
    <div class="student-fields">
      <div class="field-row"><span class="field-label">NOM</span><span class="field-value">${student.lastName?.toUpperCase()}</span></div>
      <div class="field-row"><span class="field-label">PRÉNOM</span><span class="field-value">${student.firstName}</span></div>
      <div class="field-row"><span class="field-label">CLASSE</span><span class="field-value">${classInfo?.name || 'N/A'}</span></div>
      <div class="field-row"><span class="field-label">EFFECTIF</span><span class="field-value">${classStudents.length} élèves</span></div>
      <div class="field-row"><span class="field-label">RANG</span><span class="field-value bold-blue">${studentRank} / ${classStudents.length}</span></div>
      <div class="field-row"><span class="field-label">N° MATRICULE</span><span class="field-value">${student.matricule || student.id?.slice(0, 8)?.toUpperCase() || '—'}</span></div>
    </div>
    <div class="qr-block">
      <img src="${qrUrl(qrData)}" alt="QR Code élève" class="qr-img">
      <div class="qr-label">Code QR Élève</div>
    </div>
  </div>`;
};

// ════════════════════════════════════════════════════════════════════
// TABLEAU DES NOTES (commun aux 3 modèles, avec colonnes enrichies)
// ════════════════════════════════════════════════════════════════════
const gradesTable = (studentGrades, subjects, classStudents, grades, selectedTrimester, average, totalCoef, totalPoints, classAverage, studentStatus, mention, studentRank, classStudents_len, trend, trendColor) => {
  const rows = studentGrades.map(g => {
    const subj = subjects.find(s => s.id === (g.subjectId || g.subject_id));
    const coef = subj?.coefficient || 1;
    const bonus = g.bonus || 0;
    const finalVal = computeFinal(g, bonus);
    const color = finalVal != null ? gradeColor(finalVal) : '#374151';
    const bg = finalVal != null ? gradeBg(finalVal) : '#f9fafb';
    const lbl = finalVal != null ? gradeLabel(finalVal) : '';
    const interro = g.interro != null ? g.interro.toFixed(2) : '—';
    const devoir = g.devoir != null ? g.devoir.toFixed(2) : '—';
    const compo = g.composition != null ? g.composition.toFixed(2) : '—';
    const bonusDisp = bonus > 0 ? `+${bonus.toFixed(2)}` : '—';
    const teacherName = g.teacherName || subj?.teacher || '';
    const sigCell = teacherName
      ? `<div style="font-family:'Brush Script MT',cursive;font-size:10pt;color:#1e3a5f;line-height:1;">${teacherName}</div>
         <div style="font-size:6pt;color:#2563eb;margin-top:1px;">✓ Signé</div>`
      : `<span style="color:#d1d5db;font-size:7pt;">—</span>`;

    // Moyenne classe pour cette matière
    const cAvgs = classStudents.map(s => {
      const sg = grades.find(gg => (gg.studentId || gg.student_id) === s.id && (gg.subjectId || gg.subject_id) === (g.subjectId || g.subject_id) && gg.trimester === selectedTrimester);
      return computeFinal(sg, sg?.bonus || 0) || 0;
    }).filter(v => v > 0);
    const subjClsAvg = cAvgs.length ? (cAvgs.reduce((a, b) => a + b, 0) / cAvgs.length) : null;
    const diff = finalVal != null && subjClsAvg ? (finalVal - subjClsAvg) : null;
    const diffDisp = diff != null ? (diff >= 0 ? `<span style="color:#059669;">+${diff.toFixed(2)}</span>` : `<span style="color:#dc2626;">${diff.toFixed(2)}</span>`) : '—';

    return `
      <tr>
        <td class="subj-cell">
          <div class="subj-name">${subj?.name || 'N/A'}</div>
          ${teacherName ? `<div class="subj-teacher">${teacherName}</div>` : ''}
        </td>
        <td class="center coef-cell">${coef}</td>
        <td class="center note-sub">${interro}</td>
        <td class="center note-sub">${devoir}</td>
        <td class="center note-sub">${compo}</td>
        <td class="center note-sub bonus-cell">${bonusDisp}</td>
        <td class="center note-final" style="color:${color};background:${bg};">${finalVal != null ? finalVal.toFixed(2) : '—'}</td>
        <td class="center total-pts">${finalVal != null ? (finalVal * coef).toFixed(2) : '—'}</td>
        <td class="center moy-cls">${subjClsAvg ? subjClsAvg.toFixed(2) : '—'}<br>${diff != null ? diffDisp : ''}</td>
        <td class="apprec-cell">${g.appreciation || ''}</td>
        <td class="sig-cell">${sigCell}</td>
      </tr>`;
  }).join('');

  return `
  <table class="notes-table">
    <thead>
      <tr class="th-main">
        <th class="left" rowspan="2" style="min-width:100px;">Matière<br><span style="font-weight:400;font-size:7pt;opacity:.8;">Professeur</span></th>
        <th rowspan="2" style="width:30px;">Coef.</th>
        <th colspan="4" style="background:#1e3a5f;">Notes de contrôle</th>
        <th rowspan="2" style="width:50px;">Note<br>/20</th>
        <th rowspan="2" style="width:50px;">Total<br>pts</th>
        <th rowspan="2" style="width:55px;">Moy.<br>classe</th>
        <th class="left" rowspan="2">Appréciation<br>du professeur</th>
        <th rowspan="2" style="width:75px;">Signature<br>du prof</th>
      </tr>
      <tr class="th-sub">
        <th style="width:40px;">Interro</th>
        <th style="width:40px;">Devoir</th>
        <th style="width:40px;">Compo</th>
        <th style="width:40px;">Bonus</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
      <tr class="total-row">
        <td colspan="6" style="font-weight:800;letter-spacing:.5px;">TOTAL GÉNÉRAL</td>
        <td class="center" style="font-size:13pt;font-weight:900;">${fmtAvg(average)}/20</td>
        <td class="center">${totalPoints.toFixed(2)}</td>
        <td class="center">${fmtAvg(classAverage)}</td>
        <td style="font-size:8pt;opacity:.7;">Coeff. total : ${totalCoef}</td>
        <td></td>
      </tr>
    </tbody>
  </table>`;
};

// ════════════════════════════════════════════════════════════════════
// BILAN DE PERFORMANCE (remplace graphiques — 100% CSS, sans SVG)
// ════════════════════════════════════════════════════════════════════
const performanceBoard = (studentGrades, subjects, computeFinalFn) => {
  if (!studentGrades.length) return '';
  const cards = studentGrades.map(g => {
    const subj = subjects.find(s => s.id === (g.subjectId || g.subject_id));
    const bonus = g.bonus || 0;
    const val = computeFinalFn(g, bonus);
    if (val == null) return '';
    const color = gradeColor(val);
    const bg = gradeBg(val);
    const lbl = gradeLabel(val);
    const pct = Math.round((val / 20) * 100);
    const name = (subj?.name || '?').slice(0, 10);
    return `
      <div class="perf-card">
        <div class="perf-subj">${name}</div>
        <div class="perf-note" style="color:${color};">${val.toFixed(2)}</div>
        <div class="perf-lbl" style="color:${color};background:${bg};">${lbl}</div>
        <div class="perf-bar-wrap">
          <div class="perf-bar" style="width:${pct}%;background:${color};"></div>
        </div>
        <div class="perf-pct">${pct}%</div>
      </div>`;
  }).join('');
  return `
  <div class="perf-section">
    <div class="section-label">📊 BILAN DE PERFORMANCE PAR MATIÈRE</div>
    <div class="perf-grid">${cards}</div>
  </div>`;
};

// ════════════════════════════════════════════════════════════════════
// BLOC RÉSULTATS FINAUX (banderole)
// ════════════════════════════════════════════════════════════════════
const resultsBar = (average, classAverage, classMax, classMin, studentRank, classLen, mention, studentStatus, trend, trendColor) => `
  <div class="results-bar">
    <div class="rb-cell">
      <div class="rb-label">MOYENNE GÉNÉRALE</div>
      <div class="rb-value main-avg">${fmtAvg(average)}<span style="font-size:9pt;">/20</span></div>
    </div>
    <div class="rb-cell">
      <div class="rb-label">RANG</div>
      <div class="rb-value">${studentRank}<span style="font-size:9pt;">/${classLen}</span></div>
    </div>
    <div class="rb-cell">
      <div class="rb-label">MOY. CLASSE</div>
      <div class="rb-value" style="font-size:13pt;">${fmtAvg(classAverage)}</div>
    </div>
    <div class="rb-cell">
      <div class="rb-label">MAX / MIN CLASSE</div>
      <div class="rb-value" style="font-size:10pt;">${fmtAvg(classMax)} <span style="color:#9ca3af;font-size:9pt;">/</span> ${fmtAvg(classMin)}</div>
    </div>
    <div class="rb-cell">
      <div class="rb-label">ÉVOLUTION</div>
      <div class="rb-value" style="color:${trendColor || '#64748b'};font-size:18pt;">${trend || '—'}</div>
    </div>
    <div class="rb-cell">
      <div class="rb-label">MENTION</div>
      <div class="rb-value mention-val" style="color:${mention?.color || '#1e40af'};">${mention?.text || '—'}</div>
    </div>
    <div class="rb-cell">
      <div class="rb-label">DÉCISION DU CONSEIL</div>
      <div class="rb-value" style="font-size:10pt;color:${studentStatus.color};">${studentStatus.text}</div>
    </div>
  </div>`;

// ════════════════════════════════════════════════════════════════════
// SIGNATURES
// ════════════════════════════════════════════════════════════════════
const signaturesBlock = (directorName, principalTeacher, generalAppreciation) => `
  ${generalAppreciation ? `
  <div class="council-box">
    <div class="section-label">📝 APPRÉCIATION DU CONSEIL DE CLASSE</div>
    <div class="council-text">${generalAppreciation}</div>
    ${principalTeacher ? `<div class="council-sig">Prof. Principal : ${principalTeacher} — ${new Date().toLocaleDateString('fr-FR')}</div>` : ''}
  </div>` : ''}
  <div class="signatures">
    <div class="sig-box">
      <div class="sig-title">LE DIRECTEUR</div>
      <div class="sig-body">
        ${directorName
    ? `<div class="sig-name">${directorName}</div>
             <div class="sig-date">Fait le : ${new Date().toLocaleDateString('fr-FR')}</div>
             <div class="sig-stamp">✓ Signé numériquement</div>`
    : `<div class="sig-awaiting">En attente de signature</div>`}
      </div>
    </div>
    <div class="sig-box">
      <div class="sig-title">LE PROFESSEUR PRINCIPAL</div>
      <div class="sig-body">
        ${principalTeacher
    ? `<div class="sig-name">${principalTeacher}</div>
             <div class="sig-date">Fait le : ${new Date().toLocaleDateString('fr-FR')}</div>
             <div class="sig-stamp">✓ Signé numériquement</div>`
    : `<div class="sig-awaiting">En attente de signature</div>`}
      </div>
    </div>
    <div class="sig-box">
      <div class="sig-title">SIGNATURE DES PARENTS / TUTEUR</div>
      <div class="sig-body">
        <div class="sig-awaiting">Lu et approuvé</div>
        <div class="sig-date">Date : _____ / _____ / _________</div>
      </div>
    </div>
  </div>`;

// ════════════════════════════════════════════════════════════════════
// CSS COMMUN À TOUS LES MODÈLES
// ════════════════════════════════════════════════════════════════════
const commonCss = () => `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; background: #fff; color: #1e293b; font-size: 10pt; }

  /* ── En-tête officiel ── */
  .official-header { border-bottom: 3px double #1e40af; padding-bottom: 8px; margin-bottom: 10px; }
  .republic-bar { display: flex; justify-content: space-between; align-items: center; gap: 10px; padding: 8px 0 6px; }
  .republic-col { display: flex; flex-direction: column; }
  .left-col { align-items: flex-start; min-width: 180px; }
  .center-col { align-items: center; flex: 1; text-align: center; }
  .right-col { align-items: flex-end; min-width: 120px; }
  .republic-name { font-size: 10pt; font-weight: 800; color: #1e40af; text-transform: uppercase; letter-spacing: .5px; }
  .republic-motto { font-size: 8.5pt; color: #374151; font-style: italic; margin: 2px 0; }
  .ministry-name { font-size: 7.5pt; color: #374151; line-height: 1.4; font-weight: 600; margin-top: 3px; }
  .school-logo { width: 70px; height: 70px; object-fit: contain; }
  .school-logo-placeholder { width: 70px; height: 70px; border: 2px solid #1e40af; display: flex; align-items: center; justify-content: center; font-size: 7pt; color: #1e40af; text-align: center; border-radius: 6px; }
  .school-main-name { font-size: 15pt; font-weight: 800; color: #1e3a5f; text-transform: uppercase; letter-spacing: .5px; margin-top: 4px; }
  .school-contact { font-size: 8pt; color: #6b7280; margin-top: 1px; }
  .school-devise { font-size: 8.5pt; color: #1e40af; font-style: italic; margin-top: 4px; font-weight: 600; }
  .year-badge { background: #1e40af; color: white; padding: 4px 10px; border-radius: 20px; font-size: 9pt; font-weight: 700; text-align: center; }
  .trim-badge { background: #f1f5f9; border: 1.5px solid #1e40af; color: #1e40af; padding: 4px 10px; border-radius: 20px; font-size: 9pt; font-weight: 700; text-align: center; margin-top: 6px; }
  .bulletin-title-bar { background: #1e40af; color: white; text-align: center; padding: 5px; font-size: 12pt; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; margin-top: 6px; }

  /* ── Infos élève ── */
  .student-info-block { display: flex; justify-content: space-between; align-items: stretch; border: 2px solid #1e40af; border-radius: 6px; margin-bottom: 10px; overflow: hidden; }
  .student-fields { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; padding: 10px 14px; flex: 1; }
  .field-row { }
  .field-label { display: block; font-size: 7pt; font-weight: 800; color: #1e40af; text-transform: uppercase; }
  .field-value { display: block; font-size: 10.5pt; font-weight: 600; border-bottom: 1px solid #e2e8f0; padding-bottom: 2px; }
  .bold-blue { color: #1e40af; font-size: 12pt; }
  .qr-block { background: #f8fafc; border-left: 2px solid #1e40af; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 10px; gap: 4px; }
  .qr-img { width: 90px; height: 90px; display: block; }
  .qr-label { font-size: 6.5pt; color: #94a3b8; text-transform: uppercase; font-weight: 700; }

  /* ── Tableau des notes ── */
  .notes-table { width: 100%; border-collapse: collapse; margin-bottom: 10px; font-size: 9pt; }
  .th-main { background: #1e3a5f; color: white; }
  .th-sub { background: #334155; color: #e2e8f0; }
  .notes-table th { padding: 5px 6px; text-align: center; font-size: 8pt; border: 1px solid #374151; }
  .notes-table th.left { text-align: left; }
  .notes-table td { padding: 5px 6px; border-bottom: 1px solid #e5e7eb; vertical-align: middle; }
  .notes-table tr:nth-child(even) td { background: #f8fafc; }
  .subj-cell { }
  .subj-name { font-weight: 700; font-size: 10pt; }
  .subj-teacher { font-size: 7pt; color: #94a3b8; margin-top: 1px; }
  .center { text-align: center; }
  .coef-cell { font-weight: 700; color: #1e40af; }
  .note-sub { font-size: 8.5pt; color: #475569; background: #f9fafb; }
  .bonus-cell { color: #059669; font-weight: 700; }
  .note-final { font-size: 12pt; font-weight: 900; border-radius: 4px; }
  .total-pts { font-size: 8.5pt; color: #374151; }
  .moy-cls { font-size: 8pt; color: #64748b; }
  .apprec-cell { font-style: italic; font-size: 8pt; color: #4b5563; max-width: 110px; }
  .sig-cell { text-align: center; font-size: 8pt; min-width: 70px; }
  .total-row td { background: #1e3a5f !important; color: white; font-size: 9.5pt; padding: 8px 6px; }

  /* ── Bilan de performance (remplace graphiques) ── */
  .perf-section { margin-bottom: 10px; }
  .section-label { font-size: 8pt; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: #1e40af; margin-bottom: 6px; }
  .perf-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(85px, 1fr)); gap: 6px; }
  .perf-card { border: 1.5px solid #e2e8f0; border-radius: 8px; padding: 6px 8px; text-align: center; }
  .perf-subj { font-size: 7.5pt; font-weight: 700; color: #374151; margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .perf-note { font-size: 14pt; font-weight: 900; line-height: 1; }
  .perf-lbl { font-size: 6.5pt; font-weight: 700; padding: 2px 4px; border-radius: 10px; margin: 3px auto; display: inline-block; }
  .perf-bar-wrap { height: 6px; background: #f1f5f9; border-radius: 3px; margin-top: 4px; overflow: hidden; }
  .perf-bar { height: 100%; border-radius: 3px; }
  .perf-pct { font-size: 6.5pt; color: #94a3b8; margin-top: 2px; }

  /* ── Banderole résultats ── */
  .results-bar { display: grid; grid-template-columns: repeat(7, 1fr); border: 2px solid #1e40af; margin-bottom: 10px; }
  .rb-cell { padding: 8px 4px; text-align: center; border-right: 1px solid #bfdbfe; }
  .rb-cell:last-child { border-right: none; }
  .rb-label { font-size: 6.5pt; text-transform: uppercase; color: #64748b; font-weight: 800; margin-bottom: 3px; }
  .rb-value { font-size: 14pt; font-weight: 900; color: #1e40af; }
  .main-avg { font-size: 18pt; }
  .mention-val { font-size: 10pt; }

  /* ── Conseil & signatures ── */
  .council-box { border: 2px dashed #1e40af; border-radius: 6px; padding: 10px 14px; margin-bottom: 10px; }
  .council-text { font-size: 11pt; color: #1e3a5f; min-height: 24px; }
  .council-sig { font-size: 7.5pt; color: #2563eb; margin-top: 5px; }
  .signatures { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 12px; }
  .sig-box { border: 1.5px solid #cbd5e1; border-radius: 8px; padding: 10px 12px; min-height: 90px; display: flex; flex-direction: column; }
  .sig-title { font-size: 7.5pt; font-weight: 800; color: #1e40af; text-transform: uppercase; margin-bottom: 6px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }
  .sig-body { flex: 1; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; }
  .sig-name { font-family: 'Brush Script MT', cursive; font-size: 15pt; color: #1e3a5f; }
  .sig-date { font-size: 7.5pt; color: #64748b; margin-top: 3px; }
  .sig-stamp { background: #dbeafe; color: #1d4ed8; font-size: 6.5pt; font-weight: 700; padding: 2px 8px; border-radius: 20px; margin-top: 4px; }
  .sig-awaiting { font-size: 8pt; color: #d1d5db; font-style: italic; }

  /* ── Footer ── */
  .doc-footer { text-align: center; font-size: 7.5pt; color: #94a3b8; border-top: 1px solid #e5e7eb; padding-top: 6px; margin-top: 8px; }

  @page { size: A4; margin: 9mm; }
  @media print { body { padding: 0; } }
`;

// ════════════════════════════════════════════════════════════════════
// GÉNÉRATEUR BULLETIN COMPLET (1 élève, 1 modèle)
// ════════════════════════════════════════════════════════════════════
function buildBulletin(s, template, opts) {
  const {
    calculateAverage, grades, subjects, classes, students,
    schoolLogo, schoolInfo, getMention, selectedTrimester,
    generalAppreciation
  } = opts;

  const average = parseFloat(calculateAverage(s.id, selectedTrimester)) || 0;
  const sGrades = grades.filter(g => (g.studentId || g.student_id) === s.id && g.trimester === selectedTrimester);
  const classInfo = classes.find(c => c.id === (s.classId || s.class_id));
  const classStudents = students ? students.filter(st => (st.classId || st.class_id) === classInfo?.id) : [];
  const mention = getMention(average);

  const ranking = classStudents
    .map(st => ({ student: st, average: parseFloat(calculateAverage(st.id, selectedTrimester)) || 0 }))
    .sort((a, b) => b.average - a.average);
  const studentRank = ranking.findIndex(r => r.student.id === s.id) + 1 || '-';

  const classAverages = classStudents.map(st => parseFloat(calculateAverage(st.id, selectedTrimester)) || 0).filter(a => a > 0);
  const classAverage = classAverages.length ? classAverages.reduce((a, b) => a + b, 0) / classAverages.length : 0;
  const classMax = classAverages.length ? Math.max(...classAverages) : 0;
  const classMin = classAverages.length ? Math.min(...classAverages) : 0;

  const totalCoef = sGrades.reduce((sum, g) => sum + (subjects.find(sub => sub.id === (g.subjectId || g.subject_id))?.coefficient || 0), 0);
  const totalPoints = sGrades.reduce((sum, g) => {
    const coef = subjects.find(sub => sub.id === (g.subjectId || g.subject_id))?.coefficient || 0;
    const val = computeFinal(g, g.bonus || 0) || 0;
    return sum + val * coef;
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
  const devise = schoolInfo?.devise || schoolInfo?.motto || '';
  const yearLabel = schoolInfo?.year || '2024-2025';
  const trimLabel = `Trimestre ${selectedTrimester}`;
  const directorName = schoolInfo?.directorName || schoolInfo?.director || '';
  const principalTeacher = schoolInfo?.principalTeacher || '';

  const t1Avg = parseFloat(calculateAverage(s.id, '1')) || 0;
  const t2Avg = parseFloat(calculateAverage(s.id, '2')) || 0;
  const prevAvg = selectedTrimester === '1' ? 0 : selectedTrimester === '2' ? t1Avg : t2Avg;
  const trend = prevAvg > 0 ? (average > prevAvg + 0.5 ? '↑' : average < prevAvg - 0.5 ? '↓' : '→') : null;
  const trendColor = trend === '↑' ? '#059669' : trend === '↓' ? '#dc2626' : '#d97706';

  const alertBanner = average < 10 ? `
    <div style="background:#fef2f2;border:2px solid #fca5a5;border-radius:8px;padding:10px 16px;margin-bottom:10px;display:flex;align-items:center;gap:10px;">
      <span style="font-size:18pt;">⚠️</span>
      <div>
        <div style="font-weight:800;color:#dc2626;font-size:10pt;">Résultats insuffisants — Suivi renforcé recommandé</div>
        <div style="font-size:8.5pt;color:#b91c1c;margin-top:2px;">Moyenne actuelle : ${fmtAvg(average)}/20 — Rang : ${studentRank}/${classStudents.length}</div>
      </div>
    </div>` : '';

  // CSS spécifique selon modèle
  let modelCss = '';
  if (template === 'model1') {
    modelCss = `body { padding: 12mm 10mm; }`;
  } else if (template === 'model2') {
    modelCss = `
      body { padding: 0; background: #f8fafc; }
      .page { background: white; margin: 0 auto; max-width: 210mm; padding: 12mm 10mm; }
      .official-header { padding: 0 0 8px; }
      .notes-table th { font-size: 7.5pt; }`;
  } else {
    modelCss = `
      body { padding: 0; }
      .page { padding: 10mm 9mm; }
      .official-header { border-bottom: 3px solid #0f172a; }
      .bulletin-title-bar { background: linear-gradient(135deg, #0f172a, #1e40af); letter-spacing: 3px; }
      .student-info-block { border-color: #0f172a; }
      .results-bar { border-color: #0f172a; background: #0f172a; }
      .rb-cell { border-right-color: #334155; }
      .rb-label { color: #94a3b8; }
      .rb-value { color: white; }
      .main-avg { color: #60a5fa; }`;
  }

  const headerHtml = officialHeader(schoolName, schoolAddr, schoolPhone, schoolEmail, schoolLogo, yearLabel, trimLabel, devise);
  const studentHtml = studentInfoBlock(s, classInfo, classStudents, studentRank, trimLabel, yearLabel);
  const tableHtml = gradesTable(sGrades, subjects, classStudents, grades, selectedTrimester, average, totalCoef, totalPoints, classAverage, studentStatus, mention, studentRank, classStudents.length, trend, trendColor);
  const perfHtml = performanceBoard(sGrades, subjects, computeFinal);
  const resultsHtml = resultsBar(average, classAverage, classMax, classMin, studentRank, classStudents.length, mention, studentStatus, trend, trendColor);
  const sigsHtml = signaturesBlock(directorName, principalTeacher, generalAppreciation);

  return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
<title>Bulletin — ${s.firstName} ${s.lastName}</title>
<style>
  ${commonCss()}
  ${modelCss}
</style></head><body><div class="page">
  ${headerHtml}
  ${studentHtml}
  ${alertBanner}
  ${tableHtml}
  ${perfHtml}
  ${resultsHtml}
  ${sigsHtml}
  <div class="doc-footer">
    ${schoolName} — Bulletin officiel — ${yearLabel} — ${trimLabel} — Édité le ${new Date().toLocaleDateString('fr-FR')}
  </div>
</div></body></html>`;
}

// ════════════════════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL
// ════════════════════════════════════════════════════════════════════
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
  const classInfo = classes.find(c => c.id === (student.classId || student.class_id));
  const classStudents = students ? students.filter(s => (s.classId || s.class_id) === classInfo?.id) : [];
  const mention = getMention(average);

  const ranking = classStudents
    .map(s => ({ student: s, average: parseFloat(calculateAverage(s.id, selectedTrimester)) || 0 }))
    .sort((a, b) => b.average - a.average);
  const studentRank = ranking.findIndex(r => r.student.id === student.id) + 1 || '-';
  const trimLabel = `Trimestre ${selectedTrimester}`;

  const t1Avg = parseFloat(calculateAverage(student.id, '1')) || 0;
  const t2Avg = parseFloat(calculateAverage(student.id, '2')) || 0;
  const prevAvg = selectedTrimester === '1' ? 0 : selectedTrimester === '2' ? t1Avg : t2Avg;
  const trend = prevAvg > 0 ? (average > prevAvg + 0.5 ? '↑' : average < prevAvg - 0.5 ? '↓' : '→') : null;
  const trendColor = trend === '↑' ? '#059669' : trend === '↓' ? '#dc2626' : '#d97706';

  const opts = { calculateAverage, grades, subjects, classes, students, schoolLogo, schoolInfo, getMention, selectedTrimester, generalAppreciation };

  const openPrint = (html) => {
    const win = window.open('', '_blank', 'width=960,height=800');
    if (!win) { alert('Autorisez les pop-ups pour imprimer.'); return; }
    win.document.write(html);
    win.document.close();
    setTimeout(() => { win.print(); setTimeout(() => win.close(), 600); }, 500);
  };

  const openBatchPrint = () => {
    if (!classStudents.length) return;
    setIsBatchLoading(true);
    const pages = classStudents.map(s => {
      const html = buildBulletin(s, batchTemplate, opts);
      // On extrait le contenu du body pour la concaténation
      const match = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
      return match ? `<div class="page-break">${match[1]}</div>` : '';
    }).join('');

    const css = commonCss();
    const batchHtml = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
<title>Bulletins — Classe ${classInfo?.name} — ${trimLabel}</title>
<style>
  ${css}
  body { padding: 0; }
  .page-break { padding: 10mm; page-break-after: always; }
  .page-break:last-child { page-break-after: auto; }
  @page { size: A4; margin: 6mm; }
</style></head><body>${pages}</body></html>`;

    const win = window.open('', '_blank', 'width=960,height=800');
    if (!win) { alert('Autorisez les pop-ups pour imprimer.'); setIsBatchLoading(false); return; }
    win.document.write(batchHtml);
    win.document.close();
    setTimeout(() => {
      win.print();
      setTimeout(() => win.close(), 600);
      setIsBatchLoading(false);
    }, 700);
    setShowPrintPreview(false);
  };

  // Bugfix useEffect — dependency array
  useEffect(() => {
    const handler = (e) => {
      const tmpl = e?.detail?.template || bulletinTemplate;
      const html = buildBulletin(student, tmpl, opts);
      if (html) openPrint(html);
    };
    window.addEventListener('print-bulletin', handler);
    return () => window.removeEventListener('print-bulletin', handler);
  }, [bulletinTemplate, generalAppreciation]);

  const modelOptions = [
    { id: 'model1', icon: '📋', label: 'Modèle Officiel', desc: 'Style ministère · Tableau complet', color: 'blue' },
    { id: 'model2', icon: '🎨', label: 'Modèle Moderne', desc: 'Fond clair · Bilan visuel', color: 'emerald' },
    { id: 'model3', icon: '🏆', label: 'Modèle Premium', desc: 'Style sombre · Dégradé premium', color: 'purple' },
  ];

  const colorMap = {
    blue: { border: 'border-blue-400', bg: 'hover:bg-blue-50', btn: 'bg-blue-600 hover:bg-blue-700', hover: 'group-hover:text-blue-700' },
    emerald: { border: 'border-emerald-400', bg: 'hover:bg-emerald-50', btn: 'bg-emerald-600 hover:bg-emerald-700', hover: 'group-hover:text-emerald-700' },
    purple: { border: 'border-purple-400', bg: 'hover:bg-purple-50', btn: 'bg-purple-600 hover:bg-purple-700', hover: 'group-hover:text-purple-700' },
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[94vh] overflow-y-auto">

        {/* ── Header ── */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Impression du bulletin</h3>
            <p className="text-sm text-gray-400">{student.firstName} {student.lastName?.toUpperCase()} — {classInfo?.name} — {trimLabel}</p>
          </div>
          <button onClick={() => setShowPrintPreview(false)} className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Résumé ── */}
        <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 grid grid-cols-4 gap-2 text-center">
          {[
            { val: fmtAvg(average), lbl: 'Moyenne', color: 'text-blue-600' },
            { val: `${studentRank}/${classStudents.length}`, lbl: 'Rang', color: 'text-indigo-600' },
            { val: mention?.text || '—', lbl: 'Mention', color: '', style: { color: mention?.color || '#2563eb' } },
            { val: trend || '—', lbl: 'Évolution', color: '', style: { color: trend ? trendColor : '#9ca3af' } },
          ].map((item, i) => (
            <div key={i} className="bg-white rounded-xl p-2.5 shadow-sm">
              <div className={`text-lg font-black ${item.color}`} style={item.style || {}}>{item.val}</div>
              <div className="text-xs text-gray-400 font-semibold uppercase">{item.lbl}</div>
            </div>
          ))}
        </div>

        {/* ── Appréciation conseil ── */}
        <div className="px-5 pt-4 pb-1">
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
            📝 Appréciation du conseil de classe <span className="text-gray-300 normal-case font-normal">(optionnel)</span>
          </label>
          <textarea
            value={generalAppreciation}
            onChange={e => setGeneralAppreciation(e.target.value)}
            placeholder="Ex: Trimestre encourageant. Des efforts constants sont à poursuivre en mathématiques…"
            rows={2}
            className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none text-gray-700 placeholder-gray-300"
          />
        </div>

        {/* ── Choix du modèle ── */}
        <div className="p-5 space-y-3">
          <p className="text-sm font-semibold text-gray-700">Choisissez un modèle :</p>

          {modelOptions.map(({ id, icon, label, desc, color }) => {
            const c = colorMap[color];
            return (
              <div key={id} className={`border-2 border-gray-200 rounded-xl p-4 transition-all group cursor-pointer ${c.bg} hover:${c.border}`}>
                <div className="flex items-center gap-3 mb-2.5">
                  <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center text-lg flex-shrink-0">{icon}</div>
                  <div>
                    <h4 className={`font-bold text-gray-800 text-sm ${c.hover}`}>{label}</h4>
                    <p className="text-xs text-gray-400">{desc}</p>
                  </div>
                </div>
                <button
                  onClick={() => { openPrint(buildBulletin(student, id, opts)); setShowPrintPreview(false); }}
                  className={`w-full ${c.btn} text-white px-4 py-2 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 text-sm`}
                >
                  <Printer className="w-4 h-4" /> Imprimer ce modèle
                </button>
              </div>
            );
          })}

          {/* ── Batch Print ── */}
          <div className="border-2 border-orange-200 bg-orange-50 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Users className="w-4 h-4 text-orange-600" />
              </div>
              <div>
                <h4 className="font-bold text-orange-800 text-sm">Imprimer toute la classe</h4>
                <p className="text-xs text-orange-500">{classStudents.length} bulletins en 1 clic — choisissez le modèle ci-dessous</p>
              </div>
            </div>
            <div className="mb-2.5">
              <label className="text-xs font-semibold text-orange-700 uppercase mb-1 block">Modèle à utiliser</label>
              <div className="relative">
                <select
                  value={batchTemplate}
                  onChange={e => setBatchTemplate(e.target.value)}
                  className="w-full border border-orange-300 rounded-lg px-3 py-2 text-sm font-medium text-orange-800 bg-white appearance-none focus:outline-none focus:ring-2 focus:ring-orange-400"
                >
                  <option value="model1">📋 Modèle Officiel</option>
                  <option value="model2">🎨 Modèle Moderne</option>
                  <option value="model3">🏆 Modèle Premium</option>
                </select>
                <ChevronDown className="absolute right-2 top-2.5 w-4 h-4 text-orange-400 pointer-events-none" />
              </div>
            </div>
            <button
              onClick={openBatchPrint}
              disabled={isBatchLoading}
              className="w-full bg-orange-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-orange-600 transition-colors flex items-center justify-center gap-2 text-sm disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isBatchLoading
                ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Génération en cours…</>
                : <><Printer className="w-4 h-4" /> Imprimer les {classStudents.length} bulletins</>}
            </button>
          </div>
        </div>

        {/* ── Info tip ── */}
        <div className="px-5 pb-5">
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-700">
            💡 Si la fenêtre d'impression ne s'ouvre pas, autorisez les pop-ups dans votre navigateur pour ce site.
          </div>
        </div>
      </div>
    </div>
  );
}