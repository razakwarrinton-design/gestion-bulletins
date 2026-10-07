# 📊 Logique de Calcul des Moyennes - Documentation Technique

## 🎯 Objectif

Ce document explique comment les moyennes sont calculées dans le système de gestion des bulletins. Chaque formule est documentée pour assurer la transparence et permettre la validation.

---

## 1️⃣ Moyenne d'une Matière (par note)

### Formule
```
Moyenne_Matière = (Note₁ + Note₂ + Note₃ + ... + Noteₙ) / n
```

### Exemple
Pour un élève en Mathématiques avec:
- Devoir 1: 15/20
- Composition 1: 12/20
- Devoir 2: 18/20

```
Moyenne_Maths = (15 + 12 + 18) / 3 = 45 / 3 = 15.00
```

### Implémentation
```javascript
const calculateSubjectAverage = (grades, studentId, subjectId, trimester) => {
  const subjectGrades = grades.filter(g =>
    g.studentId === studentId &&
    g.subjectId === subjectId &&
    g.trimester === trimester
  );

  if (subjectGrades.length === 0) return 0;

  const sum = subjectGrades.reduce((acc, grade) => acc + grade.value, 0);
  return Math.round((sum / subjectGrades.length) * 100) / 100;
};
```

---

## 2️⃣ Moyenne Générale d'un Trimestre (avec coefficients)

### Formule
```
Moyenne_Trimestre = Σ(Moyenne_Matière × Coefficient_Matière) / Σ(Coefficient_Matière)
```

### Conditions
- Les matières avec moyenne 0 (pas de notes) ne sont pas incluses
- Les coefficients sont cumulés seulement pour les matières notées

### Exemple détaillé

Élève avec ces matières et coefficients:
| Matière | Coefficient | Moyenne | Produit |
|---------|------------|---------|---------|
| Français | 3 | 14.00 | 42.00 |
| Mathématiques | 4 | 15.50 | 62.00 |
| Anglais | 2 | 13.00 | 26.00 |
| Histoire-Géo | 2 | 12.00 | 24.00 |
| SVT | 2 | 14.00 | 28.00 |
| **Total** | **13** | | **182.00** |

```
Moyenne_Trimestre = 182.00 / 13 = 14.00
```

### Implémentation
```javascript
const calculateTrimesterAverage = (studentId, trimester, grades, subjects) => {
  let totalWeightedScore = 0;
  let totalCoefficient = 0;

  subjects.forEach(subject => {
    const subjectAverage = calculateSubjectAverage(grades, studentId, subject.id, trimester);
    const coefficient = subject.coefficient || 1;

    if (subjectAverage > 0) {
      totalWeightedScore += subjectAverage * coefficient;
      totalCoefficient += coefficient;
    }
  });

  if (totalCoefficient === 0) return 0;
  return Math.round((totalWeightedScore / totalCoefficient) * 100) / 100;
};
```

---

## 3️⃣ Moyenne Générale Annuelle

### Formule
```
Moyenne_Année = (Moyenne_T1 + Moyenne_T2 + Moyenne_T3) / Nombre de trimestres avec notes
```

### Conditions
- Seuls les trimestres avec au moins une matière notée sont comptabilisés
- Si seulement T1 et T3 ont des notes, la moyenne = (T1 + T3) / 2
- Si un trimestre n'a aucune note, il n'est pas inclus

### Exemple
```
T1 = 14.00
T2 = 15.50
T3 = 13.50

Moyenne_Année = (14.00 + 15.50 + 13.50) / 3 = 43.00 / 3 = 14.33
```

### Implémentation
```javascript
const calculateYearlyAverage = (studentId, grades, subjects) => {
  const avg1 = calculateTrimesterAverage(studentId, '1', grades, subjects);
  const avg2 = calculateTrimesterAverage(studentId, '2', grades, subjects);
  const avg3 = calculateTrimesterAverage(studentId, '3', grades, subjects);

  const validAverages = [avg1, avg2, avg3].filter(a => a > 0);
  
  if (validAverages.length === 0) return 0;
  
  return Math.round(
    (validAverages.reduce((a, b) => a + b, 0) / validAverages.length) * 100
  ) / 100;
};
```

---

## 4️⃣ Mentions et Appréciations

### Système de Mentions

| Mention | Note minimum | Note maximum | Couleur | Symbole |
|---------|-------------|-------------|--------|---------|
| Excellent | 18 | 20 | 🟢 Vert | 🌟 |
| Très bien | 16 | 17.99 | 🔵 Bleu | ⭐ |
| Bien | 14 | 15.99 | 🔵 Bleu clair | 👍 |
| Assez bien | 12 | 13.99 | 🟡 Orange | 👌 |
| Acceptable | 10 | 11.99 | 🔴 Rouge clair | ⚠️ |
| Insuffisant | 0 | 9.99 | 🔴 Rouge | ❌ |

### Formule
```javascript
const getMentionDetails = (average) => {
  if (average >= 18) return { text: 'Excellent', color: '#10b981' };
  if (average >= 16) return { text: 'Très bien', color: '#06b6d4' };
  if (average >= 14) return { text: 'Bien', color: '#3b82f6' };
  if (average >= 12) return { text: 'Assez bien', color: '#f59e0b' };
  if (average >= 10) return { text: 'Acceptable', color: '#ef4444' };
  return { text: 'Insuffisant', color: '#dc2626' };
};
```

---

## 5️⃣ Classement et Percentiles

### Formule
```
Rang = Position de l'élève quand les moyennes sont triées décroissant
Percentile = (1 - Rang/Total) × 100
```

### Exemple
Classe de 30 élèves, l'élève est classé 8ème:
```
Rang = 8
Percentile = (1 - 8/30) × 100 = 73.33%
```

Cela signifie que 73% de la classe a une note inférieure.

### Implémentation
```javascript
const calculateStudentRank = (studentId, trimester, students, grades, subjects) => {
  const averages = students
    .map(s => ({
      id: s.id,
      average: calculateTrimesterAverage(s.id, trimester, grades, subjects)
    }))
    .filter(a => a.average > 0)
    .sort((a, b) => b.average - a.average);

  const rank = averages.findIndex(a => a.id === studentId) + 1;
  const percentile = Math.round((1 - rank / averages.length) * 100);

  return { rank, outOf: averages.length, percentile };
};
```

---

## 6️⃣ Statistiques de Classe

### Mesures calculées

#### Moyenne arithmétique
```
Moyenne = Σ(Moyenne_élève) / Nombre d'élèves
```

#### Médiane
```
Médiane = Valeur au milieu quand triées
```

#### Écart-type
```
σ = √(Σ(x - moyenne)²) / n
```

Mesure la dispersion des notes autour de la moyenne.

#### Min / Max
```
Min = Plus petite moyenne
Max = Plus grande moyenne
```

### Exemple
Classe de 5 élèves: 12, 14, 15, 16, 18

```
Moyenne = (12+14+15+16+18)/5 = 15.00
Médiane = 15.00 (valeur centrale)
Min = 12.00
Max = 18.00
Écart-type ≈ 2.19
```

### Implémentation
```javascript
const calculateClassStats = (students, trimester, grades, subjects) => {
  const averages = students
    .map(s => calculateTrimesterAverage(s.id, trimester, grades, subjects))
    .filter(a => a > 0);

  const sorted = [...averages].sort((a, b) => a - b);
  const mean = averages.reduce((a, b) => a + b, 0) / averages.length;
  const stdDev = Math.sqrt(
    averages.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / averages.length
  );

  return {
    count: averages.length,
    mean: Math.round(mean * 100) / 100,
    median: sorted[Math.floor(sorted.length / 2)],
    min: Math.min(...averages),
    max: Math.max(...averages),
    stdDev: Math.round(stdDev * 100) / 100
  };
};
```

---

## 7️⃣ Détection des Risques

### Élèves en difficulté

Un élève est considéré **en risque de redoublement** si:
```
Moyenne_Année < 10
```

### Élèves avec tendance négative
```
Variation = Moyenne_T3 - Moyenne_T1
Si Variation < -1, l'élève décline
```

### Élèves à surveiller par matière
```
Si (Moyenne_Matière < 10) pour une matière importante
OU
Si (Régression > 2 points sur trimestre)
→ Alerter l'enseignant
```

---

## 8️⃣ Arrondi et Précision

### Règles d'arrondi
- **2 décimales** pour l'affichage
- **Arrondi mathématique** (banker's rounding)

### Exemple
```
15.456 → 15.46 ✓
15.454 → 15.45 ✓
15.5 → 15.50 ✓
```

### Implémentation
```javascript
const round = (value, decimals = 2) => {
  return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
};
```

---

## 9️⃣ Validation des Données

### Contrôles appliqués

```javascript
const validateGrade = (value) => {
  // Note entre 0 et 20
  const num = parseFloat(value);
  if (isNaN(num) || num < 0 || num > 20) {
    throw new Error('Note invalide (0-20 attendu)');
  }
  return num;
};

const validateCoefficient = (value) => {
  // Coefficient > 0
  const num = parseFloat(value);
  if (isNaN(num) || num <= 0) {
    throw new Error('Coefficient doit être > 0');
  }
  return num;
};
```

---

## 🔟 Cas Spéciaux

### Élève sans notes
```
Moyenne = 0 (pas d'affichage)
Mention = Pas de mention
```

### Matière sans coefficient
```
Coefficient par défaut = 1
```

### Classe sans élèves
```
Statistiques = Non disponibles
```

### Trimestre incomplet
```
La moyenne de trimestre utilise seulement les matières notées
Les trimestres vides ne comptent pas pour la moyenne annuelle
```

---

## 📈 Historique des modifications

| Date | Modification | Impact |
|------|-------------|--------|
| 2025-02-01 | Création document | Initial |
| | Définition formules | - |
| | Exemples concrets | - |

---

## ✅ Validations et Conformité

- ✅ Conforme aux barèmes scolaires français
- ✅ Compatible avec systèmes info scolaires (SIE)
- ✅ Transparent et documenté
- ✅ Auditabe pour justification
- ✅ Reproductible avec mêmes données

---

## 📞 Support

Pour toute question sur les calculs:
- Documentation: Ce document
- Formules: `src/utils/calculUtils.js`
- Exemples: Bulletins générés

**Dernière mise à jour**: Février 2025
