// @vitest-environment jsdom
// Régression : les identifiants de classe de la base sont des nombres, la valeur d'un <select> est du
// texte. Une comparaison stricte rendait la liste d'élèves vide dès qu'on choisissait une classe.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';

vi.mock('../config/supabase', () => ({ supabase: { from: () => ({}) } }));

import AIAppreciations from './AIAppreciations';

afterEach(cleanup);

const classes = [{ id: 1, name: '6ème A' }, { id: 2, name: '5ème B' }];
const students = [
  { id: 10, firstName: 'Koffi', lastName: 'Mensah', classId: 1 },
  { id: 11, firstName: 'Ama', lastName: 'Dossou', classId: 2 },
];
const subjects = [{ id: 1, name: 'Maths', coefficient: 2 }];
const grades = [
  { studentId: 10, subjectId: 1, trimester: '1', value: 15 },
  { studentId: 11, subjectId: 1, trimester: '1', value: 9 },
];

describe('AIAppreciations : filtre par classe avec identifiants numériques', () => {
  it('affiche les élèves de la classe choisie dans la liste déroulante', () => {
    render(
      <AIAppreciations
        students={students} classes={classes} grades={grades} subjects={subjects}
        selectedClass={null} selectedTrimester="1"
        calculateAverage={() => '12.00'} showNotification={() => {}} updateGrade={() => {}}
      />,
    );
    const select = screen.getAllByRole('combobox')[0];
    fireEvent.change(select, { target: { value: '1' } }); // le <select> fournit du texte

    expect(screen.getAllByText(/Koffi/).length).toBeGreaterThan(0);
    expect(screen.queryByText(/Ama/)).toBeNull(); // élève d'une autre classe
  });
});
