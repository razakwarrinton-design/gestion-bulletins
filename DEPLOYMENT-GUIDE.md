# 🚀 Guide de Déploiement avec Supabase

## Architecture Déployée

```
┌─────────────────────────────────────────────────────────┐
│          Navigateurs (Chrome, Firefox, Safari)          │
│  - React Application (SPA)                              │
│  - localStorage comme cache local                       │
└────────────┬────────────────────────────────────────────┘
             │ HTTPS
             ↓
┌─────────────────────────────────────────────────────────┐
│          Supabase (Backend)                              │
│  ├─ PostgreSQL Database                                 │
│  ├─ Realtime Subscriptions                              │
│  ├─ Row Level Security (RLS)                            │
│  ├─ API REST                                            │
│  └─ Authentication                                      │
└─────────────────────────────────────────────────────────┘
```

## 📋 Checklist de Déploiement

### Avant le déploiement
- [ ] Configuration Supabase complète
- [ ] Variables d'environnement définies
- [ ] Tests locaux en mode production
- [ ] Backup des données localStorage
- [ ] RLS policies configurées
- [ ] Authentification testée

### Déploiement
- [ ] Build de production: `npm run build`
- [ ] Vérifier dist/ folder
- [ ] Déployer sur hosting (Vercel, Netlify, etc.)
- [ ] Vérifier les variables d'env en production
- [ ] Tester toutes les fonctionnalités
- [ ] Monitoring activé

### Après déploiement
- [ ] Surveiller les erreurs
- [ ] Vérifier les logs Supabase
- [ ] Performance monitoring
- [ ] User feedback

---

## 🌐 Options de Déploiement

### Option 1: Vercel (Recommandé - Plus facile)

```bash
# 1. Installer Vercel CLI
npm i -g vercel

# 2. Connecter le projet
vercel login
vercel link

# 3. Ajouter les variables d'environnement
vercel env add VITE_SUPABASE_URL
vercel env add VITE_SUPABASE_ANON_KEY

# 4. Déployer
vercel

# 5. Surveiller
vercel logs
```

### Option 2: Netlify

```bash
# 1. Installer Netlify CLI
npm i -g netlify-cli

# 2. Connecter le projet
netlify login
netlify link

# 3. Configuration netlify.toml
cat > netlify.toml << EOF
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[env]
  VITE_SUPABASE_URL = ""
  VITE_SUPABASE_ANON_KEY = ""
EOF

# 4. Ajouter les variables
netlify env:set VITE_SUPABASE_URL "..."
netlify env:set VITE_SUPABASE_ANON_KEY "..."

# 5. Déployer
netlify deploy --prod
```

### Option 3: Docker + Railway (Auto-scaling)

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000
CMD ["npm", "run", "preview"]
```

```bash
# Déployer sur Railway
railway link
railway env VITE_SUPABASE_URL "..."
railway env VITE_SUPABASE_ANON_KEY "..."
railway deploy
```

---

## 🔐 Configuration Sécurité Production

### 1. Variables d'environnement
```env
# Production .env
VITE_SUPABASE_URL=https://xyz.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ0eXAi...  # Clé publique OK
```

### 2. Supabase RLS Policies

```sql
-- Authentification obligatoire
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE grades ENABLE ROW LEVEL SECURITY;

-- Admin voient tout
CREATE POLICY "admin_read_all" ON users
  FOR SELECT USING (auth.jwt() ->> 'role' = 'admin');

-- Professeurs voient leurs classes
CREATE POLICY "teacher_classes" ON classes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE auth.uid() = users.id
      AND users.role = 'professeur'
    )
  );

-- Secrétaire voit les élèves
CREATE POLICY "secretaire_children" ON students
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE auth.uid() = users.id
      AND users.role = 'secretaire'
    )
  );
```

### 3. Headers de sécurité

Vercel configure automatiquement les headers CORS. Pour Netlify:

```toml
# netlify.toml
[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "SAMEORIGIN"
    X-Content-Type-Options = "nosniff"
    X-XSS-Protection = "1; mode=block"
    Referrer-Policy = "strict-origin-when-cross-origin"
```

---

## 📊 Monitoring & Observabilité

### Supabase Logs
```bash
# Logs en temps réel
supabase logs --follow

# Erreurs
supabase logs --error
```

### Google Analytics (Optionnel)
```javascript
// src/main.jsx
import ReactGA from 'react-ga';

ReactGA.initialize('GA_TRACKING_ID');
```

### Error Tracking (Sentry)
```javascript
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: "https://key@sentry.io/project",
  environment: "production"
});
```

---

## 🔄 Continuous Deployment (GitHub)

### Avec Vercel

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      
      - run: npm install
      - run: npm run build
      
      - uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
```

---

## 📈 Performance

### Build size optimization
```javascript
// vite.config.js
export default {
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'supabase': ['@supabase/supabase-js'],
          'lucide': ['lucide-react']
        }
      }
    },
    chunkSizeWarningLimit: 1000
  }
}
```

### Image optimization
```html
<!-- Utiliser Supabase Storage -->
<img src="https://xyz.supabase.co/storage/v1/object/public/avatars/user.jpg" />
```

### Caching headers
```toml
# netlify.toml
[[headers]]
  for = "/assets/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"

[[headers]]
  for = "/*.html"
  [headers.values]
    Cache-Control = "public, max-age=0, must-revalidate"
```

---

## 🚨 Troubleshooting

### Problème: VITE_SUPABASE_URL non défini
```bash
# Vérifier les variables d'env
vercel env ls

# Redéployer
vercel redeploy
```

### Problème: CORS errors
```javascript
// src/config/supabase.js
export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  {
    db: { schema: 'public' },
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  }
);
```

### Problème: Données pas synchronisées
1. Vérifier la connexion Supabase
2. Vérifier les RLS policies
3. Vérifier les logs Supabase
4. Vérifier la console du navigateur

---

## 💾 Backup & Restore

### Backup Supabase
```bash
# Export CSV
pg_dump -U postgres -d your_db > backup.sql

# Cloud backup (automatique)
# https://supabase.com/dashboard/project/[id]/settings/backups
```

### Restore
```bash
# Restaurer depuis SQL
psql -U postgres -d your_db < backup.sql

# Ou utiliser le dashboard Supabase
```

---

## 📞 Support & Ressources

- **Supabase Docs**: https://supabase.com/docs
- **Vercel Docs**: https://vercel.com/docs
- **React Deploy Guide**: https://vitejs.dev/guide/ssr.html

---

## ✅ Checklist Final

- [x] Application fonctionne en local
- [x] Build de production validé
- [x] Variables d'env configurées
- [x] Supabase database prêt
- [x] RLS policies en place
- [x] Tests en production
- [x] Monitoring activé
- [x] Backup strategy définie
- [x] Documentation mise à jour
- [x] Équipe formée

**🎉 Prêt à déployer!**
