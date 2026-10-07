// La bibliothèque xlsx est lourde : elle n'est téléchargée qu'au premier export ou import.
const loadXlsx = () => import('xlsx');

export const createExcelHandlers = ({
    students, classes, subjects, selectedClass, selectedTrimester,
    getGrade, calculateAverage, getMention,
    addClass, addStudent, updateGrade, showNotification,
}) => {
    const exportClassGrades = async () => {
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
        const XLSX = await loadXlsx();
        const ws = XLSX.utils.aoa_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, `Trimestre ${selectedTrimester}`);
        XLSX.writeFile(wb, `Notes_${className}_T${selectedTrimester}.xlsx`);
        showNotification('Fichier Excel exporté !');
    };

    const exportRanking = async () => {
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
        const XLSX = await loadXlsx();
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
            const XLSX = await loadXlsx();
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
        reader.onload = async (e) => {
            const data = new Uint8Array(e.target.result);
            const XLSX = await loadXlsx();
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

    return { exportClassGrades, exportRanking, importStudents, importGrades };
};
