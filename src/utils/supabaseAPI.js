/**
 * SUPABASE API - Exemples d'utilisation directe
 * 
 * Pour les opérations qui ne sont pas couvertes par les hooks
 */

import { supabase } from '../config/supabase';

// ============================================================================
// AUTHENTIFICATION & UTILISATEURS
// ============================================================================

export const userOperations = {
  async getAllUsers() {
    const { data, error } = await supabase
      .from('users')
      .select('*');
    
    if (error) throw error;
    return data;
  },

  async getUserByRole(role) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('role', role);
    
    if (error) throw error;
    return data;
  },

  async createUser(userData) {
    const { data, error } = await supabase
      .from('users')
      .insert([{
        email: userData.email,
        password: userData.password, // À hasher en production!
        first_name: userData.firstName,
        last_name: userData.lastName,
        role: userData.role
      }]);
    
    if (error) throw error;
    return data;
  },

  async updateUser(userId, updates) {
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', userId);
    
    if (error) throw error;
    return data;
  },

  async deleteUser(userId) {
    const { data, error } = await supabase
      .from('users')
      .delete()
      .eq('id', userId);
    
    if (error) throw error;
    return data;
  }
};

// ============================================================================
// GESTION DES CLASSES
// ============================================================================

export const classOperations = {
  async getClassWithStudents(classId) {
    const { data: classData, error: classError } = await supabase
      .from('classes')
      .select('*')
      .eq('id', classId)
      .single();
    
    if (classError) throw classError;

    const { data: students, error: studentsError } = await supabase
      .from('students')
      .select('*')
      .eq('class_id', classId);
    
    if (studentsError) throw studentsError;

    return { ...classData, students };
  },

  async getClassStats(classId) {
    // Nombre d'étudiants
    const { count: studentCount } = await supabase
      .from('students')
      .select('*', { count: 'exact', head: true })
      .eq('class_id', classId);

    // Moyenne de classe
    const { data: grades } = await supabase
      .from('grades')
      .select('value')
      .in('student_id', 
        (await supabase
          .from('students')
          .select('id')
          .eq('class_id', classId))
          .data.map(s => s.id)
      );

    const avgGrade = grades.reduce((sum, g) => sum + g.value, 0) / grades.length;

    return {
      studentCount,
      averageGrade: avgGrade.toFixed(2),
      totalGrades: grades.length
    };
  }
};

// ============================================================================
// GESTION DES NOTES
// ============================================================================

export const gradeOperations = {
  async getStudentGrades(studentId, trimester = null) {
    let query = supabase
      .from('grades')
      .select('*, subject:subjects(*)')
      .eq('student_id', studentId);
    
    if (trimester) {
      query = query.eq('trimester', trimester);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  async getClassGrades(classId, trimester) {
    const { data: students } = await supabase
      .from('students')
      .select('id, first_name, last_name')
      .eq('class_id', classId);

    const studentIds = students.map(s => s.id);

    const { data: grades, error } = await supabase
      .from('grades')
      .select('*')
      .in('student_id', studentIds)
      .eq('trimester', trimester);
    
    if (error) throw error;

    // Organiser par étudiant
    const gradesPerStudent = {};
    students.forEach(student => {
      gradesPerStudent[student.id] = {
        name: `${student.first_name} ${student.last_name}`,
        grades: grades.filter(g => g.student_id === student.id)
      };
    });

    return gradesPerStudent;
  },

  async calculateStudentAverage(studentId, trimester) {
    const { data: grades, error } = await supabase
      .from('grades')
      .select('value, subject:subjects(coefficient)')
      .eq('student_id', studentId)
      .eq('trimester', trimester);
    
    if (error) throw error;

    let totalValue = 0;
    let totalCoeff = 0;

    grades.forEach(grade => {
      const coeff = grade.subject.coefficient || 1;
      totalValue += grade.value * coeff;
      totalCoeff += coeff;
    });

    return (totalValue / totalCoeff).toFixed(2);
  }
};

// ============================================================================
// STATISTIQUES & RAPPORTS
// ============================================================================

export const reportOperations = {
  async getBulletinStats(schoolYear = '2024-2025') {
    const { data, error } = await supabase
      .from('grades')
      .select('value');
    
    if (error) throw error;

    const values = data.map(g => g.value);
    
    return {
      totalGrades: values.length,
      avgGrade: (values.reduce((a, b) => a + b, 0) / values.length).toFixed(2),
      maxGrade: Math.max(...values),
      minGrade: Math.min(...values),
      stdDev: calculateStdDev(values).toFixed(2)
    };
  },

  async getStudentRanking(classId, trimester) {
    const { data: students } = await supabase
      .from('students')
      .select('id, first_name, last_name')
      .eq('class_id', classId);

    const ranking = [];

    for (const student of students) {
      const avg = await gradeOperations.calculateStudentAverage(student.id, trimester);
      ranking.push({
        ...student,
        average: parseFloat(avg)
      });
    }

    return ranking.sort((a, b) => b.average - a.average);
  },

  async getSubjectStats(subjectId, trimester) {
    const { data: grades, error } = await supabase
      .from('grades')
      .select('value')
      .eq('subject_id', subjectId)
      .eq('trimester', trimester);
    
    if (error) throw error;

    const values = grades.map(g => g.value);
    
    return {
      totalGrades: values.length,
      average: (values.reduce((a, b) => a + b, 0) / values.length).toFixed(2),
      maxGrade: Math.max(...values),
      minGrade: Math.min(...values)
    };
  }
};

// ============================================================================
// SYNCHRONISATION & TEMPS RÉEL
// ============================================================================

export const realtimeOperations = {
  subscribeToGradeChanges(classId, callback) {
    const subscription = supabase
      .from('grades')
      .on('*', payload => {
        if (payload.new) {
          callback({ type: 'INSERT', data: payload.new });
        }
        if (payload.old && !payload.new) {
          callback({ type: 'DELETE', data: payload.old });
        }
        if (payload.new && payload.old) {
          callback({ type: 'UPDATE', data: payload.new });
        }
      })
      .subscribe();

    return subscription;
  },

  subscribeToActivityLog(userId, callback) {
    const subscription = supabase
      .from('activities')
      .on('INSERT', payload => {
        if (payload.new.user_name === userId) {
          callback(payload.new);
        }
      })
      .subscribe();

    return subscription;
  },

  async listenToClassUpdates(classId, onUpdate) {
    // Écouter les changements d'étudiants
    const studentsSubscription = supabase
      .from('students')
      .on('*', payload => {
        if (payload.new?.class_id === classId) {
          onUpdate({ type: 'STUDENT', data: payload.new });
        }
      })
      .subscribe();

    // Écouter les changements de notes
    const gradesSubscription = supabase
      .from('grades')
      .on('*', payload => {
        onUpdate({ type: 'GRADE', data: payload.new });
      })
      .subscribe();

    return {
      unsubscribe: () => {
        studentsSubscription.unsubscribe();
        gradesSubscription.unsubscribe();
      }
    };
  }
};

// ============================================================================
// UTILITAIRES
// ============================================================================

function calculateStdDev(values) {
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const squareDiffs = values.map(value => Math.pow(value - mean, 2));
  const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / values.length;
  return Math.sqrt(avgSquareDiff);
}

export const queryBuilderExamples = {
  // Requête complexe: Étudiants avec leurs notes
  async getStudentsWithGrades(classId) {
    const { data, error } = await supabase
      .from('students')
      .select(`
        id,
        first_name,
        last_name,
        grades (
          id,
          value,
          trimester,
          subject:subjects(name, coefficient)
        )
      `)
      .eq('class_id', classId);
    
    if (error) throw error;
    return data;
  },

  // Agrégation: Nombre d'étudiants par classe
  async countStudentsPerClass() {
    const { data, error } = await supabase
      .from('classes')
      .select('id, name, student_count:students(count)');
    
    if (error) throw error;
    return data;
  },

  // Filtrage avancé: Notes supérieures à 15
  async getExcellentGrades() {
    const { data, error } = await supabase
      .from('grades')
      .select('student:students(first_name, last_name), subject:subjects(name), value')
      .gt('value', 15);
    
    if (error) throw error;
    return data;
  }
};

// ============================================================================
// GESTION DES ERREURS
// ============================================================================

export async function handleSupabaseError(error, context = '') {
  console.error(`Erreur Supabase (${context}):`, error);

  if (error.code === 'PGRST116') {
    console.log('Aucune donnée trouvée');
    return null;
  }

  if (error.code === 'CORS') {
    console.error('Erreur CORS - Vérifiez la configuration Supabase');
    return null;
  }

  if (error.code === 'AUTH') {
    console.error('Erreur d\'authentification');
    return null;
  }

  if (error.code === '23505') {
    console.error('Enregistrement en doublon');
    return null;
  }

  throw error;
}

export default {
  userOperations,
  classOperations,
  gradeOperations,
  reportOperations,
  realtimeOperations,
  queryBuilderExamples
};
