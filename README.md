# Gestion des Bulletins

Application web de gestion scolaire : notes, moyennes, bulletins imprimables, suivi des absences et paiements, portail parents.

**Stack :** React 19 · Vite · Tailwind CSS 4 · Supabase (auth, base de données, RLS) · Recharts

## Démarrage

```bash
npm install
cp .env.example .env.local   # puis renseigner les clés Supabase
npm run dev
```

| Commande | Rôle |
|---|---|
| `npm run dev` | Serveur de développement |
| `npm run build` | Build de production |
| `npm test` | Tests unitaires (Vitest) |
| `npm run lint` | ESLint |

## Fonctionnalités

- Classes, élèves, matières et coefficients
- Saisie des notes, moyennes pondérées, mentions, classement
- Bulletins imprimables, appréciations (enseignant, conseil de classe, assistant IA)
- Envoi des résultats d'un élève au parent par WhatsApp (lien pré-rempli, sans clé API)
- Paiement des frais de scolarité par Mobile Money (Moov Money/Flooz, T-Money, MTN, Wave, Orange) via FedaPay
- Absences, SMS, messagerie
- Rôles : Admin, Professeur, Secrétaire, Parent (double authentification disponible)
- Portail parents, mode sombre, interface multilingue, PWA

## Structure

```
src/
  components/   Écrans et composants (GradesForm, PrintPreview, ParentPortal…)
  hooks/        Accès aux données et état (useGrades, useStudents, useSupabaseAuth…)
  services/     Paiements, SMS, chat
  utils/        Calculs de moyennes, mentions, élèves (testés)
  config/       Client Supabase
sql/            Schéma Supabase, politiques RLS, tables du chat
docs/           Guides de configuration, déploiement, sécurité, roadmap
supabase/       Fonctions edge
```

## Base de données

Exécuter dans l'éditeur SQL de Supabase, dans cet ordre :
1. `sql/supabase-schema.sql`
2. **`sql/grades-alignment.sql`** : ajoute à la table `grades` l'année scolaire, les sous-notes (interro, devoir, composition), le bonus et l'enseignant, autorise une note effacée et limite les notes à 0–20. **À exécuter avant de déployer cette version de l'application** : elle lit la colonne `bonus`, et sans ce script le chargement des notes échoue. Ré-exécutable ; les notes existantes sont rattachées à 2024-2025 (modifiable dans le script)
3. `sql/supabase-security-rls.sql`
4. `sql/CHAT_TABLES.sql`
5. `sql/students-profile.sql` : profil élève (contact d'urgence, date de naissance…), nécessaire pour enregistrer ces champs et pour l'envoi WhatsApp
6. `sql/payments-online.sql` : paiements Mobile Money (voir [docs/PAIEMENTS.md](docs/PAIEMENTS.md))
7. `sql/bulletin-access.sql` : accès des parents au bulletin (débloqué automatiquement par un paiement terminé)
8. **`sql/security-hardening.sql`** : règles d'accès (un parent ne voit que ses enfants, comptes inscrits « en attente » jusqu'à validation). **Obligatoire avant toute mise en service**, voir [docs/SECURITE.md](docs/SECURITE.md)

Ensuite, créer le premier administrateur (voir [docs/SECURITE.md](docs/SECURITE.md)). Les autres comptes s'inscrivent
eux-mêmes et sont validés par l'administrateur dans le menu *Utilisateurs*.

Détails : [docs/GUIDE-SUPABASE-CONFIGURATION.md](docs/GUIDE-SUPABASE-CONFIGURATION.md).

## Calcul des moyennes

La moyenne d'un trimestre est la moyenne des notes pondérées par le coefficient de chaque matière.
Une note non saisie est ignorée ; une note de 0 compte. Voir [docs/CALCUL-MOYENNES.md](docs/CALCUL-MOYENNES.md).

## Documentation

- [Déploiement](docs/DEPLOYMENT-GUIDE.md)
- [Portail parents](docs/SETUP-PARENT-PORTAL.md)
- [Roadmap](docs/ROADMAP.md) · [Plan d'amélioration](docs/PLAN-AMELIORATIONS.md)
