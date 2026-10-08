// @vitest-environment jsdom
//
// Test « de caractérisation » : fige le HTML exact envoyé à la fenêtre d'impression pour chaque
// modèle (et pour l'impression de toute la classe). Il sert de filet de sécurité pendant les
// refactorisations de PrintPreview : un changement de rendu doit être voulu et visible dans le diff
// du snapshot (src/components/__snapshots__/PrintPreview.golden.test.jsx.snap).
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, fireEvent, cleanup } from '@testing-library/react';

const server = vi.hoisted(() => ({
  absences: [
    { student_id: 's1', type: 'absent', justified: false },
    { student_id: 's1', type: 'absent', justified: true },
    { student_id: 's1', type: 'retard', justified: false },
    { student_id: 's2', type: 'absent', justified: false },
  ],
}));

vi.mock('../config/supabase', () => ({
  supabase: {
    from: (table) => {
      const result = () => Promise.resolve({ data: table === 'absences' ? server.absences : [], error: null });
      return { select: () => ({ eq: result, in: result }) };
    },
    rpc: () => Promise.resolve({ data: [], error: null }),
  },
}));

import PrintPreview from './PrintPreview';
import { calculateAverage, getMention } from '../utils/grades';

const classes = [{ id: 'c1', name: '6ème A' }];
const subjects = [
  { id: 'math', name: 'Maths & <b>Physique</b>', coefficient: 4, teacher: 'M. Kodjo' },
  { id: 'fr', name: 'Français', coefficient: 3 },
];
const students = [
  { id: 's1', firstName: 'Koffi', lastName: 'Mensah', classId: 'c1', birthDate: '2013-04-02' },
  { id: 's2', firstName: 'Ama', lastName: 'Dossou', classId: 'c1' },
  { id: 's3', firstName: 'Yao', lastName: 'Agbo', classId: 'c1' }, // sans note
];
// bonus : null partout — la note enregistrée (value) contient déjà le bonus, voir finalGrade.js
const grades = [
  { studentId: 's1', subjectId: 'math', trimester: '1', value: 15, interro: 14, devoir: 15, composition: 16, bonus: null, teacherName: 'M. Kodjo', appreciation: 'Bon travail' },
  { studentId: 's1', subjectId: 'fr', trimester: '1', value: 11, interro: null, devoir: null, composition: null, bonus: null, teacherName: '', appreciation: '' },
  { studentId: 's1', subjectId: 'math', trimester: '2', value: 13, interro: null, devoir: null, composition: null, bonus: null, teacherName: '', appreciation: '' },
  { studentId: 's1', subjectId: 'fr', trimester: '2', value: 12, interro: null, devoir: null, composition: null, bonus: null, teacherName: '', appreciation: '' },
  { studentId: 's2', subjectId: 'math', trimester: '1', value: 9, interro: null, devoir: null, composition: null, bonus: null, teacherName: '', appreciation: '' },
  { studentId: 's2', subjectId: 'fr', trimester: '1', value: 8, interro: null, devoir: null, composition: null, bonus: null, teacherName: '', appreciation: '' },
  { studentId: 's2', subjectId: 'math', trimester: '2', value: 10, interro: null, devoir: null, composition: null, bonus: null, teacherName: '', appreciation: '' },
];

const baseProps = (overrides = {}) => ({
  printStudent: students[0],
  setShowPrintPreview: () => {},
  selectedTrimester: '1',
  calculateAverage: (id, t) => calculateAverage(id, t, grades, subjects),
  getMention,
  grades, subjects, classes, students,
  appColors: {},
  schoolLogo: 'data:image/png;base64,iVBORw0KGgo=',
  schoolInfo: {
    name: 'Collège Test', year: '2025-2026', address: '12 rue des Écoles', phone: '+228 90 00 00 00', email: 'contact@test.tg',
    republic: 'RÉPUBLIQUE TOGOLAISE', countryMotto: 'Travail · Liberté · Patrie', ministry: 'Ministère des Enseignements',
    devise: "L'excellence avant tout", directorName: 'Mme Adjovi', principalTeacher: 'M. Kodjo',
  },
  handlePrint: () => {},
  ...overrides,
});

let opened;
beforeEach(() => {
  opened = { html: '', document: { write: (h) => { opened.html += h; }, close() {} }, print: vi.fn(), close: vi.fn() };
  vi.spyOn(window, 'open').mockReturnValue(opened);
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-01-15T10:00:00Z'));
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

const renderReady = async (props) => {
  render(<PrintPreview {...props} />);
  await act(async () => { await Promise.resolve(); }); // absences et rang chargés
};

describe('rendu des bulletins (instantané)', () => {
  it.each(['model1', 'model2', 'model3'])('%s : impression d\'un élève', async (template) => {
    await renderReady(baseProps());
    fireEvent.change(screen.getByPlaceholderText(/Bon trimestre/), { target: { value: 'Trimestre sérieux.' } });
    act(() => { window.dispatchEvent(new CustomEvent('print-bulletin', { detail: { template } })); });
    expect(opened.html).toMatchSnapshot();
  });

  it.each(['model1', 'model2', 'model3'])('%s : impression de toute la classe', async (template) => {
    await renderReady(baseProps());
    fireEvent.change(screen.getByRole('combobox'), { target: { value: template } });
    fireEvent.click(screen.getByRole('button', { name: /Imprimer 3 bulletins/ }));
    expect(opened.html).toMatchSnapshot();
  });
});

describe('impression de toute la classe : chaque bulletin porte les données de son élève', () => {
  const printClass = async (template) => {
    await renderReady(baseProps());
    fireEvent.change(screen.getByPlaceholderText(/Bon trimestre/), { target: { value: 'Appréciation de Koffi' } });
    fireEvent.change(screen.getByRole('combobox'), { target: { value: template } });
    fireEvent.click(screen.getByRole('button', { name: /Imprimer 3 bulletins/ }));
    // une « page » par élève : le corps de chaque bulletin est enveloppé dans un div page-break-after
    const doc = new DOMParser().parseFromString(opened.html, 'text/html');
    return Array.from(doc.querySelectorAll('div[style*="page-break-after"]')).map(p => p.textContent.replace(/\s+/g, ' '));
  };

  it('absences : chaque élève a les siennes (et pas celles de l\'élève ouvert)', async () => {
    const [koffi, ama, yao] = await printClass('model1');
    expect(koffi).toContain('2 abs. · 1 ret. · 2 injust.');
    expect(ama).toContain('1 abs. · 0 ret. · 1 injust.');
    expect(yao).toContain('0 abs. · 0 ret. · 0 injust.');
  });

  it('l\'appréciation du conseil de classe saisie n\'est imprimée que sur le bulletin de l\'élève ouvert', async () => {
    const [koffi, ama, yao] = await printClass('model2');
    expect(koffi).toContain('Appréciation de Koffi');
    expect(ama).not.toContain('Appréciation de Koffi');
    expect(yao).not.toContain('Appréciation de Koffi');
  });

  it('les points forts ne sont plus ceux de l\'élève ouvert', async () => {
    const [, , yao] = await printClass('model2');
    expect(yao).not.toContain('Points forts'); // aucune note : rien à valoriser
  });

  it('la mention et la décision gardent leur couleur propre (en ligne, pas dans la feuille de style commune)', async () => {
    await renderReady(baseProps());
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'model2' } });
    fireEvent.click(screen.getByRole('button', { name: /Imprimer 3 bulletins/ }));
    const doc = new DOMParser().parseFromString(opened.html, 'text/html');
    const css = doc.querySelector('style').textContent;
    expect(css).not.toMatch(/\.decision-badge\s*\{[^}]*color:\s*;/); // l'ancien CSS cassé (« color: ; »)
    const badges = Array.from(doc.querySelectorAll('.decision-badge')).map(b => b.getAttribute('style'));
    expect(new Set(badges).size).toBeGreaterThan(1); // admis / à suivre / en difficulté : pas la même couleur
  });
});
