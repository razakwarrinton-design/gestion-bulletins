// @vitest-environment jsdom
//
// Test de non-régression « ça s'affiche » : chaque écran est rendu avec des données
// plausibles et un faux Supabase. Il ne vérifie pas le détail de l'interface, mais détecte les
// plantages au rendu (variable utilisée avant sa déclaration, hook conditionnel, prop oubliée…).
// C'est ce type de plantage qui rendait l'impression des bulletins inutilisable sans qu'aucun
// test ne le voie.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, act } from '@testing-library/react';

// Faux client Supabase : n'importe quelle chaîne d'appels (from().select().eq()…) est valide et
// se résout avec { data: [], error: null }.
vi.mock('../config/supabase', () => {
  const result = { data: [], error: null, count: 0 };
  const query = () => {
    const q = new Proxy(function () {}, {
      get: (_t, prop) => {
        if (prop === 'then') return (resolve, reject) => Promise.resolve(result).then(resolve, reject);
        return () => q;
      },
      apply: () => q,
    });
    return q;
  };
  const channel = () => ({ on() { return this; }, subscribe() { return this; }, unsubscribe() {} });
  return {
    supabase: {
      from: () => query(),
      rpc: () => query(),
      channel,
      removeChannel() {},
      functions: { invoke: async () => ({ data: null, error: null }) },
      auth: {
        getSession: async () => ({ data: { session: null }, error: null }),
        getUser: async () => ({ data: { user: null }, error: null }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
        mfa: {
          listFactors: async () => ({ data: { totp: [], all: [] }, error: null }),
          enroll: async () => ({ data: null, error: null }),
          getAuthenticatorAssuranceLevel: async () => ({ data: { currentLevel: 'aal1', nextLevel: 'aal1' }, error: null }),
        },
      },
    },
  };
});

import GradesForm from './GradesForm';
import StudentsList from './StudentsList';
import StudentModal from './StudentModal';
import ClassModal from './ClassModal';
import SubjectModal from './SubjectModal';
import ConfirmModal from './ConfirmModal';
import DashboardKPIs from './DashboardKPIs';
import AcademicYearManager from './AcademicYearManager';
import AppreciationManager from './AppreciationManager';
import AdvancedAnalytics from './AdvancedAnalytics';
import AbsenceManager from './AbsenceManager';
import AIAppreciations from './AIAppreciations';
import Settings from './Settings';
import LoginPage from './LoginPage';
import LoginModalSupabase from './LoginModalSupabase';
import ParentAssignModal from './ParentAssignModal';
import ParentPortal from './ParentPortal';
import PaymentModal from './PaymentModal';
import PaymentHistory from './PaymentHistory';
import AdminPaymentsDashboard from './AdminPaymentsDashboard';
import SMSDashboard from './SMSDashboard';
import ChatWindow from './ChatWindow';
import AdminChatDashboard from './AdminChatDashboard';
import ProfesseurChatDashboard from './ProfesseurChatDashboard';
import ParentChatDashboard from './ParentChatDashboard';
import MFAManager from './MFAManager';
import MFAChallenge from './MFAChallenge';
import SyncStatus from './SyncStatus';
import { calculateAverage, getMention } from '../utils/grades';

const noop = () => {};
const classes = [{ id: 'c1', name: '6ème A' }, { id: 'c2', name: '5ème B' }];
const students = [
  { id: 's1', firstName: 'Koffi', lastName: 'Mensah', classId: 'c1' },
  { id: 's2', firstName: 'Ama', lastName: 'Dossou', classId: 'c1' },
];
const subjects = [{ id: 'math', name: 'Maths', coefficient: 4 }, { id: 'fr', name: 'Français', coefficient: 3 }];
const grades = [
  { studentId: 's1', subjectId: 'math', trimester: '1', value: 15 },
  { studentId: 's1', subjectId: 'fr', trimester: '1', value: 12 },
  { studentId: 's2', subjectId: 'math', trimester: '1', value: 9 },
];
const admin = { id: 'u1', firstName: 'Awa', lastName: 'Kossi', role: 'admin', email: 'awa@ecole.test' };
const parent = { id: 'u2', firstName: 'Yao', lastName: 'Agbo', role: 'parent', email: 'yao@mail.test' };
const avg = (id, t) => calculateAverage(id, t, grades, subjects);
// calculateTrimesterAverage (utils/calculUtils) renvoie un nombre, contrairement à calculateAverage (texte)
const numAvg = (id, t) => parseFloat(avg(id, t)) || 0;
const academicYears = [{
  id: 1, year: '2024-2025', startDate: '2024-09-01', endDate: '2025-06-30', isActive: true,
  trimesters: [{ number: 1, startDate: '2024-09-01', endDate: '2024-12-15' }],
}];

const cases = {
  GradesForm: <GradesForm classes={classes} students={students} subjects={subjects} selectedClass="c1" setSelectedClass={noop}
    selectedTrimester="1" setSelectedTrimester={noop} getGrade={() => null} updateGrade={noop} calculateAverage={avg} getMention={getMention} />,
  'GradesForm (aucune classe)': <GradesForm classes={classes} students={students} subjects={subjects} selectedClass={null} setSelectedClass={noop}
    selectedTrimester="1" setSelectedTrimester={noop} getGrade={() => null} updateGrade={noop} calculateAverage={avg} getMention={getMention} />,
  StudentsList: <StudentsList classes={classes} students={students} selectedClass="c1" setSelectedClass={noop}
    addStudent={noop} editStudent={noop} deleteStudent={noop} currentUser={admin} />,
  'StudentModal (création)': <StudentModal isOpen onClose={noop} onSave={noop} classes={classes} />,
  'StudentModal (modification)': <StudentModal isOpen onClose={noop} onSave={noop} classes={classes}
    student={{ ...students[0], emergencyPhone: '+22890123456', emergencyName: 'Awa' }} />,
  ClassModal: <ClassModal isOpen onClose={noop} onSave={noop} />,
  SubjectModal: <SubjectModal isOpen onClose={noop} onSave={noop} />,
  ConfirmModal: <ConfirmModal isOpen onClose={noop} onConfirm={noop} title="Supprimer ?" message="Sûr ?" />,
  DashboardKPIs: <DashboardKPIs classes={classes} students={students} subjects={subjects} grades={grades}
    calculateAverage={avg} currentUser={admin} setCurrentView={noop} activities={[]} />,
  AcademicYearManager: <AcademicYearManager academicYears={academicYears} setAcademicYears={noop}
    currentYear="2024-2025" setCurrentYear={noop} showNotification={noop} />,
  AppreciationManager: <AppreciationManager students={students} subjects={subjects}
    selectedClass="c1" selectedTrimester="1" showNotification={noop} appreciations={[]} onAdd={noop} onDelete={noop} />,
  AdvancedAnalytics: <AdvancedAnalytics students={students} classes={classes} grades={grades} subjects={subjects}
    selectedClass="c1" selectedTrimester="1" calculateTrimesterAverage={numAvg} getMention={getMention} />,
  AbsenceManager: <AbsenceManager classes={classes} students={students} subjects={subjects} currentUser={admin} />,
  AIAppreciations: <AIAppreciations students={students} classes={classes} grades={grades} subjects={subjects}
    selectedClass="c1" selectedTrimester="1" calculateAverage={avg} showNotification={noop} updateGrade={noop} />,
  Settings: <Settings schoolLogo={null} handleLogoUpload={noop} schoolInfo={{ name: 'Collège', year: '2024-2025' }}
    updateSchoolInfo={noop} appColors={{ primary: '#2563eb', secondary: '#10b981', accent: '#f59e0b' }} updateColor={noop}
    currentUser={admin} handleRegister={noop} showNotification={noop} activities={[]} />,
  'LoginPage (connexion)': <LoginPage isRegister={false} setIsRegister={noop} onSignIn={noop} onSignUp={noop} loading={false} />,
  'LoginPage (inscription)': <LoginPage isRegister setIsRegister={noop} onSignIn={noop} onSignUp={noop} loading={false} />,
  LoginModalSupabase: <LoginModalSupabase isRegister={false} setIsRegister={noop} setShowLoginModal={noop} onSignIn={noop} onSignUp={noop} loading={false} />,
  ParentAssignModal: <ParentAssignModal isOpen onClose={noop} students={students} classes={classes} showNotification={noop} />,
  ParentPortal: <ParentPortal currentUser={parent} schoolInfo={{ name: 'Collège' }} onPrint={noop} />,
  PaymentModal: <PaymentModal isOpen studentId="s1" amount={25000} description="Scolarité" onClose={noop} onSuccess={noop} />,
  PaymentHistory: <PaymentHistory child={{ id: 's1', firstName: 'Koffi', lastName: 'Mensah' }} />,
  AdminPaymentsDashboard: <AdminPaymentsDashboard />,
  SMSDashboard: <SMSDashboard />,
  ChatWindow: <ChatWindow conversationId="conv1" otherUser={{ id: 'u3', first_name: 'Yao', last_name: 'Agbo' }} currentUser={admin} onClose={noop} />,
  AdminChatDashboard: <AdminChatDashboard onOpenChat={noop} />,
  ProfesseurChatDashboard: <ProfesseurChatDashboard currentUser={{ ...admin, role: 'professeur' }} onOpenChat={noop} />,
  ParentChatDashboard: <ParentChatDashboard currentUser={parent} onOpenChat={noop} />,
  MFAManager: <MFAManager showNotification={noop} />,
  MFAChallenge: <MFAChallenge factorId="f1" onSuccess={noop} onCancel={noop} />,
  SyncStatus: <SyncStatus />,
};

describe('écrans : rendu sans plantage', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
    window.alert = noop;
    window.confirm = () => false;
  });

  it.each(Object.entries(cases))('%s', async (_name, element) => {
    let view;
    // Premier rendu (détecte les erreurs synchrones)
    expect(() => { view = render(element); }).not.toThrow();
    // Laisse s'exécuter les effets et les chargements asynchrones simulés
    await act(async () => { await new Promise((r) => setTimeout(r, 20)); });
    expect(view.container).toBeTruthy();
    view.unmount();
  });
});

