import * as XLSX from 'xlsx';
import { supabase } from './lib/supabaseClient';
import React, { useState, useEffect } from 'react';
import { useSupabaseState } from './hooks/useSupabaseState';
import { useSupabaseAuth } from './hooks/useSupabaseAuth';
import { calculateAverage as calcAverageUtil, getMention as getMentionUtil } from './utils/grades';
import {
  LineChart, Line, RadarChart, Radar, PolarGrid, PolarAngleAxis,
  PolarRadiusAxis, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import {
  BookOpen, Users, FileText, GraduationCap, Plus, Trash2, Edit2,
  Printer, BarChart3, Upload, FileDown, Settings, Image, Menu, X,
  LogOut, UserCircle, Shield
} from 'lucide-react';
import LoginModalSupabase from './components/LoginModalSupabase';
import PrintPreview from './components/PrintPreview';
import StudentsList from './components/StudentsList';
import GradesForm from './components/GradesForm';
import SettingsPanel from './components/Settings';
import SyncStatus from './components/SyncStatus';
import AcademicYearManager from './components/AcademicYearManager';
import AppreciationManager from './components/AppreciationManager';
import AdvancedAnalytics from './components/AdvancedAnalytics';
import * as calculUtils from './utils/calculUtils';
import * as studentUtils from './utils/studentUtils';
import { useClasses } from './hooks/useClasses';
import { useStudents } from './hooks/useStudents';
import { useSubjects } from './hooks/useSubjects';
import { useGrades } from './hooks/useGrades';
import Modal from './components/Modal';
import ClassModal from './components/ClassModal';
import StudentModal from './components/StudentModal';
import SubjectModal from './components/SubjectModal';
import ConfirmModal from './components/ConfirmModal';
import {
  DashboardSkeleton,
  ClassesSkeleton,
  TableSkeleton,
  GradesSkeleton,
  BulletinsSkeleton,
  Spinner
} from './components/Skeleton';
import ParentPortal from './components/ParentPortal';
import ParentAssignModal from './components/ParentAssignModal';

// ─── Items de navigation (source unique) ─────────────────────────────────────
const NAV_ITEMS = [
  { view: 'dashboard', label: 'Tableau de bord', icon: '📊', roles: ['admin', 'professeur', 'secretaire'] },
  { view: 'classes', label: 'Classes', icon: '🎓', roles: ['admin', 'secretaire'] },
  { view: 'students', label: 'Élèves', icon: '👥', roles: ['admin', 'professeur', 'secretaire'] },
  { view: 'subjects', label: 'Matières', icon: '📚', roles: ['admin'] },
  { view: 'grades', label: 'Saisir notes', icon: '✍️', roles: ['admin', 'professeur'] },
  { view: 'bulletins', label: 'Bulletins', icon: '📄', roles: ['admin', 'professeur', 'secretaire'] },
  { view: 'academicyears', label: 'Années scolaires', icon: '📅', roles: ['admin'] },
  { view: 'appreciations', label: 'Appréciations', icon: '⭐', roles: ['admin', 'professeur'] },
  { view: 'analytics', label: 'Analyse avancée', icon: '📈', roles: ['admin', 'professeur'] },
  { view: 'statistics', label: 'Statistiques', icon: '📊', roles: ['admin', 'professeur'] },
  { view: 'importexport', label: 'Import/Export', icon: '📂', roles: ['admin', 'secretaire'] },
  { view: 'settings', label: 'Paramètres', icon: '⚙️', roles: ['admin'] },
  { view: 'parents', label: 'Espace Parents', icon: '👨‍👩‍👧', roles: ['parent'] },
  { view: 'gestion-parents', label: 'Gestion parents', icon: '👥', roles: ['admin'] },
];

// ─── Composant principal ──────────────────────────────────────────────────────
const BulletinApp = () => {
  // ── Authentification ────────────────────────────────────────────────────────
  const { currentUser, loading: authLoading, signIn, signUp, signOut, hasPermission, isAuthenticated } = useSupabaseAuth();

  // ── Navigation & UI ──────────────────────────────────────────────────────────
  const [currentView, setCurrentView] = useState('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [parentModalOpen, setParentModalOpen] = useState(false);

  // ── Données Supabase via hooks ───────────────────────────────────────────────
  const [currentYear, setCurrentYear] = useState('2024-2025'); // déclaré avant useGrades

  const { classes, loading: isLoadingClasses, addClass, deleteClass } = useClasses();
  const { students, loading: isLoadingStudents, addStudent, updateStudent, deleteStudent } = useStudents();
  const { subjects, loading: isLoadingSubjects, addSubject, deleteSubject } = useSubjects();
  const { grades, loading: isLoadingGrades, updateGrade, getGrade } = useGrades(currentYear);

  // ── Données persistées (useSupabaseState) ───────────────────────────────────
  const [schoolInfo, setSchoolInfo] = useSupabaseState('schoolInfo', {
    name: 'ÉTABLISSEMENT SCOLAIRE',
    address: 'Adresse de l\'établissement',
    phone: '+33 XXX XXX XXX',
    email: 'contact@ecole.com'
  });
  const [appColors, setAppColors] = useSupabaseState('appColors', {
    primary: '#2563eb', secondary: '#10b981', accent: '#f59e0b'
  });
  const [activities, setActivities] = useSupabaseState('activities', []);
  const [academicYears, setAcademicYears] = useSupabaseState('academicYears', [
    {
      id: 1, year: '2024-2025',
      startDate: '2024-09-01', endDate: '2025-06-30',
      trimesters: [
        { number: 1, startDate: '2024-09-01', endDate: '2024-12-15' },
        { number: 2, startDate: '2025-01-01', endDate: '2025-04-15' },
        { number: 3, startDate: '2025-04-16', endDate: '2025-06-30' }
      ],
      isActive: true, createdAt: new Date('2024-08-01').toISOString()
    }
  ]);
  const [appreciations, setAppreciations] = useSupabaseState('appreciations', []);
  const [schoolLogo, setSchoolLogo] = useSupabaseState('schoolLogo', null);

  // ── Sélections ───────────────────────────────────────────────────────────────
  const [selectedClass, setSelectedClass] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedTrimester, setSelectedTrimester] = useState('1');

  // ── Impression ───────────────────────────────────────────────────────────────
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [printStudent, setPrintStudent] = useState(null);
  const [selectedBulletinTemplate, setSelectedBulletinTemplate] = useState('model1');

  // ── Auth Modal ───────────────────────────────────────────────────────────────
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [isRegister, setIsRegister] = useState(false);

  // ── Modals CRUD ──────────────────────────────────────────────────────────────
  const [classModalOpen, setClassModalOpen] = useState(false);
  const [studentModalOpen, setStudentModalOpen] = useState(false);
  const [subjectModalOpen, setSubjectModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [confirmModal, setConfirmModal] = useState({
    open: false, title: '', message: '', onConfirm: null
  });

  // ── Helpers ──────────────────────────────────────────────────────────────────
  const showNotification = (message) => {
    setAlertMessage(message);
    setShowAlert(true);
    setTimeout(() => setShowAlert(false), 3000);
  };

  const logActivity = (action, details) => {
    const newActivity = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      user: currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'Anonyme',
      userRole: currentUser?.role || 'unknown',
      action,
      details
    };
    setActivities(prev => [newActivity, ...prev]);
  };

  const openConfirm = (title, message, onConfirm) => {
    setConfirmModal({ open: true, title, message, onConfirm });
  };

  const closeConfirm = () => {
    setConfirmModal({ open: false, title: '', message: '', onConfirm: null });
  };

  const handleViewChange = (view) => {
    setCurrentView(view);
    setMobileMenuOpen(false);
  };

  // ── Calculs ──────────────────────────────────────────────────────────────────
  const calculateAverage = (studentId, trimester) =>
    calcAverageUtil(studentId, trimester, grades, subjects);

  const getMention = (average) =>
    getMentionUtil(average);

  const calculateTrimesterAverage = (studentId, trimester) =>
    calculUtils.calculateTrimesterAverage(studentId, trimester, grades, subjects);

  const calculateClassStats = (classId, trimester) => {
    const classStudents = students.filter(s => s.classId === classId);
    return calculUtils.calculateClassStats(classStudents, trimester, grades, subjects);
  };

  // ── Handlers Classes ─────────────────────────────────────────────────────────
  const handleAddClass = () => setClassModalOpen(true);

  const handleSaveClass = async (name) => {
    await addClass(name);
    logActivity('Ajout de classe', `Classe "${name}" créée`);
    showNotification('Classe ajoutée avec succès !');
  };

  const handleDeleteClass = (cls) => {
    openConfirm(
      'Supprimer la classe ?',
      `La classe "${cls.name}" et tous ses élèves seront définitivement supprimés.`,
      async () => {
        await deleteClass(cls.id);
        logActivity('Suppression de classe', `Classe "${cls.name}" supprimée`);
        showNotification('Classe supprimée');
      }
    );
  };

  // ── Handlers Élèves ──────────────────────────────────────────────────────────
  const handleAddStudent = () => {
    setEditingStudent(null);
    setStudentModalOpen(true);
  };

  const handleEditStudent = (student) => {
    setEditingStudent(student);
    setStudentModalOpen(true);
  };

  const handleSaveStudent = async ({ firstName, lastName, classId }) => {
    if (editingStudent) {
      await updateStudent(editingStudent.id, firstName, lastName, classId);
      logActivity('Modification d\'élève', `Élève "${firstName} ${lastName}" modifié`);
      showNotification('Élève modifié avec succès !');
    } else {
      await addStudent(firstName, lastName, classId);
      logActivity('Ajout d\'élève', `Élève "${firstName} ${lastName}" ajouté`);
      showNotification('Élève ajouté avec succès !');
    }
  };

  const handleDeleteStudent = (student) => {
    openConfirm(
      'Supprimer l\'élève ?',
      `${student.firstName} ${student.lastName} sera définitivement supprimé ainsi que toutes ses notes.`,
      async () => {
        await deleteStudent(student.id);
        logActivity('Suppression d\'élève', `Élève "${student.firstName} ${student.lastName}" supprimé`);
        showNotification('Élève supprimé');
      }
    );
  };

  // ── Handlers Matières ────────────────────────────────────────────────────────
  const handleAddSubject = () => setSubjectModalOpen(true);

  const handleSaveSubject = async (name, coefficient) => {
    await addSubject(name, coefficient);
    logActivity('Ajout de matière', `Matière "${name}" créée`);
    showNotification('Matière ajoutée avec succès !');
  };

  const handleDeleteSubject = (subject) => {
    openConfirm(
      'Supprimer la matière ?',
      `"${subject.name}" sera définitivement supprimée ainsi que toutes les notes associées.`,
      async () => {
        await deleteSubject(subject.id);
        showNotification('Matière supprimée');
      }
    );
  };

  // ── Handlers Auth ────────────────────────────────────────────────────────────
  const handleLogin = async (email, password) => {
    const result = await signIn(email, password);
    if (result.success) {
      logActivity('Connexion', 'Connexion réussie');
      showNotification('Bienvenue !');
    }
    return result;
  };

  const handleLogout = () => {
    openConfirm(
      'Se déconnecter ?',
      'Vous allez être déconnecté de l\'application.',
      async () => {
        logActivity('Déconnexion', 'Déconnexion réussie');
        const result = await signOut();
        if (result.success) {
          setCurrentView('dashboard');
          showNotification('Déconnexion réussie');
        }
      }
    );
  };

  const handleRegister = async (email, password, firstName, lastName, role) => {
    const result = await signUp(email, password, firstName, lastName, role);
    if (result.success) {
      logActivity('Création de compte', `Nouvel utilisateur: ${firstName} ${lastName} (${role})`);
      showNotification('Compte créé avec succès !');
    }
    return result;
  };

  // ── Handlers Paramètres ──────────────────────────────────────────────────────
  const handleLogoUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      setSchoolLogo(e.target.result);
      showNotification('Logo mis à jour !');
    };
    reader.readAsDataURL(file);
  };

  const updateSchoolInfo = (field, value) => {
    setSchoolInfo({ ...schoolInfo, [field]: value });
    showNotification('Informations mises à jour !');
  };

  const updateColor = (colorType, value) => {
    setAppColors({ ...appColors, [colorType]: value });
    showNotification('Couleur mise à jour !');
  };

  // ── Impression ───────────────────────────────────────────────────────────────
  const openPrintPreview = (student) => {
    setPrintStudent(student);
    setShowPrintPreview(true);
  };

  const handlePrint = () => window.print();

  // ── Import / Export Excel ────────────────────────────────────────────────────
  const exportClassGrades = () => {
    if (!selectedClass) { showNotification('Veuillez sélectionner une classe'); return; }
    const classStudents = students.filter(s => s.classId === selectedClass);
    const className = classes.find(c => c.id === selectedClass)?.name || 'Classe';
    const data = [['Nom', 'Prénom', ...subjects.map(s => s.name), 'Moyenne']];
    classStudents.forEach(student => {
      const row = [student.lastName, student.firstName];
      subjects.forEach(subject => {
        const grade = getGrade(student.id, subject.id, selectedTrimester);
        row.push(grade?.value || '');
      });
      row.push(calculateAverage(student.id, selectedTrimester));
      data.push(row);
    });
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Trimestre ${selectedTrimester}`);
    XLSX.writeFile(wb, `Notes_${className}_T${selectedTrimester}.xlsx`);
    showNotification('Fichier Excel exporté !');
  };

  const exportRanking = () => {
    if (!selectedClass) { showNotification('Veuillez sélectionner une classe'); return; }
    const classStudents = students.filter(s => s.classId === selectedClass);
    const className = classes.find(c => c.id === selectedClass)?.name || 'Classe';
    const ranking = classStudents
      .map(student => ({ student, average: parseFloat(calculateAverage(student.id, selectedTrimester)) }))
      .sort((a, b) => b.average - a.average);
    const data = [['Rang', 'Nom', 'Prénom', 'Moyenne', 'Mention']];
    ranking.forEach((item, index) => {
      const mention = getMention(item.average);
      data.push([index + 1, item.student.lastName, item.student.firstName, item.average, mention.text]);
    });
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Classement');
    XLSX.writeFile(wb, `Classement_${className}_T${selectedTrimester}.xlsx`);
    showNotification('Classement exporté !');
  };

  const importStudents = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);
      let imported = 0;
      for (const row of jsonData) {
        if (row.Nom && row.Prénom && row.Classe) {
          try {
            let classObj = classes.find(c => c.name === row.Classe);
            if (!classObj) classObj = await addClass(row.Classe);
            await addStudent(row.Prénom, row.Nom, classObj.id);
            imported++;
          } catch (err) {
            console.error('Erreur import élève:', err);
          }
        }
      }
      showNotification(`${imported} élève(s) importé(s) !`);
    };
    reader.readAsArrayBuffer(file);
  };

  const importGrades = (event) => {
    const file = event.target.files[0];
    if (!file || !selectedClass) { showNotification('Veuillez sélectionner une classe d\'abord'); return; }
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);
      let imported = 0;
      jsonData.forEach(row => {
        const student = students.find(s =>
          s.lastName === row.Nom && s.firstName === row.Prénom && s.classId === selectedClass
        );
        if (student) {
          subjects.forEach(subject => {
            if (row[subject.name] !== undefined && row[subject.name] !== '') {
              const value = parseFloat(row[subject.name]);
              if (!isNaN(value)) {
                updateGrade(student.id, subject.id, selectedTrimester, value, '');
                imported++;
              }
            }
          });
        }
      });
      showNotification(`${imported} note(s) importée(s) !`);
    };
    reader.readAsArrayBuffer(file);
  };

  // ── Renders ──────────────────────────────────────────────────────────────────
  const renderUserMenu = () => {
    if (!currentUser) {
      return (
        <button
          onClick={() => setShowLoginModal(true)}
          className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <UserCircle className="w-5 h-5" />
          <span className="hidden md:inline">Se connecter</span>
        </button>
      );
    }
    return (
      <div className="flex items-center space-x-3">
        <div className="hidden md:block text-right">
          <p className="text-sm font-medium text-gray-800">{currentUser.firstName} {currentUser.lastName}</p>
          <p className="text-xs text-gray-500 flex items-center justify-end">
            {currentUser.role === 'admin' && <><Shield className="w-3 h-3 mr-1" /> Admin</>}
            {currentUser.role === 'professeur' && <>👨‍🏫 Professeur</>}
            {currentUser.role === 'secretaire' && <>💼 Secrétaire</>}
          </p>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center space-x-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span className="hidden md:inline">Déconnexion</span>
        </button>
      </div>
    );
  };

  const renderDashboard = () => (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold text-gray-800">Tableau de bord</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div onClick={() => setCurrentView('classes')} className="bg-blue-50 rounded-lg shadow-md hover:shadow-xl transition-shadow cursor-pointer p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Classes</p>
              <p className="text-3xl font-bold text-blue-600">{classes.length}</p>
            </div>
            <GraduationCap className="w-12 h-12 text-blue-600" />
          </div>
        </div>
        <div onClick={() => setCurrentView('students')} className="bg-green-50 rounded-lg shadow-md hover:shadow-xl transition-shadow cursor-pointer p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Élèves</p>
              <p className="text-3xl font-bold text-green-600">{students.length}</p>
            </div>
            <Users className="w-12 h-12 text-green-600" />
          </div>
        </div>
        <div onClick={() => setCurrentView('subjects')} className="bg-purple-50 rounded-lg shadow-md hover:shadow-xl transition-shadow cursor-pointer p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Matières</p>
              <p className="text-3xl font-bold text-purple-600">{subjects.length}</p>
            </div>
            <BookOpen className="w-12 h-12 text-purple-600" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
        {(!currentUser || currentUser.role === 'admin' || currentUser.role === 'professeur') && (
          <div onClick={() => setCurrentView('grades')} className="bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow cursor-pointer p-6">
            <div className="flex items-center space-x-4">
              <Edit2 className="w-10 h-10 text-orange-600" />
              <div>
                <h3 className="text-xl font-bold">Saisir les notes</h3>
                <p className="text-gray-600 text-sm">Entrer et modifier les notes</p>
              </div>
            </div>
          </div>
        )}
        {currentUser?.role === 'secretaire' && (
          <div onClick={() => setCurrentView('bulletins')} className="bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow cursor-pointer p-6">
            <div className="flex items-center space-x-4">
              <FileText className="w-10 h-10 text-red-600" />
              <div>
                <h3 className="text-xl font-bold">Bulletins</h3>
                <p className="text-gray-600 text-sm">Imprimer les bulletins PDF</p>
              </div>
            </div>
          </div>
        )}
        {(!currentUser || currentUser.role === 'admin' || currentUser.role === 'professeur') && (
          <div onClick={() => setCurrentView('statistics')} className="bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow cursor-pointer p-6">
            <div className="flex items-center space-x-4">
              <BarChart3 className="w-10 h-10 text-indigo-600" />
              <div>
                <h3 className="text-xl font-bold">Statistiques</h3>
                <p className="text-gray-600 text-sm">Graphiques et analyses</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderClasses = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Gestion des classes</h2>
        {currentUser?.role !== 'secretaire' && (
          <button onClick={handleAddClass} className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-blue-700 transition-colors">
            <Plus className="w-4 h-4" />
            <span>Ajouter une classe</span>
          </button>
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {classes.map(cls => (
          <div key={cls.id} className="bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow p-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-xl font-bold">{cls.name}</h3>
                <p className="text-gray-600">{students.filter(s => s.classId === cls.id).length} élève(s)</p>
              </div>
              <button onClick={() => handleDeleteClass(cls)} className="text-red-600 hover:text-red-800 transition-colors">
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderSubjects = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Gestion des matières</h2>
        {currentUser?.role !== 'secretaire' && (
          <button onClick={handleAddSubject} className="bg-purple-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-purple-700 transition-colors">
            <Plus className="w-4 h-4" />
            <span>Ajouter une matière</span>
          </button>
        )}
      </div>
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Matière</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Coefficient</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {subjects.map(subject => (
              <tr key={subject.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap font-medium">{subject.name}</td>
                <td className="px-6 py-4 whitespace-nowrap">{subject.coefficient}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <button onClick={() => handleDeleteSubject(subject)} className="text-red-600 hover:text-red-800 transition-colors">
                    <Trash2 className="w-5 h-5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderBulletins = () => (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Consultation des bulletins</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium mb-2">Classe:</label>
          <select
            value={selectedClass || ''}
            onChange={(e) => setSelectedClass(e.target.value || null)}
            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Sélectionner une classe</option>
            {classes.map(cls => (
              <option key={cls.id} value={cls.id}>{cls.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Trimestre:</label>
          <select
            value={selectedTrimester}
            onChange={(e) => setSelectedTrimester(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="1">Trimestre 1</option>
            <option value="2">Trimestre 2</option>
            <option value="3">Trimestre 3</option>
          </select>
        </div>
      </div>
      {selectedClass && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {students.filter(s => s.classId === selectedClass).map(student => {
            const average = calculateAverage(student.id, selectedTrimester);
            const mention = getMention(average);
            return (
              <div key={student.id} className="bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow p-6 border-l-4" style={{ borderColor: mention.color }}>
                <h3 className="text-lg font-bold mb-2 text-gray-800">{student.firstName} {student.lastName}</h3>
                <div className="mb-3">
                  <p className="text-3xl font-bold text-blue-600">{average}/20</p>
                  <p className="text-sm font-medium mt-1" style={{ color: mention.color }}>{mention.text}</p>
                </div>
                <button
                  onClick={() => openPrintPreview(student)}
                  className="w-full bg-gradient-to-r from-green-600 to-green-700 text-white px-4 py-3 rounded-lg flex items-center justify-center space-x-2 hover:from-green-700 hover:to-green-800 transition-all shadow-md hover:shadow-lg"
                >
                  <Printer className="w-5 h-5" />
                  <span className="font-medium">Imprimer PDF</span>
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  const renderStatistics = () => {
    if (!selectedClass) {
      return (
        <div className="text-center p-12">
          <h2 className="text-2xl font-bold mb-4">Statistiques de la classe</h2>
          <p className="text-gray-600 mb-4">Veuillez sélectionner une classe pour voir les statistiques</p>
          <select
            value={selectedClass || ''}
            onChange={(e) => setSelectedClass(e.target.value || null)}
            className="w-64 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Sélectionner une classe</option>
            {classes.map(cls => (
              <option key={cls.id} value={cls.id}>{cls.name}</option>
            ))}
          </select>
        </div>
      );
    }

    const classStudents = students.filter(s => s.classId === selectedClass);
    const evolutionData = classStudents.map(student => ({
      name: `${student.firstName} ${student.lastName}`,
      T1: parseFloat(calculateAverage(student.id, '1')) || 0,
      T2: parseFloat(calculateAverage(student.id, '2')) || 0,
      T3: parseFloat(calculateAverage(student.id, '3')) || 0
    }));
    const classMoyenneData = [
      { trimestre: 'T1', moyenne: evolutionData.reduce((sum, s) => sum + s.T1, 0) / (evolutionData.length || 1) },
      { trimestre: 'T2', moyenne: evolutionData.reduce((sum, s) => sum + s.T2, 0) / (evolutionData.length || 1) },
      { trimestre: 'T3', moyenne: evolutionData.reduce((sum, s) => sum + s.T3, 0) / (evolutionData.length || 1) }
    ];
    const radarData = subjects.map(subject => {
      const subjectGrades = grades.filter(g =>
        g.subjectId === subject.id &&
        g.trimester === selectedTrimester &&
        classStudents.some(s => s.id === g.studentId)
      );
      const avg = subjectGrades.length > 0
        ? subjectGrades.reduce((sum, g) => sum + g.value, 0) / subjectGrades.length
        : 0;
      return { matiere: subject.name, moyenne: parseFloat(avg.toFixed(2)) };
    });
    const ranking = classStudents
      .map(student => ({ student, average: parseFloat(calculateAverage(student.id, selectedTrimester)) }))
      .sort((a, b) => b.average - a.average);
    const allAverages = ranking.map(r => r.average).filter(a => a > 0);
    const stats = {
      meilleure: Math.max(...allAverages, 0),
      moins_bonne: Math.min(...allAverages.filter(a => a > 0), 0),
      moyenne_classe: (allAverages.reduce((sum, a) => sum + a, 0) / (allAverages.length || 1)).toFixed(2)
    };

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Statistiques de la classe</h2>
          <select
            value={selectedClass || ''}
            onChange={(e) => setSelectedClass(e.target.value || null)}
            className="w-64 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Sélectionner une classe</option>
            {classes.map(cls => (
              <option key={cls.id} value={cls.id}>{cls.name}</option>
            ))}
          </select>
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Trimestre:</label>
          <select value={selectedTrimester} onChange={(e) => setSelectedTrimester(e.target.value)} className="w-64 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
            <option value="1">Trimestre 1</option>
            <option value="2">Trimestre 2</option>
            <option value="3">Trimestre 3</option>
          </select>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-green-50 rounded-lg shadow-md p-6 border-l-4 border-green-500">
            <p className="text-sm text-gray-600">Meilleure moyenne</p>
            <p className="text-3xl font-bold text-green-600">{stats.meilleure}/20</p>
          </div>
          <div className="bg-blue-50 rounded-lg shadow-md p-6 border-l-4 border-blue-500">
            <p className="text-sm text-gray-600">Moyenne de classe</p>
            <p className="text-3xl font-bold text-blue-600">{stats.moyenne_classe}/20</p>
          </div>
          <div className="bg-orange-50 rounded-lg shadow-md p-6 border-l-4 border-orange-500">
            <p className="text-sm text-gray-600">Moins bonne moyenne</p>
            <p className="text-3xl font-bold text-orange-600">{stats.moins_bonne > 0 ? stats.moins_bonne : 0}/20</p>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-bold mb-4">📈 Évolution de la moyenne de classe</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={classMoyenneData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="trimestre" />
              <YAxis domain={[0, 20]} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="moyenne" stroke="#3b82f6" strokeWidth={3} name="Moyenne classe" />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-bold mb-4">🎯 Performance par matière (Trimestre {selectedTrimester})</h3>
          <ResponsiveContainer width="100%" height={400}>
            <RadarChart data={radarData}>
              <PolarGrid />
              <PolarAngleAxis dataKey="matiere" />
              <PolarRadiusAxis domain={[0, 20]} />
              <Radar name="Moyenne" dataKey="moyenne" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.6} />
              <Tooltip />
            </RadarChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-bold mb-4">🏆 Classement (Trimestre {selectedTrimester})</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Rang</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Élève</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Moyenne</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Mention</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {ranking.map((item, index) => {
                  const mention = getMention(item.average);
                  return (
                    <tr key={item.student.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <span className="text-2xl font-bold">
                          {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}`}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-medium">{item.student.firstName} {item.student.lastName}</td>
                      <td className="px-6 py-4"><span className="text-xl font-bold text-blue-600">{item.average}/20</span></td>
                      <td className="px-6 py-4">
                        <span className="px-3 py-1 rounded-full text-sm font-medium text-white" style={{ backgroundColor: mention.color }}>{mention.text}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderImportExport = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">📂 Import / Export Excel</h2>
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-xl font-bold mb-4 flex items-center">
          <Upload className="w-6 h-6 mr-2 text-blue-600" />
          Importer des données
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-blue-500 transition-colors">
            <h4 className="font-bold mb-2">📥 Importer des élèves</h4>
            <p className="text-sm text-gray-600 mb-4">Format Excel: Colonnes "Nom", "Prénom", "Classe"</p>
            <input
              type="file" accept=".xlsx,.xls,.csv" onChange={importStudents}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-green-500 transition-colors">
            <h4 className="font-bold mb-2">📥 Importer des notes</h4>
            <p className="text-sm text-gray-600 mb-2">Format Excel: "Nom", "Prénom", puis colonnes des matières</p>
            <div className="mb-4">
              <label className="block text-xs font-medium mb-1">Classe:</label>
              <select
                value={selectedClass || ''}
                onChange={(e) => setSelectedClass(e.target.value || null)}
                className="w-full p-2 text-sm border border-gray-300 rounded-lg"
              >
                <option value="">Sélectionner</option>
                {classes.map(cls => <option key={cls.id} value={cls.id}>{cls.name}</option>)}
              </select>
            </div>
            <input
              type="file" accept=".xlsx,.xls,.csv" onChange={importGrades}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
            />
          </div>
        </div>
      </div>
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-xl font-bold mb-4 flex items-center">
          <FileDown className="w-6 h-6 mr-2 text-green-600" />
          Exporter des données
        </h3>
        <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Classe:</label>
            <select
              value={selectedClass || ''}
              onChange={(e) => setSelectedClass(e.target.value || null)}
              className="w-full p-2 border border-gray-300 rounded-lg"
            >
              <option value="">Sélectionner une classe</option>
              {classes.map(cls => <option key={cls.id} value={cls.id}>{cls.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Trimestre:</label>
            <select value={selectedTrimester} onChange={(e) => setSelectedTrimester(e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg">
              <option value="1">Trimestre 1</option>
              <option value="2">Trimestre 2</option>
              <option value="3">Trimestre 3</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={exportClassGrades} disabled={!selectedClass}
            className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 rounded-lg flex items-center justify-center space-x-2 hover:from-blue-700 hover:to-blue-800 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FileDown className="w-5 h-5" />
            <span className="font-medium">Exporter les notes</span>
          </button>
          <button
            onClick={exportRanking} disabled={!selectedClass}
            className="bg-gradient-to-r from-purple-600 to-purple-700 text-white px-6 py-4 rounded-lg flex items-center justify-center space-x-2 hover:from-purple-700 hover:to-purple-800 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FileDown className="w-5 h-5" />
            <span className="font-medium">Exporter le classement</span>
          </button>
        </div>
      </div>
      <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
        <h4 className="font-bold text-blue-800 mb-2">ℹ️ Instructions</h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• Pour importer des élèves : colonnes obligatoires "Nom", "Prénom", "Classe"</li>
          <li>• Pour importer des notes : colonnes "Nom", "Prénom" + une colonne par matière</li>
          <li>• Les exports créent des fichiers Excel prêts à être utilisés ou imprimés</li>
        </ul>
      </div>
    </div>
  );

  // ── Rendu principal ───────────────────────────────────────────────────────────
  const visibleNavItems = NAV_ITEMS.filter(item =>
    !currentUser || item.roles.includes(currentUser.role)
  );

  return (
    <div id="app-main" className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">

      {/* Notification toast */}
      {showAlert && (
        <div className="fixed top-4 right-4 z-50 animate-pulse">
          <div className="bg-green-100 border-2 border-green-600 rounded-lg p-4 shadow-lg">
            <p className="text-green-800 font-medium">{alertMessage}</p>
          </div>
        </div>
      )}

      {/* Sélecteur de modèle de bulletin */}
      {showPrintPreview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-96 overflow-y-auto m-4">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 rounded-t-lg">
              <h2 className="text-xl font-bold">Choisir le modèle de bulletin</h2>
            </div>
            <div className="p-8 text-center space-y-4">
              <div className="grid grid-cols-1 gap-4">
                {[
                  { id: 'model1', label: '📋 Modèle Classique', desc: 'Format traditionnel avec tableau détaillé' },
                  { id: 'model2', label: '📊 Modèle Moderne', desc: 'Design visuel avec graphiques et barres de progression' },
                  { id: 'model3', label: '🔍 Modèle Complet', desc: 'Analyse avancée avec alertes et détection automatique' },
                ].map(({ id, label, desc }) => (
                  <button
                    key={id}
                    onClick={() => setSelectedBulletinTemplate(id)}
                    className={`w-full p-4 rounded-lg border-2 transition ${selectedBulletinTemplate === id ? 'border-blue-600 bg-blue-50' : 'border-gray-300 bg-white hover:border-blue-400'}`}
                  >
                    <div className="font-semibold text-lg">{label}</div>
                    <div className="text-sm text-gray-600 mt-1">{desc}</div>
                  </button>
                ))}
              </div>
              <div className="flex gap-3 pt-6 justify-end">
                <button onClick={() => setShowPrintPreview(false)} className="px-4 py-2 bg-gray-400 text-white rounded hover:bg-gray-500">
                  Annuler
                </button>
                <button
                  onClick={() => {
                    window.dispatchEvent(new CustomEvent('print-bulletin', { detail: { template: selectedBulletinTemplate } }));
                    setTimeout(() => setShowPrintPreview(false), 300);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Imprimer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Composant PrintPreview */}
      {showPrintPreview && (
        <PrintPreview
          printStudent={printStudent}
          setShowPrintPreview={setShowPrintPreview}
          selectedTrimester={selectedTrimester}
          calculateAverage={calculateAverage}
          grades={grades}
          subjects={subjects}
          classes={classes}
          students={students}
          appColors={appColors}
          schoolLogo={schoolLogo}
          schoolInfo={schoolInfo}
          handlePrint={handlePrint}
          getMention={getMention}
          bulletinTemplate={selectedBulletinTemplate}
        />
      )}

      {/* Header */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <div className="flex justify-between items-center mb-2">
          <div className="flex-1"></div>
          <h1 className="text-4xl font-bold text-center text-blue-600">📚 Gestion de Bulletins Scolaires</h1>
          <div className="flex-1 flex justify-end items-center space-x-4">
            <SyncStatus />
            {renderUserMenu()}
          </div>
        </div>
        <p className="text-center text-gray-600">Système complet de gestion des notes et bulletins PDF</p>
      </div>

      {/* Navigation */}
      <div className="bg-white rounded-lg shadow-lg mb-6">
        {/* Mobile burger */}
        <div className="md:hidden p-4 flex justify-between items-center border-b">
          <h2 className="text-lg font-bold text-gray-800">
            {visibleNavItems.find(item => item.view === currentView)?.label || 'Menu'}
          </h2>
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Menu mobile dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-b">
            <div className="flex flex-col">
              {visibleNavItems.map(({ view, label, icon }) => (
                <button
                  key={view}
                  onClick={() => handleViewChange(view)}
                  className={`px-6 py-4 text-left transition-all font-medium flex items-center space-x-3 ${currentView === view ? 'bg-blue-600 text-white' : 'hover:bg-gray-50 text-gray-700'}`}
                >
                  <span className="text-2xl">{icon}</span>
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Navigation desktop */}
        <div className="hidden md:block p-2">
          <div className="flex flex-wrap gap-2">
            {visibleNavItems.map(({ view, label }) => (
              <button
                key={view}
                onClick={() => handleViewChange(view)}
                className={`px-4 py-2 rounded-lg transition-all font-medium ${currentView === view ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Contenu principal */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        {currentView === 'dashboard' && (isLoadingClasses || isLoadingStudents || isLoadingSubjects ? <DashboardSkeleton /> : renderDashboard())}
        {currentView === 'classes' && (isLoadingClasses ? <ClassesSkeleton /> : renderClasses())}
        {currentView === 'students' && (isLoadingStudents ? <TableSkeleton rows={6} cols={4} /> : (
          <StudentsList
            classes={classes}
            students={students}
            selectedClass={selectedClass}
            setSelectedClass={setSelectedClass}
            addStudent={handleAddStudent}
            editStudent={handleEditStudent}
            deleteStudent={handleDeleteStudent}
            currentUser={currentUser}
          />
        ))}
        {currentView === 'subjects' && (isLoadingSubjects ? <TableSkeleton rows={5} cols={3} /> : renderSubjects())}
        {currentView === 'grades' && (isLoadingClasses || isLoadingStudents || isLoadingSubjects || isLoadingGrades ? <GradesSkeleton /> : (
          <GradesForm
            classes={classes}
            students={students}
            subjects={subjects}
            selectedClass={selectedClass}
            setSelectedClass={setSelectedClass}
            selectedTrimester={selectedTrimester}
            setSelectedTrimester={setSelectedTrimester}
            getGrade={getGrade}
            updateGrade={updateGrade}
            calculateAverage={calculateAverage}
            getMention={getMention}
          />
        ))}
        {currentView === 'bulletins' && (isLoadingStudents || isLoadingGrades ? <BulletinsSkeleton /> : renderBulletins())}
        {currentView === 'academicyears' && (
          <AcademicYearManager
            academicYears={academicYears}
            setAcademicYears={setAcademicYears}
            currentYear={currentYear}
            setCurrentYear={setCurrentYear}
            showNotification={showNotification}
          />
        )}
        {currentView === 'appreciations' && (isLoadingStudents || isLoadingGrades ? <Spinner text="Chargement des appréciations..." /> : (
          <AppreciationManager
            grades={grades}
            students={students}
            subjects={subjects}
            classes={classes}
            selectedClass={selectedClass}
            selectedTrimester={selectedTrimester}
            showNotification={showNotification}
            currentUser={currentUser}
            appreciations={appreciations}
            setAppreciations={setAppreciations}
          />
        ))}
        {currentView === 'analytics' && (isLoadingStudents || isLoadingGrades ? <Spinner text="Chargement de l'analyse..." /> : (
          <AdvancedAnalytics
            students={students}
            classes={classes}
            grades={grades}
            subjects={subjects}
            selectedClass={selectedClass}
            selectedTrimester={selectedTrimester}
            calculateTrimesterAverage={calculateTrimesterAverage}
            getMention={getMention}
          />
        ))}
        {currentView === 'statistics' && (isLoadingStudents || isLoadingGrades ? <Spinner text="Chargement des statistiques..." /> : renderStatistics())}
        {currentView === 'importexport' && renderImportExport()}
        {currentView === 'settings' && (
          <SettingsPanel
            schoolLogo={schoolLogo}
            handleLogoUpload={handleLogoUpload}
            schoolInfo={schoolInfo}
            updateSchoolInfo={updateSchoolInfo}
            appColors={appColors}
            updateColor={updateColor}
            currentUser={currentUser}
            handleRegister={handleRegister}
            showNotification={showNotification}
            activities={activities}
          />
        )}
        {showLoginModal && (
          <LoginModalSupabase
            isRegister={isRegister}
            setIsRegister={setIsRegister}
            setShowLoginModal={setShowLoginModal}
            onSignIn={handleLogin}
            onSignUp={handleRegister}
            loading={authLoading}
          />
        )}
        {currentView === 'parents' && (
          <ParentPortal currentUser={currentUser} schoolInfo={schoolInfo} />
        )}
        {currentView === 'gestion-parents' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold">Gestion des parents</h2>
                <p className="text-sm text-gray-500 mt-0.5">Créez des comptes parents et associez-les à leurs enfants</p>
              </div>
              <button
                onClick={() => setParentModalOpen(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" /> Ajouter un parent
              </button>
            </div>

            {/* Guide d'utilisation */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
              <h3 className="font-bold text-blue-800 mb-3">📋 Comment ça marche ?</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">1</div>
                  <div>
                    <p className="font-semibold text-blue-800 text-sm">Créer un compte</p>
                    <p className="text-blue-600 text-xs mt-0.5">Cliquez "Ajouter un parent" → onglet "Créer un parent" → renseignez email et mot de passe</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">2</div>
                  <div>
                    <p className="font-semibold text-blue-800 text-sm">Lier à un élève</p>
                    <p className="text-blue-600 text-xs mt-0.5">Cliquez "Ajouter un parent" → onglet "Lier un élève" → associez le parent à son enfant</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">3</div>
                  <div>
                    <p className="font-semibold text-blue-800 text-sm">Le parent se connecte</p>
                    <p className="text-blue-600 text-xs mt-0.5">Le parent accède à l'appli avec son email/mot de passe et voit les notes de son enfant</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Lien direct vers l'appli */}
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="font-semibold text-gray-800">🔗 Lien à partager aux parents</p>
                <p className="text-sm text-gray-500 mt-0.5">https://gestion-bulletins-rho.vercel.app</p>
              </div>
              <button
                onClick={() => { navigator.clipboard.writeText('https://gestion-bulletins-rho.vercel.app'); showNotification('Lien copié !'); }}
                className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-100 transition-colors font-medium"
              >
                📋 Copier le lien
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Modals CRUD ─────────────────────────────────────────────────────── */}
      <ClassModal
        isOpen={classModalOpen}
        onClose={() => setClassModalOpen(false)}
        onSave={handleSaveClass}
      />

      <StudentModal
        isOpen={studentModalOpen}
        onClose={() => { setStudentModalOpen(false); setEditingStudent(null); }}
        onSave={handleSaveStudent}
        classes={classes}
        student={editingStudent}
      />

      <SubjectModal
        isOpen={subjectModalOpen}
        onClose={() => setSubjectModalOpen(false)}
        onSave={handleSaveSubject}
      />

      <ConfirmModal
        isOpen={confirmModal.open}
        onClose={closeConfirm}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
      />

      <ParentAssignModal
        isOpen={parentModalOpen}
        onClose={() => setParentModalOpen(false)}
        students={students}
        classes={classes}
        showNotification={showNotification}
      />
    </div>
  );
};

export default BulletinApp;