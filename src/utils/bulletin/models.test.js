// @vitest-environment jsdom
//
// Propriétés communes aux trois modèles de bulletin : impression (couleurs, coupures de page, tenue sur une
// page), texte échappé, rang en ordinal, légende de lecture, cadre d'appréciation à remplir à la main.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { buildBulletinContext, renderBulletin } from './index';
import { esc, ordinalRank, scaleLegend, DENSE_FROM_ROWS } from './shared';
import { calculateAverage, getMention } from '../grades';

const MODELS = ['model1', 'model2', 'model3'];

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-01-15T10:00:00Z'));
});
afterEach(() => vi.useRealTimers());

function html(template, { subjectCount = 3, student = {}, schoolInfo = {}, appreciation = '', subjectName = null, grade = {}, absences } = {}) {
  const subjects = Array.from({ length: subjectCount }, (_, i) => ({
    id: `m${i}`, name: i === 0 && subjectName ? subjectName : `Matière ${i + 1}`, coefficient: (i % 3) + 1, teacher: 'M. Kodjo',
  }));
  const koffi = { id: 's1', firstName: 'Koffi', lastName: 'Mensah', classId: 'c1', ...student };
  const students = [koffi, { id: 's2', firstName: 'Ama', lastName: 'Dossou', classId: 'c1' }];
  const grades = students.flatMap((st, si) => subjects.map((sub, i) => ({
    studentId: st.id, subjectId: sub.id, trimester: '1', value: 9 + ((si * 3 + i * 2) % 9),
    interro: 12, devoir: 13, composition: 14, bonus: null, teacherName: 'M. Kodjo', appreciation: '', ...(st.id === 's1' && i === 0 ? grade : {}),
  })));
  const c = buildBulletinContext({
    printStudent: koffi, selectedTrimester: '1',
    calculateAverage: (id, t) => calculateAverage(id, t, grades, subjects), getMention,
    grades, subjects, classes: [{ id: 'c1', name: '6ème A' }], students, schoolLogo: '',
    schoolInfo: { name: 'Collège Test', year: '2025-2026', directorName: 'Mme Adjovi', ...schoolInfo },
    absencesByStudent: { s1: absences ?? { absents: 2, retards: 1, injustifies: 1 } },
    generalAppreciation: appreciation, serverRank: null,
  });
  return renderBulletin(template, c, koffi, c.studentGrades, c.average, c.studentRank, c.studentStatus, c.mention, c.totalCoef, c.totalPoints);
}

const parse = (text) => new DOMParser().parseFromString(text, 'text/html');

describe.each(MODELS)('%s', (template) => {
  it("imprime les couleurs de fond, répète l'en-tête du tableau et ne coupe pas une ligne entre deux pages", () => {
    const css = html(template).match(/<style>([\s\S]*?)<\/style>/)[1];
    expect(css).toContain('print-color-adjust: exact');
    expect(css).toMatch(/thead\s*\{\s*display:\s*table-header-group/);
    expect(css).toMatch(/\.keep\s*\{[^}]*break-inside:\s*avoid/);
  });

  it('échappe les textes saisis : un nom ou une matière contenant du HTML ne casse pas la page', () => {
    const out = html(template, {
      student: { firstName: '<img src=x onerror=alert(1)>', lastName: 'A&B' },
      schoolInfo: { name: 'École <i>Test</i>', republic: '<b>RÉPUBLIQUE</b>' },
      subjectName: 'Maths <script>x()</script>',
      appreciation: 'Bien <u>travaillé</u>',
      grade: { appreciation: 'Notes <em>justes</em>' },
    });
    expect(out).not.toMatch(/<img src=x/);
    expect(out).not.toContain('<script>x()');
    expect(out).not.toContain('<i>Test</i>');
    expect(out).not.toContain('<b>RÉPUBLIQUE</b>');
    expect(out).not.toContain('<u>travaillé</u>');
    expect(out).not.toContain('<em>justes</em>');
    expect(out).toContain('&lt;img src=x onerror=alert(1)&gt;');
    expect(out).toContain('A&amp;B');
  });

  it('conserve les apostrophes (N\'Dri) : elles sont échappées, donc lues normalement par le navigateur', () => {
    const doc = parse(html(template, { student: { lastName: "N'Dri" } }));
    expect(doc.body.textContent).toContain("N'DRI");
  });

  it('affiche le rang en ordinal', () => {
    const out = parse(html(template)).body.textContent.replace(/\s+/g, ' ');
    expect(out).toContain('2e'); // Koffi est 2e sur 2 : jamais « 2 » seul
    expect(out).not.toMatch(/Rang\s*2\s*\//);
  });

  it('contient la légende des mentions, lue dans les barèmes', () => {
    const text = parse(html(template)).body.textContent.replace(/\s+/g, ' ');
    expect(text).toContain('Félicitations ≥ 16');
    expect(text).toContain("Tableau d'honneur ≥ 14");
    expect(text).toContain('ADMIS(E) ≥ 12');
    expect(text).toContain('EN DIFFICULTÉ < 8');
  });

  it(`passe en mise en page compacte au-delà de ${DENSE_FROM_ROWS} matières seulement`, () => {
    expect(html(template, { subjectCount: DENSE_FROM_ROWS })).not.toContain('page dense');
    expect(html(template, { subjectCount: DENSE_FROM_ROWS + 1 })).toContain('class="page dense"');
  });
});

describe('modèle 1', () => {
  it('le total général a autant de colonnes que le tableau (les valeurs sont sous leur en-tête)', () => {
    const doc = parse(html('model1'));
    const headerCols = doc.querySelectorAll('thead th').length;
    const totalRow = Array.from(doc.querySelectorAll('tbody tr')).pop();
    const totalCols = Array.from(totalRow.children).reduce((sum, td) => sum + (Number(td.getAttribute('colspan')) || 1), 0);
    expect(totalCols).toBe(headerCols);
    // « Note /20 » = 7e colonne, « Moy.Cl. » = 8e, « Total pts » = 9e
    const cells = Array.from(totalRow.children);
    expect(cells[1].textContent).toMatch(/\/20$/);
    expect(cells[3].textContent).toMatch(/^\d+\.\d{2}$/); // total des points sous « Total pts »
  });

  it('les marges sont portées par la page, pas par le body (sinon elles disparaissent en impression de classe)', () => {
    const css = html('model1').match(/<style>([\s\S]*?)<\/style>/)[1];
    expect(css).toMatch(/\.page\s*\{[^}]*padding:\s*9mm 10mm/);
    expect(css).not.toMatch(/body\s*\{[^}]*padding/);
  });

  it('indique le maximum et le minimum de la classe', () => {
    expect(parse(html('model1')).body.textContent).toMatch(/max \d+\.\d{2} · min \d+\.\d{2}/);
  });
});

describe('modèles 2 et 3', () => {
  it.each(['model2', 'model3'])("%s : lignes à remplir à la main quand le conseil de classe n'a rien saisi", (template) => {
    expect(html(template)).toContain('class="hand-lines"');
    const filled = html(template, { appreciation: 'Trimestre sérieux.' });
    expect(filled).not.toContain('class="hand-lines"');
    expect(filled).toContain('Trimestre sérieux.');
  });

  it.each(['model2', 'model3'])('%s : légende par matière et absences injustifiées', (template) => {
    const text = parse(html(template)).body.textContent.replace(/\s+/g, ' ');
    expect(text).toContain('Niveau par matière');
    expect(text).toMatch(/1 injust\./);
  });

  it('modèle 3 : le tableau ne déborde plus sur le panneau latéral', () => {
    const css = html('model3').match(/<style>([\s\S]*?)<\/style>/)[1];
    expect(css).toMatch(/table\s*\{[^}]*table-layout:\s*fixed/);
    expect(css).toMatch(/grid-template-columns:\s*minmax\(0,\s*1fr\)\s*152px/);
  });
});

describe('aides communes', () => {
  it('esc neutralise & < > " \'', () => {
    expect(esc(`<a href="x">&'</a>`)).toBe('&lt;a href=&quot;x&quot;&gt;&amp;&#39;&lt;/a&gt;');
    expect(esc(null)).toBe('');
  });

  it('ordinalRank : 1er, 2e…, et conserve « - » (élève sans note)', () => {
    expect(ordinalRank(1)).toBe('1er');
    expect(ordinalRank('3')).toBe('3e');
    expect(ordinalRank('-')).toBe('-');
    expect(ordinalRank(0)).toBe('0');
  });

  it('scaleLegend : un barème modifié se retrouve dans la légende (les seuils ne sont jamais recopiés)', () => {
    const legend = scaleLegend({ decisionFor: (v) => ({ text: v >= 10 ? 'REÇU' : 'AJOURNÉ' }) });
    expect(legend).toContain('REÇU ≥ 12');
    expect(legend).toContain('AJOURNÉ &lt; 8');
  });
});
