import { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import { useAppreciations } from './hooks/useAppreciations';
import { useSupabaseAuth } from './hooks/useSupabaseAuth';
import { useHashRoute } from './hooks/useHashRoute';
import { useToast } from './hooks/useToast';
import { useConfirmDialog } from './hooks/useConfirmDialog';
import { useActivityLog } from './hooks/useActivityLog';
import { useSchoolSettings } from './hooks/useSchoolSettings';
import { useCatalogActions } from './hooks/useCatalogActions';
import {
    calculateAverage as calcAverageUtil,
    getMention as getMentionUtil,
    getClassRank as getClassRankUtil,
} from './utils/grades';
import * as calculUtils from './utils/calculUtils';
import { useClasses } from './hooks/useClasses';
import { useStudents } from './hooks/useStudents';
import { useSubjects } from './hooks/useSubjects';
import { useGrades } from './hooks/useGrades';
import ClassModal from './components/ClassModal';
import StudentModal from './components/StudentModal';
import SubjectModal from './components/SubjectModal';
import ConfirmModal from './components/ConfirmModal';
import { Spinner } from './components/Skeleton';
import ParentAssignModal from './components/ParentAssignModal';
import LoginPage from './components/LoginPage';
import { useDarkMode } from './hooks/useDarkMode';
import MFAChallenge from './components/MFAChallenge';
import BulletinTemplatePicker from './components/BulletinTemplatePicker';
import { NAV_ITEMS } from './config/navigation';
import { createExcelHandlers } from './utils/excelIO';
import { consumePaymentReturn, PAYMENT_RETURN_MESSAGE } from './utils/paymentReturn';
import Sidebar from './layout/Sidebar';
import Topbar from './layout/Topbar';
import Toast from './layout/Toast';
import AppViews from './layout/AppViews';
import { resolveId } from './utils/ids';
import PendingApproval from './components/PendingApproval';

// Écrans chargés à la demande : le premier affichage reste léger (réseaux mobiles lents).
const PrintPreview = lazy(() => import('./components/PrintPreview'));

// ─── Composant principal ──────────────────────────────────────────────────────
const BulletinApp = () => {
    // ── Authentification ────────────────────────────────────────────────────────
    const { currentUser, loading: authLoading, signIn, signUp, signOut } = useSupabaseAuth();
    const { isDark, toggle: toggleDark } = useDarkMode();

    // ── Navigation & UI ──────────────────────────────────────────────────────────
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    // Retour depuis la page de paiement : message d'attente (le statut réel vient du webhook)
    const [paymentReturnId] = useState(() => consumePaymentReturn());
    const { showAlert, alertMessage, notify: showNotification } = useToast({
        initialMessage: paymentReturnId ? PAYMENT_RETURN_MESSAGE : '',
    });
    const { confirmModal, openConfirm, closeConfirm } = useConfirmDialog();
    const [parentModalOpen, setParentModalOpen] = useState(false);
    const [chatUser, setChatUser] = useState(null); // Utilisateur de chat

    // Écrans accessibles selon le rôle. L'écran courant suit l'adresse (#/écran) mais ne peut jamais
    // être un écran absent du menu du compte : une adresse tapée à la main ne contourne pas les rôles.
    const role = currentUser?.role;
    const visibleNavItems = useMemo(
        () => NAV_ITEMS.filter(item => !role || item.roles.includes(role)),
        [role]
    );
    const allowedViews = useMemo(() => visibleNavItems.map(item => item.view), [visibleNavItems]);
    const [currentView, navigate] = useHashRoute({
        allowedViews,
        defaultView: role === 'parent' ? 'parents' : 'dashboard',
    });

    // ── Données Supabase via hooks ───────────────────────────────────────────────
    const { classes, loading: isLoadingClasses, addClass, deleteClass } = useClasses();
    const { students, loading: isLoadingStudents, addStudent, updateStudent, deleteStudent } = useStudents();
    const { subjects, loading: isLoadingSubjects, addSubject, deleteSubject } = useSubjects();

    // ── Réglages de l'établissement, journal d'activité, appréciations ──────────
    const {
        schoolInfo, appColors, schoolLogo, academicYears, setAcademicYears, isLoadingYears,
        currentYear, setCurrentYear, handleLogoUpload, updateSchoolInfo, updateColor,
    } = useSchoolSettings({ notify: showNotification });
    const { activities, logActivity } = useActivityLog(currentUser);
    // Les appréciations ne sont chargées que sur leur écran (table appreciations, une ligne par appréciation)
    const appreciationsApi = useAppreciations(currentView === 'appreciations' && !isLoadingYears ? currentYear : null);

    // Charge les notes si on en a besoin (y compris dashboard), une fois l'année connue
    const shouldLoadGrades = ['dashboard', 'grades', 'bulletins', 'statistics', 'analytics', 'ia-appreciations'].includes(currentView);
    const {
        grades, loading: isLoadingGrades, error: gradesError, updateGrade, getGrade,
    } = useGrades(shouldLoadGrades && !isLoadingYears ? currentYear : null);

    // ── Classes, élèves, matières : fenêtres de saisie et actions ───────────────
    const {
        classModalOpen, setClassModalOpen, studentModalOpen, setStudentModalOpen, subjectModalOpen, setSubjectModalOpen, editingStudent, setEditingStudent, handleAddClass, handleSaveClass, handleDeleteClass, handleAddStudent, handleEditStudent, handleSaveStudent, handleDeleteStudent, handleAddSubject, handleSaveSubject, handleDeleteSubject,
    } = useCatalogActions({
        addClass, deleteClass, addStudent, updateStudent, deleteStudent, addSubject, deleteSubject, logActivity, showNotification, openConfirm,
    });

    // ── Sélections ───────────────────────────────────────────────────────────────
    const [selectedClass, setSelectedClassState] = useState(null);
    // Un <select> renvoie du texte alors que les identifiants de classe peuvent être des nombres :
    // on retrouve l'identifiant d'origine pour que les comparaisons strictes (===) restent vraies.
    const setSelectedClass = (value) => setSelectedClassState(resolveId(classes, value));
    const [selectedTrimester, setSelectedTrimester] = useState('1');

    // ── Impression ───────────────────────────────────────────────────────────────
    const [showPrintPreview, setShowPrintPreview] = useState(false);
    const [printStudent, setPrintStudent] = useState(null);
    const [selectedBulletinTemplate, setSelectedBulletinTemplate] = useState('model1');

    // ── Auth Modal ───────────────────────────────────────────────────────────────
    const [showLoginModal, setShowLoginModal] = useState(false);
    const [isRegister, setIsRegister] = useState(false);
    const [mfaChallenge, setMfaChallenge] = useState({ open: false, factorId: '' });

    // Un échec de chargement des notes ne doit pas se traduire par une liste vide sans explication
    useEffect(() => {
        if (gradesError) showNotification(`Impossible de charger les notes : ${gradesError}`);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [gradesError]);

    const handleViewChange = (view) => {
        navigate(view);
        setMobileMenuOpen(false);
    };

    // ── Calculs ──────────────────────────────────────────────────────────────────
    const calculateAverage = (studentId, trimester) =>
        calcAverageUtil(studentId, trimester, grades, subjects);

    const getMention = (average) =>
        getMentionUtil(average);

    const getRank = (studentId, trimester, classmates) =>
        getClassRankUtil(studentId, trimester, classmates, grades, subjects);

    const calculateTrimesterAverage = (studentId, trimester) =>
        calculUtils.calculateTrimesterAverage(studentId, trimester, grades, subjects);

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
                    navigate('dashboard');
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

    // Compte créé mais pas encore validé par un administrateur : aucun accès aux données
    if (currentUser.role === 'en_attente') {
        return (
            <PendingApproval
                currentUser={currentUser}
                onRefresh={() => window.location.reload()}
                onSignOut={signOut}
            />
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
                        <Suspense fallback={null}>
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
                            schoolInfo={{ ...schoolInfo, year: currentYear }}
                            handlePrint={handlePrint}
                            getMention={getMention}
                            bulletinTemplate={selectedBulletinTemplate}
                        />
                        </Suspense>
                    )}

                    {/* ── Views ─────────────────────────────────────────────────────── */}
                    <div className="bg-white rounded-2xl shadow-sm p-6 min-h-full" style={{ border: '1px solid #EFF6FF' }}>
                        <Suspense fallback={<Spinner text="Chargement..." />}>
                        <AppViews currentView={currentView} ctx={{
                            academicYears, activities, appColors, appreciationsApi, authLoading, calculateAverage,
                            calculateTrimesterAverage, chatUser, classes, currentUser, currentYear, exportClassGrades,
                            exportRanking, getGrade, getMention, getRank, grades, handleAddClass,
                            handleAddStudent, handleAddSubject, handleDeleteClass, handleDeleteStudent, handleDeleteSubject, handleEditStudent,
                            handleLogin, handleLogoUpload, handleRegister, importGrades, importStudents, isLoadingClasses,
                            isLoadingGrades, isLoadingStudents, isLoadingSubjects, isLoadingYears, isRegister, navigate,
                            openConfirm, openPrintPreview, schoolInfo, schoolLogo, selectedClass, selectedTrimester,
                            setAcademicYears, setChatUser, setCurrentYear, setIsRegister, setParentModalOpen,
                            setSelectedClass, setSelectedTrimester, setShowLoginModal, showLoginModal, showNotification, students,
                            subjects, updateColor, updateGrade, updateSchoolInfo,
                        }} />
                        </Suspense>
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