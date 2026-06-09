import * as XLSX from 'xlsx';
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
    LogOut, UserCircle, Shield, LayoutDashboard, Pencil, Calendar,
    Star, TrendingUp, FolderUp, UserCheck, UsersRound, CreditCard,
    Bot, CheckCircle, BarChart2, ChevronRight, ClipboardList
} from 'lucide-react';
import { supabase } from './config/supabase';
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
import PaymentManager from './components/PaymentManager';
import AIAppreciations from './components/AIAppreciations';
import AbsenceManager from './components/AbsenceManager';
import DashboardKPIs from './components/DashboardKPIs';
import LoginPage from './components/LoginPage';
import { useDarkMode } from './hooks/useDarkMode';
import DarkModeToggle from './components/DarkModeToggle';

// ─── Sections de navigation ───────────────────────────────────────────────────
const NAV_SECTIONS = [
    { key: 'principal', label: 'Principal' },
    { key: 'notes', label: 'Notes & Bulletins' },
    { key: 'avance', label: 'Avancé' },
    { key: 'gestion', label: 'Gestion' },
];

// ─── Items de navigation ──────────────────────────────────────────────────────
const NAV_ITEMS = [
    { view: 'dashboard', label: 'Tableau de bord', Icon: LayoutDashboard, section: 'principal', roles: ['admin', 'professeur', 'secretaire'] },
    { view: 'classes', label: 'Classes', Icon: GraduationCap, section: 'principal', roles: ['admin', 'secretaire'] },
    { view: 'students', label: 'Élèves', Icon: Users, section: 'principal', roles: ['admin', 'professeur', 'secretaire'] },
    { view: 'subjects', label: 'Matières', Icon: BookOpen, section: 'principal', roles: ['admin'] },
    { view: 'grades', label: 'Saisir notes', Icon: Pencil, section: 'notes', roles: ['admin', 'professeur'] },
    { view: 'absences', label: 'Absences', Icon: ClipboardList, section: 'notes', roles: ['admin', 'professeur', 'secretaire'] },
    { view: 'bulletins', label: 'Bulletins', Icon: FileText, section: 'notes', roles: ['admin', 'professeur', 'secretaire'] },
    { view: 'academicyears', label: 'Années scolaires', Icon: Calendar, section: 'notes', roles: ['admin'] },
    { view: 'appreciations', label: 'Appréciations', Icon: Star, section: 'notes', roles: ['admin', 'professeur'] },
    { view: 'analytics', label: 'Analyse avancée', Icon: TrendingUp, section: 'avance', roles: ['admin', 'professeur'] },
    { view: 'statistics', label: 'Statistiques', Icon: BarChart2, section: 'avance', roles: ['admin', 'professeur'] },
    { view: 'ia-appreciations', label: 'IA Appréciations', Icon: Bot, section: 'avance', roles: ['admin', 'professeur'] },
    { view: 'importexport', label: 'Import/Export', Icon: FolderUp, section: 'gestion', roles: ['admin', 'secretaire'] },
    { view: 'gestion-parents', label: 'Gestion parents', Icon: UsersRound, section: 'gestion', roles: ['admin'] },
    { view: 'paiements', label: 'Paiements', Icon: CreditCard, section: 'gestion', roles: ['admin', 'secretaire'] },
    { view: 'settings', label: 'Paramètres', Icon: Settings, section: 'gestion', roles: ['admin'] },
    { view: 'parents', label: 'Espace Parents', Icon: UserCheck, section: 'gestion', roles: ['parent'] },
];

// ─── Composant principal ──────────────────────────────────────────────────────
const BulletinApp = () => {
    // ── Authentification ────────────────────────────────────────────────────────
    const { currentUser, loading: authLoading, signIn, signUp, signOut, hasPermission, isAuthenticated } = useSupabaseAuth();
    const { isDark, toggle: toggleDark } = useDarkMode();

    // ── Navigation & UI ──────────────────────────────────────────────────────────
    const [currentView, setCurrentView] = useState('dashboard');
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [showAlert, setShowAlert] = useState(false);
    const [alertMessage, setAlertMessage] = useState('');
    const [parentModalOpen, setParentModalOpen] = useState(false);

    // ── Données Supabase via hooks ───────────────────────────────────────────────
    // ── Données Supabase via hooks ───────────────────────────────────────────────
    const [currentYear, setCurrentYear] = useState('2024-2025');

    const { classes, loading: isLoadingClasses } = useClasses();
    const { students, loading: isLoadingStudents } = useStudents();
    const { subjects, loading: isLoadingSubjects } = useSubjects();

    // ✅ Charge les grades si on en a besoin (y compris dashboard)
    const shouldLoadGrades = ['dashboard', 'grades', 'bulletins', 'statistics', 'analytics', 'ia-appreciations'].includes(currentView);
    const { grades, loading: isLoadingGrades, updateGrade, getGrade } = useGrades(shouldLoadGrades ? currentYear : null);

    // ── Données persistées (useSupabaseState) ───────────────────────────────────
    const [schoolInfo, setSchoolInfo] = useSupabaseState('schoolInfo', {
        // ── Infos de base (existants) ──
        name: 'ÉTABLISSEMENT SCOLAIRE',
        address: 'Adresse de l\'établissement',
        phone: '+33 XXX XXX XXX',
        email: 'contact@ecole.com',
        year: '2024-2025',
        // ── Nouveaux champs (à renseigner dans Paramètres) ──
        republic: '',   // ex: "REPUBLIQUE TOGOLAISE"
        countryMotto: '',   // ex: "Travail · Liberté · Patrie"
        ministry: '',   // ex: "Ministère des Enseignements Primaire et Secondaire"
        devise: '',   // devise de l'école, ex: "L'excellence avant tout"
        directorName: '',   // nom complet du directeur
        principalTeacher: '',   // nom du professeur principal (pour les bulletins)
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
    const [mfaChallenge, setMfaChallenge] = useState({ open: false, factorId: '' });

    // ── Modals CRUD ──────────────────────────────────────────────────────────────
    const [classModalOpen, setClassModalOpen] = useState(false);
    const [studentModalOpen, setStudentModalOpen] = useState(false);
    const [subjectModalOpen, setSubjectModalOpen] = useState(false);
    const [editingStudent, setEditingStudent] = useState(null);
    const [confirmModal, setConfirmModal] = useState({
        open: false, title: '', message: '', onConfirm: null
    });

    // ── Items de navigation visibles selon le rôle ───────────────────────────────
    const visibleNavItems = NAV_ITEMS.filter(item =>
        !currentUser || item.roles.includes(currentUser.role)
    );

    // ── Redirection automatique : un parent va directement à son espace ──────────
    useEffect(() => {
        console.log('🔄 App: Checking role for redirection. CurrentUser:', currentUser);
        if (currentUser?.role === 'parent') {
            console.log('✅ App: Parent detected! Redirecting to "parents" view...');
            setCurrentView('parents');
        } else if (currentUser?.role) {
            console.log('📋 App: User role is:', currentUser.role, '(not parent)');
        }
    }, [currentUser]);

    // ── Gestion liste parents ────────────────────────────────────────────────────
    const [parentsList, setParentsList] = useState([]);
    const [loadingParents, setLoadingParents] = useState(false);

    const fetchParents = async () => {
        setLoadingParents(true);
        try {
            const { data, error } = await supabase
                .from('user_profiles')
                .select(`
                    id, email, first_name, last_name, created_at,
                    parent_students (
                        student_id,
                        students ( id, first_name, last_name, classes ( name ) )
                    )
                `)
                .eq('role', 'parent')
                .order('created_at', { ascending: false });
            if (!error) setParentsList(data || []);
        } finally {
            setLoadingParents(false);
        }
    };

    useEffect(() => {
        if (currentView === 'gestion-parents') fetchParents();
    }, [currentView]);

    const handleDeleteParent = (parent) => {
        openConfirm(
            'Supprimer ce parent ?',
            `Le compte de ${parent.first_name} ${parent.last_name} (${parent.email}) sera supprimé ainsi que ses liaisons élèves.`,
            async () => {
                await supabase.from('parent_students').delete().eq('parent_id', parent.id);
                await supabase.from('user_profiles').delete().eq('id', parent.id);
                showNotification('Parent supprimé avec succès');
                fetchParents();
            }
        );
    };

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

    // ── Écran de chargement ───────────────────────────────────────────────────
    if (authLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
                <div className="text-center space-y-4">
                    <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="text-blue-600 font-semibold text-lg">Chargement d'EduPulse...</p>
                </div>
            </div>
        );
    }

    // ── Écran de connexion si non authentifié ─────────────────────────────────
    if (!currentUser) {
        return (
            <>
                <LoginPage
                    isRegister={isRegister}
                    setIsRegister={setIsRegister}
                    onSignIn={handleLogin}
                    onSignUp={handleRegister}
                    loading={authLoading}
                    showAlert={showAlert}
                    alertMessage={alertMessage}
                />
                {mfaChallenge.open && (
                    <MFAChallenge
                        factorId={mfaChallenge.factorId}
                        onSuccess={() => {
                            setMfaChallenge({ open: false, factorId: '' });
                            showNotification('Bienvenue ! 🔐');
                            logActivity('Connexion 2FA', 'Connexion sécurisée réussie');
                        }}
                        onCancel={async () => {
                            await signOut();
                            setMfaChallenge({ open: false, factorId: '' });
                        }}
                    />
                )}
            </>
        );
    }

    return (
        <div className="flex h-screen overflow-hidden" style={{ background: '#F0F5FF' }}>

            {/* ── Toast notification ─────────────────────────────────────────────── */}
            {showAlert && (
                <div className="fixed top-4 right-4 z-[100]">
                    <div className="bg-white border border-green-200 rounded-xl px-4 py-3 shadow-lg flex items-center gap-3">
                        <div className="w-7 h-7 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                            <CheckCircle className="w-4 h-4 text-green-600" />
                        </div>
                        <p className="text-sm font-medium text-gray-800">{alertMessage}</p>
                    </div>
                </div>
            )}

            {/* ── Sidebar ────────────────────────────────────────────────────────── */}
            <aside
                className={`w-[210px] flex-shrink-0 flex flex-col h-full z-50 transition-transform duration-300
          ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          fixed md:relative`}
                style={{ background: '#0D1B2A' }}
            >
                {/* Brand */}
                <div className="px-4 py-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                            <BarChart3 className="w-4 h-4 text-white" />
                        </div>
                        <div>
                            <div className="text-white font-bold text-sm leading-tight">EduPulse</div>
                            <div className="text-[10px]" style={{ color: 'rgba(255,255,255,0.35)' }}>Gestion scolaire</div>
                        </div>
                    </div>
                </div>

                {/* Nav */}
                <nav className="flex-1 overflow-y-auto px-2 py-2">
                    {NAV_SECTIONS.map(section => {
                        const sectionItems = visibleNavItems.filter(i => i.section === section.key);
                        if (sectionItems.length === 0) return null;
                        return (
                            <div key={section.key}>
                                <div className="text-[9.5px] font-bold uppercase tracking-widest px-2 py-2 mt-2"
                                    style={{ color: 'rgba(255,255,255,0.3)' }}>
                                    {section.label}
                                </div>
                                {sectionItems.map(({ view, label, Icon }) => (
                                    <button
                                        key={view}
                                        onClick={() => handleViewChange(view)}
                                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] font-medium mb-0.5 transition-all duration-150 text-left
                      ${currentView === view
                                                ? 'bg-blue-600 text-white'
                                                : 'hover:text-white'}`}
                                        style={{
                                            color: currentView === view ? 'white' : 'rgba(255,255,255,0.55)',
                                            background: currentView === view ? undefined : 'transparent',
                                        }}
                                        onMouseEnter={e => { if (currentView !== view) e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; }}
                                        onMouseLeave={e => { if (currentView !== view) e.currentTarget.style.background = 'transparent'; }}
                                    >
                                        <Icon className="w-[15px] h-[15px] flex-shrink-0" />
                                        <span className="flex-1 truncate">{label}</span>
                                    </button>
                                ))}
                            </div>
                        );
                    })}
                </nav>

                {/* User footer */}
                <div className="px-2 py-3" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                    {currentUser && (
                        <div className="flex items-center gap-2 px-2 py-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.05)' }}>
                            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0 font-bold text-white text-[11px]">
                                {currentUser.firstName?.[0]}{currentUser.lastName?.[0]}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="text-white text-[12px] font-medium truncate">
                                    {currentUser.firstName} {currentUser.lastName}
                                </div>
                                <div className="text-[10px]" style={{ color: 'rgba(255,255,255,0.35)' }}>
                                    {currentUser.role === 'admin' ? 'Administrateur' :
                                        currentUser.role === 'professeur' ? 'Professeur' :
                                            currentUser.role === 'parent' ? 'Parent' : 'Secrétaire'}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </aside>

            {/* Mobile overlay */}
            {mobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 md:hidden"
                    onClick={() => setMobileMenuOpen(false)}
                />
            )}

            {/* ── Main ───────────────────────────────────────────────────────────── */}
            <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">

                {/* Topbar */}
                <header className="bg-white flex items-center gap-3 px-5 py-2.5 flex-shrink-0"
                    style={{ borderBottom: '1px solid #EFF6FF' }}>

                    {/* Mobile burger */}
                    <button
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        className="md:hidden p-1.5 rounded-lg text-gray-500 hover:bg-blue-50 transition-colors"
                    >
                        {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                    </button>

                    {/* Page title */}
                    <div className="flex-1 flex items-center gap-2">
                        {(() => {
                            const item = visibleNavItems.find(i => i.view === currentView);
                            if (!item) return null;
                            const { Icon } = item;
                            return (
                                <>
                                    <Icon className="w-4 h-4 text-blue-600 flex-shrink-0" />
                                    <span className="text-[15px] font-bold text-gray-900">{item.label}</span>
                                </>
                            );
                        })()}
                    </div>

                    {/* Search */}
                    <div className="hidden md:flex items-center gap-2 rounded-lg px-3 py-1.5 text-gray-400 text-[12px] min-w-[150px]"
                        style={{ background: '#F0F5FF', border: '1px solid #DBEAFE' }}>
                        <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        Rechercher...
                    </div>

                    {/* Year badge */}
                    <div className="hidden md:flex items-center text-[11px] font-semibold text-blue-600 rounded-lg px-2.5 py-1.5"
                        style={{ background: '#EFF6FF', border: '1px solid #DBEAFE' }}>
                        {currentYear}
                    </div>

                    {/* SyncStatus */}
                    <SyncStatus />

                    {/* Dark mode */}
                    <DarkModeToggle isDark={isDark} toggle={toggleDark} />

                    {/* Logout */}
                    {currentUser && (
                        <button
                            onClick={handleLogout}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-colors"
                            style={{ background: '#FEE2E2', color: '#DC2626', border: '1px solid #FECACA' }}
                            onMouseEnter={e => e.currentTarget.style.background = '#FECACA'}
                            onMouseLeave={e => e.currentTarget.style.background = '#FEE2E2'}
                        >
                            <LogOut className="w-3.5 h-3.5" />
                            <span className="hidden md:inline">Déconnexion</span>
                        </button>
                    )}
                </header>

                {/* ── Scrollable content ──────────────────────────────────────────── */}
                <main className="flex-1 overflow-y-auto p-5">

                    {/* Sélecteur de modèle de bulletin */}
                    {showPrintPreview && (
                        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full m-4 overflow-hidden">
                                <div className="bg-blue-600 text-white px-6 py-4">
                                    <h2 className="text-lg font-bold">Choisir le modèle de bulletin</h2>
                                </div>
                                <div className="p-6 space-y-3">
                                    {[
                                        { id: 'model1', label: '📋 Modèle Classique', desc: 'Format traditionnel avec tableau détaillé' },
                                        { id: 'model2', label: '📊 Modèle Moderne', desc: 'Design visuel avec graphiques et barres de progression' },
                                        { id: 'model3', label: '🔍 Modèle Complet', desc: 'Analyse avancée avec alertes et détection automatique' },
                                    ].map(({ id, label, desc }) => (
                                        <button key={id} onClick={() => setSelectedBulletinTemplate(id)}
                                            className={`w-full p-4 rounded-xl border-2 text-left transition-all ${selectedBulletinTemplate === id ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-blue-300'}`}>
                                            <div className="font-semibold">{label}</div>
                                            <div className="text-sm text-gray-500 mt-0.5">{desc}</div>
                                        </button>
                                    ))}
                                </div>
                                <div className="px-6 pb-5 flex gap-3 justify-end">
                                    <button onClick={() => setShowPrintPreview(false)}
                                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors text-sm">
                                        Annuler
                                    </button>
                                    <button onClick={() => {
                                        window.dispatchEvent(new CustomEvent('print-bulletin', { detail: { template: selectedBulletinTemplate } }));
                                        setTimeout(() => setShowPrintPreview(false), 300);
                                    }} className="px-4 py-2 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors text-sm">
                                        Imprimer
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

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

                    {/* ── Views ─────────────────────────────────────────────────────── */}
                    <div className="bg-white rounded-2xl shadow-sm p-6 min-h-full" style={{ border: '1px solid #EFF6FF' }}>

                        {currentView === 'dashboard' && (isLoadingClasses || isLoadingStudents || isLoadingSubjects
                            ? <DashboardSkeleton />
                            : <DashboardKPIs
                                classes={classes} students={students} subjects={subjects} grades={grades}
                                calculateAverage={calculateAverage} currentUser={currentUser}
                                currentYear={currentYear} setCurrentView={setCurrentView} activities={activities}
                            />
                        )}
                        {currentView === 'classes' && (isLoadingClasses ? <ClassesSkeleton /> : renderClasses())}
                        {currentView === 'students' && (isLoadingStudents
                            ? <TableSkeleton rows={6} cols={4} />
                            : <StudentsList
                                classes={classes} students={students}
                                selectedClass={selectedClass} setSelectedClass={setSelectedClass}
                                addStudent={handleAddStudent} editStudent={handleEditStudent}
                                deleteStudent={handleDeleteStudent} currentUser={currentUser}
                            />
                        )}
                        {currentView === 'subjects' && (isLoadingSubjects ? <TableSkeleton rows={5} cols={3} /> : renderSubjects())}
                        {currentView === 'grades' && (isLoadingClasses || isLoadingStudents || isLoadingSubjects || isLoadingGrades
                            ? <GradesSkeleton />
                            : <GradesForm
                                classes={classes} students={students} subjects={subjects}
                                selectedClass={selectedClass} setSelectedClass={setSelectedClass}
                                selectedTrimester={selectedTrimester} setSelectedTrimester={setSelectedTrimester}
                                getGrade={getGrade} updateGrade={updateGrade}
                                calculateAverage={calculateAverage} getMention={getMention}
                            />
                        )}
                        {currentView === 'bulletins' && (isLoadingStudents || isLoadingGrades ? <BulletinsSkeleton /> : renderBulletins())}
                        {currentView === 'academicyears' && (
                            <AcademicYearManager
                                academicYears={academicYears} setAcademicYears={setAcademicYears}
                                currentYear={currentYear} setCurrentYear={setCurrentYear}
                                showNotification={showNotification}
                            />
                        )}
                        {currentView === 'appreciations' && (isLoadingStudents || isLoadingGrades
                            ? <Spinner text="Chargement des appréciations..." />
                            : <AppreciationManager
                                grades={grades} students={students} subjects={subjects} classes={classes}
                                selectedClass={selectedClass} selectedTrimester={selectedTrimester}
                                showNotification={showNotification} currentUser={currentUser}
                                appreciations={appreciations} setAppreciations={setAppreciations}
                            />
                        )}
                        {currentView === 'analytics' && (isLoadingStudents || isLoadingGrades
                            ? <Spinner text="Chargement de l'analyse..." />
                            : <AdvancedAnalytics
                                students={students} classes={classes} grades={grades} subjects={subjects}
                                selectedClass={selectedClass} selectedTrimester={selectedTrimester}
                                calculateTrimesterAverage={calculateTrimesterAverage} getMention={getMention}
                            />
                        )}
                        {currentView === 'statistics' && (isLoadingStudents || isLoadingGrades
                            ? <Spinner text="Chargement des statistiques..." />
                            : renderStatistics()
                        )}
                        {currentView === 'importexport' && renderImportExport()}
                        {currentView === 'settings' && (
                            <SettingsPanel
                                schoolLogo={schoolLogo} handleLogoUpload={handleLogoUpload}
                                schoolInfo={schoolInfo} updateSchoolInfo={updateSchoolInfo}
                                appColors={appColors} updateColor={updateColor}
                                currentUser={currentUser} handleRegister={handleRegister}
                                showNotification={showNotification} activities={activities}
                            />
                        )}
                        {showLoginModal && (
                            <LoginModalSupabase
                                isRegister={isRegister} setIsRegister={setIsRegister}
                                setShowLoginModal={setShowLoginModal}
                                onSignIn={handleLogin} onSignUp={handleRegister} loading={authLoading}
                            />
                        )}
                        {currentView === 'parents' && (
                            <ParentPortal
                                currentUser={currentUser}
                                schoolInfo={schoolInfo}
                                onPrint={(child) => openPrintPreview(child)}
                            />
                        )}
                        {currentView === 'gestion-parents' && (
                            <div className="space-y-6">
                                {/* ── En-tête ── */}
                                <div className="flex justify-between items-center">
                                    <div>
                                        <h2 className="text-xl font-bold text-gray-900">Gestion des parents</h2>
                                        <p className="text-sm text-gray-400 mt-0.5">Créez des comptes parents et associez-les à leurs enfants</p>
                                    </div>
                                    <button onClick={() => setParentModalOpen(true)}
                                        className="bg-blue-600 text-white px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-blue-700 transition-colors text-sm font-medium">
                                        <Plus className="w-4 h-4" /> Ajouter un parent
                                    </button>
                                </div>

                                {/* ── Comment ça marche ── */}
                                <div className="bg-blue-50 border border-blue-100 rounded-xl p-5">
                                    <h3 className="font-bold text-blue-800 mb-3 text-sm">📋 Comment ça marche ?</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        {[
                                            { n: 1, title: 'Créer un compte', desc: 'Cliquez "Ajouter un parent" → onglet "Créer un parent" → renseignez email et mot de passe' },
                                            { n: 2, title: 'Lier à un élève', desc: 'Cliquez "Ajouter un parent" → onglet "Lier un élève" → associez le parent à son enfant' },
                                            { n: 3, title: 'Le parent se connecte', desc: "Le parent accède à l'appli avec son email/mot de passe et voit les notes de son enfant" },
                                        ].map(({ n, title, desc }) => (
                                            <div key={n} className="flex items-start gap-3">
                                                <div className="w-7 h-7 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0">{n}</div>
                                                <div><p className="font-semibold text-blue-800 text-sm">{title}</p><p className="text-blue-600 text-xs mt-0.5">{desc}</p></div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* ── Lien à partager ── */}
                                <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between">
                                    <div>
                                        <p className="font-semibold text-gray-800 text-sm">🔗 Lien à partager aux parents</p>
                                        <p className="text-xs text-gray-400 mt-0.5">https://gestion-bulletins-rho.vercel.app</p>
                                    </div>
                                    <button onClick={() => { navigator.clipboard.writeText('https://gestion-bulletins-rho.vercel.app'); showNotification('Lien copié !'); }}
                                        className="bg-gray-50 border border-gray-200 text-gray-700 px-3 py-1.5 rounded-lg text-xs hover:bg-gray-100 transition-colors font-medium">
                                        📋 Copier le lien
                                    </button>
                                </div>

                                {/* ── Liste des parents inscrits ── */}
                                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                                    <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                                        <div className="flex items-center gap-2">
                                            <UsersRound className="w-4 h-4 text-blue-600" />
                                            <h3 className="font-bold text-gray-800 text-sm">Parents inscrits</h3>
                                            <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-full">
                                                {parentsList.length}
                                            </span>
                                        </div>
                                        <button onClick={fetchParents} className="text-xs text-gray-400 hover:text-blue-600 transition-colors">
                                            ↻ Actualiser
                                        </button>
                                    </div>

                                    {loadingParents ? (
                                        <div className="flex items-center justify-center py-12 gap-3">
                                            <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                                            <span className="text-sm text-gray-400">Chargement...</span>
                                        </div>
                                    ) : parentsList.length === 0 ? (
                                        <div className="text-center py-12">
                                            <UsersRound className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                                            <p className="text-sm text-gray-400">Aucun parent inscrit pour le moment</p>
                                            <button onClick={() => setParentModalOpen(true)}
                                                className="mt-3 text-xs text-blue-600 hover:underline font-medium">
                                                + Ajouter le premier parent
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="divide-y divide-gray-50">
                                            {parentsList.map(parent => {
                                                const enfants = parent.parent_students || [];
                                                return (
                                                    <div key={parent.id} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors">
                                                        {/* Avatar */}
                                                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                                                            {parent.first_name?.[0]}{parent.last_name?.[0]}
                                                        </div>

                                                        {/* Infos parent */}
                                                        <div className="flex-1 min-w-0">
                                                            <p className="font-semibold text-gray-800 text-sm">
                                                                {parent.first_name} {parent.last_name}
                                                            </p>
                                                            <p className="text-xs text-gray-400 truncate">{parent.email}</p>
                                                        </div>

                                                        {/* Enfants liés */}
                                                        <div className="hidden md:flex flex-col items-start gap-1 min-w-[180px]">
                                                            {enfants.length === 0 ? (
                                                                <span className="text-xs text-orange-500 bg-orange-50 px-2 py-0.5 rounded-full font-medium">
                                                                    ⚠️ Aucun élève lié
                                                                </span>
                                                            ) : (
                                                                enfants.map(ps => (
                                                                    <span key={ps.student_id} className="text-xs text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full">
                                                                        👦 {ps.students?.first_name} {ps.students?.last_name}
                                                                        {ps.students?.classes?.name && (
                                                                            <span className="text-gray-400 ml-1">— {ps.students.classes.name}</span>
                                                                        )}
                                                                    </span>
                                                                ))
                                                            )}
                                                        </div>

                                                        {/* Date d'inscription */}
                                                        <div className="hidden lg:block text-right flex-shrink-0">
                                                            <p className="text-xs text-gray-400">
                                                                {new Date(parent.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                            </p>
                                                        </div>

                                                        {/* Actions */}
                                                        <div className="flex items-center gap-2 flex-shrink-0">
                                                            <button
                                                                onClick={() => setParentModalOpen(true)}
                                                                className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                                                                title="Lier un élève"
                                                            >
                                                                <UserCheck className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteParent(parent)}
                                                                className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                                                title="Supprimer"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                        {currentView === 'paiements' && (
                            <PaymentManager
                                students={students} classes={classes}
                                currentUser={currentUser} schoolInfo={schoolInfo} currentYear={currentYear}
                            />
                        )}
                        {currentView === 'absences' && (
                            <AbsenceManager
                                students={students}
                                classes={classes}
                                subjects={subjects}
                                currentUser={currentUser}
                            />
                        )}
                        {currentView === 'ia-appreciations' && (
                            <AIAppreciations
                                students={students} classes={classes} grades={grades} subjects={subjects}
                                selectedClass={selectedClass} selectedTrimester={selectedTrimester}
                                calculateAverage={calculateAverage} showNotification={showNotification}
                                updateGrade={updateGrade}
                            />
                        )}
                    </div>
                </main>
            </div>

            {/* ── Modals CRUD ──────────────────────────────────────────────────────── */}
            <ClassModal isOpen={classModalOpen} onClose={() => setClassModalOpen(false)} onSave={handleSaveClass} />
            <StudentModal
                isOpen={studentModalOpen}
                onClose={() => { setStudentModalOpen(false); setEditingStudent(null); }}
                onSave={handleSaveStudent} classes={classes} student={editingStudent}
            />
            <SubjectModal isOpen={subjectModalOpen} onClose={() => setSubjectModalOpen(false)} onSave={handleSaveSubject} />
            <ConfirmModal
                isOpen={confirmModal.open} onClose={closeConfirm}
                onConfirm={confirmModal.onConfirm} title={confirmModal.title} message={confirmModal.message}
            />
            <ParentAssignModal
                isOpen={parentModalOpen} onClose={() => setParentModalOpen(false)}
                students={students} classes={classes} showNotification={showNotification}
            />
        </div>
    );
};

export default BulletinApp;