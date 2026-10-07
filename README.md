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
2. `sql/supabase-security-rls.sql`
3. `sql/CHAT_TABLES.sql`
4. `sql/students-profile.sql` : profil élève (contact d'urgence, date de naissance…), nécessaire pour enregistrer ces champs et pour l'envoi WhatsApp
5. `sql/payments-online.sql` : paiements Mobile Money (voir [docs/PAIEMENTS.md](docs/PAIEMENTS.md))

Détails : [docs/GUIDE-SUPABASE-CONFIGURATION.md](docs/GUIDE-SUPABASE-CONFIGURATION.md) et
[docs/SECURITE-RLS-RESUME.md](docs/SECURITE-RLS-RESUME.md).

## Calcul des moyennes

La moyenne d'un trimestre est la moyenne des notes pondérées par le coefficient de chaque matière.
Une note non saisie est ignorée ; une note de 0 compte. Voir [docs/CALCUL-MOYENNES.md](docs/CALCUL-MOYENNES.md).

## Documentation

- [Déploiement](docs/DEPLOYMENT-GUIDE.md)
- [Portail parents](docs/SETUP-PARENT-PORTAL.md)
- [Roadmap](docs/ROADMAP.md) · [Plan d'amélioration](docs/PLAN-AMELIORATIONS.md)
