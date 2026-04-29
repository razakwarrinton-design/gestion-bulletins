/**
 * GUIDE DE MIGRATION: De localStorage à Supabase
 * 
 * Ce fichier explique comment migrer progressivement l'application
 * de localStorage à Supabase sans perdre de données.
 */

// ============================================================================
// OPTION 1: Utiliser le hook avec fallback automatique (RECOMMANDÉ)
// ============================================================================
// C'est l'approche la plus simple et la plus sûre
// Elle maintient localStorage comme sauvegarde

import { useSupabaseStateWithFallback } from './hooks/useSupabaseState';

export function ExampleComponent() {
  // Utilise Supabase d'abord, fallback sur localStorage
  const [classes, setClasses, isLoading, usesFallback] = useSupabaseStateWithFallback(
    'classes',
    []
  );

  if (isLoading) return <div>Chargement...</div>;

  if (usesFallback) {
    return <div className="bg-yellow-100 p-4">Mode local (données non synchronisées)</div>;
  }

  return (
    <div>
      <p>✅ Données synchronisées avec Supabase</p>
      {/* Votre UI ici */}
    </div>
  );
}

// ============================================================================
// OPTION 2: Utiliser Supabase directement (Sans fallback)
// ============================================================================
// À utiliser seulement après avoir configuré Supabase correctement

import { useSupabaseState } from './hooks/useSupabaseState';

export function AdvancedComponent() {
  // Utilise UNIQUEMENT Supabase
  const [classes, setClasses, isLoading] = useSupabaseState('classes', []);

  if (isLoading) return <div>Chargement...</div>;

  return (
    <div>
      {/* Votre UI ici */}
    </div>
  );
}

// ============================================================================
// OPTION 3: Utiliser directement les fonctions Supabase
// ============================================================================
// Pour des opérations spécifiques non couvertes par les hooks

import { supabase } from './config/supabase';

export async function customDatabaseOperation() {
  // Récupérer des données
  const { data, error } = await supabase
    .from('classes')
    .select('*')
    .eq('name', 'CM2 A');

  if (error) {
    console.error('Erreur:', error);
    return;
  }

  console.log('Résultat:', data);

  // Insérer des données
  const { data: insertedData, error: insertError } = await supabase
    .from('classes')
    .insert([
      { id: 1, name: 'CM2 B', level: 'CM2' }
    ]);

  // Mettre à jour des données
  const { data: updatedData, error: updateError } = await supabase
    .from('classes')
    .update({ name: 'CM2 C' })
    .eq('id', 1);

  // Supprimer des données
  const { error: deleteError } = await supabase
    .from('classes')
    .delete()
    .eq('id', 1);
}

// ============================================================================
// MIGRATION PROGRESSIVE: De useLocalStorageState à useSupabaseStateWithFallback
// ============================================================================
// Étapes recommandées:

/*
ÉTAPE 1: Configuration initiale (déjà fait!)
  ✅ npm install @supabase/supabase-js
  ✅ Créer src/config/supabase.js
  ✅ Créer src/hooks/useSupabaseState.js
  ✅ Créer .env.local avec vos clés

ÉTAPE 2: Ajouter le composant de statut
  ✅ Importer SyncStatus.jsx dans App.jsx
  ✅ L'afficher dans la barre de navigation

ÉTAPE 3: Remplacer les states un par un
  Exemple pour App.jsx:

  // AVANT (localStorage):
  const [classes, setClasses] = useLocalStorageState('classes', []);

  // APRÈS (Supabase avec fallback):
  const [classes, setClasses, isLoading, usesFallback] = useSupabaseStateWithFallback(
    'classes',
    []
  );

  // Gérer l'état de chargement:
  if (isLoading) return <LoadingScreen />;

ÉTAPE 4: Tester après chaque changement
  - Vérifier que les données se sauvegardent
  - Vérifier que les données se chargent
  - Vérifier la synchronisation temps réel

ÉTAPE 5: Nettoyer localStorage
  Après que tout fonctionne avec Supabase:
  - localStorage.removeItem('classes');
  - localStorage.removeItem('students');
  - Etc... (facultatif, localStorage peut rester comme cache)
*/

// ============================================================================
// SCHÉMA DES DONNÉES SUPABASE
// ============================================================================

/*
Tables créées dans Supabase:

1. users
  - id (BIGINT, PK)
  - email (TEXT, UNIQUE)
  - password (TEXT)
  - first_name (TEXT)
  - last_name (TEXT)
  - role (TEXT: admin, professeur, secretaire)
   - created_at (TIMESTAMP)

2. classes
   - id (BIGINT, PK)
   - name (TEXT)
   - level (TEXT)
   - created_at (TIMESTAMP)

3. students
   - id (BIGINT, PK)
   - first_name (TEXT)
   - last_name (TEXT)
   - class_id (BIGINT, FK)
   - created_at (TIMESTAMP)

4. subjects
   - id (BIGINT, PK)
   - name (TEXT)
   - coefficient (DECIMAL)
   - created_at (TIMESTAMP)

5. grades
   - id (TEXT, PK)
   - student_id (BIGINT, FK)
   - subject_id (BIGINT, FK)
   - trimester (TEXT)
   - value (DECIMAL)
   - appreciation (TEXT)
   - created_at (TIMESTAMP)

6. activities
   - id (BIGINT, PK)
   - timestamp (TIMESTAMP)
   - user_name (TEXT)
   - user_role (TEXT)
   - action (TEXT)
   - details (TEXT)
   - created_at (TIMESTAMP)

7. app_data
   - key (TEXT, PK)
   - value (JSONB)
   - updated_at (TIMESTAMP)
   - updated_by (TEXT)
*/

// ============================================================================
// EXEMPLE: Ajouter un listener en temps réel
// ============================================================================

export function setupRealtimeListener() {
  // S'abonner aux changements de classes
  const subscription = supabase
    .from('classes')
    .on('*', payload => {
      console.log('Changement détecté:', payload);
      // Mettre à jour votre UI ici
    })
    .subscribe();

  // Nettoyage
  return () => {
    subscription.unsubscribe();
  };
}

// ============================================================================
// GESTION DES ERREURS
// ============================================================================

export async function handleDatabaseError(error) {
  if (error.code === 'PGRST116') {
    // Pas de lignes trouvées
    console.log('Aucune donnée trouvée');
    return;
  }

  if (error.code === 'CORS') {
    // Erreur CORS - vérifiez la configuration Supabase
    console.error('Erreur CORS - Vérifiez la configuration Supabase');
    return;
  }

  if (error.code === 'AUTH') {
    // Erreur d'authentification
    console.error('Authentification requise');
    return;
  }

  console.error('Erreur Supabase:', error);
}

// ============================================================================
// CONSEILS ET BONNES PRATIQUES
// ============================================================================

/*
1. PERFORMANCE:
   - Utilisez des indexes sur les colonnes fréquemment filtrées
   - Limitez le nombre de lignes retournées avec .limit()
   - Utilisez la pagination pour les grandes listes

2. SÉCURITÉ:
   - Mettez en place les Row Level Security (RLS) policies
   - Ne publiez jamais votre SUPABASE_ANON_KEY
   - Utilisez les .env.local pour les secrets

3. SYNCHRONISATION:
   - Utilisez Realtime pour les mises à jour temps réel
   - Mettez en cache les données localement
   - Gérez les conflits de synchronisation

4. OFFLINE SUPPORT:
   - useSupabaseStateWithFallback gère le mode offline
   - Les données seront synchronisées quand la connexion revient
   - localStorage sert de cache persistant

5. DÉBOGAGE:
   - Activez les logs Supabase: supabase.debug()
   - Vérifiez la console du navigateur
   - Utilisez le dashboard Supabase pour vérifier les données
*/
