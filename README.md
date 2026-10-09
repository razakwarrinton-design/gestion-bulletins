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
9. `sql/appreciations-activities.sql` : appréciations et journal d'activité dans des tables (une ligne par élément) au lieu d'un bloc partagé que deux utilisateurs pouvaient s'écraser ; reprend les données existantes. **À exécuter avant de déployer cette version.** À lancer après `security-hardening.sql`
10. `sql/audit-log.sql` : journal d'audit tenu par la base (qui a créé, modifié ou supprimé quoi), lisible par les administrateurs dans le menu *Journal d'audit*. À exécuter après `security-hardening.sql`

### Créer le premier administrateur

Aucun compte n'est fourni (la page de connexion n'affiche plus de comptes de démonstration). Les inscriptions
publiques sont « en attente » et n'ont accès à rien : le premier administrateur se promeut donc par SQL.

1. Dans l'application, **Créer un compte** avec votre e-mail (si le projet Supabase exige la confirmation de
   l'adresse, ouvrir d'abord le message reçu). L'écran « Compte en attente de validation » est normal.
2. Dans l'éditeur SQL de Supabase :
   ```sql
   UPDATE public.user_profiles SET role = 'admin' WHERE email = 'votre.adresse@exemple.com';
   ```
3. Se reconnecter : tous les écrans, dont *Utilisateurs*, sont accessibles.

Les autres comptes s'inscrivent eux-mêmes et sont validés par l'administrateur dans le menu *Utilisateurs*
(voir aussi [docs/SECURITE.md](docs/SECURITE.md)).

### Base de démonstration créée avec des identifiants `uuid`

Les scripts créent les tables avec des identifiants numériques et ne remplacent pas une table déjà
présente (`CREATE TABLE IF NOT EXISTS`). Une base dont les tables métier (élèves, classes, notes…) ont des
identifiants `uuid` fait échouer l'installation. Si ses données peuvent être perdues, exécuter
`sql/reset-legacy-schema.sql` (⚠️ destructif : il conserve seulement les comptes, leurs rôles et `app_data`),
puis toute la chaîne d'installation ci-dessus. Cette procédure est testée dans
`sql/__tests__/legacy-uuid-install.test.js` sur un schéma reconstitué (noms et types de colonnes uniquement).

### Mettre à jour une installation existante

Les scripts d'installation sont ré-exécutables. Pour passer une base déjà en service à cette version :

1. **Sauvegarder, ou tester sur une branche Supabase** : ces scripts modifient des tables en place.
2. Vérifier les contraintes actuelles de `grades` (une base modifiée à la main peut différer des scripts du dépôt) :
   `select conname, pg_get_constraintdef(oid) from pg_constraint where conrelid = 'public.grades'::regclass;`
3. Exécuter, **dans cet ordre** : `grades-alignment.sql` → `security-hardening.sql` → `appreciations-activities.sql` → `audit-log.sql`.
4. Déployer l'application, puis les fonctions Edge (voir ci-dessous).

`security-hardening.sql` doit être relancé : `child_class_rank` (rang de l'enfant dans sa classe) prend maintenant
l'année scolaire en paramètre. Ce script **supprime puis recrée toutes les règles d'accès** des tables `user_profiles`,
`app_data`, `classes`, `subjects`, `students`, `grades`, `activities` et `absences` : une règle ajoutée à la main dans le
tableau de bord Supabase sur l'une d'elles sera perdue. Notez-les avant, et recréez-les ensuite si elles sont nécessaires.

Ce que ces scripts changent pour les utilisateurs : les notes existantes sont rattachées à l'année 2024-2025 (modifiable
dans `grades-alignment.sql`) ; les appréciations et le journal d'activité sont copiés dans leurs nouvelles tables (les
anciennes données restent dans `app_data`) ; les appréciations reprises n'ont pas d'auteur connu, donc tout professeur
peut encore les modifier, alors que les nouvelles ne sont modifiables que par leur auteur et l'administrateur ; le
journal d'audit commence à l'exécution de `audit-log.sql` (il ne reconstitue pas l'historique passé).

### Migrations (Supabase CLI)

`supabase/migrations/20261009000000_baseline.sql` est l'état de la base obtenu en exécutant les scripts 1 à 10 :
il est **généré** (`npm run sql:baseline`) et un test échoue s'il n'est plus à jour. Pour suivre les évolutions du
schéma avec la CLI, au lieu de coller des scripts dans l'éditeur SQL :

1. `supabase init` (crée `supabase/config.toml`, sans toucher aux fichiers existants), puis `supabase link --project-ref <réf>`.
2. **Base déjà installée** : déclarer la référence comme appliquée, sans la rejouer :
   `supabase migration repair --status applied 20261009000000`. Ne pas faire `supabase db push` avant : il rejouerait
   `security-hardening.sql`, qui supprime puis recrée les règles d'accès (voir plus haut).
   **Base vide** : `supabase db push` l'installe.
3. Toute évolution suivante = une **nouvelle** migration (`supabase migration new <nom>`), jamais une modification
   de la référence ni un changement fait à la main dans le tableau de bord.

Cela ne protège de la dérive de la base (comme celle des identifiants `uuid` rencontrée plus haut) que si les
changements passent par ces fichiers.

### Sauvegardes

Le plan gratuit de Supabase ne propose pas de sauvegarde téléchargeable. Avant toute migration, et régulièrement :
- **Tableau de bord → Table Editor → table → Export → CSV** (au minimum `students`, `classes`, `subjects`, `grades`, `absences`, `payments`, `user_profiles`) ;
- ou, avec la CLI : `supabase db dump --linked -f sauvegarde.sql` (structure) et `supabase db dump --linked --data-only -f donnees.sql`.

Ces exports permettent de retrouver les données ; la restauration est une opération à part (réimport des CSV ou
`psql -f`). L'écran *Import / Export* de l'application exporte les notes d'une classe en Excel, ce qui ne remplace
pas une sauvegarde complète de la base.

Détails : [docs/GUIDE-SUPABASE-CONFIGURATION.md](docs/GUIDE-SUPABASE-CONFIGURATION.md).

## Fonctions Edge (Supabase)

| Fonction | Rôle | Secrets à définir |
|---|---|---|
| `create-parent-account` | Création d'un compte parent par l'administrateur | (fournis par la plateforme) |
| `payment-initiate`, `payment-webhook` | Paiement Mobile Money via FedaPay ([docs/PAIEMENTS.md](docs/PAIEMENTS.md)) | `FEDAPAY_SECRET_KEY`, `FEDAPAY_ENV`, `APP_URL` |
| `send-sms` | SMS via Africa's Talking, réservé à l'administrateur et au secrétariat | `AT_USERNAME`, `AT_API_KEY`, `AT_ENV` (`sandbox` ou `production`), `AT_SENDER_ID` (facultatif) |
| `generate-appreciation` | Appréciation de bulletin rédigée par une IA, réservée à l'administrateur et aux professeurs | `AI_API_KEY`, `AI_MODEL`, `AI_BASE_URL` (service compatible avec l'API « chat completions ») |

Déploiement : `supabase functions deploy <nom>`, puis `supabase secrets set NOM=valeur …`. Tant qu'une fonction
n'est pas déployée et configurée, le bouton correspondant affiche un message explicite (« n'est pas déployée »,
« n'est pas configurée ») : aucun envoi n'est simulé.

`generate-appreciation` ne transmet au service d'IA que le prénom de l'élève, ses notes par matière, le trimestre
et la moyenne de classe (liste blanche côté serveur : jamais le nom de famille, la date de naissance, les contacts
ni la photo). La clé du service reste dans les secrets Supabase, jamais dans le navigateur. Le fournisseur et le
modèle se choisissent par les secrets ; les tests (`supabase/functions/_shared/appreciation*.test.ts`) simulent le
fournisseur : la fonction n'a pas été appelée contre un vrai service.

Le bouton « Notifier les parents » (écran de saisie des notes) appelle `notify-parents`, qui **n'existe pas** :
le projet n'a ni service d'envoi d'e-mails, et les seuls numéros disponibles sont les contacts d'urgence des élèves
(un SMS payant vers de vraies personnes). Le canal (e-mail, SMS ou notification dans l'application) est à choisir
avant de l'écrire ; d'ici là le bouton affiche que la fonction n'est pas déployée.

## Calcul des moyennes

La moyenne d'un trimestre est la moyenne des notes pondérées par le coefficient de chaque matière.
Une note non saisie est ignorée ; une note de 0 compte. Voir [docs/CALCUL-MOYENNES.md](docs/CALCUL-MOYENNES.md).

## Documentation

- [Déploiement](docs/DEPLOYMENT-GUIDE.md)
- [Portail parents](docs/SETUP-PARENT-PORTAL.md)
- [Roadmap](docs/ROADMAP.md) · [Plan d'amélioration](docs/PLAN-AMELIORATIONS.md)
