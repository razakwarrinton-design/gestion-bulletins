import { describe, it, expect, vi } from 'vitest';
import { renderToString as renderRaw } from 'react-dom/server';

vi.mock('../config/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({ eq: () => ({ order: async () => ({ data: [], error: null }) }) }),
    }),
    auth: {
      getSession: async () => ({ data: { session: null } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
    },
    channel: () => ({ on() { return this; }, subscribe() { return this; } }),
    removeChannel() {},
  },
}));

vi.stubGlobal('localStorage', { getItem: () => null, setItem() {}, removeItem() {} });

import ClassesView from './ClassesView';
import SubjectsView from './SubjectsView';
import BulletinsView from './BulletinsView';
import StatisticsView from './StatisticsView';
import ImportExportView from './ImportExportView';
import ParentsManagementView from './ParentsManagementView';
import Sidebar from '../layout/Sidebar';
import Topbar from '../layout/Topbar';
import Toast from '../layout/Toast';
import BulletinTemplatePicker from '../components/BulletinTemplatePicker';
import { NAV_ITEMS, NAV_SECTIONS } from '../config/navigation';
import { calculateAverage } from '../utils/grades';
import { getMention } from '../utils/grades';

// Le rendu serveur sépare les morceaux de texte par des commentaires HTML
const renderToString = (el) => renderRaw(el).replace(/<!-- -->/g, '');

const admin = { id: 'u1', firstName: 'Awa', lastName: 'Kossi', role: 'admin' };
const classes = [{ id: 'c1', name: '6ème A' }, { id: 'c2', name: '5ème B' }];
const students = [
  { id: 's1', firstName: 'Koffi', lastName: 'Mensah', classId: 'c1' },
  { id: 's2', firstName: 'Ama', lastName: 'Dossou', classId: 'c1' },
];
const subjects = [
  { id: 'math', name: 'Maths', coefficient: 4 },
  { id: 'fr', name: 'Français', coefficient: 3 },
];
const grades = [
  { studentId: 's1', subjectId: 'math', trimester: '1', value: 15 },
  { studentId: 's1', subjectId: 'fr', trimester: '1', value: 12 },
  { studentId: 's2', subjectId: 'math', trimester: '1', value: 9 },
];
const noop = () => {};
const avg = (studentId, trimester) => calculateAverage(studentId, trimester, grades, subjects);

describe('vues extraites de App.jsx : rendu sans erreur', () => {
  it('ClassesView affiche les classes et le nombre d\'élèves', () => {
    const html = renderToString(
      <ClassesView currentUser={admin} classes={classes} students={students} onAddClass={noop} onDeleteClass={noop} />
    );
    expect(html).toContain('6ème A');
    expect(html).toContain('2 élève(s)');
    expect(html).toContain('Ajouter une classe');
  });

  it('ClassesView masque le bouton d\'ajout pour un non-admin', () => {
    const html = renderToString(
      <ClassesView currentUser={{ ...admin, role: 'professeur' }} classes={classes} students={students} onAddClass={noop} onDeleteClass={noop} />
    );
    expect(html).not.toContain('Ajouter une classe');
  });

  it('SubjectsView affiche les matières et coefficients', () => {
    const html = renderToString(
      <SubjectsView currentUser={admin} subjects={subjects} onAddSubject={noop} onDeleteSubject={noop} />
    );
    expect(html).toContain('Maths');
    expect(html).toContain('Ajouter une matière');
  });

  it('BulletinsView affiche moyenne et mention de chaque élève de la classe', () => {
    const html = renderToString(
      <BulletinsView
        classes={classes} students={students} selectedClass="c1" setSelectedClass={noop}
        selectedTrimester="1" setSelectedTrimester={noop}
        calculateAverage={avg} getMention={getMention} onPrint={noop}
      />
    );
    expect(html).toContain('Koffi Mensah');
    expect(html).toContain('13.71/20'); // (15*4 + 12*3) / 7
    expect(html).toContain('Imprimer PDF');
  });

  it('StatisticsView demande une classe tant qu\'aucune n\'est choisie', () => {
    const html = renderToString(
      <StatisticsView
        classes={classes} students={students} subjects={subjects} grades={grades}
        selectedClass={null} setSelectedClass={noop} selectedTrimester="1" setSelectedTrimester={noop}
        calculateAverage={avg} getMention={getMention}
      />
    );
    expect(html).toContain('sélectionner une classe');
  });

  it('StatisticsView affiche classement et indicateurs pour une classe', () => {
    const html = renderToString(
      <StatisticsView
        classes={classes} students={students} subjects={subjects} grades={grades}
        selectedClass="c1" setSelectedClass={noop} selectedTrimester="1" setSelectedTrimester={noop}
        calculateAverage={avg} getMention={getMention}
      />
    );
    expect(html).toContain('Meilleure moyenne');
    expect(html).toContain('Classement');
    expect(html).toContain('Koffi Mensah');
  });

  it('ImportExportView rend les boutons d\'export', () => {
    const html = renderToString(
      <ImportExportView
        classes={classes} selectedClass="c1" setSelectedClass={noop}
        selectedTrimester="1" setSelectedTrimester={noop}
        onImportStudents={noop} onImportGrades={noop} onExportGrades={noop} onExportRanking={noop}
      />
    );
    expect(html).toContain('Exporter les notes');
    expect(html).toContain('Exporter le classement');
  });

  it('ParentsManagementView se rend (état de chargement)', () => {
    const html = renderToString(
      <ParentsManagementView openConfirm={noop} showNotification={noop} onAddParent={noop} />
    );
    expect(html).toContain('Gestion des parents');
    expect(html).toContain('Ajouter un parent');
  });
});

describe('mise en page extraite de App.jsx : rendu sans erreur', () => {
  const visible = (role) => NAV_ITEMS.filter(i => i.roles.includes(role));

  it('Sidebar liste les entrées de navigation visibles pour le rôle', () => {
    const html = renderToString(
      <Sidebar
        visibleNavItems={visible('professeur')} currentView="grades"
        mobileMenuOpen={false} setMobileMenuOpen={noop} onNavigate={noop} currentUser={admin}
      />
    );
    expect(html).toContain('Saisir notes');
    expect(html).not.toContain('Paramètres'); // réservé aux admins
  });

  it('Topbar affiche le titre de la vue courante et l\'année', () => {
    const html = renderToString(
      <Topbar
        mobileMenuOpen={false} setMobileMenuOpen={noop} visibleNavItems={visible('admin')}
        currentView="classes" currentYear="2024-2025" isDark={false} toggleDark={noop}
        currentUser={admin} onLogout={noop}
      />
    );
    expect(html).toContain('2024-2025');
    expect(html).toContain('Déconnexion');
  });

  it('Toast ne rend rien quand il est masqué', () => {
    expect(renderToString(<Toast show={false} message="Salut" />)).toBe('');
    expect(renderToString(<Toast show message="Salut" />)).toContain('Salut');
  });

  it('BulletinTemplatePicker propose les 3 modèles', () => {
    const html = renderToString(<BulletinTemplatePicker selected="model2" onSelect={noop} onClose={noop} />);
    expect(html).toContain('Modèle Classique');
    expect(html).toContain('Modèle Moderne');
    expect(html).toContain('Modèle Complet');
  });

  it('chaque entrée de navigation appartient à une section existante', () => {
    const keys = NAV_SECTIONS.map(s => s.key);
    NAV_ITEMS.forEach(item => expect(keys).toContain(item.section));
  });
});
