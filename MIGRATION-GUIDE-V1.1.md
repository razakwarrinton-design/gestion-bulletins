# 📦 Guide de Migration v1.0 → v1.1

## 🎯 Vue d'ensemble

Cette guide vous aide à migrer votre application de **v1.0** (système basique) vers **v1.1** (système complet avec années scolaires et appréciations).

---

## ✅ Étapes de Migration

### 1️⃣ Sauvegarde des données actuelles

Avant de faire quoi que ce soit, **sauvegardez vos données** :

```bash
# Exporter les données actuelles via l'interface
# Menu → Import/Export → Exporter Notes
# Cela crée un fichier Excel avec vos notes actuelles
```

#### Données à sauvegarder manuellement :
- Classes
- Élèves
- Matières
- Notes (par trimestre)

---

### 2️⃣ Mise à jour du code

Le code a été **automatiquement mis à jour**. Vérifiez que vous avez :

✅ App.jsx - Mis à jour avec :
  - Imports des nouveaux composants
  - States pour `academicYears` et `appreciations`
  - Trois nouveaux menus : Années scolaires, Appréciations, Analyse avancée

✅ Nouveaux fichiers créés :
  - `src/utils/studentUtils.js`
  - `src/utils/calculUtils.js`
  - `src/components/AcademicYearManager.jsx`
  - `src/components/AppreciationManager.jsx`
  - `src/components/AdvancedAnalytics.jsx`

---

### 3️⃣ Mise à jour de la base de données (si Supabase)

#### Créer les nouvelles tables dans Supabase :

**Table: `academic_years`**
```sql
create table academic_years (
  id bigint primary key generated always as identity,
  year text unique not null,
  start_date date not null,
  end_date date not null,
  trimesters jsonb not null,
  is_active boolean default false,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Index pour recherche rapide
create index idx_academic_years_is_active on academic_years(is_active);
create index idx_academic_years_year on academic_years(year);
```

**Table: `appreciations`**
```sql
create table appreciations (
  id bigint primary key generated always as identity,
  student_id bigint not null references students(id) on delete cascade,
  subject_id bigint references subjects(id) on delete set null,
  trimester text not null,
  type text not null, -- 'teacher' ou 'council'
  appreciation text,
  teacher_name text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Indexes
create index idx_appreciations_student_id on appreciations(student_id);
create index idx_appreciations_subject_id on appreciations(subject_id);
create index idx_appreciations_trimester on appreciations(trimester);
create index idx_appreciations_type on appreciations(type);
```

#### Permissions RLS (Row Level Security) :

```sql
-- Pour academic_years
alter table academic_years enable row level security;

create policy "Admins can manage academic years"
  on academic_years
  for all
  using (auth.jwt() ->> 'role' = 'admin')
  with check (auth.jwt() ->> 'role' = 'admin');

-- Pour appreciations
alter table appreciations enable row level security;

create policy "Teachers can add and view appreciations"
  on appreciations
  for all
  using (
    auth.jwt() ->> 'role' in ('admin', 'professeur')
  )
  with check (
    auth.jwt() ->> 'role' in ('admin', 'professeur')
  );
```

---

### 4️⃣ Migration des données existantes

#### 4a. Ajouter une année scolaire par défaut

L'application crée automatiquement une année scolaire "2024-2025" au premier démarrage.

**Pour ajouter d'autres années** :
1. Connectez-vous en tant qu'**Admin**
2. Allez à **Menu → Années scolaires**
3. Cliquez sur **Ajouter une année scolaire**
4. Remplissez le formulaire :
   - **Année** : "2023-2024", "2024-2025", etc.
   - **Date de début** : 01/09/2024
   - **Date de fin** : 30/06/2025
   - **Trimestres** : Configurez les dates de chaque trimestre

#### 4b. Transformer vos données

```javascript
// Structure ANCIENNE (v1.0)
const student = {
  id: 1,
  firstName: 'Jean',
  lastName: 'Dupont',
  classId: 101
};

// Structure NOUVELLE (v1.1) - Optionnelle mais recommandée
const student = {
  id: 1,
  firstName: 'Jean',
  lastName: 'Dupont',
  classId: 101,
  matricule: '2024-6A-001',        // ← Nouveau
  dateOfBirth: '2010-05-15',       // ← Nouveau
  gender: 'M',                      // ← Nouveau
  schoolYear: '2024-2025'          // ← Nouveau
};
```

**Comment faire la migration** :

**Option 1 : Manuelle via Interface**
1. Allez à **Élèves**
2. Pour chaque élève, cliquez **Modifier**
3. Ajoutez les champs manquants
4. Sauvegardez

**Option 2 : Via Script de Migration**

Créez un fichier `migrate-students.js` :

```javascript
import * as studentUtils from './utils/studentUtils';

// Charger vos élèves actuels depuis localStorage
const students = JSON.parse(localStorage.getItem('students')) || [];

// Transformer chaque élève
const migratedStudents = students.map((student, index) => {
  // Chercher la classe pour générer le matricule
  const classes = JSON.parse(localStorage.getItem('classes')) || [];
  const classObj = classes.find(c => c.id === student.classId);
  const classCode = classObj?.name.split(' ')[0] || '6A';
  
  return {
    ...student,
    matricule: studentUtils.generateMatricule('2024', classCode, index + 1),
    dateOfBirth: student.dateOfBirth || '2010-01-01',
    gender: student.gender || 'Non spécifié',
    schoolYear: '2024-2025'
  };
});

// Valider les données
migratedStudents.forEach(student => {
  const validation = studentUtils.validateStudent(student);
  if (!validation.isValid) {
    console.error(`Erreur pour ${student.firstName}:`, validation.errors);
  }
});

// Sauvegarder les données migrées
localStorage.setItem('students', JSON.stringify(migratedStudents));
console.log(`${migratedStudents.length} élèves migrés avec succès !`);
```

**Exécution** :
```bash
# Option A : Via console du navigateur
# 1. Ouvrir DevTools (F12)
# 2. Aller à l'onglet Console
# 3. Copier-coller le script et exécuter

# Option B : Via Node.js
node migrate-students.js
```

---

### 5️⃣ Tester la migration

#### Test 1 : Vérifier les années scolaires
```bash
# 1. Démarrer l'app : npm run dev
# 2. Se connecter en Admin
# 3. Aller à "Années scolaires"
# 4. Vérifier qu'une année par défaut existe
```

#### Test 2 : Vérifier les calculs
```bash
# 1. Aller à "Saisir notes"
# 2. Ajouter une classe et un élève (s'ils n'existent pas)
# 3. Entrer quelques notes
# 4. Aller à "Bulletins"
# 5. Vérifier que les moyennes s'affichent correctement

# Calcul manuel pour vérifier :
# Notes : Maths(14), Français(16), Histoire(12)
# Coefficients : 2, 1, 1
# Moyenne = (14*2 + 16*1 + 12*1) / (2+1+1) = (28+16+12)/4 = 56/4 = 14
```

#### Test 3 : Appréciations
```bash
# 1. Aller à "Appréciations"
# 2. Sélectionner un élève et une classe
# 3. Ajouter une appréciation professeur
# 4. Ajouter une appréciation conseil
# 5. Vérifier que les données sont sauvegardées
```

#### Test 4 : Analyse avancée
```bash
# 1. Aller à "Analyse avancée"
# 2. Sélectionner une classe
# 3. Vérifier les statistiques :
#    - Moyenne de la classe
#    - Médiane
#    - Distribution des mentions
#    - Top 5 élèves
#    - Élèves en difficulté
```

---

### 6️⃣ Charger l'ancienne année scolaire

Si vous aviez des données de **2023-2024**, créez-la :

```javascript
// Via Admin → Années scolaires
{
  year: '2023-2024',
  startDate: '2023-09-01',
  endDate: '2024-06-30',
  trimesters: [
    { number: 1, startDate: '2023-09-01', endDate: '2023-12-15' },
    { number: 2, startDate: '2024-01-01', endDate: '2024-04-15' },
    { number: 3, startDate: '2024-04-16', endDate: '2024-06-30' }
  ],
  isActive: false  // Archive
}
```

---

## 🔄 Rollback (Revenir à v1.0)

Si quelque chose ne fonctionne pas :

### Option 1 : Via Git
```bash
git revert HEAD~7  # Annuler les 7 derniers commits
npm install
npm run dev
```

### Option 2 : Restaurer depuis localStorage
```javascript
// Sauvegarder une copie avant migration
localStorage.setItem('backup_before_v1.1', localStorage.getItem('students'));
localStorage.setItem('backup_before_v1.1_grades', localStorage.getItem('grades'));

// Si besoin de restaurer
localStorage.setItem('students', localStorage.getItem('backup_before_v1.1'));
localStorage.setItem('grades', localStorage.getItem('backup_before_v1.1_grades'));
```

---

## 📊 Vérification de la migration

Checklist pour confirmer que tout fonctionne :

- [ ] L'app démarre sans erreurs : `npm run dev`
- [ ] Les nouveaux menus apparaissent (pour Admin)
- [ ] Les anciennes données sont toujours présentes
- [ ] Vous pouvez ajouter une nouvelle année scolaire
- [ ] Vous pouvez ajouter des appréciations
- [ ] L'analyse avancée affiche les statistiques
- [ ] Les calculs sont corrects
- [ ] Les exports Excel fonctionnent
- [ ] Les imports CSV fonctionnent
- [ ] RLS/Permissions Supabase (si utilisé)

---

## 🆘 Problèmes courants et solutions

### Problème 1 : "Module not found: calculUtils"
**Cause** : Les nouveaux fichiers utils n'existent pas
**Solution** :
```bash
# Vérifier que les fichiers existent
ls src/utils/calculUtils.js
ls src/utils/studentUtils.js

# Si manquants, les créer depuis FEATURES-V1.1.md
```

### Problème 2 : "Cannot read property of undefined"
**Cause** : Un état n'est pas initialisé correctement
**Solution** :
```javascript
// Dans App.jsx, ajouter des valeurs par défaut
const [academicYears, setAcademicYears] = useState([{
  id: 1,
  year: '2024-2025',
  // ...
}]);
```

### Problème 3 : Les notes ne s'affichent pas
**Cause** : La formule de calcul peut être incorrecte
**Solution** :
```bash
# Ouvrir DevTools (F12) → Console
# Exécuter :
const { calculateTrimesterAverage } = require('./utils/calculUtils');
console.log(calculateTrimesterAverage(1, '1', grades, subjects));

# Vérifier que le résultat est correct
```

### Problème 4 : Données manquantes après Supabase
**Cause** : Les données sont peut-être en localStorage, pas en Supabase
**Solution** :
```javascript
// Dans useSupabaseStateWithFallback, vérifier le fallback
// Accéder à localStorage directement
const students = JSON.parse(localStorage.getItem('students')) || [];
```

---

## 📈 Après la migration

### Optimisations recommandées

1. **Ajouter les matricules** aux élèves existants
2. **Paramétrer les trimestres** selon votre calendrier académique
3. **Créer les appréciations** pour les années précédentes
4. **Exporter les données** vers Supabase si vous utilisez le cloud
5. **Paramétrer les alertes** pour les élèves en difficulté

### Sauvegarde régulière

```javascript
// Chaque mois, exporter vos données
function backupData() {
  const backup = {
    students: localStorage.getItem('students'),
    grades: localStorage.getItem('grades'),
    appreciations: localStorage.getItem('appreciations'),
    academicYears: localStorage.getItem('academicYears'),
    timestamp: new Date().toISOString()
  };
  
  // Télécharger en JSON
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `backup_${new Date().toISOString().split('T')[0]}.json`;
  a.click();
}
```

---

## ✅ Validation finale

Après migration, vérifiez :

```javascript
// Console du navigateur (F12)

// 1. Vérifier l'année scolaire active
const academicYears = JSON.parse(localStorage.getItem('academicYears'));
console.log('Années scolaires :', academicYears);

// 2. Vérifier les appréciations
const appreciations = JSON.parse(localStorage.getItem('appreciations'));
console.log('Appréciations :', appreciations);

// 3. Vérifier les élèves migrés
const students = JSON.parse(localStorage.getItem('students'));
console.log('Élèves avec matricule :', students[0]);

// 4. Vérifier un calcul
import('./src/utils/calculUtils.js').then(mod => {
  const result = mod.calculateTrimesterAverage(1, '1', grades, subjects);
  console.log('Moyenne du trimestre :', result);
});
```

---

## 🎉 C'est fait !

Félicitations ! Votre application est maintenant à jour avec :
- ✅ Gestion complète des années scolaires
- ✅ Système d'appréciations dual
- ✅ Analyse avancée et statistiques
- ✅ Formules de calcul transparentes
- ✅ Validation des données

**Questions ?** Consultez :
- [CALCUL-MOYENNES.md](CALCUL-MOYENNES.md) - Détails des calculs
- [GUIDE-UX-UI.md](GUIDE-UX-UI.md) - Design et UX
- [ROADMAP.md](ROADMAP.md) - Évolution future

Bonne utilisation ! 🚀
