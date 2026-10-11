// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { buildClassSummaryHtml, summaryRows, summaryStats } from './classSummary';
import { calculateAverage } from '../grades';
import { applyGradingScale } from '../gradingScale';
import { prepareBulletinHtml } from '../printSecurity';

afterEach(() => applyGradingScale(null));

const subjects = [
  { id: 'm', name: 'Maths', coefficient: 2 },
  { id: 'f', name: 'Français', coefficient: 3 },
];
const students = [
  { id: 's1', firstName: 'Koffi', lastName: 'Mensah' },
  { id: 's2', firstName: 'Ama', lastName: 'Dossou' },
  { id: 's3', firstName: 'Yao', lastName: 'Agbo' },
  { id: 's4', firstName: 'Esi', lastName: 'Zinsou' }, // aucune note
  { id: 's5', firstName: 'Kodjo', lastName: 'Bella' }, // ex æquo avec s1
];
const g = (studentId, subjectId, value, trimester = '1') => ({ studentId, subjectId, trimester, value });
const grades = [
  g('s1', 'm', 16), g('s1', 'f', 16), // 16
  g('s2', 'm', 9), g('s2', 'f', 9), // 9
  g('s3', 'm', 19), g('s3', 'f', 19), // 19
  g('s5', 'm', 16), g('s5', 'f', 16), // 16
  g('s1', 'm', 2, '2'), // autre trimestre : ignoré
];
const avg = (id, t) => calculateAverage(id, t, grades, subjects);
const rows = () => summaryRows({ students, subjects, grades, trimester: '1', calculateAverage: avg });

const html = (overrides = {}) => buildClassSummaryHtml({
  className: '6ème A', trimester: '1', yearLabel: '2026-2027',
  schoolInfo: { name: 'Collège Test', directorName: 'Mme Adjovi', principalTeacher: 'M. Kodjo' },
  students, subjects, grades, calculateAverage: avg, ...overrides,
});
const text = (h) => new DOMParser().parseFromString(h, 'text/html').body.textContent.replace(/\s+/g, ' ');

describe('summaryRows', () => {
  it('classe par moyenne, les ex æquo partagent le rang (ordre alphabétique), les élèves sans note sont en dernier', () => {
    expect(rows().map((r) => [r.student.id, r.rank])).toEqual([
      ['s3', 1], ['s5', 2], ['s1', 2], ['s2', 4], ['s4', null],
    ]);
  });

  it('ne lit que le trimestre demandé', () => {
    const t2 = summaryRows({ students, subjects, grades, trimester: '2', calculateAverage: (id, t) => calculateAverage(id, t, grades, subjects) });
    expect(t2.filter((r) => r.graded).map((r) => r.student.id)).toEqual(['s1']);
    expect(t2[0].values).toEqual([2, null]);
  });
});

describe('summaryStats', () => {
  it('compte seulement les élèves classés', () => {
    const stats = summaryStats(rows());
    expect(stats).toMatchObject({ effectif: 5, classed: 4, max: 19, min: 9, admitted: 3, struggling: 0 });
    expect(stats.average).toBeCloseTo((16 + 9 + 19 + 16) / 4, 5);
  });

  it("suit le barème de l'école : admission à 10 et difficulté à 10 changent les effectifs", () => {
    applyGradingScale({ cutoffs: [19, 17, 15, 12, 11], difficulty: 10, admission: 10.5 });
    expect(summaryStats(rows())).toMatchObject({ admitted: 3, struggling: 1 }); // 9 < 10
  });

  it('classe vide : pas de division par zéro', () => {
    expect(summaryStats([])).toMatchObject({ effectif: 0, classed: 0, average: null, max: null, min: null });
  });
});

describe('buildClassSummaryHtml', () => {
  it('contient une ligne par élève dans l\'ordre du classement, avec rang ordinal, mention et décision', () => {
    const doc = new DOMParser().parseFromString(html(), 'text/html');
    const trs = Array.from(doc.querySelectorAll('tbody tr')).map((tr) => Array.from(tr.children).map((td) => td.textContent.trim()));
    expect(trs).toHaveLength(5);
    expect(trs[0]).toEqual(['1er', 'AGBO Yao', '19.00', '19.00', '19.00', 'Excellent', 'ADMIS(E)']);
    expect(trs[1][0]).toBe('2e');
    expect(trs[2][0]).toBe('2e');
    expect(trs[3]).toEqual(['4e', 'DOSSOU Ama', '9.00', '9.00', '9.00', 'Insuffisant', 'À SUIVRE']);
    expect(trs[4]).toEqual(['-', 'ZINSOU Esi', '', '', '', 'Aucune note', '']);
  });

  it('affiche les statistiques de la classe, la légende du barème et les signatures', () => {
    const t = text(html());
    expect(t).toContain('Classés : 4/5');
    expect(t).toContain('Moyenne de la classe : 15.00');
    expect(t).toContain('Plus forte : 19.00');
    expect(t).toContain('Admis : 3 (75 %)');
    expect(t).toContain('Excellent ≥ 18');
    expect(t).toMatch(/Le professeur principals*M. Kodjo/);
    expect(t).toMatch(/Le directeurs*Mme Adjovi/);
    expect(t).toContain('Trimestre 1 · Année 2026-2027');
  });

  it('imprime les couleurs, en paysage, et propose un nom de fichier propre', () => {
    const h = html();
    expect(h).toContain('print-color-adjust: exact');
    expect(h).toContain('A4 landscape');
    expect(h).toContain('<title>Tableau-recapitulatif_6ème_A_T1_2026-2027</title>');
  });

  it('échappe tout texte saisi : élève, matière, école, direction', () => {
    const h = html({
      className: '<b>6A</b>',
      schoolInfo: { name: '<script>x()</script>', directorName: '<img src=x onerror=1>' },
      students: [{ id: 's1', firstName: '<i>Koffi</i>', lastName: 'A&B' }],
      subjects: [{ id: 'm', name: '<u>Maths</u>', coefficient: 2 }],
    });
    expect(h).not.toMatch(/<script>x|<img src=x|<i>Koffi|<u>Maths|<b>6A/);
    expect(h).toContain('A&amp;B');
    // et le document survit au nettoyage d'impression sans perdre son contenu
    const printed = prepareBulletinHtml(h);
    expect(printed).toContain('Content-Security-Policy');
    expect(text(printed)).toContain('A&B');
  });

  it('une classe sans élève donne un tableau vide sans erreur', () => {
    expect(() => html({ students: [] })).not.toThrow();
    expect(text(html({ students: [] }))).toContain('Classés : 0/0');
  });

  it('passe en mise en page resserrée à partir de 12 matières', () => {
    const many = Array.from({ length: 12 }, (_, i) => ({ id: `x${i}`, name: `Matière ${i}`, coefficient: 1 }));
    expect(html({ subjects: many })).toContain('class="page dense"');
    expect(html()).not.toContain('page dense');
  });
});
