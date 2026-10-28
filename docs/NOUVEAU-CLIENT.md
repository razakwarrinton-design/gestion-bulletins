# Installer EduPulse pour un nouvel établissement

EduPulse sert **un établissement par installation** : chaque école a son propre projet Supabase (ses données) et son
propre déploiement de l'application. Deux écoles ne partagent jamais une base. C'est le choix le plus sûr tant qu'il
n'existe pas de séparation par établissement *dans* la base (voir « Limites » en bas).

Compter environ une heure pour une première installation, quelques minutes ensuite.

## 1. Créer le projet Supabase

1. [supabase.com](https://supabase.com) → *New project* : un projet **par établissement**, dans une région proche des
   utilisateurs. Notez le mot de passe de la base et conservez-le dans un gestionnaire de mots de passe.
2. *Project Settings → API* : notez l'**URL** du projet et la clé **anon** (publique par conception). La clé
   **service_role** donne accès à tout : ne la collez jamais dans l'application ni dans un fichier suivi par git.

## 2. Installer la base

Dans *SQL Editor*, exécuter **un seul** de ces deux chemins :

- **Recommandé** : coller le contenu de `supabase/migrations/20261009000000_baseline.sql` (tous les scripts, dans le bon
  ordre, générés par `npm run sql:baseline`) et l'exécuter d'un bloc ;
- ou exécuter les scripts de `sql/` un par un dans l'ordre du [README](../README.md#base-de-données).

Les scripts `client-errors.sql` (journal des incidents), `notifications.sql` (cloche de notifications des parents) et `announcements.sql` (actualités de l'établissement : frais et règles publiés par le personnel, lus par les parents) sont inclus ; ils sont facultatifs.

**Ordre de mise en ligne d'une mise à jour** : exécuter d'abord `notifications.sql` puis `announcements.sql` (dans cet ordre), puis déployer l'application. Une application
déployée avant le script reste utilisable (la cloche est simplement absente), mais le bouton « Prévenir les parents » le signale.

## 3. Régler l'authentification

*Authentication → URL Configuration* : **Site URL** = l'adresse de l'application de cet établissement (étape 4).
Ajouter la même adresse dans *Redirect URLs*. *Authentication → Providers → Email* : décider si la confirmation de
l'adresse e-mail est exigée (recommandé).

## 4. Déployer l'application (Vercel)

Un projet Vercel **par établissement**, branché sur le même dépôt, avec ses propres variables d'environnement. Les
variables `VITE_…` sont **inscrites dans l'application au moment de la construction** : chaque établissement a donc
sa propre construction, et un changement de variable demande un nouveau déploiement.

| Variable | Valeur |
|---|---|
| `VITE_SUPABASE_URL` | URL du projet Supabase de cet établissement |
| `VITE_SUPABASE_ANON_KEY` | clé *anon* de ce projet |
| `VITE_LEGAL_OPERATOR` | nom de l'entreprise ou de la personne qui exploite le service |
| `VITE_LEGAL_ADDRESS` | adresse postale de l'éditeur |
| `VITE_LEGAL_EMAIL` | adresse de contact pour les demandes sur les données |
| `VITE_DATA_HOSTING` | lieu d'hébergement, ex. « Supabase, région Europe (Francfort) » |

Sans les variables `VITE_LEGAL_…`, les pages *Confidentialité* et *Conditions d'utilisation* affichent « [à renseigner] »
en surbrillance : c'est voulu, ne rien inventer.

## 5. Créer le premier administrateur

Aucun compte n'est fourni, et une inscription publique reste « en attente » (aucun accès). Voir le README,
*Créer le premier administrateur* : s'inscrire dans l'application, puis dans l'éditeur SQL :

```sql
UPDATE public.user_profiles SET role = 'admin' WHERE email = 'adresse.de.l.administrateur@exemple.com';
```

Ne jamais promouvoir automatiquement le premier inscrit : n'importe qui trouvant l'adresse avant l'école deviendrait
administrateur.

## 6. Fonctions Edge (selon les besoins)

| Fonction | Nécessaire ? | Remarque |
|---|---|---|
| `create-parent-account` | oui, pour créer les comptes des parents | secrets : voir le README |
| `generate-appreciation` | facultatif | demande un fournisseur d'IA, donc un abonnement |
| `payment-initiate`, `payment-webhook` | facultatif | paiements Mobile Money, donc un abonnement |
| `send-sms` | facultatif | fournisseur de SMS, donc un abonnement |
| `notify-parents` | facultatif | e-mail aux parents (notes disponibles, nouvelles actualités) ; compte Brevo gratuit (300 e-mails/jour : une actualité pour tout l'établissement envoie un e-mail par parent), voir ci-dessous. Sans elle, la cloche de l'application fonctionne seule |

### E-mail aux parents (`notify-parents`)

1. Créer un compte Brevo, puis *Expéditeurs, domaines* : ajouter et **valider** l'adresse d'expédition (Brevo envoie un e-mail de confirmation). Brevo recommande un nom de domaine à l'école : une adresse gratuite de type gmail.com est moins bien distribuée (risque de courrier indésirable).
2. *SMTP & API* → créer une clé API.
3. `supabase secrets set BREVO_API_KEY=xkeysib-… MAIL_FROM_EMAIL=ecole@votre-domaine.tg APP_URL=https://adresse-de-l-application` (ajouter `MAIL_FROM_NAME="Nom de l'école"` si le nom des réglages ne convient pas).
4. `supabase functions deploy notify-parents`.
   Sans la ligne de commande Supabase : dans le tableau de bord, *Edge Functions* → `notify-parents` → *Code*, remplacer tout le contenu par celui de `docs/dashboard/notify-parents.ts` (version en un seul fichier, générée par `npm run functions:bundle`), puis *Deploy*. Les secrets se définissent dans *Edge Functions* → *Secrets*.
5. Vérifier avec un parent de test dont l'adresse est la vôtre : saisir une classe, cliquer *Prévenir les parents*, contrôler la réception **et le dossier courrier indésirable**.

Les secrets se définissent **par projet** (`supabase secrets set …`) : ceux d'un établissement ne servent pas à un autre.

## 7. Régler l'établissement dans l'application

*Paramètres* : nom, adresse, logo, en-tête officiel (pays, ministère), nom du directeur et du professeur principal, puis
**Barème de l'établissement** (seuils de mention, d'admission et de difficulté : reprendre le règlement intérieur de
l'école). Créer ensuite l'année scolaire, les classes, les matières, puis importer les élèves depuis Excel.

## 8. Avant la mise en service

- [ ] `sql/security-hardening.sql` exécuté (compris dans la migration de référence) : un parent ne voit que ses enfants ;
- [ ] premier administrateur créé, double authentification (2FA) activée sur son compte ;
- [ ] pages légales relues et validées par l'établissement (modèles, pas des textes juridiques définitifs) ;
- [ ] une sauvegarde faite (`npm run backup`) **et** un exercice de restauration réussi une fois (voir README,
      *Sauvegardes*) ;
- [ ] un bulletin de chaque modèle imprimé en PDF avec les vraies données et relu par la direction ;
- [ ] un compte parent de test créé, rattaché à un élève, qui ne voit que cet élève.

## 9. Mettre à jour une installation existante

Quand un nouveau script SQL est publié : le régénérer dans la migration de référence (`npm run sql:baseline`), puis
l'exécuter sur **chaque** projet client (les scripts sont ré-exécutables), en commençant par une sauvegarde. Déployer
ensuite l'application sur chaque projet Vercel. Avec la CLI Supabase, `supabase link` puis `supabase db push` évitent de
coller les scripts à la main, projet par projet.

## Limites (à dire au client)

- **Une base par établissement** : il n'y a pas de tableau de bord commun à plusieurs écoles, ni de compte qui
  appartiendrait à deux établissements. Un groupe scolaire de plusieurs écoles aurait plusieurs installations.
- Les mises à jour se font installation par installation.
- Pas de facturation ni d'abonnement intégrés : la facturation du service se fait en dehors de l'application.
