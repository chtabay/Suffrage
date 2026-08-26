# Horizon statistique

## Intention

`/horizon` produit un repère d'espérance de vie restante, un compte à rebours et
un QR code partageable. La page n'est ni une prédiction médicale ni un espace
public de Placet : elle n'apparaît dans aucune navigation ni aucun sitemap et
demande aux moteurs de ne pas l'indexer.

Elle n'est pas protégée par un compte. Toute personne qui reçoit le lien ou le QR
code peut lire son contenu.

## Lien v1

Les données restent dans le fragment de l'URL, donc après `#` :

```text
https://placet.app/horizon#v=1&d=1976-05-12&s=f&p=Claire&t=Mon+horizon&c=Un+petit+mot
```

| Clé | Valeur | Règle |
| --- | --- | --- |
| `v` | `1` | version obligatoire du format |
| `d` | date ISO `AAAA-MM-JJ` | génération 1908 à 2022 |
| `s` | `f` ou `m` | référence statistique féminine ou masculine |
| `p` | prénom | obligatoire, 40 caractères maximum |
| `t` | titre | facultatif, 80 caractères maximum |
| `c` | commentaire | facultatif, 250 caractères maximum |

Les valeurs sont encodées avec `URLSearchParams`. Elles sont affichées comme du
texte, jamais interprétées comme du HTML. Par défaut, aucune de ces données n'est
envoyée à une API, une base, un outil d'analytics ou `localStorage`. Le fragment
reste visible dans l'historique du navigateur et pour le destinataire du lien.
Lors d'une connexion déclenchée depuis cette page, il peut être conservé au plus
30 minutes dans `localStorage`, puis retiré dès le retour, afin de retrouver
l'horizon après OAuth ou lien magique.
Un fragment encodé de plus de 1 800 caractères est refusé avec une invitation à
raccourcir le texte, afin que le QR reste techniquement lisible même lorsque des
caractères prennent plusieurs octets.

## Calcul figé

Référentiel : Insee, *Tables de mortalité par génération en France*, scénario
central, publication du 10 novembre 2022, fichier détaillé `t2.xlsx` :
<https://www.insee.fr/fr/statistiques/6543678>.

La copie embarquée contient, pour chaque génération de 1908 à 2022 et chaque âge
révolu de 0 à 119 ans, l'espérance de vie restante des tables féminine et
masculine. Les nombres sont arrondis à quatre décimales. Le référentiel ne se met
pas à jour automatiquement.

À la date d'ouverture :

1. l'âge calendaire exact est calculé ;
2. l'espérance restante est interpolée linéairement entre les deux âges entiers
   encadrants de la table ;
3. l'âge horizon est la somme de l'âge exact et de cette espérance restante ;
4. le compte à rebours vise la date calendaire correspondant à cet âge horizon.

Pour une naissance un 29 février, l'anniversaire statistique tombe le 28 février
les années non bissextiles.

## Repères figés

Quatre lignes matérialisent le temps restant : retraite, étés, week-ends et
entrée en Ehpad.

- retraite : DREES, données 2023 publiées en 2025 — 63 ans et 1 mois pour les
  femmes, 62 ans et 5 mois pour les hommes ;
- entrée en Ehpad : DREES, données 2023 publiées en 2025 — 85 ans et 11 mois,
  tous sexes confondus ;
- été : chaque 21 juin strictement postérieur à l'ouverture et antérieur à
  l'horizon statistique ;
- week-end : chaque samedi strictement postérieur à l'ouverture et antérieur à
  l'horizon.

Les deux durées sont décomposées en années calendaires, jours, heures, minutes et
secondes. Ces valeurs restent figées comme la table de mortalité.

## Rappels facultatifs

Après connexion et consentement aux notifications, une personne peut rattacher
un horizon à son compte. Seuls le prénom, la naissance, la référence statistique,
le fuseau, la langue et les trois choix de rappel sont conservés. Le titre et le
commentaire ne le sont jamais.

Trois catégories sont proposées : anniversaire avec compte à rebours actualisé,
passage sous 30, 20, 10, 5 et 1 an, et repère de retraite. Un cron horaire évalue
les horizons à 9 heures dans leur fuseau. Chaque événement est réservé avant
envoi et ne peut partir qu'une fois. Les réglages peuvent être modifiés ou
supprimés depuis l'horizon concerné.

## Présentation

Le titre et le commentaire personnalisent uniquement l'affichage. Le QR code
encode exactement le lien affiché et ne passe par aucun raccourcisseur. Sous les
actions, « Aujourd'hui sur Placet » peut montrer un seul scrutin public encore
ouvert ; ce bloc reste distinct de l'activation des rappels.
