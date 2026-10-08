import { strengthsAndWeaknesses } from './context';

// MODÈLE 2 — MODERNE : renvoie le HTML complet du bulletin d'un élève.
// `c` est le contexte de buildBulletinContext ; les autres paramètres sont ceux de l'élève imprimé
// (ils diffèrent de c.student quand on imprime toute la classe).
export function renderModel2(c, s, sGrades, sAvg, sRank, sStatus, sMention, sTotalCoef) {
  const { effectif, schoolInfo, subjects, classInfo, computeFinal, gradeColor, gradeLabel, fmtAvg, qrCodeImg, digitalSigBox, schoolLogo, schoolName, schoolAddr, schoolPhone, trimLabel, yearLabel, republic, countryMotto, ministry, schoolDevise, classTotal, classAverage, classMax, classMin, absencesFor, appreciationFor } = c;
  const absData = absencesFor(s.id);
  const generalAppreciation = appreciationFor(s.id);
  const { strengths, weaknesses } = strengthsAndWeaknesses(sGrades, subjects);
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
  .mention-bar { margin: 10px 16px 8px; border-radius: 0 6px 6px 0; padding: 8px 14px; display: flex; justify-content: space-between; align-items: center; }
  .mention-text { font-size: 11pt; font-weight: 700; }
  .decision-badge { padding: 3px 12px; border-radius: 20px; font-size: 8.5pt; font-weight: 700; }
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
  .class-stats { display: grid; grid-template-columns: repeat(6,1fr); gap: 6px; margin: 0 16px 10px; }
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
      <div class="student-meta">Classe: <strong>${classInfo?.name || 'N/A'}</strong> &nbsp;|&nbsp; Effectif: <strong>${effectif}</strong> &nbsp;|&nbsp; ${yearLabel}${s.birthDate || s.birth_date ? ` &nbsp;|&nbsp; Né(e) le: <strong>${new Date(s.birthDate || s.birth_date).toLocaleDateString('fr-FR')}</strong>` : ''}</div>
    </div>
    <div class="student-stats">
      <div class="stat-pill"><div class="stat-val">${fmtAvg(sAvg)}</div><div class="stat-lbl">Moyenne</div></div>
      <div class="stat-pill"><div class="stat-val">${sRank}</div><div class="stat-lbl">Rang</div></div>
      ${qrCodeImg(s, sAvg, sRank, classTotal)}
    </div>
  </div>

  <div class="mention-bar" style="background:${sMention.color || '#2563eb'}18;border-left:5px solid ${sMention.color || '#2563eb'};">
    <div>
      <div style="font-size:7.5pt;color:#64748b;text-transform:uppercase;font-weight:700;margin-bottom:1px;">Mention</div>
      <div class="mention-text" style="color:${sMention.color || '#2563eb'};">${sMention.text || 'N/A'}</div>
    </div>
    <div class="decision-badge" style="background:${sStatus.color}18;color:${sStatus.color};border:1.5px solid ${sStatus.color};">${sStatus.text}</div>
  </div>

  <div class="class-stats">
    <div class="cstat"><div class="cstat-val">${fmtAvg(classAverage)}</div><div class="cstat-lbl">Moy. classe</div></div>
    <div class="cstat"><div class="cstat-val">${fmtAvg(classMax)}</div><div class="cstat-lbl">Meilleure</div></div>
    <div class="cstat"><div class="cstat-val">${fmtAvg(classMin)}</div><div class="cstat-lbl">Plus basse</div></div>
    <div class="cstat"><div class="cstat-val">${sTotalCoef}</div><div class="cstat-lbl">Total coeff.</div></div>
    <div class="cstat" style="background:${absData.absents > 3 ? '#fef2f2' : '#f8fafc'};"><div class="cstat-val" style="color:${absData.absents > 3 ? '#dc2626' : '#1e40af'};">${absData.absents}</div><div class="cstat-lbl">Absences</div></div>
    <div class="cstat"><div class="cstat-val" style="color:#d97706;">${absData.retards}</div><div class="cstat-lbl">Retards</div></div>
  </div>

  <div class="section">
    <div class="section-title">Résultats par matière</div>
    ${rows}
  </div>

  ${strengths.length > 0 || weaknesses.length > 0 ? `
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:0 16px 10px;">
    ${strengths.length > 0 ? `
    <div style="background:#f0fdf4;border:1.5px solid #86efac;border-radius:8px;padding:8px 12px;">
      <div style="font-size:7.5pt;font-weight:800;color:#166534;text-transform:uppercase;margin-bottom:5px;">💪 Points forts</div>
      ${strengths.map(st => `<div style="display:flex;justify-content:space-between;padding:2px 0;font-size:8pt;border-bottom:1px dashed #bbf7d0;"><span style="font-weight:600;color:#166534;">${st.name}</span><span style="font-weight:800;color:#059669;">${st.value.toFixed(2)}</span></div>`).join('')}
    </div>` : ''}
    ${weaknesses.length > 0 ? `
    <div style="background:#fef2f2;border:1.5px solid #fca5a5;border-radius:8px;padding:8px 12px;">
      <div style="font-size:7.5pt;font-weight:800;color:#991b1b;text-transform:uppercase;margin-bottom:5px;">⚠️ À renforcer</div>
      ${weaknesses.map(st => `<div style="display:flex;justify-content:space-between;padding:2px 0;font-size:8pt;border-bottom:1px dashed #fecaca;"><span style="font-weight:600;color:#991b1b;">${st.name}</span><span style="font-weight:800;color:#dc2626;">${st.value.toFixed(2)}</span></div>`).join('')}
    </div>` : ''}
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
}
