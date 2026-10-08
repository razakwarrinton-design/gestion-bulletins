import { strengthsAndWeaknesses } from './context';

// MODÈLE 3 — PREMIUM : renvoie le HTML complet du bulletin d'un élève.
// `c` est le contexte de buildBulletinContext ; les autres paramètres sont ceux de l'élève imprimé
// (ils diffèrent de c.student quand on imprime toute la classe).
export function renderModel3(c, s, sGrades, sAvg, sRank, sStatus, sMention, sTotalCoef, sTotalPts) {
  const { effectif, schoolInfo, subjects, grades, classStudents, classInfo, selectedTrimester, calculateAverage, computeFinal, gradeColor, gradeLabel, fmtAvg, qrCodeImg, digitalSigBox, schoolLogo, schoolName, schoolAddr, schoolPhone, schoolEmail, trimLabel, yearLabel, republic, countryMotto, ministry, schoolDevise, classTotal, classAverage, classMax, classMin, absencesFor, appreciationFor } = c;
  const absData = absencesFor(s.id);
  const generalAppreciation = appreciationFor(s.id);
    const directorName = schoolInfo?.directorName || schoolInfo?.director || '';
    const principalTeacher = schoolInfo?.principalTeacher || '';

    const sT1 = parseFloat(calculateAverage(s.id, '1')) || 0;
    const sT2 = parseFloat(calculateAverage(s.id, '2')) || 0;
    const sT3 = parseFloat(calculateAverage(s.id, '3')) || 0;
    const { strengths: sStr, weaknesses: sWeak } = strengthsAndWeaknesses(sGrades, subjects);

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
  .kpis { display: grid; grid-template-columns: repeat(6,1fr); border: 1.5px solid #e2e8f0; }
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
  .mention-box { border-radius: 8px; padding: 9px; text-align: center; }
  .mention-val { font-size: 12pt; font-weight: 900; }
  .decision-tag { display:inline-block; padding:2px 10px; border-radius:20px; font-size:7.5pt; font-weight:800; margin-top:5px; }
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
        ${qrCodeImg(s, sAvg, sRank, classTotal)}
      </div>
    </div>
  </div>

  <div class="student-banner">
    <div>
      <div class="student-fullname">${s.firstName} ${s.lastName?.toUpperCase()}</div>
      <div class="student-class">Classe: <strong>${classInfo?.name || 'N/A'}</strong> &nbsp;·&nbsp; Effectif: <strong>${effectif}</strong> &nbsp;·&nbsp; Rang: <strong>${sRank}/${classTotal}</strong>${s.birthDate || s.birth_date ? ` &nbsp;·&nbsp; Né(e) le: <strong>${new Date(s.birthDate || s.birth_date).toLocaleDateString('fr-FR')}</strong>` : ''}</div>
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
    <div class="kpi" style="background:${absData.absents > 3 ? '#fef2f2' : 'inherit'};"><div class="kpi-val" style="color:${absData.absents > 3 ? '#dc2626' : '#1e40af'};">${absData.absents}</div><div class="kpi-lbl">Absences</div><div style="font-size:6pt;color:#94a3b8;">${absData.retards} ret.</div></div>
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
      <div class="mention-box" style="background:linear-gradient(135deg,${sMention.color || '#2563eb'}15,${sMention.color || '#2563eb'}08);border:2px solid ${sMention.color || '#2563eb'};">
        <div style="font-size:7pt;color:#64748b;text-transform:uppercase;font-weight:700;margin-bottom:3px;">Mention</div>
        <div class="mention-val" style="color:${sMention.color || '#2563eb'};">${sMention.text || 'N/A'}</div>
        <div class="decision-tag" style="background:${sStatus.color}18;color:${sStatus.color};border:1.5px solid ${sStatus.color};">${sStatus.text}</div>
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
}
