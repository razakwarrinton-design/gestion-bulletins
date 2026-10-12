// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';

vi.mock('../config/supabase', () => ({ supabase: { functions: { invoke: vi.fn() } } }));

import GradesTable from './GradesTable';
import GradesForm from './GradesForm';

afterEach(() => { cleanup(); try { localStorage.clear(); } catch { /* ignore */ } });

const subjects = [{ id: 1, name: 'Maths', coefficient: 2 }, { id: 2, name: 'Français', coefficient: 3 }];
const students = [
  { id: 10, firstName: 'Koffi', lastName: 'Mensah', classId: 1 },
  { id: 11, firstName: 'Ama', lastName: 'Dossou', classId: 1 },
];
const mention = () => ({ text: 'Passable', color: '#d97706' });

const renderTable = ({ grades = {}, onSave = vi.fn().mockResolvedValue({ success: true }) } = {}) => {
  render(
    <GradesTable
      students={students} subjects={subjects} trimester="1"
      getGrade={(studentId, subjectId) => grades[`${studentId}-${subjectId}`]}
      onSave={onSave} calculateAverage={() => '12.00'} getMention={mention}
    />,
  );
  return onSave;
};
const cell = (student, subject) => screen.getByLabelText(`${student.firstName} ${student.lastName}, ${subject.name}`);

describe('GradesTable', () => {
  it('une ligne par élève, une colonne par matière, la moyenne à droite', () => {
    renderTable({ grades: { '10-1': { value: 14 } } });
    expect(screen.getAllByRole('row')).toHaveLength(3); // en-tête + 2 élèves
    expect(screen.getByRole('columnheader', { name: /Maths/ })).toBeTruthy();
    expect(cell(students[0], subjects[0]).value).toBe('14');
    expect(cell(students[0], subjects[1]).value).toBe('');
    expect(screen.getAllByText('12.00/20')).toHaveLength(2);
  });

  it('enregistre une note saisie, sans toucher à l\'appréciation ni au nom du professeur', async () => {
    const onSave = renderTable();
    fireEvent.change(cell(students[0], subjects[1]), { target: { value: '15,5'.replace(',', '.') } });
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1), { timeout: 3000 });
    expect(onSave).toHaveBeenCalledWith(10, 2, '1', 15.5, undefined, { interro: null, devoir: null, composition: null, bonus: null });
  });

  it('efface une note : envoie une valeur vide', async () => {
    const onSave = renderTable({ grades: { '10-1': { value: 14 } } });
    fireEvent.change(cell(students[0], subjects[0]), { target: { value: '' } });
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1), { timeout: 3000 });
    expect(onSave.mock.calls[0][3]).toBe('');
  });

  it('une valeur hors limites est signalée tout de suite et n\'est jamais envoyée', async () => {
    const onSave = renderTable();
    fireEvent.change(cell(students[1], subjects[0]), { target: { value: '1214' } });
    expect((await screen.findByRole('alert')).textContent).toMatch(/entre 0 et 20/);
    expect(cell(students[1], subjects[0]).getAttribute('aria-invalid')).toBe('true');
    await new Promise((resolve) => setTimeout(resolve, 1000));
    expect(onSave).not.toHaveBeenCalled();
    // corrigée : l'alerte disparaît et la note est enregistrée
    fireEvent.change(cell(students[1], subjects[0]), { target: { value: '14' } });
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1), { timeout: 3000 });
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('un refus de la base est affiché dans la case', async () => {
    renderTable({ onSave: vi.fn().mockResolvedValue({ success: false, error: 'Droits insuffisants' }) });
    fireEvent.change(cell(students[0], subjects[0]), { target: { value: '12' } });
    expect((await screen.findByRole('alert', {}, { timeout: 3000 })).textContent).toBe('Droits insuffisants');
  });

  it('une note avec détail (interrogation, devoir, composition, bonus) est en lecture seule : la modifier effacerait le détail', () => {
    renderTable({ grades: { '10-1': { value: 15, interro: 14, devoir: 15, composition: 16 }, '10-2': { value: 13, bonus: 1 } } });
    expect(screen.queryByLabelText('Koffi Mensah, Maths')).toBeNull(); // pas de champ de saisie
    expect(screen.getByLabelText(/Koffi Mensah, Maths : 15, détail à modifier dans la vue Cartes/)).toBeTruthy();
    expect(screen.getByLabelText(/Koffi Mensah, Français : 13/)).toBeTruthy();
    expect(cell(students[1], subjects[0])).toBeTruthy(); // l'autre élève reste modifiable
  });

  it('Entrée et la flèche du bas passent à l\'élève suivant, dans la même matière', () => {
    renderTable();
    const first = cell(students[0], subjects[1]);
    first.focus();
    fireEvent.keyDown(first, { key: 'Enter' });
    expect(document.activeElement).toBe(cell(students[1], subjects[1]));
    fireEvent.keyDown(document.activeElement, { key: 'ArrowUp' });
    expect(document.activeElement).toBe(first);
  });

  it('une note modifiée ailleurs (vue cartes, import) est recopiée dans la case', () => {
    const grades = { '10-1': { value: 10 } };
    const props = (g) => ({
      students, subjects, trimester: '1', getGrade: (a, b) => g[`${a}-${b}`], onSave: vi.fn(),
      calculateAverage: () => '10', getMention: mention,
    });
    const { rerender } = render(<GradesTable {...props(grades)} />);
    expect(cell(students[0], subjects[0]).value).toBe('10');
    rerender(<GradesTable {...props({ '10-1': { value: 17 } })} />);
    expect(cell(students[0], subjects[0]).value).toBe('17');
  });
});

describe('GradesForm : choix de la vue', () => {
  const many = (n) => Array.from({ length: n }, (_, i) => ({
    id: i + 1, firstName: `P${i}`, lastName: `N${i}`, classId: 1, class_id: 1,
  }));
  const renderForm = (count) => render(
    <GradesForm
      classes={[{ id: 1, name: '6ème A' }]} students={many(count)} subjects={subjects}
      selectedClass={1} setSelectedClass={() => {}} selectedTrimester="1" setSelectedTrimester={() => {}}
      getGrade={() => undefined} updateGrade={vi.fn()} calculateAverage={() => 0} getMention={mention}
    />,
  );

  it('petite classe : cartes ; grande classe (plus de 10 élèves) : tableau', () => {
    renderForm(5);
    expect(screen.queryByRole('table')).toBeNull();
    expect(screen.getByRole('button', { name: 'Cartes' }).getAttribute('aria-pressed')).toBe('true');
    cleanup();
    renderForm(11);
    expect(screen.getByRole('table')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Tableau' }).getAttribute('aria-pressed')).toBe('true');
  });

  it('le choix de l\'utilisateur est mémorisé et prime sur la taille de la classe', () => {
    renderForm(11);
    fireEvent.click(screen.getByRole('button', { name: 'Cartes' }));
    expect(screen.queryByRole('table')).toBeNull();
    expect(localStorage.getItem('edupulse.gradesView')).toBe('cards');
    cleanup();
    renderForm(11);
    expect(screen.queryByRole('table')).toBeNull(); // la préférence est relue
  });

  it('fonctionne même si le stockage du navigateur est indisponible', () => {
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('bloqué'); });
    const set = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('bloqué'); });
    renderForm(11);
    expect(screen.getByRole('table')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Cartes' }));
    expect(screen.queryByRole('table')).toBeNull();
    spy.mockRestore();
    set.mockRestore();
  });
});
