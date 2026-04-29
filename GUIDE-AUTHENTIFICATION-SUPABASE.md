# 🔐 Guide Complet - Sécurité RLS et Authentification Supabase

Ce guide vous explique comment activer l'authentification Supabase et renforcer la sécurité avec les politiques RLS (Row Level Security).

---

## 📋 Ce que vous allez faire

1. ✅ Activer l'authentification Email dans Supabase
2. ✅ Exécuter le script SQL de sécurité
3. ✅ Créer les premiers utilisateurs
4. ✅ Mettre à jour le code de l'application
5. ✅ Tester l'authentification

---

## 🔧 Étape 1 : Activer l'authentification Email dans Supabase

1. **Allez dans votre projet Supabase** : https://supabase.com/dashboard
2. **Cliquez sur "Authentication"** dans le menu de gauche
3. **Cliquez sur "Providers"**
4. **Trouvez "Email"** et **activez-le** (toggle ON)
5. **Paramètres recommandés** :
   - ✅ Enable email confirmations : **OFF** (pour simplifier le test)
   - ✅ Enable email signup : **ON**
   - ✅ Secure password change : **ON**

6. **Cliquez sur "Save"**

---

## 🗄️ Étape 2 : Exécuter le script SQL de sécurité

1. **Allez dans "SQL Editor"** (icône `</>` dans le menu)
2. **Cliquez sur "+ New query"**
3. **Ouvrez le fichier** `supabase-security-rls.sql`
4. **Copiez tout le contenu** (Ctrl+A puis Ctrl+C)
5. **Collez-le** dans l'éditeur SQL
6. **Cliquez sur "Run"** (ou Ctrl+Enter)
7. **Attendez** - vous devriez voir "Success"

### Ce que fait ce script :

- ✅ Crée la table `user_profiles` (profils utilisateurs)
- ✅ Configure les triggers automatiques
- ✅ Crée les politiques RLS selon les rôles :
  - **Admin** : Accès total
  - **Professeur** : Lecture complète + modification notes/appréciations
  - **Secrétaire** : Lecture complète + impression bulletins

---

## 👥 Étape 3 : Créer les utilisateurs de test

### Méthode A : Via l'interface Supabase (recommandé)

1. **Allez dans "Authentication" → "Users"**
2. **Cliquez sur "Add user" → "Create new user"**

#### Créer l'utilisateur Admin :

```
Email: admin@ecole.com
Password: Admin@2024 (ou votre choix)
Auto Confirm User: ✅ ON
```

Cliquez sur **"User Metadata"** et ajoutez ce JSON :
```json
{
  "first_name": "Admin",
  "last_name": "Système",
  "role": "admin"
}
```

Cliquez sur **"Create user"**

#### Créer l'utilisateur Professeur :

```
Email: prof@ecole.com
Password: Prof@2024
Auto Confirm User: ✅ ON
```

User Metadata :
```json
{
  "first_name": "Jean",
  "last_name": "Professeur",
  "role": "professeur"
}
```

#### Créer l'utilisateur Secrétaire :

```
Email: secret@ecole.com
Password: Secret@2024
Auto Confirm User: ✅ ON
```

User Metadata :
```json
{
  "first_name": "Marie",
  "last_name": "Secrétaire",
  "role": "secretaire"
}
```

---

### Méthode B : Via SQL (alternatif)

Si vous préférez créer les utilisateurs via SQL :

```sql
-- Note : Vous devrez activer l'extension pgcrypto
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Cette fonction doit être exécutée en tant qu'admin Supabase
```

⚠️ **Important** : La méthode A (interface) est plus simple et recommandée.

---

## 🔄 Étape 4 : Mettre à jour le code de l'application

### Option 1 : Migration progressive (recommandé)

Je vais créer une nouvelle version d'App.jsx qui utilise l'authentification Supabase tout en restant compatible avec vos données actuelles.

### Option 2 : Test en parallèle

Vous pouvez tester l'authentification sans modifier App.jsx immédiatement :

1. Créez une page de test `test-auth.html`
2. Testez la connexion
3. Une fois validé, migrez App.jsx

---

## 🧪 Étape 5 : Tester l'authentification

### Test 1 : Connexion Admin

1. **Ouvrez votre application** : http://localhost:5175
2. **Cliquez sur "Se connecter"**
3. **Entrez** :
   - Email: `admin@ecole.com`
   - Password: `Admin@2024`
4. **Cliquez sur "Se connecter"**
5. **Vérifiez** que vous voyez "Admin Système" en haut à droite

### Test 2 : Vérifier les permissions

En tant qu'Admin :
- ✅ Vous pouvez créer/modifier/supprimer des classes
- ✅ Vous pouvez ajouter des élèves
- ✅ Vous pouvez saisir des notes
- ✅ Vous pouvez voir les paramètres

### Test 3 : Connexion Professeur

1. **Déconnectez-vous**
2. **Reconnectez-vous** avec :
   - Email: `prof@ecole.com`
   - Password: `Prof@2024`
3. **Vérifiez** :
   - ✅ Vous pouvez saisir des notes
   - ✅ Vous pouvez voir les statistiques
   - ❌ Vous ne pouvez PAS voir les paramètres

### Test 4 : Connexion Secrétaire

1. **Déconnectez-vous**
2. **Reconnectez-vous** avec :
   - Email: `secret@ecole.com`
   - Password: `Secret@2024`
3. **Vérifiez** :
   - ✅ Vous pouvez voir les bulletins
   - ✅ Vous pouvez imprimer les bulletins
   - ❌ Vous ne pouvez PAS saisir de notes
   - ❌ Vous ne pouvez PAS voir les paramètres

---

## 🔐 Comprendre les politiques RLS

### Politiques de lecture (SELECT)

```sql
CREATE POLICY "Lecture pour utilisateurs authentifiés" 
  ON app_data FOR SELECT 
  USING (auth.uid() IS NOT NULL);
```

**Signification** : Tous les utilisateurs connectés peuvent lire toutes les données.

### Politiques d'écriture (INSERT)

```sql
CREATE POLICY "Insertion pour admins et professeurs" 
  ON app_data FOR INSERT 
  WITH CHECK (public.get_user_role() IN ('admin', 'professeur'));
```

**Signification** : Seuls les admins et professeurs peuvent créer de nouvelles données.

### Politiques de modification (UPDATE)

```sql
CREATE POLICY "Mise à jour selon rôle" 
  ON app_data FOR UPDATE 
  USING (
    CASE 
      WHEN public.get_user_role() = 'admin' THEN true
      WHEN public.get_user_role() = 'professeur' AND key IN ('grades', 'appreciations') THEN true
      WHEN public.get_user_role() = 'secretaire' AND key IN ('activities') THEN true
      ELSE false
    END
  );
```

**Signification** :
- **Admin** : Peut modifier tout
- **Professeur** : Peut modifier `grades` et `appreciations`
- **Secrétaire** : Peut modifier `activities` uniquement

### Politiques de suppression (DELETE)

```sql
CREATE POLICY "Suppression pour admins seulement" 
  ON app_data FOR DELETE 
  USING (public.get_user_role() = 'admin');
```

**Signification** : Seuls les admins peuvent supprimer des données.

---

## 🛡️ Matrice des permissions

| Action | Admin | Professeur | Secrétaire |
|--------|-------|------------|------------|
| 📖 Voir classes/élèves/matières | ✅ | ✅ | ✅ |
| ➕ Créer classe | ✅ | ❌ | ❌ |
| ➕ Ajouter élève | ✅ | ✅ | ❌ |
| ➕ Ajouter matière | ✅ | ❌ | ❌ |
| ✏️ Saisir notes | ✅ | ✅ | ❌ |
| ✏️ Modifier appréciations | ✅ | ✅ | ❌ |
| 📊 Voir statistiques | ✅ | ✅ | ❌ |
| 📄 Voir bulletins | ✅ | ✅ | ✅ |
| 🖨️ Imprimer bulletins | ✅ | ✅ | ✅ |
| ⚙️ Paramètres | ✅ | ❌ | ❌ |
| 🗑️ Supprimer données | ✅ | ❌ | ❌ |

---

## 🔧 Personnaliser les politiques

### Exemple 1 : Permettre aux secrétaires de modifier les activités

```sql
-- Déjà fait dans le script !
-- Les secrétaires peuvent modifier la clé 'activities'
```

### Exemple 2 : Restreindre la lecture par classe

Si vous voulez que les professeurs ne voient que leurs classes :

```sql
-- D'abord, ajouter une colonne class_id dans user_profiles
ALTER TABLE user_profiles ADD COLUMN class_id BIGINT;

-- Puis modifier la politique de lecture
DROP POLICY "Lecture pour utilisateurs authentifiés" ON app_data;

CREATE POLICY "Lecture selon classe" 
  ON app_data FOR SELECT 
  USING (
    CASE 
      WHEN public.get_user_role() = 'admin' THEN true
      WHEN public.get_user_role() = 'professeur' THEN 
        -- Logique personnalisée ici
        true
      ELSE true
    END
  );
```

---

## 🐛 Dépannage

### Erreur : "new row violates row-level security policy"

**Solution** : L'utilisateur n'a pas les permissions pour cette action. Vérifiez :
1. Le rôle de l'utilisateur dans `user_profiles`
2. Les politiques RLS dans la table concernée
3. La fonction `get_user_role()` retourne bien le bon rôle

```sql
-- Vérifier le rôle actuel
SELECT public.get_user_role();

-- Vérifier le profil
SELECT * FROM user_profiles WHERE id = auth.uid();
```

### Erreur : "permission denied for table user_profiles"

**Solution** : Les politiques RLS ne sont pas correctement configurées.

```sql
-- Réexécuter les politiques
DROP POLICY IF EXISTS "Les utilisateurs peuvent voir leur propre profil" ON user_profiles;
CREATE POLICY "Les utilisateurs peuvent voir leur propre profil" 
  ON user_profiles FOR SELECT 
  USING (auth.uid() = id);
```

### Les utilisateurs ne peuvent pas se connecter

**Solution** :
1. Vérifiez que l'authentification Email est activée
2. Vérifiez que l'utilisateur existe dans Authentication → Users
3. Vérifiez que `Auto Confirm User` était activé à la création

---

## 📊 Vérifications de sécurité

### Vérifier les politiques actives

```sql
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  cmd,
  qual
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN ('app_data', 'user_profiles')
ORDER BY tablename, policyname;
```

### Vérifier les utilisateurs et leurs rôles

```sql
SELECT 
  email,
  first_name,
  last_name,
  role,
  created_at
FROM user_profiles
ORDER BY role, email;
```

### Tester les permissions

```sql
-- En tant qu'utilisateur connecté, tester :
SELECT public.get_user_role(); -- Doit retourner votre rôle

-- Tester la lecture
SELECT * FROM app_data LIMIT 1;

-- Tester l'écriture (si vous êtes admin ou prof)
UPDATE app_data SET value = value WHERE key = 'activities';
```

---

## 🚀 Passer en production

### Checklist de sécurité

- [ ] ✅ Authentification Email activée
- [ ] ✅ Politiques RLS configurées
- [ ] ✅ Tous les utilisateurs ont des mots de passe forts
- [ ] ✅ Email confirmation activée (en production)
- [ ] ✅ Variables d'environnement sécurisées
- [ ] ✅ HTTPS activé sur le domaine
- [ ] ✅ Backups configurés dans Supabase
- [ ] ✅ Logs d'activité activés

### Recommandations production

1. **Activer la confirmation par email** :
   - Authentication → Providers → Email
   - Enable email confirmations : **ON**

2. **Configurer un domaine email personnalisé** :
   - Project Settings → Auth → SMTP Settings
   - Utilisez SendGrid, Mailgun, ou AWS SES

3. **Activer les logs d'audit** :
   ```sql
   CREATE TABLE audit_logs (
     id BIGSERIAL PRIMARY KEY,
     user_id UUID REFERENCES auth.users(id),
     action TEXT,
     table_name TEXT,
     old_data JSONB,
     new_data JSONB,
     timestamp TIMESTAMPTZ DEFAULT NOW()
   );
   ```

4. **Configurer les sauvegardes** :
   - Project Settings → Database → Backups
   - Configurer des backups quotidiens

---

## 📞 Support

- **Documentation Supabase** : https://supabase.com/docs/guides/auth
- **RLS Guide** : https://supabase.com/docs/guides/auth/row-level-security
- **Discord Supabase** : https://discord.supabase.com

---

## ✅ Récapitulatif

Vous avez maintenant :

✅ **Authentification sécurisée** avec Supabase Auth  
✅ **Politiques RLS** selon les rôles (admin, professeur, secrétaire)  
✅ **Gestion des permissions** fine par action  
✅ **Protection des données** au niveau de la base de données  
✅ **Système évolutif** et prêt pour la production  

**Félicitations ! 🎉 Votre application est maintenant sécurisée !**

---

**Date** : ${new Date().toLocaleDateString('fr-FR')}  
**Version** : 2.0.0 - Authentification Supabase + RLS
