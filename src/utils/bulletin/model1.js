// MODÈLE 1 — OFFICIEL : renvoie le HTML complet du bulletin d'un élève.
// `c` est le contexte de buildBulletinContext ; les autres paramètres sont ceux de l'élève imprimé
// (ils diffèrent de c.student quand on imprime toute la classe).
export function renderModel1(c, s, sGrades, sAvg, sRank, sStatus, sMention, sTotalCoef, sTotalPts) {
  const { schoolInfo, subjects, grades, classStudents, classInfo, selectedTrimester, computeFinal, gradeColor, fmtAvg, officialTopBar, qrCodeImg, digitalSigBox, schoolLogo, schoolName, schoolAddr, schoolPhone, schoolEmail, trimLabel, yearLabel, schoolDevise, classTotal, classAverage, effectif, absencesFor, appreciationFor } = c;
  const absData = absencesFor(s.id);
  const generalAppreciation = appreciationFor(s.id);
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
      const cAvgs = classStudents.map(st => {
        const sg = grades.find(gg => (gg.studentId || gg.student_id) === st.id && (gg.subjectId || gg.subject_id) === (g.subjectId || g.subject_id) && gg.trimester === selectedTrimester);
        return computeFinal(sg) || 0;
      }).filter(v => v > 0);
      const subjClsAvg = cAvgs.length ? (cAvgs.reduce((a, b) => a + b, 0) / cAvgs.length).toFixed(2) : '—';
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
          <td class="center" style="font-size:8pt;color:#6b7280;">${subjClsAvg}</td>
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
  .results-band { display: grid; grid-template-columns: repeat(6, 1fr); border: 2px solid #1e40af; margin-bottom: 8px; }
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
      <div class="info-row"><div class="info-label">Effectif</div><div class="info-value">${effectif} élèves</div></div>
      <div class="info-row"><div class="info-label">Rang</div><div class="info-value">${sRank} / ${classTotal}</div></div>
      <div class="info-row"><div class="info-label">Trimestre</div><div class="info-value">${trimLabel}</div></div>
      ${s.birthDate || s.birth_date ? `<div class="info-row"><div class="info-label">Date de naissance</div><div class="info-value">${new Date(s.birthDate || s.birth_date).toLocaleDateString('fr-FR')}</div></div>` : ''}
      <div class="info-row"><div class="info-label">Absences</div><div class="info-value" style="color:${absData.absents > 3 ? '#dc2626' : '#374151'};">${absData.absents} abs. · ${absData.retards} ret. · ${absData.injustifies} injust.</div></div>
    </div>
    <div style="flex-shrink:0;">${qrCodeImg(s, sAvg, sRank, classTotal)}</div>
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
        <th style="width:42px;">Moy.Cl.</th>
        <th style="width:48px;">Total pts</th>
        <th class="left">Appréciation</th>
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
    <div class="result-cell"><div class="result-label">Rang</div><div class="result-value">${sRank}<span style="font-size:8pt;">/${classTotal}</span></div></div>
    <div class="result-cell"><div class="result-label">Mention</div><div class="result-value" style="font-size:9.5pt;color:${sMention.color || '#1e40af'};">${sMention.text}</div></div>
    <div class="result-cell"><div class="result-label">Décision</div><div class="result-value" style="font-size:9.5pt;color:${sStatus.color};">${sStatus.text}</div></div>
    <div class="result-cell" style="background:${absData.absents > 3 ? '#fef2f2' : '#f8fafc'}"><div class="result-label">Absences</div><div class="result-value" style="font-size:9.5pt;color:${absData.absents > 3 ? '#dc2626' : '#374151'};">${absData.absents}<span style="font-size:7pt;"> abs.</span></div><div style="font-size:6.5pt;color:#94a3b8;">${absData.retards} retard${absData.retards > 1 ? 's' : ''}</div></div>
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
}
