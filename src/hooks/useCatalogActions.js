import { useState } from 'react';

/**
 * Création, modification et suppression des classes, élèves et matières : état des fenêtres de
 * saisie, confirmation avant suppression, entrée au journal d'activité et message de confirmation.
 */
export function useCatalogActions({
    addClass, deleteClass, addStudent, updateStudent, deleteStudent, addSubject, deleteSubject, logActivity, showNotification, openConfirm,
}) {
    // ── Modals CRUD ──────────────────────────────────────────────────────────────
    const [classModalOpen, setClassModalOpen] = useState(false);
    const [studentModalOpen, setStudentModalOpen] = useState(false);
    const [subjectModalOpen, setSubjectModalOpen] = useState(false);
    const [editingStudent, setEditingStudent] = useState(null);

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

    const handleSaveStudent = async ({ firstName, lastName, classId, ...profile }) => {
        // profile : date de naissance, sexe, photo, contact d'urgence (voir sql/students-profile.sql)
        if (editingStudent) {
            await updateStudent(editingStudent.id, firstName, lastName, classId, profile);
            logActivity('Modification d\'élève', `Élève "${firstName} ${lastName}" modifié`);
            showNotification('Élève modifié avec succès !');
        } else {
            await addStudent(firstName, lastName, classId, profile);
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

    return {
        classModalOpen, setClassModalOpen, studentModalOpen, setStudentModalOpen, subjectModalOpen, setSubjectModalOpen, editingStudent, setEditingStudent, handleAddClass, handleSaveClass, handleDeleteClass, handleAddStudent, handleEditStudent, handleSaveStudent, handleDeleteStudent, handleAddSubject, handleSaveSubject, handleDeleteSubject,
    };
}
