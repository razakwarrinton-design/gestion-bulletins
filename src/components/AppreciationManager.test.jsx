// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import AppreciationManager from './AppreciationManager';

afterEach(cleanup);

const students = [{ id: 4, firstName: 'Koffi', lastName: 'Mensah', classId: 1 }, { id: 5, firstName: 'Ama', lastName: 'Dossou', classId: 1 }];
const subjects = [{ id: 2, name: 'Maths' }];

const setup = (props = {}) => {
  const onAdd = vi.fn().mockResolvedValue({ success: true });
  const onDelete = vi.fn().mockResolvedValue({ success: true });
  const showNotification = vi.fn();
  render(<AppreciationManager
    students={students} subjects={subjects} selectedClass={1} selectedTrimester="2"
    showNotification={showNotification} appreciations={[]} onAdd={onAdd} onDelete={onDelete} {...props}
  />);
  return { onAdd, onDelete, showNotification };
};

const fill = ({ student = '4', subject = '2', text = 'Bon travail' } = {}) => {
  fireEvent.change(screen.getByDisplayValue('Sélectionner un élève'), { target: { value: student } });
  if (subject) fireEvent.change(screen.getByDisplayValue('Sélectionner une matière'), { target: { value: subject } });
  fireEvent.change(screen.getByPlaceholderText("Entrez l'appréciation..."), { target: { value: text } });
};

describe('AppreciationManager', () => {
  it('enregistre une appréciation d\'enseignant avec les identifiants d\'origine (nombres)', async () => {
    const { onAdd, showNotification } = setup();
    fill();
    fireEvent.click(screen.getByText('Enregistrer'));
    await waitFor(() => expect(onAdd).toHaveBeenCalled());
    expect(onAdd).toHaveBeenCalledWith({ studentId: 4, subjectId: 2, trimester: '2', type: 'teacher', text: 'Bon travail' });
    await waitFor(() => expect(showNotification).toHaveBeenCalledWith('Appréciation enregistrée'));
  });

  it('refuse un formulaire incomplet sans appeler la base', () => {
    const { onAdd, showNotification } = setup();
    fill({ text: '   ' });
    fireEvent.click(screen.getByText('Enregistrer'));
    expect(onAdd).not.toHaveBeenCalled();
    expect(showNotification).toHaveBeenCalledWith('Veuillez remplir tous les champs');
  });

  it('une appréciation du conseil de classe n\'a pas de matière', async () => {
    const { onAdd } = setup();
    fireEvent.click(screen.getByText(/Conseil de classe/));
    fill({ subject: null, text: 'Félicitations' });
    fireEvent.click(screen.getByText('Enregistrer'));
    await waitFor(() => expect(onAdd).toHaveBeenCalled());
    expect(onAdd).toHaveBeenCalledWith({ studentId: 4, subjectId: null, trimester: '2', type: 'council', text: 'Félicitations' });
  });

  it('annonce l\'échec au lieu d\'un faux « enregistrée » et garde le texte saisi', async () => {
    const { showNotification } = setup({ onAdd: vi.fn().mockResolvedValue({ success: false, error: 'droits insuffisants' }) });
    fill();
    fireEvent.click(screen.getByText('Enregistrer'));
    await waitFor(() => expect(showNotification).toHaveBeenCalledWith('Erreur : appréciation non enregistrée (droits insuffisants)'));
    expect(screen.getByPlaceholderText("Entrez l'appréciation...").value).toBe('Bon travail');
  });

  it('liste les appréciations de l\'onglet avec l\'élève et la matière', () => {
    setup({ appreciations: [
      { id: 1, studentId: 4, subjectId: 2, trimester: '1', type: 'teacher', text: 'Sérieux', createdAt: '2025-11-02T09:00:00Z' },
      { id: 2, studentId: 5, subjectId: null, trimester: '1', type: 'council', text: 'Conseil', createdAt: '2025-11-02T09:00:00Z' },
    ] });
    expect(screen.getByText('Sérieux')).toBeTruthy();
    expect(screen.getByText(/Mensah Koffi - Maths/)).toBeTruthy();
    expect(screen.queryByText('Conseil')).toBeNull(); // autre onglet
  });

  it('annonce le refus de suppression de la base', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const { showNotification } = setup({
      appreciations: [{ id: 1, studentId: 4, subjectId: 2, trimester: '1', type: 'teacher', text: 'Sérieux', createdAt: '2025-11-02T09:00:00Z' }],
      onDelete: vi.fn().mockResolvedValue({ success: false, error: 'Vous ne pouvez supprimer que vos propres appréciations' }),
    });
    fireEvent.click(document.querySelector('button.text-red-600'));
    await waitFor(() => expect(showNotification).toHaveBeenCalledWith('Erreur : Vous ne pouvez supprimer que vos propres appréciations'));
  });
});
