import { qrDataUrl } from '../qrCode';
import { currentAcademicYear } from '../studentUtils';
import { getMentionLevel } from '../mentions';
import { finalGrade } from '../finalGrade';
import { getClassRank, hasGrade } from '../grades';

const NO_ABSENCES = { absents: 0, retards: 0, injustifies: 0 };

/** Points forts (meilleures notes) et points à renforcer (moins bonnes notes) d'un élève. */
export function strengthsAndWeaknesses(studentGrades, subjects) {
  const nameOf = (g) => subjects.find(s => s.id === (g.subjectId || g.subject_id))?.name || '?';
  const sorted = [...studentGrades].filter(g => g.value != null).sort((a, b) => b.value - a.value);
  const half = Math.max(1, Math.floor(sorted.length / 2));
  const strengths = sorted.slice(0, Math.min(3, half)).map(g => ({ name: nameOf(g), value: g.value }));
  const weaknesses = sorted.slice(-Math.min(3, half)).reverse().map(g => ({ name: nameOf(g), value: g.value }));
  return { strengths, weaknesses };
}

/**
 * Données et petites fonctions de mise en forme partagées par les modèles de bulletin.
 * Calcule, pour l'élève imprimé, sa moyenne, son rang (celui de la base s'il est connu, sinon le
 * calcul local), les statistiques de classe, les informations de l'école et les blocs communs
 * (en-tête officiel, QR code, cadre de signature).
 */
export function buildBulletinContext({
  printStudent, selectedTrimester, calculateAverage, getMention,
  grades, subjects, classes, students, schoolLogo, schoolInfo,
  absencesByStudent, generalAppreciation, serverRank,
}) {
  const student = printStudent;
  const average = parseFloat(calculateAverage(student.id, selectedTrimester)) || 0;
  const studentGrades = grades.filter(g => (g.studentId || g.student_id) === student.id && g.trimester === selectedTrimester);
  const classInfo = classes.find(c => c.id === (student.classId || student.class_id));
  const classStudents = students ? students.filter(s => (s.classId || s.class_id) === classInfo?.id) : [];
  const mention = getMention(average);

  // Rang : même règle que partout ailleurs (utils/grades) — seuls les élèves ayant une note sont
  // classés et les ex æquo partagent leur rang. Pour l'élève imprimé, la base (qui voit toute la
  // classe) a priorité : un parent ne lit que ses propres enfants.
  const ranking = classStudents.filter(s => hasGrade(s.id, selectedTrimester, grades));
  const rankOf = (studentId) => {
    if (serverRank && studentId === student.id) return serverRank.rank;
    return getClassRank(studentId, selectedTrimester, classStudents, grades, subjects).rank || '-';
  };

  const classAverages = ranking.map(s => parseFloat(calculateAverage(s.id, selectedTrimester)) || 0);
  const localClassAverage = classAverages.length ? classAverages.reduce((a, b) => a + b, 0) / classAverages.length : 0;
  const localClassMax = classAverages.length ? Math.max(...classAverages) : 0;
  const localClassMin = classAverages.length ? Math.min(...classAverages) : 0;

  const studentRank = rankOf(student.id);
  // Nombre d'élèves classés (« rang / total »)
  const classTotal = serverRank ? serverRank.total : ranking.length;
  // Effectif de la classe (tous les élèves, classés ou non) ; la base peut en voir plus que la liste affichée
  const effectif = Math.max(classTotal, classStudents.length);
  const classAverage = serverRank ? Number(serverRank.class_average) : localClassAverage;
  const classMax = serverRank ? Number(serverRank.class_max) : localClassMax;
  const classMin = serverRank ? Number(serverRank.class_min) : localClassMin;

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
  const yearLabel = schoolInfo?.year || currentAcademicYear();

  // ── Champs personnalisables pays/ministère (issus de schoolInfo) ──────────
  const republic = schoolInfo?.republic || '';   // ex: "REPUBLIQUE TOGOLAISE"
  const countryMotto = schoolInfo?.countryMotto || '';   // ex: "Travail · Liberté · Patrie"
  const ministry = schoolInfo?.ministry || '';   // ex: "Ministère des Enseignements Primaire et Secondaire"
  const schoolDevise = schoolInfo?.devise || '';   // devise de l'école

  const fmtAvg = (v) => { const n = parseFloat(v); return isNaN(n) ? '-' : n.toFixed(2); };
  const gradeColor = (v) => v >= 15 ? '#059669' : v >= 10 ? '#2563eb' : v >= 8 ? '#d97706' : '#dc2626';
  const gradeLabel = (v) => getMentionLevel(v)?.label ?? '';

  const { strengths, weaknesses } = strengthsAndWeaknesses(studentGrades, subjects);

  // La note enregistrée contient déjà le bonus : voir utils/finalGrade.js
  const computeFinal = finalGrade;

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
    const url = qrDataUrl(data);
    return `<img src="${url}" width="80" height="80" alt="QR" style="display:block;image-rendering:pixelated;">`;
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

  // Absences et appréciation du conseil de classe sont propres à chaque élève : en impression de
  // classe, chaque bulletin porte les siennes (l'appréciation saisie ne concerne que l'élève ouvert).
  const absencesFor = (studentId) => absencesByStudent?.[studentId] ?? NO_ABSENCES;
  const appreciationFor = (studentId) => (studentId === student.id ? generalAppreciation : '');

  return {
    student, studentGrades, average, mention, ranking, studentRank, studentStatus, totalCoef, totalPoints, classInfo, classStudents, classTotal, classAverage, classMax, classMin, strengths, weaknesses, schoolName, schoolAddr, schoolPhone, schoolEmail, trimLabel, yearLabel, republic, countryMotto, ministry, schoolDevise, fmtAvg, gradeColor, gradeLabel, computeFinal, officialTopBar, qrCodeImg, digitalSigBox, subjects, grades, selectedTrimester, calculateAverage, schoolInfo, schoolLogo, absencesFor, appreciationFor, rankOf, effectif,
  };
}
