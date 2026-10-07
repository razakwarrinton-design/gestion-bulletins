// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import StudentModal from './StudentModal';

afterEach(cleanup);

const classes = [{ id: 1, name: '6ème A' }];
const base = { id: 7, firstName: 'Ama', lastName: 'Dossou', classId: 1 };

const open = (student, onSave = vi.fn().mockResolvedValue()) => {
  render(<StudentModal isOpen onClose={() => {}} onSave={onSave} classes={classes} student={student} />);
  return onSave;
};

describe('StudentModal : accès au bulletin des parents', () => {
  it("la case n'apparaît pas à la création", () => {
    open(null);
    expect(screen.queryByText('Bulletin accessible aux parents')).toBeNull();
  });

  it("la case n'apparaît pas si la colonne n'existe pas encore en base", () => {
    open({ ...base });
    expect(screen.queryByText('Bulletin accessible aux parents')).toBeNull();
  });

  it("le personnel peut débloquer le bulletin d'un élève bloqué", async () => {
    const onSave = open({ ...base, bulletin_access: false });
    const box = screen.getByLabelText(/Bulletin accessible aux parents/);
    expect(box.checked).toBe(false);
    fireEvent.click(box);
    fireEvent.click(screen.getByText('Enregistrer'));
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave.mock.calls[0][0]).toMatchObject({ bulletinAccess: true });
  });

  it('le personnel peut bloquer un bulletin débloqué', async () => {
    const onSave = open({ ...base, bulletin_access: true });
    const box = screen.getByLabelText(/Bulletin accessible aux parents/);
    expect(box.checked).toBe(true);
    fireEvent.click(box);
    fireEvent.click(screen.getByText('Enregistrer'));
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave.mock.calls[0][0]).toMatchObject({ bulletinAccess: false });
  });

  it("sans colonne en base, rien n'est envoyé pour ce champ", async () => {
    const onSave = open({ ...base });
    fireEvent.click(screen.getByText('Enregistrer'));
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave.mock.calls[0][0]).not.toHaveProperty('bulletinAccess');
  });
});
