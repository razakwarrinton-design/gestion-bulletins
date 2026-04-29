/**
 * EXEMPLE: Migration App.jsx vers Supabase
 * 
 * Ce fichier montre comment migrer progressivement App.jsx
 * de useLocalStorageState vers useSupabaseStateWithFallback
 */

// ============================================================================
// AVANT: Utiliser localStorage
// ============================================================================
// import useLocalStorageState from './hooks/useLocalStorageState';
// 
// const BulletinApp = () => {
//   const [classes, setClasses] = useLocalStorageState('classes', []);
//   const [students, setStudents] = useLocalStorageState('students', []);
//   const [subjects, setSubjects] = useLocalStorageState('subjects', []);
//   const [grades, setGrades] = useLocalStorageState('grades', []);
//   const [users, setUsers] = useLocalStorageState('users', [...]);
//   const [activities, setActivities] = useLocalStorageState('activities', []);
//   // ...
// }

// ============================================================================
// APRÈS: Utiliser Supabase avec fallback
// ============================================================================

import { useSupabaseStateWithFallback } from './hooks/useSupabaseState';
import SyncStatus from './components/SyncStatus';

export const MIGRATION_STEPS = {
  STEP_1: `
    // Étape 1: Remplacer les imports
    import { useSupabaseStateWithFallback } from './hooks/useSupabaseState';
  `,
  
  STEP_2: `
    // Étape 2: Remplacer les states un par un
    // AVANT:
    const [classes, setClasses] = useLocalStorageState('classes', []);
    
    // APRÈS:
    const [classes, setClasses, isLoading, usesFallback] = useSupabaseStateWithFallback(
      'classes',
      []
    );
  `,

  STEP_3: `
    // Étape 3: Gérer les états de chargement
    if (isLoading) {
      return <div>Chargement des données...</div>;
    }
  `,

  STEP_4: `
    // Étape 4: Afficher le statut de synchronisation
    <div className="flex items-center space-x-2">
      <SyncStatus />
      <span>Synchronisation</span>
    </div>
  `
};

// ============================================================================
// EXEMPLE COMPLET: App.jsx migré
// ============================================================================

export function AppWithSupabase() {
  // Remplacer tous les useLocalStorageState par useSupabaseStateWithFallback
  const [classes, setClasses, classesLoading] = useSupabaseStateWithFallback('classes', []);
  const [students, setStudents, studentsLoading] = useSupabaseStateWithFallback('students', []);
  const [subjects, setSubjects, subjectsLoading] = useSupabaseStateWithFallback('subjects', []);
  const [grades, setGrades, gradesLoading] = useSupabaseStateWithFallback('grades', []);
  const [users, setUsers, usersLoading] = useSupabaseStateWithFallback('users', [
    {
      id: 1,
      email: 'admin@ecole.com',
      password: 'admin123',
      role: 'admin',
      firstName: 'Admin',
      lastName: 'Système'
    }
  ]);
  const [activities, setActivities, activitiesLoading] = useSupabaseStateWithFallback('activities', []);
  const [schoolInfo, setSchoolInfo, schoolInfoLoading] = useSupabaseStateWithFallback('schoolInfo', {
    name: 'ÉTABLISSEMENT SCOLAIRE',
    address: 'Adresse',
    phone: 'Téléphone',
    email: 'email@ecole.com'
  });
  const [appColors, setAppColors, appColorsLoading] = useSupabaseStateWithFallback('appColors', {
    primary: '#3b82f6',
    secondary: '#10b981',
    accent: '#8b5cf6'
  });
  const [schoolLogo, setSchoolLogo, schoolLogoLoading] = useSupabaseStateWithFallback('schoolLogo', null);
  const [currentUser, setCurrentUser, currentUserLoading] = useSupabaseStateWithFallback('currentUser', null);

  // Vérifier si tous les données sont chargées
  const allLoading = classesLoading || studentsLoading || subjectsLoading || 
                     gradesLoading || usersLoading || activitiesLoading ||
                     schoolInfoLoading || appColorsLoading || schoolLogoLoading ||
                     currentUserLoading;

  if (allLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Synchronisation des données...</p>
          <SyncStatus />
        </div>
      </div>
    );
  }

  // Le reste du composant reste identique!
  // Vous pouvez copier-coller tout le code restant de App.jsx
  return (
    <div>
      <header className="flex items-center justify-between">
        <h1>Gestion des Bulletins</h1>
        <SyncStatus />
      </header>
      {/* ... reste du code ... */}
    </div>
  );
}

// ============================================================================
// SCRIPT DE MIGRATION POUR APP.JSX
// ============================================================================

export const MIGRATION_CHECKLIST = `
[ ] 1. Configurer Supabase (.env.local)
[ ] 2. Créer les tables Supabase (script SQL)
[ ] 3. Installer @supabase/supabase-js
[ ] 4. Importer useSupabaseStateWithFallback
[ ] 5. Importer SyncStatus
[ ] 6. Remplacer classes: useLocalStorageState → useSupabaseStateWithFallback
[ ] 7. Remplacer students
[ ] 8. Remplacer subjects
[ ] 9. Remplacer grades
[ ] 10. Remplacer users
[ ] 11. Remplacer activities
[ ] 12. Remplacer schoolInfo
[ ] 13. Remplacer appColors
[ ] 14. Remplacer schoolLogo
[ ] 15. Remplacer currentUser
[ ] 16. Ajouter gestion du chargement
[ ] 17. Ajouter SyncStatus dans l'UI
[ ] 18. Tester chaque fonctionnalité
[ ] 19. Tester la synchronisation temps réel
[ ] 20. Nettoyer localStorage (optionnel)
`;

// ============================================================================
// COMMANDES UTILES
// ============================================================================

export const USEFUL_COMMANDS = {
  clearLocalStorage: `
    // Dans la console du navigateur:
    localStorage.clear();
  `,
  
  checkSupabaseConnection: `
    // Dans src/config/supabase.js:
    import { supabase } from './config/supabase';
    
    // Dans la console:
    await supabase.from('app_data').select('count()', { count: 'exact', head: true })
  `,

  insertTestData: `
    // Insérer des données de test:
    import { supabase } from './config/supabase';
    
    const { data, error } = await supabase
      .from('classes')
      .insert([
        { id: 1, name: 'CM2 A', level: 'CM2' },
        { id: 2, name: 'CM2 B', level: 'CM2' }
      ]);
  `
};

// ============================================================================
// SCRIPT AUTOMATISÉ DE MIGRATION
// ============================================================================

export async function autoMigrateLocalStorageToSupabase() {
  const { supabase } = require('./config/supabase');

  // Récupérer toutes les clés de localStorage
  const keys = Object.keys(localStorage);

  for (const key of keys) {
    try {
      const value = localStorage.getItem(key);
      const parsed = JSON.parse(value);

      // Insérer dans Supabase
      const { error } = await supabase
        .from('app_data')
        .upsert({
          key,
          value: JSON.stringify(parsed),
          updated_at: new Date().toISOString()
        });

      if (error) {
        console.error(`Erreur pour ${key}:`, error);
      } else {
        console.log(`✅ ${key} migré avec succès`);
      }
    } catch (err) {
      console.error(`Erreur lors du traitement de ${key}:`, err);
    }
  }

  console.log('Migration terminée!');
}

// ============================================================================
// DONNÉES SENSIBLES À PROTÉGER AVEC RLS
// ============================================================================

export const RLS_POLICIES = \`
-- Politique: Les professeurs voient seulement leurs propres étudiants
CREATE POLICY "Teachers see only their students" ON students
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM grades 
      WHERE grades.student_id = students.id
      AND grades.created_by = auth.uid()
    )
  );

-- Politique: Les secrétaires voient tous les élèves
CREATE POLICY "Secretaire see all students" ON students
  FOR SELECT
  USING (
    auth.jwt() ->> 'role' = 'secretaire'
  );

-- Politique: Les admins voient tout
ALTER POLICY "admin_policy" ON grades
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );
\`;
