# Sécurité et protection des données

L'application manipule des données d'**élèves mineurs** (identité, notes, absences, contacts, paiements).
Ce document décrit qui peut voir quoi, comment l'installer correctement et ce qui reste à surveiller.

## Qui voit quoi

| Donnée | Admin | Professeur | Secrétaire | Parent | Compte en attente |
|---|---|---|---|---|---|
| Élèves (identité, contact d'urgence) | tous | tous | tous | **ses enfants** | rien |
| Notes | tout | tout, saisie | lecture | **ses enfants** | rien |
| Absences | tout | tout, saisie | tout, saisie | **ses enfants** | rien |
| Paiements | tout | — | — | **ses enfants** (lecture) | rien |
| Classes, matières | tout | lecture | lecture | lecture | rien |
| Appréciations, journal d'activité | tout | selon clé | selon clé | **rien** | rien |
| Réglages de l'école (nom, logo, années) | tout | tout | tout | lecture | rien |
| Annuaire des comptes | tous | tous | tous | personnel seulement | son profil |
| Attribution des rôles | **oui** | non | non | non | non |

Ces règles sont appliquées **par la base de données** (RLS PostgreSQL), pas seulement par l'interface :
elles tiennent même si quelqu'un appelle directement l'API avec la clé publique du projet.
Elles sont vérifiées par `sql/__tests__/rls.test.js`, qui exécute les scripts SQL sur un vrai PostgreSQL.

## Installation

Exécuter dans l'éditeur SQL de Supabase, **dans cet ordre** :

1. `sql/supabase-schema.sql`
2. `sql/supabase-security-rls.sql`
3. `sql/CHAT_TABLES.sql`
4. `sql/students-profile.sql`
5. `sql/payments-online.sql`
6. **`sql/security-hardening.sql`** (toujours en dernier ; ré-exécutable)

Puis créer le premier administrateur : *Authentication → Users → Add user* (mot de passe fort et unique),
et le promouvoir :

```sql
UPDATE user_profiles SET role = 'admin' WHERE email = 'votre-adresse@exemple.com';
```

### Si l'application était déjà en service

`security-hardening.sql` change le comportement pour les comptes existants. Avant de l'exécuter :

- **Les comptes créés avant ce script gardent leur rôle.** Avant lui, l'inscription publique donnait le rôle
  « secrétaire » à n'importe qui. Passez en revue *Utilisateurs* et repassez en « en attente » tout compte que
  vous ne reconnaissez pas :
  ```sql
  SELECT email, role, created_at FROM user_profiles ORDER BY created_at DESC;
  ```
- Le script **supprime puis recrée toutes les politiques** des tables `user_profiles`, `app_data`, `classes`,
  `subjects`, `students`, `grades`, `activities`, `absences` : une politique ajoutée à la main sur l'une d'elles
  disparaît (une politique permissive oubliée annulerait les restrictions).
- Les parents ne lisent plus que leurs enfants. Vérifiez que chaque parent est bien lié à ses enfants
  (*Gestion parents*) ; un parent sans lien ne voit plus rien.
- La vue `v_users` et la fonction `create_admin_user` sont supprimées (la première était lisible par tous les
  comptes, la seconde permettait de tester quels e-mails existent).

## Réglages Supabase recommandés (tableau de bord → Authentication)

- **Confirmation de l'e-mail** activée : évite les inscriptions avec l'adresse de quelqu'un d'autre.
- **Longueur minimale du mot de passe** : 8 caractères ou plus ; activer la protection contre les mots de passe
  compromis si votre offre le permet.
- **CAPTCHA** (hCaptcha ou Cloudflare Turnstile) sur l'inscription : limite les inscriptions automatisées.
- **Limites de débit** : garder les valeurs par défaut ou les durcir.
- La clé **`anon`** est publique par conception (elle est dans le navigateur). La clé **`service_role`** ne doit
  **jamais** apparaître dans le code, dans `.env` côté front ni dans le dépôt : elle n'existe que dans les
  fonctions Edge, fournie par Supabase.

## Autres protections en place

- **Inscription publique sans accès** : un nouveau compte est « en attente » tant qu'un administrateur ne l'a
  pas validé. Un utilisateur ne peut pas modifier son propre rôle (RLS + déclencheur).
- **Impression des bulletins** : le HTML des bulletins est nettoyé (scripts, gestionnaires d'événements,
  `javascript:`) et protégé par une CSP sans script ni réseau (`src/utils/printSecurity.js`). Un nom d'élève
  contenant du code ne peut plus s'exécuter dans la fenêtre d'impression, qui a la même origine que l'application
  et donc accès à la session.
- **QR code des bulletins** généré dans le navigateur : plus aucun nom, classe ni moyenne n'est envoyé à un
  service tiers.
- **Paiements** : clés secrètes uniquement côté serveur, statut écrit seulement après confirmation signée
  (voir [PAIEMENTS.md](PAIEMENTS.md)).
- **Rang d'un enfant** : calculé par une fonction SQL qui ne renvoie que le rang et les statistiques de classe,
  sans exposer les notes des autres élèves.

## Limites connues

- **`app_data` : dernier écrivain gagnant.** Les listes stockées en bloc (appréciations, années scolaires)
  sont réécrites en entier : deux personnes qui modifient la même liste au même moment peuvent s'écraser.
  À terme, ces données devraient avoir leur propre table.
- **Journal d'activité** : borné à 200 entrées, non infalsifiable (un administrateur peut l'effacer). Ce n'est
  pas une piste d'audit au sens légal.
- **SMS** : l'envoi est simulé tant qu'aucune fonction serveur n'est branchée ; la clé de l'opérateur ne doit
  pas être placée dans le navigateur.
- **Conformité** : les données d'élèves mineurs sont des données personnelles. Vérifiez les obligations de votre
  pays (déclaration ou autorisation auprès de l'autorité de protection des données, durée de conservation,
  information des familles) avant la mise en service.

## Vérifier

```bash
npm test      # inclut les tests RLS sur un vrai PostgreSQL (PGlite), environ 15 s
```

Pour mesurer l'état **avant** durcissement (les tests de fuite doivent alors échouer, ce qui prouve qu'ils
détectent bien les problèmes) : `RLS_BASELINE=1 npx vitest run sql/__tests__/rls`.
