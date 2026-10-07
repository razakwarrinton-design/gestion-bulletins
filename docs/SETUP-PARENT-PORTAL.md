# 📖 Guide de Configuration - Espace Parents

## ✅ Résumé des Corrections Apportées

J'ai amélioré le diagnostic de la page d'accueil Parent en:

1. **Ajout de logs détaillés** dans le navigateur (F12)
   - Vous verrez exactement où le process s'arrête
   - Empile/ID du parent affichés

2. **Meilleur affichage d'erreur** sur la page
   - Message d'erreur plus clair si problème Supabase
   - Lien vers F12 pour déboguer

3. **Information technique** quand aucun élève lié
   - Affiche le Parent ID (important pour debug)
   - Affiche le rôle confirmé

---

## 🚀 Configuration Complète pour l'Admin

Pour que l'Espace Parents **fonctionne completement**, suivez ces étapes:

### **Étape 1: Créer un Compte Parent**

1. Allez à **Tableau de bord** → **Gestion parents**
2. Cliquez **"Ajouter un parent"**
3. Sélectionnez l'onglet **"Créer un parent"**
4. Remplissez:
   - Email: `parent@example.com` (unique)
   - Mot de passe: Au moins 6 caractères
5. Cliquez **"Créer le compte"**
6. ✅ Vous recevrez un message "Parent créé avec succès"

### **Étape 2: Créer des Élèves**

Si vous n'avez pas d'élèves:

1. Allez à **Élèves** → **"+ Ajouter un élève"**
2. Remplissez les infos et sélectionnez une classe
3. Répétez pour plusieurs élèves

### **Étape 3: Lier Parent → Élève**

1. Allez à **Gestion parents**
2. Cliquez **"Ajouter un parent"**
3. Sélectionnez l'onglet **"Lier un élève"**
4. Sélectionnez:
   - Parent: Celui créé à l'étape 1
   - Classe: La classe de l'élève
   - Élève: L'élève spécifique
5. Cliquez **"Lier"**
6. ✅ Message: "Élève lié(e) au parent"

### **Étape 4: Le Parent se Connecte**

1. **Déconnectez-vous** (bouton de déconnexion)
2. Entrez les identifiants du parent (Email + Mot de passe)
3. **Ouvrez F12** → Onglet **Console**
4. Cherchez le log: `✅ App: Parent detected! Redirecting to "parents" view...`
5. ✅ Vous devriez voir **"Espace Parents"** automatiquement

---

## 🔍 Logs à Vérifier (F12 → Console)

### **Si tout fonctionne:**
```
🔄 App: Checking role for redirection. CurrentUser: {
  id: "xxxx-xxxx-xxxx-xxxx",
  firstName: "John",
  lastName: "Doe",
  role: "parent",
  email: "parent@example.com"
}
✅ App: Parent detected! Redirecting to "parents" view...
👨‍👩‍👧 ParentPortal: Component mounted
📚 useParent: Fetching parent data for ID: xxxx-xxxx-xxxx-xxxx
✅ useParent: Found 1 linked students
✅ useParent: Mapped 1 students: [...]
```

### **Si erreur "Aucun élève associé":**
```
✅ useParent: Found 0 linked students
```
**Solution:** Allez à "Gestion parents" → "Lier un élève"

### **Si erreur Supabase:**
```
❌ useParent: Error fetching parent_students: 
{code: "42P01", message: "relation \"public.parent_students\" does not exist"}
```
**Solution:** Vérifiez que la table `parent_students` existe dans Supabase (voir point 5 du troubleshooting)

---

## 🛠️ Tables Supabase Requises

Pour que l'Espace Parents fonctionne, assurez-vous d'avoir:

### **1. Table `user_profiles`**
```sql
-- Colonnes requises:
- id (UUID) PRIMARY KEY
- email (TEXT) UNIQUE
- first_name (TEXT)
- last_name (TEXT)
- role (TEXT) -- 'admin', 'parent', 'professeur', 'secretaire'
- created_at (TIMESTAMP)
```

### **2. Table `parent_students`**
```sql
-- Colonnes requises:
- id (UUID) PRIMARY KEY
- parent_id (UUID) FOREIGN KEY → user_profiles(id)
- student_id (UUID) FOREIGN KEY → students(id)
- created_at (TIMESTAMP)

-- Contrainte UNIQUE (un parent-élève = 1 seule fois)
UNIQUE(parent_id, student_id)
```

### **3. Table `students`**
```sql
-- Colonnes requises:
- id (UUID) PRIMARY KEY
- first_name (TEXT)
- last_name (TEXT)
- class_id (UUID) FOREIGN KEY → classes(id)
- created_at (TIMESTAMP)
```

### **4. Table `classes`**
```sql
-- Colonnes requises:
- id (UUID) PRIMARY KEY
- name (TEXT) -- ex: "6e A", "Terminale S"
- created_at (TIMESTAMP)
```

### **5. Table `grades`** (optionnel mais recommandé)
```sql
-- Colonnes requises:
- id (UUID) PRIMARY KEY
- student_id (UUID) FOREIGN KEY → students(id)
- subject_id (UUID) FOREIGN KEY → subjects(id)
- value (NUMERIC) -- note sur 20
- trimester (INTEGER) -- 1, 2, ou 3
- created_at (TIMESTAMP)
```

---

## 🔐 RLS Policies (Supabase)

**⚠️ Important:** Sans RLS policies correctes, les parents pourraient voir les données d'autres parents!

### **Pour table `parent_students`:**

```sql
-- Parents peuvent voir LEURS propres liens
CREATE POLICY "parents_view_own_students" ON parent_students
FOR SELECT USING (
  auth.uid() = parent_id
);

-- Admins peuvent tout voir
CREATE POLICY "admin_manages_parent_students" ON parent_students
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);
```

### **Pour table `students`:**

```sql
-- Parents peuvent voir LEURS enfants
CREATE POLICY "parents_view_own_children" ON students
FOR SELECT USING (
  id IN (
    SELECT student_id FROM parent_students
    WHERE parent_id = auth.uid()
  )
);

-- Admins/Prof peuvent voir tous les élèves
CREATE POLICY "staff_view_all_students" ON students
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'professeur', 'secretaire')
  )
);
```

---

## ✨ Test de Vérification (Pour l'Admin)

Avant de tester avec un parent vrai:

1. Créez un compte parent test
2. Liez-le à un élève
3. Ouvrez une **fenêtre privée/incognito**
4. Connectez-vous avec le compte parent
5. Ouvrez F12 → Console
6. Vérifiez les logs (voir section "Logs à Vérifier")
7. Vous devriez voir:
   - Le menu montre "Espace Parents"
   - La redirection automatique fonctionne
   - Les élèves sont affichés

---

## 🐛 Déboguer un Problème Spécifique

### **Problème: "Aucun élève associé" s'affiche**
```
✅ Cela signifie:
- Parent est authentifié ✓
- Le rôle est 'parent' ✓
- Les logs fonctionnent ✓
- Mais: Aucun élève n'est lié

🔧 Solution:
1. Allez à "Gestion parents"
2. Onglet "Lier un élève"
3. Sélectionnez parent + élève + cliquez "Lier"
4. Parent: Reconnectez-vous
```

### **Problème: Menu ne montre pas "Espace Parents"**
```
❌ Cela signifie: Le rôle n'est pas 'parent'

🔧 Solution:
1. Allez à Paramètres (admin)
2. Cherchez le compte du parent
3. Modifiez le rôle → 'parent'
4. Parent: Reconnectez-vous
```

### **Problème: Erreur "Erreur de chargement" sur la page**
```
❌ Erreur Supabase

🔧 Solutions par ordre de probabilité:
1. Vérifiez que parent_students existe dans Supabase
2. Vérifiez les RLS policies
3. Vérifiez .env.local a les bonnes clés Supabase
4. Vérifiez parent_students a au moins une ligne
5. Consultez F12 pour le message d'erreur exact
```

---

## 📞 Support

Si vous avez encore un problème:

1. Ouvrez F12 → Console
2. Copiez **TOUS les messages**
3. Partagez le message d'erreur complet

Exemple à partager:
```
Console log:
🔄 App: Checking role for redirection. CurrentUser: {...}
✅ App: Parent detected! Redirecting to "parents" view...
👨‍👩‍👧 ParentPortal: Component mounted
Loading: false
Children: []
Error: "Parent_students relation not found"
```

