# 🚀 PHASE 3 : Intégration Supabase

## Aperçu
Cette application est maintenant configurée pour utiliser **Supabase** (Firebase open-source) comme base de données cloud avec synchronisation en temps réel.

## ✅ Ce qui a été fait

### 1. Installation des dépendances
```bash
npm install @supabase/supabase-js
```

### 2. Configuration Supabase
- Fichier de configuration: `src/config/supabase.js`
- Hook personnalisé: `src/hooks/useSupabaseState.js`
- Hook avec fallback localStorage: `useSupabaseStateWithFallback()`

### 3. Caractéristiques implémentées
✅ Synchronisation temps réel via Supabase Realtime  
✅ Sauvegarde persistante dans le cloud  
✅ Accès aux données depuis n'importe où  
✅ Fallback automatique sur localStorage en cas d'indisponibilité  

---

## 📋 Étapes de configuration

### Étape 1 : Créer un compte Supabase
1. Allez sur https://supabase.com
2. Cliquez sur "Sign Up"
3. Créez un nouveau compte (gratuit)

### Étape 2 : Créer un nouveau projet
1. Cliquez sur "New Project"
2. Donnez-lui un nom (ex: "gestion-bulletins")
3. Créez une région (ex: eu-west-1 pour l'Europe)
4. Attendez que le projet soit initialisé (~2 minutes)

### Étape 3 : Créer les tables de la base de données

Dans le SQL Editor de Supabase, exécutez ce script :

```sql
-- Table pour les données d'application (fallback simple)
CREATE TABLE app_data (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW(),
  updated_by TEXT
);

-- Table pour les utilisateurs
CREATE TABLE users (
  id BIGINT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  role TEXT CHECK (role IN ('admin', 'professeur', 'secretaire')),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Table pour les classes
CREATE TABLE classes (
  id BIGINT PRIMARY KEY,
  name TEXT NOT NULL,
  level TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Table pour les élèves
CREATE TABLE students (
  id BIGINT PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  class_id BIGINT REFERENCES classes(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Table pour les matières
CREATE TABLE subjects (
  id BIGINT PRIMARY KEY,
  name TEXT NOT NULL,
  coefficient DECIMAL(5,2),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Table pour les notes
CREATE TABLE grades (
  id TEXT PRIMARY KEY,
  student_id BIGINT REFERENCES students(id),
  subject_id BIGINT REFERENCES subjects(id),
  trimester TEXT,
  value DECIMAL(5,2),
  appreciation TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Table pour les activités (logging)
CREATE TABLE activities (
  id BIGINT PRIMARY KEY,
  timestamp TIMESTAMP,
  user_name TEXT,
  user_role TEXT,
  action TEXT,
  details TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Activer Realtime pour les changements en temps réel
ALTER TABLE app_data REPLICA IDENTITY FULL;
ALTER TABLE users REPLICA IDENTITY FULL;
ALTER TABLE classes REPLICA IDENTITY FULL;
ALTER TABLE students REPLICA IDENTITY FULL;
ALTER TABLE subjects REPLICA IDENTITY FULL;
ALTER TABLE grades REPLICA IDENTITY FULL;
ALTER TABLE activities REPLICA IDENTITY FULL;
```

### Étape 4 : Configurer les variables d'environnement

1. Dans Supabase, allez dans Settings → API
2. Copiez :
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public** → `VITE_SUPABASE_ANON_KEY`

3. Créez un fichier `.env.local` à la racine du projet :
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### Étape 5 : Redémarrer l'application

```bash
npm run dev
```

---

## 🔄 Synchronisation des données existantes

Les données existantes dans localStorage seront automatiquement synchronisées avec Supabase grâce au hook `useSupabaseStateWithFallback`.

Pour migrer manuellement :

```javascript
// Dans la console du navigateur
const oldData = localStorage.getItem('classes');
const parsedData = JSON.parse(oldData);
// Les données seront automatiquement envoyées à Supabase lors de la prochaine sauvegarde
```

---

## 🔐 Sécurité

### Politiques de Row Level Security (RLS)

Allez dans l'onglet Authentication → Policies et créez ces règles :

```sql
-- Permettre à tous les utilisateurs de lire leurs propres données
CREATE POLICY "Users can read their own data" ON users
  FOR SELECT USING (auth.uid()::text = id::text);

-- Permettre aux admins de voir toutes les données
CREATE POLICY "Admins can see all data" ON grades
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  );
```

---

## 📊 Avantages de cette architecture

| Feature | localStorage | Supabase |
|---------|-------------|----------|
| Persistance | ✅ Local | ✅ Cloud |
| Partage de données | ❌ Non | ✅ Oui |
| Synchronisation temps réel | ❌ Non | ✅ Oui |
| Accès partout | ❌ Non | ✅ Oui |
| Sauvegarde | ❌ Manuel | ✅ Auto |
| Fallback | ❌ Non | ✅ localStorage |

---

## 🐛 Dépannage

### Erreur : "VITE_SUPABASE_URL not found"
→ Créez le fichier `.env.local` avec vos clés Supabase

### Erreur : "relation "app_data" does not exist"
→ Exécutez le script SQL dans Supabase pour créer les tables

### Les données ne se synchronisent pas
→ Vérifiez la console du navigateur pour les erreurs
→ Assurez-vous que Realtime est activé pour la table

---

## 📚 Ressources

- [Documentation Supabase](https://supabase.com/docs)
- [Supabase Realtime](https://supabase.com/docs/guides/realtime)
- [SQL Editor Supabase](https://supabase.com/docs/guides/getting-started/quickstarts/build-with-sqlite)

---

## ✨ Prochaines étapes

1. ✅ Installer et configurer Supabase
2. 🔄 Migrer progressivement useLocalStorageState → useSupabaseState
3. 🔐 Mettre en place l'authentification Supabase Auth
4. 📊 Créer des views SQL pour les rapports
5. 🚀 Déployer l'application
