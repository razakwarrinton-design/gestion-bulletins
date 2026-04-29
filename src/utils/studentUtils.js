/**
 * Utilitaires pour la gestion des élèves
 * Inclut: matricule, année scolaire, validation
 */

// Format: ANNEE-CLASSE-SEQUENCE
// Ex: 2025-6A-001 = élève 001 de la classe 6A de l'année 2024-2025
export const generateMatricule = (schoolYear, classId, sequence) => {
  const classCode = classId?.toString().slice(-2).toUpperCase() || 'XX';
  const paddedSequence = String(sequence).padStart(3, '0');
  return `${schoolYear}-${classCode}-${paddedSequence}`;
};

// Extrait l'année scolaire d'un matricule
export const extractSchoolYearFromMatricule = (matricule) => {
  return matricule?.split('-')[0] || null;
};

// Valide le format d'un matricule
export const isValidMatricule = (matricule) => {
  return /^\d{4}-[A-Z0-9]{2}-\d{3}$/.test(matricule);
};

// Génère une année scolaire au format YYYY-YYYY
// Ex: academicYear(2024) → "2024-2025"
export const academicYear = (year) => {
  return `${year}-${year + 1}`;
};

// Retourne l'année en cours (au format académique)
export const currentAcademicYear = () => {
  const now = new Date();
  const year = now.getFullYear();
  // Considère que l'année académique commence en septembre
  return now.getMonth() >= 8 ? academicYear(year) : academicYear(year - 1);
};

// Formatage d'un élève pour affichage
export const formatStudentName = (student) => {
  return `${student?.lastName?.toUpperCase()} ${student?.firstName}`;
};

// Validation des données d'élève
export const validateStudent = (student) => {
  const errors = [];
  
  if (!student.firstName?.trim()) {
    errors.push('Prénom requis');
  }
  
  if (!student.lastName?.trim()) {
    errors.push('Nom requis');
  }
  
  if (!student.classId) {
    errors.push('Classe requise');
  }
  
  if (student.matricule && !isValidMatricule(student.matricule)) {
    errors.push('Matricule invalide');
  }
  
  if (student.dateOfBirth && isNaN(new Date(student.dateOfBirth).getTime())) {
    errors.push('Date de naissance invalide');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Export/Import CSV
export const exportStudentsToCSV = (students, classes) => {
  const headers = ['Matricule', 'Nom', 'Prénom', 'Classe', 'Date de naissance', 'Genre', 'Année scolaire'];
  
  const rows = students.map(student => {
    const className = classes.find(c => c.id === student.classId)?.name || 'N/A';
    return [
      student.matricule || '',
      student.lastName,
      student.firstName,
      className,
      student.dateOfBirth || '',
      student.gender || '',
      student.schoolYear || ''
    ];
  });
  
  const csv = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');
  
  return csv;
};

// Import depuis CSV
export const importStudentsFromCSV = (csv) => {
  const lines = csv.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.replace(/"/g, ''));
  
  const students = lines.slice(1).map(line => {
    const values = line.split(',').map(v => v.replace(/"/g, ''));
    
    return {
      id: Date.now() + Math.random(),
      matricule: values[0],
      lastName: values[1],
      firstName: values[2],
      classId: values[3],
      dateOfBirth: values[4],
      gender: values[5],
      schoolYear: values[6]
    };
  });
  
  return students;
};
