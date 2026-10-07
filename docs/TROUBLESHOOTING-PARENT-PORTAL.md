# 🔧 Guide de Dépannage - Espace Parents Non Affichage

## ❓ Problème
"La page d'accueil pour le parent ne s'affiche pas" (Parent portal not displaying)

---

## 🔍 Étapes de Diagnostic

### 1️⃣ **Vérifier la Connexion Parent**

**✓ Pour l'admin:**
- Allez à **"Gestion des parents"**
- Assurez-vous qu'un compte parent est créé (onglet "Créer un parent")
- Vérifiez que le parent est lié à au moins un élève (onglet "Lier un élève")

**✓ Pour le parent:**
- Connectez-vous avec votre email et mot de passe
- Ouvrez les **Outils de Développement** (F12 → Console)

---

### 2️⃣ **Vérifier les Logs du Navigateur (F12)**

Ouvrez **Console** dans les outils de développement et cherchez:

#### ✅ **Messages Attendus** (tout fonctionne):
```
🔄 App: Checking role for redirection. CurrentUser: {id: "xxx", role: "parent", ...}
✅ App: Parent detected! Redirecting to "parents" view...
👨‍👩‍👧 ParentPortal: Component mounted
📚 useParent: Fetching parent data for ID: xxx
✅ useParent: Found X linked students
✅ useParent: Mapped X students:
```

#### ❌ **Erreurs à Chercher**:

| Erreur | Cause Probable | Solution |
|--------|---|---|
| `Parent ID: undefined` | currentUser.id non défini | Reconnectez-vous |
| `Found 0 linked students` | Aucun élève lié | Admin: Allez à "Gestion des parents" → "Lier un élève" |
| `❌ useParent: Error fetching parent_students` | Erreur Supabase | Vérifiez les RLS policies (voir point 5) |
| `Erreur de chargement` + message | Erreur dans la requête | Consultez le message d'erreur exact |

---

### 3️⃣ **Vérifier le Rôle de l'Utilisateur**

Si vous ne voyez PAS "Espace Parents" dans le menu latéral:

```javascript
// Tapez ceci dans la console (F12):
console.log(localStorage.getItem('userRole'));
```

**Devrait afficher:** `"parent"`

**Si c'est différent**, contactez l'admin pour corriger le rôle.

---

### 4️⃣ **Vérifier la Base de Données Supabase**

**L'admin doit vérifier:**

1. **Table `user_profiles`**
   - ✓ Chaque parent a `role = 'parent'`
   - ✓ Les IDs sont uniques

2. **Table `parent_students`**
   - ✓ Des lignes existent reliant parents aux élèves
   - ✓ Format: `parent_id` (UUID) → `student_id` (UUID)
   - Exemple:
     ```
     parent_id: "123e-456f-789g"
     student_id: "abc1-def2-ghi3"
     ```

3. **Table `students`**
   - ✓ Les élèves existent
   - ✓ Ils ont un `class_id` valide

4. **Table `classes`**
   - ✓ Les classes existent
   - ✓ Elles ont un `name` défini

---

### 5️⃣ **Vérifier les RLS Policies (Supabase)**

Si vous voyez l'erreur "RLS policy" ou "Permission denied":

**Pour la table `parent_students`**, assurez-vous d'avoir une RLS policy:

```sql
-- Les parents peuvent voir leurs propres parent_students
CREATE POLICY "parents_can_view_own" ON parent_students
FOR SELECT USING (auth.uid() = parent_id);

-- Les admins peuvent tout voir
CREATE POLICY "admin_can_manage" ON parent_students
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);
```

---

### 6️⃣ **Vérifier la Configuration Supabase**

Dans [src/config/supabase.js](src/config/supabase.js):

```javascript
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);
```

**Vérifiez:**
- ✓ `VITE_SUPABASE_URL` est défini (doit être la URL complète)
- ✓ `VITE_SUPABASE_ANON_KEY` est correct
- ✓ Les variables d'env sont dans `.env.local`

---

## 🎯 Cas Courants & Solutions

### **Cas 1: Parent voit "Aucun élève associé"**
```
✅ C'est normal si aucun élève n'a été lié
→ Admin: Ouvrez "Gestion des parents" → "Lier un élève"
→ Parent: Reconnectez-vous après le lien
```

### **Cas 2: Parent ne voit PAS "Espace Parents" dans le menu**
```
❌ Le rôle n'est pas 'parent'
→ Admin: Allez à Paramètres → Gestion des comptes
→ Modifiez le rôle de l'utilisateur → 'parent'
→ Parent: Reconnectez-vous
```

### **Cas 3: Erreur "parent_students not found"**
```
❌ Les RLS policies bloquent l'accès
→ Admin: Allez à Supabase → SQL Editor
→ Exécutez le script RLS (voir point 5)
```

### **Cas 4: Espace Parents affiche une page blanche**
```
❌ Erreur JavaScript non gérée
→ Ouvrez F12 → Console
→ Regardez les erreurs rouges
→ Signalez le message exact
```

---

## 📋 Checklist Complète pour l'Admin

Pour que l'Espace Parents fonctionne:

- [ ] Au moins 1 parent créé (Gestion des parents → Créer un parent)
- [ ] Parent lié à au moins 1 élève (Gestion des parents → Lier un élève)
- [ ] Compte du parent a `role = 'parent'` dans `user_profiles`
- [ ] Les élèves existent et sont associés à une classe
- [ ] RLS policies sont configurées sur `parent_students`
- [ ] `.env.local` contient les variables Supabase correctes
- [ ] Parent peut se connecter avec son email/mot de passe

---

## 🆘 Si Rien Ne Marche

1. **Ouvrez les Outils de Développement (F12)**
2. **Allez à l'onglet Console**
3. **Copiez TOUS les messages avec 🔄, ✅, ou ❌**
4. **Signalez les messages d'erreur exacts**

**Exemple de rapport utile:**
```
Console Output:
🔄 App: Checking role for redirection. CurrentUser: {id: "123", role: "parent"}
✅ App: Parent detected! Redirecting to "parents" view...
👨‍👩‍👧 ParentPortal: Component mounted
📚 useParent: Fetching parent data for ID: 123
❌ useParent: Error fetching parent_students: 
   {code: "PGRST200", message: "Table parent_students not found"}
```

---

## 📞 Support

Pour debug plus facile, partagez:
1. Le message d'erreur exact (F12)
2. L'ID du parent (affichage dans le footer)
3. Si le parent est bien lié à un élève (Supabase)
4. Les variables `.env.local` (masquez les clés sensibles)

