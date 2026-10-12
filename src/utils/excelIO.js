import { normalizeText, parseStudentRows, parseGradeRows, summarizeProblems } from './importParsing';

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

    /** Lit la première feuille d'un fichier Excel ou CSV : tableau de lignes { colonne: valeur }. */
    const readSheetRows = async (file) => {
        const buffer = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = () => reject(new Error('lecture impossible'));
            reader.readAsArrayBuffer(file);
        });
        const XLSX = await loadXlsx();
        const workbook = XLSX.read(new Uint8Array(buffer), { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        if (!worksheet) throw new Error('aucune feuille');
        // blankrows : les lignes vides sont gardées (et ignorées ensuite) pour que les numéros de ligne cités dans les
        // messages correspondent à ceux d'Excel
        return XLSX.utils.sheet_to_json(worksheet, { blankrows: true });
    };

    /** Crée les élèves d'un import ; les classes absentes sont créées une seule fois chacune. */
    const importStudentRows = async (rawRows) => {
        const { valid, problems, fatal } = parseStudentRows(rawRows, { classes, students });
        if (fatal) { showNotification(fatal); return; }
        const classByName = new Map(classes.map(c => [normalizeText(c.name), c]));
        let imported = 0;
        let failed = 0;
        for (const row of valid) {
            try {
                const key = normalizeText(row.className);
                let classObj = classByName.get(key);
                if (!classObj) {
                    classObj = await addClass(row.className);
                    classByName.set(key, classObj);
                }
                await addStudent(row.firstName, row.lastName, classObj.id);
                imported++;
            } catch (err) {
                failed++;
                console.error('Erreur import élève:', err);
            }
        }
        const skipped = summarizeProblems(problems);
        const parts = [`${imported} élève(s) importé(s)`];
        if (failed) parts.push(`${failed} échec(s) d'enregistrement`);
        if (problems.length) parts.push(`${problems.length} ligne(s) ignorée(s) (${skipped})`);
        showNotification(parts.join(', '));
    };

    /** Enregistre les notes d'un import dans la classe sélectionnée. */
    const importGradeRows = async (rawRows) => {
        const classStudents = students.filter(s => s.classId === selectedClass);
        const { updates, problems, ignoredColumns, fatal } = parseGradeRows(rawRows, { students: classStudents, subjects });
        if (fatal) { showNotification(fatal); return; }
        let imported = 0;
        let failed = 0;
        for (const { studentId, subjectId, value } of updates) {
            // Le fichier contient la note finale : on remplace les sous-notes et le bonus, mais
            // on conserve l'appréciation (non fournie = inchangée).
            const result = await updateGrade(studentId, subjectId, selectedTrimester, value, undefined, {
                interro: null, devoir: null, composition: null, bonus: null,
            });
            if (result?.success === false) failed++; else imported++;
        }
        const parts = [`${imported} note(s) importée(s)`];
        if (failed) parts.push(`${failed} échec(s) : vérifiez vos droits et votre connexion`);
        if (problems.length) parts.push(`${problems.length} valeur(s) ou ligne(s) ignorée(s) (${summarizeProblems(problems)})`);
        if (ignoredColumns.length) parts.push(`colonne(s) non reconnue(s) : ${ignoredColumns.join(', ')}`);
        showNotification(parts.join(', '));
    };

    /** Lit le fichier choisi puis le traite ; un fichier illisible est signalé, jamais ignoré en silence. */
    const handleFile = (process) => async (event) => {
        const input = event.target;
        const file = input.files?.[0];
        if (!file) return;
        try {
            await process(await readSheetRows(file));
        } catch (err) {
            console.error('Erreur import:', err);
            showNotification('Fichier illisible : choisissez un fichier Excel (.xlsx, .xls) ou CSV valide');
        } finally {
            input.value = ''; // permet de choisir à nouveau le même fichier après correction
        }
    };

    const importStudents = handleFile(importStudentRows);
    const importGrades = async (event) => {
        if (!selectedClass) {
            showNotification('Veuillez sélectionner une classe d\'abord');
            if (event.target) event.target.value = '';
            return;
        }
        return handleFile(importGradeRows)(event);
    };

    return { exportClassGrades, exportRanking, importStudents, importGrades, importStudentRows, importGradeRows };
};
