# 🚀 Guide de Configuration Supabase - Gestion de Bulletins

Ce guide vous explique comment configurer définitivement Supabase pour votre application de gestion de bulletins scolaires.

---

## 📋 Prérequis

- Compte Supabase (gratuit) : https://supabase.com
- Node.js installé
- Projet React fonctionnel

---

## 🔧 Étape 1 : Créer un projet Supabase

1. **Allez sur** : https://supabase.com
2. **Connectez-vous** ou **créez un compte**
3. **Cliquez sur** "New Project"
4. **Remplissez les informations** :
   - Project Name : `gestion-bulletins` (ou autre nom)
   - Database Password : Choisissez un mot de passe fort
   - Region : Choisissez la région la plus proche (ex: `Frankfurt` pour l'Europe)
   - Pricing Plan : Sélectionnez "Free" pour commencer
5. **Cliquez sur** "Create new project"
6. **Attendez** 2-3 minutes que le projet soit créé

---

## 🔑 Étape 2 : Récupérer les clés d'API

1. Une fois le projet créé, allez dans **Settings** (icône engrenage)
2. Cliquez sur **API** dans le menu de gauche
3. **Copiez** les informations suivantes :
   - **Project URL** (commence par `https://xxxxx.supabase.co`)
   - **anon public** key (la clé `anon` dans la section "Project API keys")

---

## 📝 Étape 3 : Configurer les variables d'environnement

1. **Créez** un fichier `.env.local` à la racine du projet `gestion-bulletins/` :

```bash
VITE_SUPABASE_URL=https://votre-projet.supabase.co
VITE_SUPABASE_ANON_KEY=votre-cle-anon-ici
```

2. **Remplacez** les valeurs par celles copiées à l'étape 2

3. **Vérifiez** que `.env.local` est dans votre `.gitignore` (pour ne pas partager vos clés)

---

## 🗄️ Étape 4 : Créer le schéma de la base de données

1. Dans Supabase, allez dans **SQL Editor** (icône `</>` dans le menu)
2. Cliquez sur **New query**
3. **Copiez tout le contenu** du fichier `supabase-schema.sql`
4. **Collez-le** dans l'éditeur SQL
5. **Cliquez sur** "Run" (ou appuyez sur `Ctrl+Enter`)
6. **Vérifiez** qu'il n'y a pas d'erreurs dans la console

---

## ✅ Étape 5 : Vérifier la création des tables

1. Allez dans **Table Editor** dans Supabase
2. Vous devriez voir les tables suivantes :
   - ✅ `app_data` (table principale)
   - ✅ `classes`
   - ✅ `students`
   - ✅ `subjects`
   - ✅ `grades`
   - ✅ `users`
   - ✅ `activities`

3. **Cliquez sur** `app_data` pour voir les données par défaut

---

## 🔐 Étape 6 : Configurer les politiques RLS (Row Level Security)

Les politiques RLS sont déjà créées par le script SQL. Pour vérifier :

1. Allez dans **Authentication** → **Policies**
2. Vérifiez que les politiques sont actives sur toutes les tables

**Note** : Actuellement, l'accès est public (pour simplifier). Pour renforcer la sécurité, vous pourrez configurer l'authentification Supabase plus tard.

---

## 🧪 Étape 7 : Tester la connexion

1. **Démarrez** votre application :

```bash
cd gestion-bulletins
npm run dev
```

2. **Ouvrez** http://localhost:5173

3. **Vérifiez** dans la console du navigateur (F12) qu'il n'y a pas d'erreurs Supabase

4. **Testez** :
   - Créer une classe
   - Ajouter un élève
   - Ajouter une matière
   - Saisir des notes

5. **Vérifiez dans Supabase** (Table Editor → `app_data`) que les données sont bien enregistrées

---

## 📊 Étape 8 : Migrer les données existantes (si vous en avez)

Si vous avez déjà des données dans localStorage, utilisez le script de migration :

1. **Ouvrez** la console du navigateur (F12) sur votre application
2. **Exécutez** le script de migration (voir fichier `migrate-to-supabase.js`)
3. **Vérifiez** que les données sont bien dans Supabase

---

## 🔄 Étape 9 : Activer la synchronisation en temps réel (optionnel)

1. Dans Supabase, allez dans **Database** → **Replication**
2. **Activez** la réplication sur la table `app_data`
3. Votre application recevra maintenant les mises à jour en temps réel

---

## 🛡️ Étape 10 : Sécurité avancée (recommandé pour production)

### Option 1 : Authentification Supabase

Pour utiliser l'authentification Supabase native :

1. Allez dans **Authentication** → **Providers**
2. Activez **Email** ou d'autres providers (Google, etc.)
3. Modifiez le code pour utiliser `supabase.auth.signUp()` et `supabase.auth.signIn()`

### Option 2 : Politiques RLS avancées

Modifiez les politiques pour restreindre l'accès selon les rôles :

```sql
-- Exemple : Seuls les admins peuvent supprimer
CREATE POLICY "Seuls admins peuvent supprimer" ON app_data
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE email = auth.email() 
      AND role = 'admin'
    )
  );
```

---

## 🐛 Dépannage

### Erreur : "Invalid API key"
- Vérifiez que vous avez bien copié la clé `anon` (pas la clé `service_role`)
- Vérifiez que le fichier `.env.local` est à la racine du projet

### Erreur : "relation app_data does not exist"
- Relancez le script SQL `supabase-schema.sql`
- Vérifiez que vous êtes bien dans le bon projet Supabase

### Les données ne se synchronisent pas
- Vérifiez dans la console du navigateur (F12) s'il y a des erreurs
- Vérifiez que les politiques RLS sont bien configurées
- Vérifiez votre connexion internet

### "CORS error"
- Vérifiez que l'URL Supabase est correcte dans `.env.local`
- Redémarrez le serveur de développement (`npm run dev`)

---

## 📚 Ressources supplémentaires

- **Documentation Supabase** : https://supabase.com/docs
- **API Reference** : https://supabase.com/docs/reference/javascript/introduction
- **RLS Guide** : https://supabase.com/docs/guides/auth/row-level-security
- **Real-time** : https://supabase.com/docs/guides/realtime

---

## ✅ Checklist de vérification

Avant de mettre en production, vérifiez :

- [ ] Les clés Supabase sont configurées dans `.env.local`
- [ ] Toutes les tables sont créées
- [ ] Les politiques RLS sont actives
- [ ] L'application se connecte sans erreur
- [ ] Les données sont sauvegardées dans Supabase
- [ ] Le fichier `.env.local` est dans `.gitignore`
- [ ] Vous avez un backup de vos données
- [ ] Les utilisateurs peuvent se connecter
- [ ] Les bulletins PDF s'impriment correctement

---

## 🎉 Félicitations !

Votre application est maintenant configurée avec Supabase ! 

**Avantages** :
- ✅ Données dans le cloud (accessibles partout)
- ✅ Synchronisation en temps réel
- ✅ Backups automatiques
- ✅ Scalabilité automatique
- ✅ Sécurité renforcée avec RLS

**Prochaines étapes** :
1. Tester toutes les fonctionnalités
2. Configurer les sauvegardes
3. Inviter d'autres utilisateurs
4. Déployer en production (Vercel, Netlify, etc.)
