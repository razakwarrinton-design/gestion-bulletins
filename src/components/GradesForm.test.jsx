// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';

vi.mock('../config/supabase', () => ({ supabase: { functions: { invoke: vi.fn() } } }));

import GradesForm from './GradesForm';

afterEach(cleanup);

const renderForm = (updateGrade) => render(
  <GradesForm
    classes={[{ id: 1, name: '6ème A' }]}
    students={[{ id: 10, firstName: 'Koffi', lastName: 'Mensah', first_name: 'Koffi', last_name: 'Mensah', classId: 1, class_id: 1 }]}
    subjects={[{ id: 5, name: 'Maths', coefficient: 2 }]}
    selectedClass={1}
    setSelectedClass={() => {}}
    selectedTrimester="1"
    setSelectedTrimester={() => {}}
    getGrade={() => undefined}
    updateGrade={updateGrade}
    calculateAverage={() => 0}
    getMention={() => ''}
  />,
);

// Une ligne de matière dépliée affiche quatre champs : interrogation, devoir, composition, bonus
const fields = () => screen.getAllByPlaceholderText('—');

describe('GradesForm : saisie hors limites', () => {
  it("n'envoie pas à la base une note refusée, et dit pourquoi ; une valeur corrigée est enregistrée", async () => {
    const updateGrade = vi.fn().mockResolvedValue({ success: true });
    renderForm(updateGrade);
    await screen.findByText('Maths');

    const [, devoir] = fields();
    fireEvent.change(devoir, { target: { value: '1214' } });
    expect(await screen.findByRole('alert', {}, { timeout: 3000 })).toBeTruthy();
    expect(screen.getByRole('alert').textContent).toMatch(/entre 0 et 20/);
    expect(updateGrade).not.toHaveBeenCalled();

    fireEvent.change(devoir, { target: { value: '14' } });
    await waitFor(() => expect(updateGrade).toHaveBeenCalledTimes(1), { timeout: 3000 });
    expect(updateGrade.mock.calls[0][5]).toMatchObject({ devoir: 14 });
    // l'erreur disparaît dès que l'enregistrement réussit
    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull(), { timeout: 3000 });
  });
});
