// @vitest-environment jsdom
// Régression : les identifiants de la base sont des nombres, la valeur d'un <select> est du texte.
// Une comparaison stricte laissait vide la liste d'élèves dès qu'on choisissait une classe.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';

vi.mock('../config/supabase', () => {
  const parents = [{ id: 'p1', first_name: 'Awa', last_name: 'Kossi', email: 'awa@parents.test' }];
  const query = (table) => {
    const q = new Proxy(function () {}, {
      get: (_t, prop) => (prop === 'then'
        ? (resolve, reject) => Promise.resolve({ data: table === 'user_profiles' ? parents : [], error: null }).then(resolve, reject)
        : () => q),
      apply: () => q,
    });
    return q;
  };
  return { supabase: { from: (table) => query(table), rpc: () => query() } };
});

import AbsenceManager from './AbsenceManager';
import ParentAssignModal from './ParentAssignModal';

afterEach(cleanup);

const classes = [{ id: 1, name: '6ème A' }, { id: 2, name: '5ème B' }];
const students = [
  { id: 10, firstName: 'Koffi', lastName: 'Mensah', classId: 1 },
  { id: 11, firstName: 'Ama', lastName: 'Dossou', classId: 2 },
];

describe('identifiants numériques dans les listes déroulantes', () => {
  it('saisie des absences : la classe choisie affiche ses élèves', () => {
    render(<AbsenceManager classes={classes} students={students} subjects={[]} currentUser={{ id: 'u1' }} />);
    fireEvent.change(screen.getAllByRole('combobox')[0], { target: { value: '1' } });

    expect(screen.getAllByText(/Koffi/).length).toBeGreaterThan(0);
    expect(screen.queryByText(/Ama/)).toBeNull();
  });

  it('liaison parent-élève : le filtre par classe restreint la liste des élèves', async () => {
    render(<ParentAssignModal isOpen onClose={() => {}} students={students} classes={classes} showNotification={() => {}} />);
    await screen.findByText(/Awa Kossi/); // la liste des parents est chargée
    const [, classSelect] = screen.getAllByRole('combobox'); // parent, classe, élève
    fireEvent.change(classSelect, { target: { value: '2' } });

    expect(screen.getByRole('option', { name: /Ama Dossou/ })).toBeTruthy();
    expect(screen.queryByRole('option', { name: /Koffi/ })).toBeNull();
  });
});
