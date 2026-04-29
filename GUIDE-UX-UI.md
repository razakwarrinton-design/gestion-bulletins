# 🎨 Guide UX/UI - Système de Gestion des Bulletins

## 🎯 Principes de Design

### Accessibilité
- ✅ Contraste minimum 4.5:1 pour le texte
- ✅ Tous les éléments interactifs accessibles au clavier
- ✅ Icônes avec labels textuels
- ✅ Support des lecteurs d'écran

### Responsive
- ✅ Mobile-first approach
- ✅ Breakpoints: 320px, 768px, 1024px, 1280px
- ✅ Touch targets minimum 44px × 44px
- ✅ Adaptation des colonnes

### Cohérence
- ✅ Design system unifié
- ✅ Couleurs standardisées
- ✅ Typographie hiérarchisée
- ✅ Spacing et padding réguliers

---

## 🎨 Palette de Couleurs

### Couleurs principales
```
Primaire:       #2563eb (Bleu)
Secondaire:     #10b981 (Vert)
Accent:         #f59e0b (Orange)
Danger:         #ef4444 (Rouge)
Warning:        #f59e0b (Orange)
Info:           #06b6d4 (Cyan)
Success:        #10b981 (Vert)
```

### Mentions scolaires
```
Excellent:      #10b981 (Vert)      🌟
Très bien:      #06b6d4 (Cyan)      ⭐
Bien:           #3b82f6 (Bleu)      👍
Assez bien:     #f59e0b (Orange)    👌
Acceptable:     #ef4444 (Rouge)     ⚠️
Insuffisant:    #dc2626 (Rouge vif) ❌
```

### Backgrounds
```
Primary:        #f3f4f6 (Gris très clair)
Secondary:      #ffffff (Blanc)
Muted:          #e5e7eb (Gris clair)
Dark:           #1f2937 (Gris foncé)
```

---

## 📐 Typographie

### Hiérarchie

```
Titre principal (H1):  24px, 700, line-height: 32px
Titre section (H2):    20px, 700, line-height: 28px
Titre subsection (H3): 18px, 600, line-height: 26px
Titre card (H4):       16px, 600, line-height: 24px

Texte courant:         14px, 400, line-height: 20px
Texte petit:           12px, 400, line-height: 16px
Label:                 12px, 500, line-height: 16px
```

### Police
- **Titres**: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto
- **Corps**: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto

---

## 🧩 Composants Clés

### Boutons

#### Primaire
```
Style: Fond bleu plein
Texte: Blanc
Padding: 8px 16px
Border radius: 8px
Hover: Bleu plus foncé
Focus: Ring bleu
Disabled: Opacity 50%
```

#### Secondaire
```
Style: Fond gris
Texte: Gris foncé
Padding: 8px 16px
Border radius: 8px
Hover: Gris plus foncé
```

#### Danger
```
Style: Fond rouge
Texte: Blanc
Padding: 8px 16px
Border radius: 8px
Hover: Rouge plus foncé
```

### Formulaires

```
Input:
- Padding: 10px 12px
- Border: 1px gris léger
- Border radius: 6px
- Focus: Ring bleu, border bleu
- Font-size: 14px

Label:
- Font-size: 12px
- Font-weight: 500
- Margin-bottom: 8px
- Color: gris foncé

Erreur:
- Color: rouge
- Font-size: 12px
- Margin-top: 4px
```

### Cards

```
Style: Fond blanc, shadow subtle
Padding: 16px / 24px
Border radius: 8px
Border gauche: 4px (couleur)
Hover: Shadow renforcée
```

### Tables

```
Header:
- Background: gris très clair
- Font-weight: 600
- Font-size: 12px
- Padding: 12px
- Text-transform: uppercase
- Letter-spacing: 0.5px

Rows:
- Padding: 12px
- Border-bottom: 1px gris très clair
- Hover: Background gris léger

Alternating:
- Rows pairs: Blanc
- Rows impairs: Gris très clair
```

---

## 🎬 Animations

### Transitions
```
Standard:       150ms ease-out
Emphasis:       300ms cubic-bezier(0.4, 0, 0.2, 1)
Entrance:       200ms ease-out
Exit:           150ms ease-in
```

### Exemples
```
Bouton hover:    200ms, transform scale(1.02)
Modal entrée:    300ms, opacity + transform
Menu déroulant:  200ms, opacity + max-height
```

---

## 📱 Responsive Design

### Mobile (< 768px)
```
Layout: Stack vertical
Colonnes: 1
Padding: 16px
Font-size corps: 14px
Boutons: Full-width quand possible
Images: 100% width
```

### Tablet (768px - 1024px)
```
Layout: 2 colonnes
Colonnes: 2
Padding: 20px
Font-size: 14px
Grille: 12 colonnes
```

### Desktop (1024px+)
```
Layout: 3+ colonnes
Colonnes: 3+
Padding: 24px
Font-size: 14px
Max-width container: 1280px
```

---

## 🔄 Flux utilisateur par rôle

### Administrateur
```
Connexion → Dashboard → Gestion
├── Gestion des utilisateurs
├── Gestion des années scolaires
├── Gestion des paramètres
├── Export/Import
└── Historique d'activité
```

### Enseignant/Professeur
```
Connexion → Dashboard → Saisie notes
├── Saisir notes
├── Ajouter appréciations
├── Générer bulletins
└── Voir statistiques
```

### Secrétaire
```
Connexion → Dashboard → Gestion élèves
├── Ajouter/modifier élèves
├── Import en masse
├── Générer bulletins
├── Export PDF
└── Consultation
```

---

## 📊 Tableaux de bord par rôle

### Admin Dashboard
- Statistiques globales
- Utilisateurs actifs
- Activités récentes
- Santé du système
- Alertes

### Enseignant Dashboard
- Classes assignées
- Nombre d'élèves
- Notes à saisir
- Bulletins en attente
- Appréciations à valider

### Secrétaire Dashboard
- Élèves par classe
- Bulletins générés
- Exports en attente
- Absences/tardifs
- Calendrier scolaire

---

## ⚡ Performance & UX

### Optimisations
- ✅ Lazy loading des images
- ✅ Code splitting (routes)
- ✅ Compression assets
- ✅ Cache stratégique
- ✅ Pagination pour listes

### Targets
- First Contentful Paint: < 1.5s
- Largest Contentful Paint: < 2.5s
- Cumulative Layout Shift: < 0.1
- Time to Interactive: < 3s

---

## 🎯 Feedback utilisateur

### Notifications
```
Succès:         Vert, icône ✓, 3s auto-hide
Erreur:         Rouge, icône ✗, 5s auto-hide
Warning:        Orange, icône ⚠️, 4s auto-hide
Info:           Bleu, icône ℹ️, 3s auto-hide
```

### États de chargement
```
Skeleton loading pour listes
Spinner pour opérations
Progress bar pour imports
Toast pour confirmations
```

### Feedback de validation
```
Real-time validation avec icônes
Messages d'erreur contextuels
Suggestions d'amélioration
Confirmations pour actions critiques
```

---

## 🌓 Mode Sombre (Optionnel)

### Couleurs adaptées
```
Background:     #111827 (Noir gris)
Card:           #1f2937 (Gris foncé)
Text primaire:  #f3f4f6 (Blanc cassé)
Text secondaire:#d1d5db (Gris clair)
Borders:        #374151 (Gris)
```

---

## ♿ Accessibilité - WCAG 2.1 Level AA

### Contrastes
- Texte normal: 4.5:1
- Texte large: 3:1
- Composants UI: 3:1

### Keyboard Navigation
- Tab order logique
- Focus visible
- Shortcuts documentés
- Pas de piège au clavier

### Texte alternatif
- `alt` pour toutes images
- Labels pour inputs
- ARIA labels si nécessaire
- Descriptions pour diagrammes

### Structuration
- Hiérarchie correcte (H1 → H6)
- Listes sémantiques
- Landmarks (main, nav, etc.)
- Forms: labels associés

---

## 📱 Interactions Touch

### Tailles
- Boutons: 44px minimum
- Zones cliquables: 48px × 48px
- Espacement: 8px entre éléments
- Texte: 16px minimum

### Gestes
- Tap: Activation
- Double-tap: Zoom (si applicable)
- Swipe: Navigation
- Long-press: Menu contextuel

---

## 🎓 Patterns utilisateur

### Création d'élève
```
1. Form avec validation live
2. Vérification doublon
3. Upload photo (optionnel)
4. Confirmation
5. Toast succès
```

### Saisie notes
```
1. Sélection classe/matière
2. Grille notes éditable
3. Validation en temps réel
4. Auto-save
5. Confirmation bulk
```

### Génération bulletin
```
1. Sélection élève/trimestre
2. Aperçu
3. Téléchargement PDF
4. Partage (optionnel)
5. Archivage
```

---

## 🌍 Internationalisation

### Support langues
- Français
- Anglais
- (Arabe, Espagnol - v2.0)

### Dates et nombres
- Dates: dd/MM/yyyy
- Nombres: virgule décimale
- Devises: €

---

## 🧪 Tests UX

### Checklist avant release
- [ ] Mobile responsive (iOS + Android)
- [ ] Keyboard navigation complète
- [ ] Lecteur d'écran (NVDA, JAWS)
- [ ] Contraste minimal WCAG AA
- [ ] Performance Lighthouse > 90
- [ ] Pas de console errors
- [ ] Tous les states testés
- [ ] Formulaires valident correctement

---

## 📚 Ressources

### Design System
- Tailwind CSS v3
- Lucide Icons
- Recharts pour graphiques

### Tools
- Figma pour wireframes
- Storybook pour composants
- Lighthouse pour performance

---

**Dernière mise à jour**: Février 2025  
**Créateur**: Équipe produit
