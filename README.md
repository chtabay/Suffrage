# Suffrage

Application web pour **concevoir simplement des systèmes de vote** et les comparer
avec leurs avantages et inconvénients : du suffrage universel direct majoritaire
au Condorcet (simple ou randomisé), scrutins à un ou deux tours, sélection de
grands électeurs au premier tour, etc.

## Stack

- **Next.js 15** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS 3**
- **Supabase** (auth + Postgres) — projet partagé **OpenSM**
- Déploiement **Vercel** lié à ce dépôt GitHub

> ℹ️ Le projet est figé sur Next 15 / Tailwind 3 pour rester compatible avec
> Node 18.18 en local. Vercel compile sur Node 20+ sans souci.

## Base de données

La base Supabase **OpenSM** (`xwlywozdxlgjwksypzmi`) est **partagée** avec d'autres
projets. Cette application :

- n'utilise **que** des tables **préfixées `scrutin_`** dans le schéma `public` ;
- ne **modifie jamais** les tables existantes (jeu de simulation OpenSM).

## Démarrage

```bash
npm install
cp .env.example .env.local   # puis renseigner la clé publishable Supabase
npm run dev
```

Ouvrir http://localhost:3000.

## Variables d'environnement

| Variable | Description |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | URL du projet Supabase OpenSM |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clé publishable Supabase (publique par conception) |
| `NEXT_PUBLIC_PV_PAYMENT_LINK` | *(optionnel — en standby)* Lien de paiement Stripe du « PV officiel ». Non défini ⇒ bouton masqué. Voir § Monétisation. |

## Monétisation — « PV officiel » (test concierge, **EN STANDBY**)

Piste retenue : l'app reste **gratuite** (produit d'appel) ; on monnaie
**l'opposabilité *après* le vote** via un **procès-verbal vérifiable** (PV) du
résultat, à prix d'impulsion (≈ 2 €).

> **État au 2026-06-27 : en veille.** Le code est en place et vérifié, mais
> l'encaissement réel n'est **pas** activé — pas encore de structure juridique pour
> percevoir des paiements (création d'une structure prévue ultérieurement).

**Déjà branché :**
- Bouton « 📄 Recevez le PV officiel — 2 € » sous les résultats (vues votant,
  clôturé, organisateur) — composant `OfficialRecordCta` dans
  `src/components/scrutin/PublicVote.tsx`.
- Le bouton n'apparaît **que si** `NEXT_PUBLIC_PV_PAYMENT_LINK` est défini ⇒
  **dormant par défaut** (variable non posée sur Vercel).
- Le lien porte `?client_reference_id=<token-du-scrutin>` pour rattacher chaque
  paiement à son vote.
- Côté **Stripe** : objets créés en **mode test uniquement** (produit « PV officiel
  du scrutin », prix 2,00 € EUR, lien de paiement `buy.stripe.com/test_…`). Rien en
  live.

**Fulfillment prévu (concierge, manuel) :** à réception du paiement (notification
Stripe + `client_reference_id`), fabriquer le PV à la main et l'envoyer à l'e-mail
de l'acheteur.

**Réactivation (checklist) :**
1. Disposer d'une structure pour encaisser (auto-entreprise / société) **et** activer
   les paiements *live* sur Stripe (identité, IBAN…).
2. Recréer produit / prix / lien de paiement **en mode live**.
3. Poser `NEXT_PUBLIC_PV_PAYMENT_LINK` (URL *live*) dans les variables Vercel ⇒ le
   bouton s'active.
4. *(plus tard)* Automatiser la génération du PV + un vrai lien de vérification.

> Note frais : sous ≈ 1 € par transaction, les frais Stripe fixes (~0,25 € + 1,5 %)
> mangent > 25 % — d'où le prix d'amorçage à 2 € (ou des packs).
