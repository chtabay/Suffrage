# Migrations

Le schéma de Placet vit dans la base Supabase partagée `OpenSM`
(`xwlywozdxlgjwksypzmi`), tables et fonctions préfixées `scrutin_`.

Jusqu'ici il n'existait **que là** : aucun `.sql` dans le dépôt, donc aucune
revue possible sur un changement de schéma, et aucun moyen de savoir quand ni
pourquoi une policy avait été posée. Un incident l'a rendu concret — révoquer
un droit de lecture en production a cassé un chemin serveur qu'aucun test ne
couvrait, et rien dans le dépôt ne permettait de le voir venir.

Ce dossier commence la reprise en main. Il n'est **pas rétroactif** : les ~22
tables et ~80 fonctions déjà en place n'y sont pas. Seuls les changements
nouveaux y passent, du plus récent vers le plus ancien.

## Règles

1. Un fichier par changement, nommé `AAAAMMJJ-sujet.sql`.
2. **Idempotent** : `create or replace`, `if not exists`, `drop … if exists`.
   Le fichier doit pouvoir être rejoué sans casse.
3. En tête, un commentaire qui dit *pourquoi* — le *quoi* se lit dans le SQL.
4. Appliqué à la main sur la base, puis committé. Le dépôt est la mémoire,
   pas l'outil de déploiement.
5. Un changement de **droits** (`grant` / `revoke` / policy) se teste depuis
   l'application avant d'être committé : les chemins client et serveur ne
   lisent pas les mêmes colonnes.
