# 🚀 Guide de Démarrage Rapide v1.1

## ⚡ Démarrage en 5 Minutes

### 1. Vérifier l'installation
```bash
cd gestion-bulletins
npm install  # Si c'est la première fois
```

### 2. Lancer l'app
```bash
npm run dev
```

### 3. Accédez à l'app
```
http://localhost:5173
```

### 4. Login par défaut
```
Email: admin@ecole.com
Password: admin123
Role: Admin
```

---

## 📍 Où Trouver Les Nouvelles Features

### Menu Principal (Navigation)
Après connexion, vous verrez ces nouveaux menus:

```
📊 TABLEAU DE BORD
├── 📅 Années scolaires     ← NEW (Admin only)
├── ⭐ Appréciations         ← NEW (Admin + Professeur)
└── 📈 Analyse avancée       ← NEW (Admin + Professeur)
```

### Navigation Desktop
Cliquez sur les boutons dans la barre de navigation en haut.

### Navigation Mobile
Cliquez sur l'icône ☰ (menu burger) et sélectionnez l'option.

---

## 🎯 Premiers Pas Par Rôle

### 👨‍💼 Si vous êtes Admin

#### 1. Créer une année scolaire
1. Cliquez sur **"Années scolaires"** dans le menu
2. Cliquez sur **"Ajouter une année"**
3. Remplissez les infos:
   - Année : "2024-2025"
   - Date de début : 2024-09-01
   - Date de fin : 2025-06-30
   - Trimestres : Configurez les 3 trimestres
4. Cliquez sur **"Ajouter"**

#### 2. Ajouter une classe
1. Allez à **"Classes"** dans le menu
2. Cliquez sur **"Ajouter une classe"**
3. Entrez le nom : "6ème A"
4. Cliquez sur **"Ajouter"**

#### 3. Ajouter des élèves
1. Allez à **"Élèves"**
2. Sélectionnez la classe "6ème A"
3. Cliquez sur **"Ajouter un élève"**
4. Entrez Prénom et Nom
5. Cliquez sur **"Ajouter"**

#### 4. Ajouter des matières
1. Allez à **"Matières"**
2. Cliquez sur **"Ajouter une matière"**
3. Entrez:
   - Nom : "Mathématiques"
   - Coefficient : "2"
4. Cliquez sur **"Ajouter"**
5. Répétez pour d'autres matières

#### 5. Utiliser Analyse Avancée
1. Allez à **"Analyse avancée"**
2. Sélectionnez une classe
3. Sélectionnez un trimestre
4. Voyez:
   - 📊 Graphique de distribution
   - 📈 Statistiques (moyenne, médiane, écart-type)
   - 🔴 Élèves en difficulté
   - 🏆 Top 5 élèves

---

### 👨‍🏫 Si vous êtes Professeur

#### 1. Saisir les notes
1. Allez à **"Saisir notes"**
2. Sélectionnez:
   - Classe
   - Trimestre
3. Entrez les notes pour chaque élève/matière (de 0 à 20)
4. Entrez l'appréciation (texte libre)
5. Appuyez sur **"Enregistrer"**

#### 2. Ajouter une appréciation
1. Allez à **"Appréciations"**
2. Sélectionnez un élève
3. Choisissez le type:
   - **Appréciation Enseignant** (par matière)
   - **Appréciation Conseil** (générale)
4. Écrivez le texte
5. Cliquez sur **"Sauvegarder"**

#### 3. Voir les statistiques
1. Allez à **"Analyse avancée"**
2. Sélectionnez votre classe
3. Voyez la performance globale

---

### 💼 Si vous êtes Secrétaire

#### 1. Consulter les bulletins
1. Allez à **"Bulletins"**
2. Sélectionnez:
   - Classe
   - Trimestre
3. Cliquez sur **"Imprimer PDF"** pour chaque élève

#### 2. Importer des élèves (Excel)
1. Allez à **"Import/Export"**
2. Cliquez sur **"Importer élèves"**
3. Sélectionnez un fichier Excel avec colonnes:
   ```
   | Nom | Prénom | Classe |
   |-----|--------|--------|
   ```
4. Les élèves sont importés automatiquement

#### 3. Exporter les notes
1. Allez à **"Import/Export"**
2. Sélectionnez une classe et trimestre
3. Cliquez sur **"Exporter notes"**
4. Un fichier Excel est téléchargé

---

## 📊 Exemples d'Utilisation

### Exemple 1 : Ajouter une appréciation

```
Étape 1: Allez à "Appréciations"
Étape 2: Sélectionnez "Jean Dupont" - Classe "6A" - Trimestre "1"
Étape 3: Cliquez sur l'onglet "Appréciation Enseignant"
Étape 4: Sélectionnez Matière "Mathématiques"
Étape 5: Écrivez : "Bon élève, travaille régulièrement"
Étape 6: Cliquez "Sauvegarder"

✅ L'appréciation est sauvegardée !
```

### Exemple 2 : Consulter l'analyse avancée

```
Étape 1: Allez à "Analyse avancée"
Étape 2: Sélectionnez Classe "6A"
Étape 3: Sélectionnez Trimestre "1"

Vous voyez:
- Graphique avec distribution des mentions
- Moyenne classe: 14.5/20
- Médiane: 14.0/20
- Élèves en difficulté: 2 (Jean, Marie)
- Top 5: [Thomas 18.5, Anne 18.2, ...]
- Statistiques par matière
```

### Exemple 3 : Générer un bulletin

```
Étape 1: Allez à "Bulletins"
Étape 2: Sélectionnez Classe "6A"
Étape 3: Sélectionnez Trimestre "1"
Étape 4: Cliquez "Imprimer PDF" pour Jean Dupont

✅ PDF généré avec:
- Infos élève
- Notes par matière
- Moyenne générale
- Mention (Très bien, Bien, etc.)
- Remarques professeur
```

---

## 🐛 Problèmes Courants et Solutions

### Problem 1 : "Module calculUtils not found"
**Solution** :
```bash
# Vérifier que le fichier existe
ls src/utils/calculUtils.js

# Si manquant, créer à partir de FEATURES-V1.1.md
```

### Problem 2 : Notes ne s'affichent pas
**Solution** :
1. Vérifier qu'une classe est sélectionnée
2. Vérifier qu'des matières existent
3. Ouvrir DevTools (F12) → Console
4. Taper : `JSON.parse(localStorage.getItem('grades'))`
5. Vérifier si les notes sont là

### Problem 3 : Appréciation ne sauvegarde pas
**Solution** :
1. Vérifier que localStorage n'est pas plein
2. Faire F5 (refresh) et réessayer
3. Ouvrir Console et vérifier les erreurs (F12)

### Problem 4 : "Access denied" sur Supabase
**Solution** :
1. Vérifier la connexion Supabase dans `config/supabase.js`
2. Vérifier les RLS policies (voir MIGRATION-GUIDE)
3. L'app doit fonctionner en localStorage fallback anyway

---

## ✅ Checklist Post-Installation

Après démarrage, vérifiez:

- [ ] L'app charge sans erreurs
- [ ] Vous pouvez vous connecter
- [ ] Le menu affiche les 12 options
- [ ] Les nouveaux menus apparaissent (Années, Appréciations, Analytics)
- [ ] Vous pouvez ajouter une année scolaire
- [ ] Vous pouvez saisir des notes
- [ ] Vous pouvez ajouter une appréciation
- [ ] Vous pouvez générer un bulletin PDF
- [ ] L'analyse avancée affiche les graphiques

---

## 📚 Guides Complets

Pour plus d'informations:

1. **FEATURES-V1.1.md** - Détails de toutes les fonctionnalités
2. **MIGRATION-GUIDE-V1.1.md** - Migration depuis v1.0
3. **CALCUL-MOYENNES.md** - Formules mathématiques
4. **GUIDE-UX-UI.md** - Design et accessibilité
5. **ROADMAP.md** - Évolution future
6. **INTEGRATION-REPORT-V1.1.md** - Rapport technique

---

## 🆘 Support

### Erreurs Courant
- Regarder le console (F12 → Console)
- Chercher le message d'erreur rouge
- Consulter MIGRATION-GUIDE pour troubleshooting

### Base de Données
- App fonctionne en **localStorage par défaut**
- Pour Supabase, voir `src/hooks/useSupabaseState.js`
- Données persistantes entre sessions

### Performance
- Optimisé pour classes < 500 élèves
- Optimisé pour trimestres < 1000 notes
- Recharts performance pour > 100 points

---

## 🎉 Vous êtes Prêt !

L'application est maintenant complètement fonctionnelle avec:
- ✅ 12 vues complètes
- ✅ 3 rôles avec permissions
- ✅ Gestion années scolaires
- ✅ Système appréciations
- ✅ Analyse avancée
- ✅ Calculs transparents
- ✅ Persistence localStorage + Supabase

**Commencez par créer une année scolaire, puis ajoutez une classe et des élèves !**

Bonne utilisation ! 🚀
