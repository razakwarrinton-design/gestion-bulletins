import { lazy } from 'react';
import {
    DashboardSkeleton,
    ClassesSkeleton,
    TableSkeleton,
    GradesSkeleton,
    BulletinsSkeleton,
    Spinner
} from '../components/Skeleton';
import ClassesView from '../views/ClassesView';
import SubjectsView from '../views/SubjectsView';

// Écrans chargés à la demande : le premier affichage reste léger (réseaux mobiles lents).
const LoginModalSupabase = lazy(() => import('../components/LoginModalSupabase'));
const StudentsList = lazy(() => import('../components/StudentsList'));
const GradesForm = lazy(() => import('../components/GradesForm'));
const SettingsPanel = lazy(() => import('../components/Settings'));
const AcademicYearManager = lazy(() => import('../components/AcademicYearManager'));
const AppreciationManager = lazy(() => import('../components/AppreciationManager'));
const AdvancedAnalytics = lazy(() => import('../components/AdvancedAnalytics'));
const ParentPortal = lazy(() => import('../components/ParentPortal'));
const AIAppreciations = lazy(() => import('../components/AIAppreciations'));
const AbsenceManager = lazy(() => import('../components/AbsenceManager'));
const DashboardKPIs = lazy(() => import('../components/DashboardKPIs'));
const AdminPaymentsDashboard = lazy(() => import('../components/AdminPaymentsDashboard'));
const SMSDashboard = lazy(() => import('../components/SMSDashboard'));
const ChatWindow = lazy(() => import('../components/ChatWindow'));
const ParentChatDashboard = lazy(() => import('../components/ParentChatDashboard'));
const ProfesseurChatDashboard = lazy(() => import('../components/ProfesseurChatDashboard'));
const AdminChatDashboard = lazy(() => import('../components/AdminChatDashboard'));
const UsersManager = lazy(() => import('../components/UsersManager'));
const StatisticsView = lazy(() => import('../views/StatisticsView'));
const ImportExportView = lazy(() => import('../views/ImportExportView'));
const ParentsManagementView = lazy(() => import('../views/ParentsManagementView'));
const BulletinsView = lazy(() => import('../views/BulletinsView'));

/**
 * Aiguillage des écrans : affiche celui qui correspond à l'adresse (#/écran).
 * `ctx` regroupe les données et actions de l'application utilisées par les écrans.
 */
export default function AppViews({ currentView, ctx }) {
    const {
        academicYears, activities, appColors, appreciations, authLoading, calculateAverage,
        calculateTrimesterAverage, chatUser, classes, currentUser, currentYear, exportClassGrades,
        exportRanking, getGrade, getMention, getRank, grades, handleAddClass,
        handleAddStudent, handleAddSubject, handleDeleteClass, handleDeleteStudent, handleDeleteSubject, handleEditStudent,
        handleLogin, handleLogoUpload, handleRegister, importGrades, importStudents, isLoadingClasses,
        isLoadingGrades, isLoadingStudents, isLoadingSubjects, isLoadingYears, isRegister, navigate,
        openConfirm, openPrintPreview, schoolInfo, schoolLogo, selectedClass, selectedTrimester,
        setAcademicYears, setAppreciations, setChatUser, setCurrentYear, setIsRegister, setParentModalOpen,
        setSelectedClass, setSelectedTrimester, setShowLoginModal, showLoginModal, showNotification, students,
        subjects, updateColor, updateGrade, updateSchoolInfo,
    } = ctx;
    return (
        <>

                        {currentView === 'dashboard' && (isLoadingClasses || isLoadingStudents || isLoadingSubjects
                            ? <DashboardSkeleton />
                            : <DashboardKPIs
                                classes={classes} students={students} subjects={subjects} grades={grades}
                                calculateAverage={calculateAverage} currentUser={currentUser}
                                currentYear={currentYear} setCurrentView={navigate} activities={activities}
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
                                getRank={getRank} schoolName={schoolInfo.name}
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
                        {currentView === 'users' && (
                            <UsersManager currentUser={currentUser} showNotification={showNotification} />
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
                                currentYear={isLoadingYears ? null : currentYear}
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
        </>
    );
}
