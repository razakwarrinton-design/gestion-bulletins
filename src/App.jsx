import { useState, useEffect } from 'react';
import { useSupabaseState } from './hooks/useSupabaseState';
import { useSupabaseAuth } from './hooks/useSupabaseAuth';
import { calculateAverage as calcAverageUtil, getMention as getMentionUtil } from './utils/grades';
import LoginModalSupabase from './components/LoginModalSupabase';
import PrintPreview from './components/PrintPreview';
import StudentsList from './components/StudentsList';
import GradesForm from './components/GradesForm';
import SettingsPanel from './components/Settings';
import AcademicYearManager from './components/AcademicYearManager';
import AppreciationManager from './components/AppreciationManager';
import AdvancedAnalytics from './components/AdvancedAnalytics';
import * as calculUtils from './utils/calculUtils';
import { useClasses } from './hooks/useClasses';
import { useStudents } from './hooks/useStudents';
import { useSubjects } from './hooks/useSubjects';
import { useGrades } from './hooks/useGrades';
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
import AIAppreciations from './components/AIAppreciations';
import AbsenceManager from './components/AbsenceManager';
import DashboardKPIs from './components/DashboardKPIs';
import LoginPage from './components/LoginPage';
import { useDarkMode } from './hooks/useDarkMode';
import AdminPaymentsDashboard from './components/AdminPaymentsDashboard';
import SMSDashboard from './components/SMSDashboard';
import ChatWindow from './components/ChatWindow';
import ParentChatDashboard from './components/ParentChatDashboard';
import ProfesseurChatDashboard from './components/ProfesseurChatDashboard';
import AdminChatDashboard from './components/AdminChatDashboard';
import MFAChallenge from './components/MFAChallenge';
import BulletinTemplatePicker from './components/BulletinTemplatePicker';
import { NAV_ITEMS } from './config/navigation';
import { createExcelHandlers } from './utils/excelIO';
import Sidebar from './layout/Sidebar';
import Topbar from './layout/Topbar';
import Toast from './layout/Toast';
import ClassesView from './views/ClassesView';
import SubjectsView from './views/SubjectsView';
import BulletinsView from './views/BulletinsView';
import StatisticsView from './views/StatisticsView';
import ImportExportView from './views/ImportExportView';
import ParentsManagementView from './views/ParentsManagementView';

// ─── Composant principal ──────────────────────────────────────────────────────
const BulletinApp = () => {
    // ── Authentification ────────────────────────────────────────────────────────
    const { currentUser, loading: authLoading, signIn, signUp, signOut } = useSupabaseAuth();
    const { isDark, toggle: toggleDark } = useDarkMode();

    // ── Navigation & UI ──────────────────────────────────────────────────────────
    const [currentView, setCurrentView] = useState('dashboard');
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [showAlert, setShowAlert] = useState(false);
    const [alertMessage, setAlertMessage] = useState('');
    const [parentModalOpen, setParentModalOpen] = useState(false);
    const [chatUser, setChatUser] = useState(null); // Utilisateur de chat

    // ── Données Supabase via hooks ───────────────────────────────────────────────
    const [currentYear, setCurrentYear] = useState('2024-2025');

    const { classes, loading: isLoadingClasses, addClass, deleteClass } = useClasses();
    const { students, loading: isLoadingStudents, addStudent, updateStudent, deleteStudent } = useStudents();
    const { subjects, loading: isLoadingSubjects, addSubject, deleteSubject } = useSubjects();

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

    const handleRegister = async (email, password, firstName, lastName) => {
        const result = await signUp(email, password, firstName, lastName);
        if (result.success) {
            logActivity('Création de compte', `Nouvel utilisateur: ${firstName} ${lastName} (secretaire)`);
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
    const { exportClassGrades, exportRanking, importStudents, importGrades } = createExcelHandlers({
        students, classes, subjects, selectedClass, selectedTrimester,
        getGrade, calculateAverage, getMention,
        addClass, addStudent, updateGrade, showNotification,
    });

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

            <Toast show={showAlert} message={alertMessage} />

            <Sidebar
                visibleNavItems={visibleNavItems} currentView={currentView}
                mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen}
                onNavigate={handleViewChange} currentUser={currentUser}
            />

            {/* ── Main ───────────────────────────────────────────────────────────── */}
            <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">

                <Topbar
                    mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen}
                    visibleNavItems={visibleNavItems} currentView={currentView}
                    currentYear={currentYear} isDark={isDark} toggleDark={toggleDark}
                    currentUser={currentUser} onLogout={handleLogout}
                />

                {/* ── Scrollable content ──────────────────────────────────────────── */}
                <main className="flex-1 overflow-y-auto p-5">

                    {showPrintPreview && (
                        <BulletinTemplatePicker
                            selected={selectedBulletinTemplate}
                            onSelect={setSelectedBulletinTemplate}
                            onClose={() => setShowPrintPreview(false)}
                        />
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
                        {currentView === 'classes' && (isLoadingClasses ? <ClassesSkeleton /> : (
                            <ClassesView
                                currentUser={currentUser} classes={classes} students={students}
                                onAddClass={handleAddClass} onDeleteClass={handleDeleteClass}
                            />
                        ))}
                        {currentView === 'students' && (isLoadingStudents
                            ? <TableSkeleton rows={6} cols={4} />
                            : <StudentsList
                                classes={classes} students={students}
                                selectedClass={selectedClass} setSelectedClass={setSelectedClass}
                                addStudent={handleAddStudent} editStudent={handleEditStudent}
                                deleteStudent={handleDeleteStudent} currentUser={currentUser}
                            />
                        )}
                        {currentView === 'subjects' && (isLoadingSubjects ? <TableSkeleton rows={5} cols={3} /> : (
                            <SubjectsView
                                currentUser={currentUser} subjects={subjects}
                                onAddSubject={handleAddSubject} onDeleteSubject={handleDeleteSubject}
                            />
                        ))}
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
                        {currentView === 'bulletins' && (isLoadingStudents || isLoadingGrades ? <BulletinsSkeleton /> : (
                            <BulletinsView
                                classes={classes} students={students}
                                selectedClass={selectedClass} setSelectedClass={setSelectedClass}
                                selectedTrimester={selectedTrimester} setSelectedTrimester={setSelectedTrimester}
                                calculateAverage={calculateAverage} getMention={getMention}
                                onPrint={openPrintPreview}
                            />
                        ))}
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
                            : <StatisticsView
                                classes={classes} students={students} subjects={subjects} grades={grades}
                                selectedClass={selectedClass} setSelectedClass={setSelectedClass}
                                selectedTrimester={selectedTrimester} setSelectedTrimester={setSelectedTrimester}
                                calculateAverage={calculateAverage} getMention={getMention}
                            />
                        )}
                        {currentView === 'importexport' && (
                            <ImportExportView
                                classes={classes}
                                selectedClass={selectedClass} setSelectedClass={setSelectedClass}
                                selectedTrimester={selectedTrimester} setSelectedTrimester={setSelectedTrimester}
                                onImportStudents={importStudents} onImportGrades={importGrades}
                                onExportGrades={exportClassGrades} onExportRanking={exportRanking}
                            />
                        )}
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
                        {currentView === 'sms-dashboard' && <SMSDashboard />}
                        {currentView === 'chat' && (
                            chatUser ? (
                                <ChatWindow
                                    conversationId={chatUser.conversationId}
                                    otherUser={chatUser.otherUser}
                                    currentUser={currentUser}
                                    onClose={() => setChatUser(null)}
                                />
                            ) : currentUser?.role === 'admin' ? (
                                <AdminChatDashboard
                                    currentUser={currentUser}
                                    onOpenChat={(conversationId, otherUser) => setChatUser({ conversationId, otherUser })}
                                />
                            ) : currentUser?.role === 'professeur' ? (
                                <ProfesseurChatDashboard
                                    currentUser={currentUser}
                                    onOpenChat={(conversationId, otherUser) => setChatUser({ conversationId, otherUser })}
                                />
                            ) : (
                                <ParentChatDashboard
                                    currentUser={currentUser}
                                    onOpenChat={(conversationId, otherUser) => setChatUser({ conversationId, otherUser })}
                                />
                            )
                        )}
                        {currentView === 'parents' && (
                            <ParentPortal
                                currentUser={currentUser}
                                schoolInfo={schoolInfo}
                                onPrint={(child) => openPrintPreview(child)}
                            />
                        )}
                        {currentView === 'gestion-parents' && (
                            <ParentsManagementView
                                openConfirm={openConfirm} showNotification={showNotification}
                                onAddParent={() => setParentModalOpen(true)}
                            />
                        )}
                        {currentView === 'admin-payments' && <AdminPaymentsDashboard />}
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