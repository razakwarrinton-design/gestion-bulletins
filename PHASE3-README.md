# 🚀 PHASE 3: Base de Données Cloud - Supabase

## 📊 État de la Migration

### Installations ✅
- [x] npm install @supabase/supabase-js
- [x] Configuration de base créée
- [x] Hooks personnalisés implémentés
- [ ] Supabase configuré (À faire par l'utilisateur)
- [ ] App.jsx migré vers Supabase
- [ ] Tests de synchronisation en temps réel

---

## 🎯 Objectifs de cette phase

| Objectif | Status |
|----------|--------|
| Remplacer localStorage par Supabase | 🔄 En cours |
| Données accessibles depuis partout | ⏳ En attente de config |
| Synchronisation temps réel | ⏳ En attente de config |
| Mode offline avec fallback | ✅ Implémenté |
| Activités loggées en temps réel | ⏳ À connecter |

---

## 🔧 Configuration Rapide (5 minutes)

### 1️⃣ Créer un compte Supabase
```bash
# Allez sur: https://supabase.com/sign-up
```

### 2️⃣ Créer un projet
- Nom: `gestion-bulletins`
- Région: Europe (eu-west-1)
- Attendez ~2 minutes

### 3️⃣ Exécuter le SQL
Allez dans **SQL Editor** et collez:
[Voir PHASE3-SUPABASE.md pour le script complet]

### 4️⃣ Configurer les variables
Créez `.env.local` à la racine:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-key-here
```

### 5️⃣ Redémarrer
```bash
npm run dev
```

---

## 📁 Fichiers Créés

```
src/
├── config/
│   └── supabase.js                 # Configuration Supabase
├── hooks/
│   └── useSupabaseState.js         # Hooks personnalisés
├── components/
│   └── SyncStatus.jsx              # Indicateur de sync
└── utils/
    └── MIGRATION-GUIDE.js          # Guide complet de migration

.env.example                         # Template de configuration
PHASE3-SUPABASE.md                  # Documentation complète
```

---

## 🎮 Utilisation des Hooks

### Approche recommandée (avec fallback localStorage)
```javascript
import { useSupabaseStateWithFallback } from './hooks/useSupabaseState';

function MyComponent() {
  const [classes, setClasses, isLoading, usesFallback] = useSupabaseStateWithFallback(
    'classes',
    []
  );

  if (isLoading) return <div>Chargement...</div>;
  if (usesFallback) return <div>Mode local</div>;

  return <div>{classes.length} classes</div>;
}
```

### Approche directe Supabase (sans fallback)
```javascript
import { useSupabaseState } from './hooks/useSupabaseState';

function MyComponent() {
  const [classes, setClasses, isLoading] = useSupabaseState('classes', []);
  // ...
}
```

---

## ✨ Fonctionnalités Implémentées

### ✅ Synchronisation Temps Réel
Les changements sont propagés à tous les clients en temps réel via Supabase Realtime.

### ✅ Fallback Automatique
Si Supabase n'est pas disponible, l'app bascule automatiquement sur localStorage.

### ✅ Indicateur de Statut
Un petit badge affiche:
- 🟢 **Cloud** = Synchronisé avec Supabase
- 🟡 **Local** = Mode offline, données locales

### ✅ Optimistic Updates
Les données sont mises à jour immédiatement dans l'UI, puis synchronisées en arrière-plan.

### ✅ Persistance Multi-Appareil
Une fois Supabase configuré, les données sont accessibles depuis n'importe quel appareil/navigateur.

---

## 🔄 Migration Progressive

La meilleure approche est de migrer progressivement:

### Jour 1: Configuration
- [ ] Créer compte Supabase
- [ ] Configurer les variables d'environnement
- [ ] Tester la connexion

### Jour 2: Petits données
- [ ] Migrer: schoolInfo
- [ ] Migrer: appColors
- [ ] Tester chaque migration

### Jour 3: Données principales
- [ ] Migrer: classes
- [ ] Migrer: students
- [ ] Migrer: subjects

### Jour 4: Données complexes
- [ ] Migrer: grades
- [ ] Migrer: users
- [ ] Migrer: activities

---

## 🐛 Dépannage

### "VITE_SUPABASE_URL not found"
```bash
# Créez .env.local avec vos clés Supabase
echo "VITE_SUPABASE_URL=..." > .env.local
echo "VITE_SUPABASE_ANON_KEY=..." >> .env.local
```

### "relation 'app_data' does not exist"
```bash
# Exécutez le script SQL dans Supabase → SQL Editor
# Voir PHASE3-SUPABASE.md
```

### Les données ne se synchronisent pas
```javascript
// Vérifiez la console:
// 1. F12 → Console
// 2. Cherchez les erreurs Supabase
// 3. Vérifiez que Realtime est activé
```

---

## 📊 Avantages

| Avant (localStorage) | Après (Supabase) |
|-------------------|------------------|
| Données locales | ☁️ Cloud |
| Un appareil | 🌍 Partout |
| Pas de sync | ⚡ Temps réel |
| Perte de données | 🔒 Sauvegardé |
| Manual backup | 🤖 Auto backup |

---

## 🔐 Sécurité

Les variables sensibles sont protégées:
- ✅ `.env.local` dans `.gitignore`
- ✅ `VITE_SUPABASE_ANON_KEY` est public par design
- ✅ Configurer RLS policies dans Supabase pour les données sensibles

---

## 📚 Documentation

- [PHASE3-SUPABASE.md](./PHASE3-SUPABASE.md) - Setup complet
- [MIGRATION-GUIDE.js](./src/utils/MIGRATION-GUIDE.js) - Exemples de code
- [useSupabaseState.js](./src/hooks/useSupabaseState.js) - Documentation des hooks

---

## 🚀 Prochaines Étapes

1. ✅ Installation et configuration de base
2. ⏳ **Setup Supabase** (À faire maintenant)
3. 🔄 Migration App.jsx
4. 🧪 Tests de synchronisation
5. 🔐 Mise en place RLS
6. 🚀 Déploiement en production

---

## 💡 Tips & Tricks

### Nettoyer localStorage après migration
```javascript
// Dans la console du navigateur:
localStorage.clear();
```

### Vérifier les données dans Supabase
```javascript
// Allez dans: Dashboard Supabase → Tables → app_data
```

### Activer le mode debug
```javascript
// Dans src/config/supabase.js:
supabase.debug();
```

---

**Status global**: 🟡 En attente de configuration Supabase par l'utilisateur

Besoin d'aide? Consultez les fichiers de documentation! 📖
