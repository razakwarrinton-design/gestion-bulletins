// Tableau récapitulatif d'une classe pour un trimestre (procès-verbal du conseil de classe) : une ligne par élève
// avec ses notes par matière, sa moyenne, son rang, sa mention et la décision, puis les statistiques de la classe.
// Même règles que les bulletins : rang et ex æquo de utils/grades, barème de l'école, texte saisi échappé.
import { getClassRank, hasGrade, getMention, decisionFor } from '../grades';
import { getScale } from '../gradingScale';
import { esc, PRINT_CSS, scaleLegend } from './shared';
import { fileTitle } from './index';

const fmt = (value) => {
  const n = parseFloat(value);
  return Number.isNaN(n) ? '' : n.toFixed(2);
};

/** Les 12 premières matières gardent le corps de texte normal ; au-delà, la mise en page se resserre. */
const DENSE_FROM_SUBJECTS = 12;

/**
 * Lignes du tableau, classées : d'abord les élèves classés (rang croissant, puis ordre alphabétique pour les ex æquo),
 * puis ceux qui n'ont aucune note ce trimestre (jamais classés, jamais comptés dans les statistiques).
 */
export function summaryRows({ students, subjects, grades, trimester, calculateAverage }) {
  const byStudent = new Map();
  for (const g of grades) {
    if (g.trimester !== trimester) continue;
    if (!byStudent.has(g.studentId)) byStudent.set(g.studentId, new Map());
    byStudent.get(g.studentId).set(g.subjectId, g.value);
  }
  const rows = students.map((student) => {
    const graded = hasGrade(student.id, trimester, grades);
    const average = graded ? parseFloat(calculateAverage(student.id, trimester)) || 0 : null;
    const { rank } = getClassRank(student.id, trimester, students, grades, subjects);
    return {
      student, graded, average, rank: graded ? rank : null,
      values: subjects.map((s) => byStudent.get(student.id)?.get(s.id) ?? null),
    };
  });
  const name = (r) => `${r.student.lastName ?? ''} ${r.student.firstName ?? ''}`;
  return rows.sort((a, b) => {
    if (a.graded !== b.graded) return a.graded ? -1 : 1;
    if (a.graded && a.rank !== b.rank) return a.rank - b.rank;
    return name(a).localeCompare(name(b), 'fr');
  });
}

/** Statistiques de la classe : sur les élèves classés seulement. */
export function summaryStats(rows) {
  const averages = rows.filter((r) => r.graded).map((r) => r.average);
  const count = averages.length;
  const { admission, difficulty } = getScale();
  return {
    effectif: rows.length,
    classed: count,
    average: count ? averages.reduce((a, b) => a + b, 0) / count : null,
    max: count ? Math.max(...averages) : null,
    min: count ? Math.min(...averages) : null,
    admitted: averages.filter((a) => a >= admission).length,
    struggling: averages.filter((a) => a < difficulty).length,
  };
}

const CSS = `
  @page { size: A4 landscape; margin: 0; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: Arial, Helvetica, sans-serif; color: #0f172a; }
  .page { width: 297mm; min-height: 210mm; padding: 8mm 10mm 6mm; }
  h1 { margin: 0; font-size: 14pt; color: #1e3a5f; }
  .meta { display: flex; justify-content: space-between; align-items: flex-end; margin: 2mm 0 3mm; font-size: 8.5pt; color: #334155; }
  table { width: 100%; border-collapse: collapse; font-size: 7.5pt; }
  th { background: #1e3a5f; color: #fff; padding: 3px 2px; font-weight: 700; text-align: center; vertical-align: bottom; }
  td { border-bottom: 1px solid #e2e8f0; padding: 2.5px 3px; text-align: center; }
  td.name, th.name { text-align: left; }
  tr:nth-child(even) td { background: #f8fafc; }
  .num { font-variant-numeric: tabular-nums; }
  .stats { display: flex; gap: 6mm; margin-top: 3mm; font-size: 8pt; }
  .stats div { border: 1px solid #cbd5e1; border-radius: 4px; padding: 2px 6px; }
  .sign { display: flex; justify-content: space-between; margin-top: 4mm; font-size: 8pt; }
  .sign div { width: 70mm; min-height: 16mm; border-top: 1px solid #94a3b8; padding-top: 2px; text-align: center; color: #475569; }
  .dense table { font-size: 6.4pt; }
  .dense td { padding: 1.5px 2px; }
  ${PRINT_CSS}`;

/** Document HTML complet du tableau récapitulatif (à passer par prepareBulletinHtml avant impression). */
export function buildClassSummaryHtml({
  className, trimester, yearLabel, schoolInfo, students, subjects, grades, calculateAverage,
}) {
  const rows = summaryRows({ students, subjects, grades, trimester, calculateAverage });
  const stats = summaryStats(rows);
  const dense = subjects.length >= DENSE_FROM_SUBJECTS;
  const title = fileTitle('Tableau-recapitulatif', className, `T${trimester}`, yearLabel);

  const head = subjects.map((s) => `<th>${esc(s.name)}<br><span style="font-weight:400">coef ${esc(s.coefficient ?? '')}</span></th>`).join('');
  const body = rows.map((r) => {
    const mention = r.graded ? getMention(r.average) : null;
    const decision = r.graded ? decisionFor(r.average) : null;
    return `<tr>
      <td class="num">${r.graded ? esc(r.rank === 1 ? '1er' : `${r.rank}e`) : '-'}</td>
      <td class="name"><b>${esc((r.student.lastName ?? '').toUpperCase())}</b> ${esc(r.student.firstName ?? '')}</td>
      ${r.values.map((v) => `<td class="num">${esc(fmt(v))}</td>`).join('')}
      <td class="num"><b>${r.graded ? esc(fmt(r.average)) : ''}</b></td>
      <td style="color:${mention ? mention.color : '#64748b'}">${mention ? esc(mention.text) : 'Aucune note'}</td>
      <td style="color:${decision ? decision.color : '#64748b'};font-weight:700">${decision ? esc(decision.text) : ''}</td>
    </tr>`;
  }).join('');

  const school = esc(schoolInfo?.name || 'ÉTABLISSEMENT SCOLAIRE');
  const pct = stats.classed ? Math.round((stats.admitted / stats.classed) * 100) : 0;
  const statBox = (label, value) => `<div>${label} : <b>${value}</b></div>`;

  return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>${esc(title)}</title><style>${CSS}</style></head>
<body><div class="page${dense ? ' dense' : ''}">
  <div class="meta">
    <div><h1>Tableau récapitulatif — ${esc(className)}</h1>${school}</div>
    <div style="text-align:right">Trimestre ${esc(trimester)} · Année ${esc(yearLabel)}<br>Effectif : ${stats.effectif} élève(s)</div>
  </div>
  <table>
    <thead><tr><th>Rang</th><th class="name">Élève</th>${head}<th>Moyenne</th><th>Mention</th><th>Décision</th></tr></thead>
    <tbody>${body}</tbody>
  </table>
  <div class="stats keep">
    ${statBox('Classés', `${stats.classed}/${stats.effectif}`)}
    ${statBox('Moyenne de la classe', stats.average == null ? '-' : fmt(stats.average))}
    ${statBox('Plus forte', stats.max == null ? '-' : fmt(stats.max))}
    ${statBox('Plus faible', stats.min == null ? '-' : fmt(stats.min))}
    ${statBox('Admis', `${stats.admitted} (${pct} %)`)}
    ${statBox('En difficulté', stats.struggling)}
  </div>
  ${scaleLegend()}
  <div class="sign keep">
    <div>Le professeur principal<br>${esc(schoolInfo?.principalTeacher || '')}</div>
    <div>Le directeur<br>${esc(schoolInfo?.directorName || '')}</div>
  </div>
</div></body></html>`;
}
