/**
 * Script de Migration des Données localStorage vers Supabase
 * 
 * INSTRUCTIONS :
 * 1. Assurez-vous que votre projet Supabase est configuré (voir GUIDE-SUPABASE-CONFIGURATION.md)
 * 2. Ouvrez votre application dans le navigateur
 * 3. Ouvrez la console du navigateur (F12)
 * 4. Copiez-collez tout ce script dans la console
 * 5. Appuyez sur Entrée
 * 6. Attendez le message "Migration terminée avec succès !"
 * 
 * ⚠️ IMPORTANT : Faites une sauvegarde de vos données avant de lancer ce script !
 */

(async function migrateLocalStorageToSupabase() {
  console.log('🚀 Début de la migration localStorage → Supabase');
  
  // Liste des clés à migrer
  const keysToMigrate = [
    'classes',
    'students',
    'subjects',
    'grades',
    'users',
    'schoolInfo',
    'appColors',
    'activities',
    'academicYears',
    'appreciations',
    'currentUser',
    'schoolLogo'
  ];

  // Importer Supabase (doit être disponible dans votre app)
  const { createClient } = window.supabaseJs || await import('@supabase/supabase-js');
  
  // Configuration Supabase (à adapter selon votre .env)
  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
  const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
  
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || SUPABASE_URL.includes('your-project')) {
    console.error('❌ Erreur : Configuration Supabase manquante ou invalide');
    console.error('Vérifiez votre fichier .env.local');
    return;
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  let migratedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  console.log(`📦 ${keysToMigrate.length} clés à migrer`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  for (const key of keysToMigrate) {
    try {
      // Récupérer les données de localStorage
      const localData = localStorage.getItem(key);
      
      if (!localData || localData === 'null' || localData === 'undefined') {
        console.log(`⏭️  ${key}: Pas de données à migrer`);
        skippedCount++;
        continue;
      }

      // Parser les données
      let parsedData;
      try {
        parsedData = JSON.parse(localData);
      } catch (parseError) {
        console.warn(`⚠️  ${key}: Données non valides (JSON mal formé)`);
        skippedCount++;
        continue;
      }

      // Vérifier si des données existent déjà dans Supabase
      const { data: existingData, error: checkError } = await supabase
        .from('app_data')
        .select('value')
        .eq('key', key)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }

      // Si des données existent déjà, demander confirmation
      if (existingData) {
        const shouldOverwrite = confirm(
          `Des données existent déjà pour "${key}" dans Supabase.\n\n` +
          `Voulez-vous les ÉCRASER avec les données localStorage ?\n\n` +
          `Cliquez sur "OK" pour écraser, "Annuler" pour conserver les données Supabase.`
        );
        
        if (!shouldOverwrite) {
          console.log(`⏭️  ${key}: Conservé (données Supabase)`);
          skippedCount++;
          continue;
        }
      }

      // Insérer ou mettre à jour dans Supabase
      const { error: upsertError } = await supabase
        .from('app_data')
        .upsert({
          key: key,
          value: JSON.stringify(parsedData),
          updated_at: new Date().toISOString()
        });

      if (upsertError) {
        throw upsertError;
      }

      console.log(`✅ ${key}: Migré avec succès (${JSON.stringify(parsedData).length} octets)`);
      migratedCount++;

    } catch (error) {
      console.error(`❌ ${key}: Erreur lors de la migration`, error);
      errorCount++;
    }
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 Résumé de la migration :');
  console.log(`   ✅ Migrées    : ${migratedCount}`);
  console.log(`   ⏭️  Ignorées   : ${skippedCount}`);
  console.log(`   ❌ Erreurs    : ${errorCount}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  if (errorCount === 0) {
    console.log('✅ Migration terminée avec succès !');
    console.log('');
    console.log('🔄 Prochaines étapes :');
    console.log('1. Rechargez la page (F5)');
    console.log('2. Vérifiez que vos données sont bien affichées');
    console.log('3. Une fois confirmé, vous pouvez vider localStorage avec :');
    console.log('   localStorage.clear()');
  } else {
    console.warn('⚠️  Migration terminée avec des erreurs. Vérifiez les logs ci-dessus.');
  }

})();

/**
 * FONCTIONS UTILITAIRES SUPPLÉMENTAIRES
 */

// Fonction pour vérifier les données dans Supabase
async function verifySupabaseData() {
  const { createClient } = window.supabaseJs || await import('@supabase/supabase-js');
  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
  const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  console.log('🔍 Vérification des données dans Supabase...');
  const { data, error } = await supabase.from('app_data').select('*');
  
  if (error) {
    console.error('❌ Erreur lors de la vérification:', error);
    return;
  }

  console.table(data.map(item => ({
    clé: item.key,
    taille: JSON.stringify(item.value).length + ' octets',
    dernière_maj: new Date(item.updated_at).toLocaleString('fr-FR')
  })));
}

// Fonction pour sauvegarder localStorage en JSON (backup)
function backupLocalStorage() {
  const backup = {};
  const keysToBackup = [
    'classes', 'students', 'subjects', 'grades', 'users',
    'schoolInfo', 'appColors', 'activities', 'academicYears',
    'appreciations', 'currentUser', 'schoolLogo'
  ];

  keysToBackup.forEach(key => {
    const data = localStorage.getItem(key);
    if (data) {
      backup[key] = JSON.parse(data);
    }
  });

  // Télécharger le backup
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `backup-localStorage-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);

  console.log('✅ Backup téléchargé avec succès !');
}

// Fonction pour restaurer depuis un backup JSON
async function restoreFromBackup(backupData) {
  const { createClient } = window.supabaseJs || await import('@supabase/supabase-js');
  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
  const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  console.log('🔄 Restauration depuis le backup...');
  
  for (const [key, value] of Object.entries(backupData)) {
    const { error } = await supabase
      .from('app_data')
      .upsert({
        key,
        value: JSON.stringify(value),
        updated_at: new Date().toISOString()
      });

    if (error) {
      console.error(`❌ Erreur lors de la restauration de ${key}:`, error);
    } else {
      console.log(`✅ ${key} restauré`);
    }
  }

  console.log('✅ Restauration terminée !');
}

console.log('📚 Fonctions disponibles dans la console :');
console.log('  - verifySupabaseData()     : Vérifier les données dans Supabase');
console.log('  - backupLocalStorage()     : Télécharger un backup JSON');
console.log('  - restoreFromBackup(data)  : Restaurer depuis un backup');
