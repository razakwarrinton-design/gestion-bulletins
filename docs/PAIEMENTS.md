# Paiements Mobile Money (FedaPay)

Les parents paient les frais de scolarité par Mobile Money depuis le portail parents.
[FedaPay](https://fedapay.com) sert d'agrégateur : il couvre notamment **Moov Money (Flooz)** et
**T-Money** au Togo, **MTN / Moov / Celtiis** au Bénin, **Orange / MTN / Moov / Wave** en Côte d'Ivoire
et **Orange / Wave** au Sénégal. Un seul compte marchand, une seule intégration.

## Comment ça marche

```
Parent ──► PaymentModal ──► Edge Function payment-initiate ──► FedaPay (crée la collecte)
                                   │                                  │
                                   │  paiement enregistré             ▼
                                   │  (status = processing)     page de paiement FedaPay
                                   ▼                                  │ le parent valide sur son téléphone
                             table payments ◄── Edge Function payment-webhook ◄── FedaPay (événement signé)
                                                  (relit la transaction chez FedaPay,
                                                   vérifie le montant, passe en completed / failed)
```

Règles de sécurité appliquées :

- La **clé secrète FedaPay n'est jamais dans le navigateur** : elle n'existe que dans les secrets Supabase.
- Le navigateur **ne peut pas** écrire un statut `completed`. Seul `payment-webhook` le fait, après
  vérification de la signature **et** relecture de la transaction chez FedaPay.
- Un paiement dont le montant confirmé diffère du montant demandé n'est jamais validé.
- Un parent ne peut payer que pour les élèves liés à son compte.
- Un paiement `completed` ne repasse jamais en arrière (notifications rejouées ou dans le désordre).
- Les parents peuvent **lire** les paiements de leurs enfants (RLS), jamais les modifier.

## Mise en place

### 1. Base de données

Exécuter `sql/payments-online.sql` dans l'éditeur SQL de Supabase (après `sql/supabase-security-rls.sql`).
Le script est additif et ré-exécutable.

### 2. Compte FedaPay

1. Créer un compte marchand sur https://fedapay.com et commencer en **sandbox**.
2. Récupérer la **clé secrète** (`sk_sandbox_…`).
3. Dans *Webhooks*, créer un webhook vers
   `https://<ref-projet>.supabase.co/functions/v1/payment-webhook`, événements `transaction.*`,
   et copier son **secret** (`wh_sandbox_…`).

### 3. Secrets et déploiement (CLI Supabase)

```bash
supabase secrets set FEDAPAY_SECRET_KEY=sk_sandbox_xxx \
                     FEDAPAY_WEBHOOK_SECRET=wh_sandbox_xxx \
                     FEDAPAY_ENV=sandbox \
                     APP_URL=https://gestion-bulletins-rho.vercel.app

supabase functions deploy payment-initiate
supabase functions deploy payment-webhook --no-verify-jwt
```

`--no-verify-jwt` est obligatoire pour le webhook : FedaPay l'appelle sans jeton Supabase. Il est
protégé par la signature, vérifiée dans le code.

### 4. Test en sandbox

1. Se connecter comme parent lié à un élève, ouvrir le paiement, saisir un numéro de test FedaPay
   avec indicatif (ex. `+229…`, voir les numéros de test dans la doc FedaPay).
2. Valider sur la page FedaPay. Le paiement passe de `processing` à `completed` dès réception du webhook.
3. Vérifier dans *Paiements* (admin) : le montant apparaît dans « Montant encaissé ».

### 5. Passage en production

Remplacer les trois secrets par les clés **live** et `FEDAPAY_ENV=live`, puis recréer le webhook en live.
**Ne jamais** committer de clé ; `.env` et les secrets Supabase ne sont pas dans le dépôt.

## À valider avant la mise en production

- **Format de la signature du webhook.** Le code suit le format des bibliothèques officielles
  (`X-FEDAPAY-SIGNATURE: t=<horodatage>,s=<HMAC-SHA256>` sur `<horodatage>.<corps>`), mais il faut le
  confirmer avec un vrai webhook sandbox. En cas d'écart, seul `verifyWebhookSignature`
  (`supabase/functions/_shared/fedapay.ts`) est à adapter. La relecture de la transaction chez FedaPay
  limite déjà le risque : un faux webhook ne peut pas valider un paiement.
- **Frais FedaPay et montant.** Le montant demandé est celui du paiement ; vérifiez dans le tableau de
  bord FedaPay à qui incombent les frais de l'opérateur et ajustez si besoin.
- **Contrat marchand.** L'activation du mode live exige la validation de votre dossier par FedaPay.

## Tests

`npm test` couvre le module FedaPay (statuts, signature, appels API simulés) :
`supabase/functions/_shared/fedapay.test.ts`. Les fonctions Edge elles-mêmes (Deno) ne sont pas exécutées
par la suite de tests : elles sont à tester en sandbox.
