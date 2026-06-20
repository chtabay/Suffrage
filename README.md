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
