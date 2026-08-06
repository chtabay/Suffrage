# Tableau de bord de cercle — spécification définitive

**Fichier cible** : `D:\Suffrage\src\components\scrutin\SpaceDashboard.tsx` (609 l., rendu 267→607)
**Routes neuves** : `src/app/[locale]/espaces/[id]/membres/page.tsx`, `.../consultations/page.tsx`
**Vocabulaire** : cercle / membres / consultation / questions / segments (commit 87962b6). Aucune exception.

---

## 1. La règle

> **Le tableau de bord montre l'ÉTAT du cercle et les LEVIERS qui le changent ; il n'énumère jamais ses contenus. Tout chiffre y est une porte vers la vue de gestion qui, elle, énumère.**

**La frontière chiffrée.** Un ensemble se rend en place si et seulement si les **trois** conditions tiennent :

| | Condition | Contrôle |
|---|---|---|
| (a) | Le **code** impose un plafond ≤ 6 lignes rendues | pas « en général il y en a peu » : un `.slice(0, N)` littéral |
| (b) | Chaque ligne rendue porte **au moins un chiffre d'état ou un levier** | jamais un simple nom |
| (c) | Une **règle de tri explicite** décide qui tombe hors du plafond | et l'excédent est résumé par un compteur-lien |

Échouer à l'une des trois = **énumération** = sort de la page vers une route.

**Application, décidée :**

| Ensemble | Volume | Verdict | Motif |
|---|---|---|---|
| Membres | 8 → 200, sans borne | **jamais en place** | (a) et (c) échouent |
| Consultations **en cours** | plafond 3, tri `closes_at` asc | **en place** | 4 chiffres d'état par ligne, tri explicite |
| Consultations **brouillons / closes** | jusqu'à 30, sans borne | **jamais en place** | (a) et (c) échouent ; aucune décision attachée |
| Segments | 3 → 12, plafond 6 puces | **en place, EN LECTURE SEULE** | l'effectif est un chiffre d'état ; les gestes partent |
| Réglages d'adhésion | ensemble de champs **fixe** | **en place, sous `<details>`** | borné par construction |

**Corollaire de forme, non négociable.** Le `<details>` natif est réservé aux **RÉGLAGES** (ensemble de champs fixe — seule occurrence actuelle : `SpaceDashboard.tsx:458`). Il ne cache **jamais** une collection qui croît : il n'a ni recherche, ni pagination, ni URL, et il monte tout le DOM quand même. Une liste dépliée dans le tableau de bord **est** une liste dans le tableau de bord.

---

## 2. La page, section par section

### Esquisse

```
┌────────────────────────────────────────────────────────────────┐
│  ← Retour aux cercles                                          │  §1
│  ┌──────────────────────────────────────────┐                  │
│  │ Les Amis du Théâtre            [inline]  │  ← <input> nu    │
│  └──────────────────────────────────────────┘                  │
│  47 membres · 12 par le lien · 3 sans adresse · 5 sans segment │
│  ▔▔▔▔▔▔▔▔▔▔   ▔▔▔▔▔▔▔▔▔▔▔▔▔   ▔▔▔▔▔▔▔▔▔▔▔▔▔▔   ▔▔▔▔▔▔▔▔▔▔▔▔▔▔  │
│   → /membres    ?filtre=       ?filtre=          ?filtre=      │
│                  adherents      sans-email        sans-segment │
├════════════════════════════════════════════════════════════════┤
│ ╔══════════════════════════════════════════════════════════╗   │  §2
│ ║  Agir                                    1/2 aujourd'hui ║   │  CORAL
│ ║  ┌──────────────────┐ ┌────────────────────────┐         ║   │
│ ║  │ Poser une question│ │ Préparer une consultation│       ║   │
│ ║  └──────────────────┘ └────────────────────────┘         ║   │
│ ║  ⚠ ☐ Ouvrir les adhésions — sans quoi une question ne    ║   │
│ ║     peut pas être adressée à ce cercle.                   ║   │
│ ╚══════════════════════════════════════════════════════════╝   │
├════════════════════════════════════════════════════════════════┤
│ ┌ En cours ─────────────────────────────────────────────────┐  │  §3
│ │ AG 2026                                       ( OUVERTE ) │  │  ≤3
│ │ Avancé + Lyon · scellé · 4 questions                      │  │  lignes
│ │ Ferme le 14 août · 18/24 ont émargé                       │  │  cliquables
│ ├───────────────────────────────────────────────────────────┤  │
│ │ Budget travaux                                ( OUVERTE ) │  │
│ │ 12 convoqués · nominatif · 1 question                     │  │
│ │ Pas d'échéance · 7/12 ont émargé                          │  │
│ └───────────────────────────────────────────────────────────┘  │
│   + 2 en cours →   ·   2 brouillons →   ·   17 closes →         │
│   ▔▔▔▔▔▔▔▔▔▔▔ CORAL                                            │
├════════════════════════════════════════════════════════════════┤
│ ┌ Membres ──────────────────────────── 47 membres ──────────┐  │  §4
│ │ 12 segments · 3 sous le seuil de 5                        │  │  LECTURE
│ │ [Avancé · 3 ⚠] [Lyon · 4 ⚠] [Nord · 4 ⚠] [Roulage · 12]   │  │  SEULE
│ │ [Standard · 7] [Bureau · 9]      + 6 autres segments →     │  │
│ │                              ┌───────────────────────┐    │  │
│ │                              │ Gérer les membres →   │    │  │
│ │                              └───────────────────────┘    │  │
│ └───────────────────────────────────────────────────────────┘  │
├════════════════════════════════════════════════════════════════┤
│ ┌ Ouvrir les adhésions ─────────────────────────────────────┐  │  §5
│ │ Ouvertes · 3 demandes en attente, la plus ancienne 68 h ⚠ │  │
│ │ ▸ Réglages du cercle                        (<details>)   │  │
│ └───────────────────────────────────────────────────────────┘  │
│                                                                │
│  Supprimer ce cercle                                           │  §6
└────────────────────────────────────────────────────────────────┘
```

---

### §0 — Les trois sorties, avant tout rendu

**MONTRE.** Un de trois états, jamais un quatrième :
1. `Org.loading` (existante) ;
2. carte d'erreur + bouton « Réessayer » ;
3. « Ce cercle n'existe pas, ou vous ne l'animez pas » (clé neuve `Org.spaceNotFound`), quand `getSpace` rend `null`.

**J'accepte la correction 5 de Sceptique 1 : la garantie est par VAGUE, pas par page.** `load()` (`:118-134`) fait deux vagues dans **un seul `try`** — vague 1 `getSpace`/`listMembers`/`listEvents` (`:121`), vague 2 `listSegments`/`listMemberSegments` (`:128`). Un `finally { setReady(true) }` global ferait rendre « 0 segment » sur un cercle qui en a douze. Aujourd'hui ce mensonge est démenti par les puces sur chaque ligne de membre (`:335-350`) ; **une fois les listes parties, plus rien ne le dément**, et l'animateur convoquera « tout le cercle » faute de cible visible.

Donc : **deux drapeaux, deux `catch`**.
- `coreErr` → la page entière rend la carte d'erreur.
- `segErr` → §1 et §3 se rendent normalement ; la barre du §4 rend **« segments indisponibles — Réessayer »**, jamais « 0 segment », jamais une barre vide. Le 4ᵉ chiffre du §1 (« sans segment ») est **omis**.

**PERMET.** « Réessayer » rappelle `load()`. Sur l'absence : le lien retour `Org.back` (`:269`).
**OUVRE VERS.** Rien (états terminaux).
**SOURCE.** Dérivé. Deux états `coreErr`/`segErr` + `ready`. Zéro requête neuve.

---

### §1 — En-tête : le nom, et quatre chiffres qui sont quatre portes

**MONTRE.** Lien retour ; nom du cercle ; **une** ligne d'état en points médians. Zéro ligne de membre — c'est la totalité de ce que la page dit du roster sans clic, contre 128 lignes de liste aujourd'hui (`:304-432`).

| Chiffre | Condition d'affichage | Style |
|---|---|---|
| `47 membres` | toujours | corps |
| `12 par le lien` | **si > 0** | corps |
| `3 sans adresse` | si > 0 | **REDTXT** |
| `5 sans segment` | si > 0 **ET** `segments.length > 0` | **REDTXT** |

**J'accepte la correction 3 de Sceptique 1, avec une garde qu'il n'a pas posée.** « k sans segment » est le seul indicateur de faute d'administration d'un cercle à niveaux — un membre qui cotise et qu'aucune consultation ciblée ne convoquera jamais. Il coûte un `useMemo`. Et « k par le lien » devient conditionnel : sur un cercle 100 % importé (le cas de Grand Dynamo, `self_joined=false` partout) il afficherait un `0` permanent et décoratif.

**Garde que j'ajoute :** « k sans segment » n'a de sens que si le cercle a **au moins un segment**. Sans segments, *tout le monde* est sans segment — le chiffre vaudrait `47` en rouge sur un cercle parfaitement sain. Condition : `segments.length > 0 && segErr === null`.

**PERMET.** Renommer le cercle **en ligne** — patron exact `EventEditor.tsx:357-365` : `<input>` aux styles du `h1`, `onBlur → updateSpace({name})`, Entrée = `blur`, `aria-label` sur `Org.renameSpaceAria` (neuve). Aujourd'hui le `h1` est inerte (`:270-272`) alors que ce nom part dans les emails d'adhésion. `renameSpace` (`events.ts:234`) a **zéro appelant, vérifié** : il se supprime au profit d'`updateSpace`, qui gère déjà `patch.name` (`events.ts:195`).

**OUVRE VERS.** `/espaces/<id>/membres` ; `?filtre=adherents` ; `?filtre=sans-email` ; `?filtre=sans-segment`.

> **J'accepte la correction 5 de Sceptique 2 :** la spec écrivait `sans-email` au §1 et `sans-adresse` ailleurs. **Un seul survit : `?filtre=sans-email`**, cohérent avec la clé `Org.filterNoEmail`.

Le chiffre « sans adresse » règle un vrai défaut : l'animateur découvre aujourd'hui ses orphelins quand la base refuse l'ouverture des adhésions (déclencheur `scrutin_space_open_needs_emails`), et le message rendu (`:207-208`) ne dit **ni combien ni lesquels**.

**SOURCE.** Dérivé, zéro requête neuve. `members.length` ; `members.filter(m => m.self_joined)` (colonne dans `MEMBER_COLS`, `events.ts:135`, **vérifié**) ; `members.filter(m => !m.email?.trim())` ; `members.filter(m => !(memberSegs[m.id]?.length))`.

---

### §2 — Barre d'action : deux leviers, et la garde qui manquait

**MONTRE.**
- Compteur du jour, seulement si `space.solicit_per_day != null` : « 1 / 2 sollicitations aujourd'hui », REDTXT au plafond.
- Si `!space.join_open` : une ligne d'avertissement **qui porte la case elle-même** (`Org.needsCircleForAudience`, neuve).

Aujourd'hui le CTA le plus contrasté de la page échoue en base sur tout cercle `join_open=false` — **c'est-à-dire par défaut** — parce que `circle_audience_guard` renvoie `not_a_circle` (`20260805-audience-p1.sql:53`, **vérifié**), et le refus n'apparaît qu'**après** composition de la question, sous un libellé générique.

**PERMET.** Les deux boutons, destinations inchangées : `Org.actionAsk` → `/new?espace=<id>` (`:286-292`) ; `Org.actionSequence` → `createEvent` + `push /evenement/<id>` (`:293-299`). Plus la case `join_open`, **reprise de `:439-444`** — elle quitte la carte des adhésions pour venir là où son absence fait échouer.

> **J'accepte le défaut 2 de Sceptique 2, et il est plus grave qu'il ne le dit.** Vérifié : `createEvent` (`events.ts:300-318`) n'envoie **aucun `status`** → brouillon ; la garde compte `status <> 'draft'` (`audience-p1.sql:86-88`). Un brouillon **ne consomme pas le plafond**. Désactiver « Préparer une consultation » au plafond rendrait l'écran **plus strict que la base** et supprimerait le seul chemin pour préparer la consultation de demain — exactement la divergence que ce § interdit.
>
> **Décision : seul « Poser une question » se désactive au plafond. « Préparer une consultation » reste toujours actif.**
>
> **Et un fait neuf que ni l'audit ni les sceptiques n'ont relevé :** `EventEditor` ouvre par `updateEvent(eventId, { status: 'open' })` (`EventEditor.tsx:229-230`, **vérifié**) — un `update` nu qui **ne passe par `circle_audience_guard` ni par aucune autre garde**. Le plafond du jour, le seuil de 5 et le refus `not_a_circle` ne s'appliquent **qu'au parcours `/new`**. L'avertissement du §2 ne doit donc jamais laisser croire que le second chemin est protégé, et le libellé de `Org.needsCircleForAudience` doit viser « une question adressée à ce cercle », pas « une consultation ». **Fermer ce contournement est un lot de sécurité à part, hors périmètre ici — je le consigne.**

**OUVRE VERS.** `/new?espace=<id>` et `/evenement/<id>` (parcours existants).

**SOURCE.** Dérivé de `events` déjà chargé. Reprendre **littéralement** la définition de la garde :
```ts
const dayStartUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
const todayCount = events.filter(e => e.status !== 'draft' && new Date(e.created_at) >= dayStartUTC).length;
```
**Début de jour en UTC**, pour coller à `date_trunc('day', now())` : un calcul en heure locale produit jusqu'à une journée d'écart aux bords, donc un écran qui annonce « 1/2 » pendant que la base refuse.

---

### §3 — Consultations en cours : le poste de commande (≤ 3 lignes)

> **J'accepte le BLOQUANT 1 de Sceptique 1.** La spec d'entrée contenait **trois versions incompatibles** du même bloc :
> - §3 : jusqu'à 3 lignes enrichies ;
> - « Les deux portes » : « 2 en cours · 1 brouillon · 7 closes, **rien de plus** » ;
> - « Ce que la contrainte casse », E : « deux ou plus : **on n'affiche que le compte et l'échéance la plus proche** ».
>
> Les variantes 2 et 3 sont une **régression mesurable** : aujourd'hui `:565-572` rend **chaque** consultation en `<Link href={/evenement/${e.id}}>` avec son titre — ouvrir « AG 2026 » coûte **1 clic**. Après, 2 clics plus un balayage d'une page mêlant brouillons et closes. On aurait retiré un accès direct pour le remplacer par un nombre.
>
> **Les variantes 2 et 3 sont barrées. Seul le §3 ci-dessous fait foi.**

**MONTRE.** Les consultations `status === 'open'`, **plafonnées à 3 par le code**, triées `closes_at` croissant (nulls en dernier), puis `created_at` croissant.

- **Ligne 1** : titre + pastille d'état — gabarit `MesScrutinsScreen.tsx:104-124` (bordure 2px INK, `borderRadius` 20), qui remplace les capitales espacées de `:568-570`.
- **Ligne 2** : public convoqué · régime (`Explore.sealed` / `Explore.named`, existantes) · nombre de questions.
- **Ligne 3** : échéance (`Explore.closesOn`, existante) · participation.

Sous ces lignes, les compteurs-liens : **« + 2 en cours » en CORAL** (jamais en gris), puis « 2 brouillons · 17 closes » en gris.

**Pourquoi une consultation ouverte n'est pas une énumération** — les trois critères tiennent : (a) plafond littéral de 3 dans le code ; (b) quatre chiffres d'état par ligne (échéance, régime, public, émargement) ; (c) tri explicite par échéance, donc la ligne qui tombe est toujours la moins urgente. Et c'est le seul endroit de l'application où l'on voit qu'une urne se ferme demain.

**Le risque du plafond, et son atténuation.** Si `solicit_per_day` est nul (aucune limite en base) et que l'animateur ouvre 5 consultations, deux disparaissent. Une consultation à `closes_at` null trie en dernier et peut être oubliée indéfiniment. D'où le compteur d'excédent **en CORAL**, lié à `?etat=ouvert`.

#### Le public convoqué : le défaut fatal, et ce que je fais

> **J'accepte intégralement le défaut fatal de Sceptique 2, vérifié ligne à ligne.** `audience_label` n'est écrit que par `set_poll_audience` (`audience-p1.sql:131,139`) et `open_circle_consultation` (`:189`). Le parcours « Préparer une consultation » appelle `createEvent` puis `EventEditor`, dont la convocation est un **insert nu** : `convene` (`events.ts:424-438`) insère dans `scrutin_event_members` **sans jamais toucher `scrutin_events.audience_label`** (vérifié : la fonction n'écrit que `event_id, member_id, name, email, district, weight`), et l'ouverture est un `updateEvent({status:'open'})` (`EventEditor.tsx:229-230`).
>
> **Conséquence :** pour **toute** consultation née de ce parcours — le seul qui porte plusieurs questions, donc la raison d'être même de l'objet consultation — `audience_label` vaut **NULL quel que soit le public réellement convoqué**. Rendre NULL comme « Tout le cercle » ferait annoncer « tout le cercle » sur une consultation convoquée à 6 personnes sur 47.

**Décision — je retiens la voie (b) de Sceptique 2 pour P0/P1, et la voie (a) en P2 :**

| `audience_label` | Rendu ligne 2 |
|---|---|
| non-null | le label figé, tel quel |
| null | **« N convoqués »** (`convened_count`, RPC `get_space_event_stats`) — **jamais « Tout le cercle »** |
| null, et RPC pas encore livrée (P0) | **la ligne 2 omet le public** et ne rend que le régime |

En P2, voie (a) : au passage brouillon→ouvert dans `EventEditor`, écrire `audience_label` depuis la convocation réelle — NULL seulement si `scrutin_event_members` couvre tout le roster, sinon un libellé figé. C'est un `update`, pas une migration.

**Ce que je ne « corrige » pas, et le commentaire à écrire dans le code.** `audience_label` est un **instantané textuel** délibéré (`20260801-cercles-segments.sql:84-92`) : un segment renommé ou supprimé ne doit pas réécrire l'histoire d'une consultation tenue. Ne jamais le remplacer par une jointure sur `scrutin_segments`. À inscrire en commentaire, sinon quelqu'un le « réparera ».

#### Confidentialité, appliquée ici

- Ratio d'émargement en scellé **seulement si convoqués ≥ 5** ; sinon la ligne dit « 3 convoqués », sans ratio.
- Chiffre chargé **une fois au montage**, jamais de polling.
- **Aucun dépouillement, jamais. Aucune liste de non-répondants, jamais.**

> **J'accepte la réserve de Sceptique 2 sur l'ARGUMENT (pas sur la règle).** Dire que le chargement unique supprime « structurellement » le canal d'attribution est **faux** : un rafraîchissement remonte le composant, et `EventEditor.tsx:164-182` sonde déjà exactement le même chiffre **toutes les 12 s**, à une route de là. La contrainte **déplace** ce canal, elle ne le ferme pas. **Seul le correctif H le ferme.** Le « dividende de sécurité » invoqué pour justifier la contrainte est donc réécrit à la baisse, et l'ordre de livraison (H d'abord, ratio ensuite) reste **la seule protection réelle**.

**PERMET.** Cliquer une ligne. **Rien d'autre** : ni renommage ni suppression en ligne — supprimer une consultation détruit des bulletins scellés irrécupérables par construction (ils n'ont jamais porté de nom).

**OUVRE VERS.** `/evenement/<id>` ; `/espaces/<id>/consultations?etat=ouvert|brouillon|close`.

**SOURCE.**
- `closes_at`, `secret_ballot`, `status`, `created_at` : **déjà dans `EVENT_COLS`** (`events.ts:136-137`, vérifié) et **zéro occurrence** dans `SpaceDashboard.tsx`.
- `audience_label` : **absent de `EVENT_COLS` et du type `EventRow`** (`events.ts:49-71`, vérifié) → **2 lignes à ajouter, zéro migration** — mais voir le défaut fatal ci-dessus : ces 2 lignes **sélectionnent une colonne que ce parcours n'écrit pas**.
- `polls_count`, `convened_count`, `signed_count` : **RPC neuve `get_space_event_stats(p_space_id)`**, agrégats seuls.

> **Raccourci tentant et faux, à interdire explicitement :** brancher le §3 sur `countEventVoters` (`events.ts:589-601`). Il filtre `.not("event_member_id","is",null)` alors que le bulletin scellé est écrit `null` (`lot1:114-115`) et masqué par la policy restrictive `scrutin_ballots_hide_secret`. Il vaut **structurellement 0** sur le régime pour lequel tout le chantier existe : le tableau afficherait « 0/12 ont émargé » à un animateur dont huit membres ont répondu, et il relancerait tout le monde ou refermerait.
>
> **J'accepte le défaut 3 de Sceptique 2 et j'annule la prescription de l'audit :** `countEventVoters` **a un appelant vivant** — `EventEditor.tsx:11` et `:170`, dans un `setInterval` de 12 s. **Ne pas le supprimer d'`events.ts` : cela casserait l'éditeur.** Seul `getVotedMemberIds` (`events.ts:540`) est mort côté navigateur (vérifié : zéro appelant dans `src/` hors sa définition ; le seul appel restant est serveur, via `supabase.rpc` direct) et peut partir avec son `revoke`.

---

### §4 — Membres : des chiffres, des segments en lecture, et pas une seule ligne

**MONTRE.** Titre « Membres » + rappel du compteur (`aria-live="polite"`). Puis la barre des segments, **sortie de `join_open`** : aujourd'hui `{space?.join_open && (` (`:454`) enveloppe le bloc segments (`:458-554`), donc **un cercle à liste importée ne peut créer aucun segment**, alors que segmenter sert à **cibler** et n'a rien à voir avec recruter. Rien en base ne lie les deux.

Deux chiffres en tête — « 12 segments · 3 sous le seuil de 5 » — puis **au plus 6 puces** « nom · effectif », triées **effectif < 5 d'abord** (elles exigent une décision : elles rendent une consultation scellée impossible, `v_min = 5`, `audience-p1.sql:47`), puis `rank`/`position`. Excédent : « + 6 autres segments → ».

> **J'accepte le BLOQUANT 2 de Sceptique 1, contre le §4 de la spec d'entrée.** Celle-ci se contredisait : son §4 faisait « la puce *+ segment* révèle en place le champ », pendant que sa propre section B écrivait « **remède : interdire le contrôle de création sur le tableau de bord** […] à cette condition **seulement** B devient réglé ». Le §4 livrait donc précisément la version que B qualifie de « seule décision de ce lot qui peut faire empirer les choses ».
>
> **Décision : aucun levier de segment sur le tableau de bord. Le champ « + segment » descend en `/membres`, à côté de l'affectation.** Sinon on crée « Lyon » sur une page et on cherche les Lyonnais sur une autre — la distance passe de ~170 lignes de scroll à une **navigation avec perte de contexte**.

**Où passe la ligne, exactement :**

| Élément | Verdict | Motif |
|---|---|---|
| **Effectif** d'un segment | **reste** (lecture) | chiffre d'état — problème N : `memberSegs` est chargé `:128-130` et jamais agrégé |
| **Créer** un segment | **part** (§8) | levier, mais indissociable de l'affectation (B) |
| **Affecter** membre par membre | **part** (§8) | 200 membres × `<select>` de 12 = 200 sélecteurs et 2 400 `<option>` montés d'un coup (`:353-365`) |
| **Supprimer** un segment | **part** (§8) | geste destructif à cascade (`ON DELETE CASCADE`), rendu par un `×` de ~15 px sans padding (`:513`), sous le minimum WCAG 2.5.8 |

**PERMET.** **Rien.** C'est une barre de lecture. Aucun geste destructeur sur ces puces — aujourd'hui cliquer une puce de segment sur une ligne de membre **désaffecte silencieusement** (`:341-350`) : le geste le plus naturel est le plus destructeur.

**OUVRE VERS.** Une puce → `/espaces/<id>/membres?segment=<id>` ; « + N autres » et le compteur → `/espaces/<id>/membres#segments` ; bouton secondaire « Gérer les membres → » → `/espaces/<id>/membres`.

> **Les puces DOIVENT être des liens pré-filtrés.** Un animateur qui affecte des segments toutes les semaines paie le déplacement en §8. Si les puces ne portent pas `?segment=<id>`, le geste passe de 1 clic à 3 et la refonte sera vécue comme une régression.

**SOURCE.** Dérivé — inversion de `memberSegs` (`Record<memberId, segmentId[]>` → `Record<segmentId, count>`) dans un `useMemo`. Zéro requête neuve. Si `segErr`, la barre rend « segments indisponibles — Réessayer ».

*Note de confidentialité :* afficher « Avancé · 3 » n'est **pas** un ratio de participation — c'est le décompte de son propre roster par son animateur, il ne dit rien d'un bulletin. La règle des 5 ne s'y applique pas ; elle s'applique à l'émargement du §3.

---

### §5 — Adhésions : un état, un chiffre daté, des réglages repliés

**MONTRE.** Titre `Org.circle`, **à réécrire en « Ouvrir les adhésions »** (le titre doit dire ce qu'on y fait). L'état de `join_open` — la case vit désormais au §2. Si `join_open` : **un chiffre daté**, « 3 demandes en attente, la plus ancienne depuis 68 h », le ⚠ REDTXT au-delà de 48 h. **Sans liste, sans nom, sans adresse.**

> **J'accepte la correction 4a de Sceptique 1.** La spec d'entrée justifiait ce chiffre par un besoin de diagnostic — « distinguer *personne n'a cliqué* de *dix personnes dont l'email de confirmation n'arrive pas* » — auquel **un entier ne répond pas**. « 3 en attente » signifie soit trois clics d'il y a deux minutes (rien à faire), soit trois confirmations perdues à 70 h de la péremption (**fenêtre de 72 h, vérifiée : `expires_at default now() + interval '72 hours'`, lot2:66**), irrattrapable. **L'information discriminante est l'ÂGE de la plus ancienne, pas le compte.**
>
> **Le contrat de la RPC devient `{count int, oldest_at timestamptz}`.** Jamais un nom, jamais une adresse : `scrutin_join_requests` a la RLS active et **zéro policy délibérément** (vérifié, `lot2:80-82` — « la file contient des emails NON confirmés »), et rendre une adresse rouvrirait l'oracle d'appartenance que ce zéro-policy protège. Un horodatage n'identifie personne.

**PERMET.** Sous un `<details>` (usage légitime : ensemble de champs **fixe**), les quatre réglages existants, logique inchangée :
1. lien `/cercle/<join_token>` + copie (`:465-478`), le `<code>` devenant **un lien ouvrable** — c'est la seule page où le pitch et l'engagement de rythme s'affichent, et l'animateur ne l'a jamais vue ;
2. lien de conversation `chat_url` (`:481-489`) ;
3. pitch (`:492-499`) ;
4. rythme `solicit_per_day` (`:538-552`).

**Le bloc des segments n'y est plus** (parti au §8).

Chaque enregistrement reçoit une **coche verte transitoire**, patron de `copiedJoin` : l'animateur prend ici un engagement opposable à ses membres sans savoir aujourd'hui s'il a été enregistré.

**Le bouton copier, dernier échec silencieux.** `:468-477` passe au vert « Copié » **inconditionnellement** : hors contexte sécurisé ou permission refusée, l'animateur colle autre chose dans WhatsApp et ne l'apprend qu'à l'autre bout. La page promettant désormais beaucoup moins, celui-ci devient le plus visible : **attendre la promesse de `writeText`, traiter l'absence d'API comme un échec.**

**OUVRE VERS.** `/cercle/<join_token>`, nouvel onglet.

**SOURCE.** Colonnes déjà chargées (`join_open`, `join_token`, `pitch`, `chat_url`, `solicit_per_day` dans `SPACE_COLS`, `events.ts:133-134`, **vérifié**). Le chiffre daté = **RPC neuve `get_space_join_pending(p_space_id)`**, `security definer`, retournant `{count, oldest_at}` **et rien d'autre**.

---

### §6 — Zone rouge : supprimer le cercle

**MONTRE.** Rien tant qu'on n'a pas cliqué : un lien discret, puis la carte rouge à recopie du nom (`:576-606`), **conservée telle quelle**.
**PERMET.** La suppression, à l'identique. **Un seul changement** : `onDeleteSpace` (`:190-194`) reçoit un `try/catch` et ne pousse vers `/espaces` **qu'en cas de succès** — aujourd'hui l'animateur retape le nom exact, le bouton ne fait rien, et il en conclut que Placet ne sait pas supprimer.
**OUVRE VERS.** `/espaces` après succès.
**SOURCE.** `space.name` déjà chargé. Zéro requête neuve.

---

### §7 — État premier jour : la page ne montre aucun zéro

**MONTRE.** Condition **stricte** : `members.length === 0 && events.length === 0`, **et seulement après que §0 a garanti que la vague 1 a RÉUSSI**. Alors §1 à §5 ne sont pas rendus : ni « 0 membre », ni « 0 sollicitation », ni barre de segments vide, ni compteur de demandes à zéro — un tableau de bord de zéros n'apprend rien et fait croire à une panne.

À la place, **une carte unique de mise en route** : trois étapes numérotées portant chacune son état (à faire / fait) — 1. ajouter des membres · 2. facultatif : créer un segment · 3. poser la première question.

**PERMET.** C'est le **seul** endroit où le bloc de collage + aperçu + import (`:373-431`) est rendu en place, **et c'est ce qui justifie qu'il quitte la page partout ailleurs** : à cet instant précis ce n'est pas une énumération mais l'unique geste à faire, et l'aperçu (`previewAdd/Dup/Bad`, `:401-405`) décrit le presse-papier, pas le cercle.

**Cas intermédiaire à ne pas confondre** : `members > 0 && events.length === 0` → **tableau de bord normal**, la carte du §3 rendant un état vide **avec son CTA dedans** (patron `MesScrutinsScreen.tsx:200-230`). Cela supprime au passage `Org.eventsSubtitle`, qui écrit aujourd'hui « Créez-en une depuis la carte du haut » — un itinéraire rédigé à l'intérieur d'une page de 342 lignes de rendu.

**Le lien avec §0 est indissociable.** `members.length === 0 && events.length === 0` est **exactement** ce que produit un `load()` en échec aujourd'hui. Livrer §7 sans les trois sorties, c'est offrir un bloc de collage à l'animateur d'un cercle de 200 personnes dont la requête a échoué.

**OUVRE VERS.** Étape 3 → `/new?espace=<id>`. La page bascule d'elle-même sur §1-§6 au premier membre.
**SOURCE.** Dérivé (`members.length`, `events.length`, déjà chargés `:121`).

---

## 3. Les vues de gestion

### Mécanisme retenu : **des routes dédiées**

`src/app/[locale]/espaces/[id]/membres/page.tsx` et `.../consultations/page.tsx`, 9 lignes chacune sur le patron **exact** de `espaces/[id]/page.tsx` (vérifié, 9 lignes), montant un composant client enveloppé dans `OrgShell` (`SpacesHome.tsx:30`, **vérifié exporté**).

**Cinq arguments, tous vérifiés dans ce dépôt :**

1. **Le coût d'une route vient de s'effondrer.** `Nav` se monte sans prop (`Nav.tsx:26-29`) ; `OrgShell` est exporté et déjà réutilisé par `SpaceDashboard.tsx:264-268` et `EventEditor.tsx:32`. Une vue = 1 `page.tsx` de 9 lignes + 1 composant. **Aucune infrastructure à écrire.**
2. **Le retour existe déjà, traduit.** `Org.backToSpace` = « ← Retour au cercle » est présent dans les 4 langues et n'a **qu'un** appelant (`EventEditor.tsx:349`) : **zéro clé i18n de retour à créer**. Le précédent est exact — `EventEditor` est déjà une vue de gestion atteinte par route depuis le tableau de bord.
3. **L'URL est le seul mécanisme qui rend le vœu du fondateur ADRESSABLE.** « 3 sans adresse » ne devient un levier que si le chiffre est un lien. Ni un `<details>` ni un panneau ne peut porter un état de filtre pré-réglé depuis ailleurs.
4. **Le bouton retour et le geste système mobile.** Avec `<details>`, l'état ouvert n'est nulle part : le retour quitte la page. Le seul précédent de superposition du dépôt (`AboutPlacet.tsx:87-104`) n'intercepte pas `popstate` — le geste retour d'Android tuerait la page entière. Avec une route : retour = tableau de bord, gratuitement.
5. **Le poids embarqué.** `buildPreview` + `splitLine` + `looksLikeHeader` (`:53-93`) et tout le bloc collage/aperçu/import (`:373-431`) sont chargés par **tout** visiteur du tableau de bord. Déplacés, ils sortent du bundle (code-splitting App Router), et le `Link` les préfetche au survol.

**Pourquoi pas `<details>`** : il déplie **en place**, donc le fichier de 609 lignes absorberait en plus recherche, filtres et pagination ; l'état n'est ni partageable ni restauré ; et sur mobile, déplier 200 lignes produit un document de plusieurs milliers de pixels mis en page d'un coup. **Surtout, il viole la consigne à la lettre.**

**Pourquoi pas un panneau superposé** : il faudrait réécrire `createPortal`, `role="dialog"`, `aria-modal`, Échap, focus rendu à l'ouvrant — et `AboutPlacet` ne verrouille ni le défilement du corps ni la tabulation. Il faudrait un `zIndex` au-dessus de la nav collante (`Nav.tsx:56-58`, z-index 50), donc **masquer la navigation pendant une tâche qui dure**. Et aucune URL, donc rien des points 3 et 4.

**Nommage.** `/espaces` **ne change pas** (il est dans des emails). Les segments neufs prennent le vocabulaire du 2026-08-07. Aucune localisation d'URL : `routing.ts` n'a pas de table `pathnames`.

**Facettes et URL, la règle de partage.** Les **facettes** vont dans l'URL (`?segment=`, `?filtre=`, `?public=`, `?etat=`), posées par **`router.replace` et non `push`** : le bouton retour doit ramener au tableau de bord, pas parcourir douze états de filtre. La **recherche ne va JAMAIS dans l'URL** : une chaîne saisie dans « chercher un nom » est une donnée personnelle, et une URL se colle dans un chat. Elle reste en état React.

**Frontière `<Suspense>` obligatoire.** Lire `useSearchParams` dans un composant client l'impose dans la page serveur, sinon le build Next 15 échoue au prerender. Le dépôt l'a déjà rencontré et documenté (`m/[token]/page.tsx:10-15`, **vérifié**). À poser **dès le premier fichier**, pas après le premier build rouge.

**`robots` sur les deux routes neuves** : `robots: { index: false, follow: false }`, sur le modèle de `m/[token]/page.tsx:6`. `espaces/[id]/page.tsx` n'en a **pas** (vérifié) et `robots.ts` ne l'interdit pas — **incohérence réelle à corriger dans le même passage.**

**Pas de troisième vue.** Une route `/segments` recréerait **au niveau du routage** le problème B, et devrait recharger `listMembers` + `listMemberSegments` pour n'afficher que des sommes. Un segment n'a pas d'existence hors de « quels membres » : **sa vue de gestion EST la vue des membres.**

---

### §8 — `/espaces/<id>/membres` — titre « Membres »

**Composant** `MembersManager.tsx`, dans `OrgShell`.

**MONTRE.** Lien retour `Org.backToSpace` ; nom du cercle en surtitre cliquable ; `<h1>` = `Org.members` ; sous-titre `Org.membersSubtitle` ; **les quatre mêmes chiffres qu'au §1** avec `aria-live="polite"`. Puis : la bande des segments, un champ de recherche, la rangée de facettes, et la liste **bornée à 50 lignes** avec « Voir les N suivants ».

C'est **ici, et nulle part ailleurs**, que 200 lignes ont le droit d'exister : la page est faite pour ça, elle a une recherche, un filtre, une borne et une URL partageable.

Chaque ligne garde son contenu actuel : nom, badge `tagSelfJoined`/`tagImported` avec la date de consentement en `title`, email, `×N` si `weight > 1`, puces de segments, croix de retrait 28×28.

**La bande des segments** (`#segments`) : puces `[1 Roulage · 12] [2 Standard · 7] [3 Avancé · 3 ⚠]`, le champ `Org.segmentPlaceholder` + `Org.segmentAddCta`, la case « échelle » `Org.segmentRanked` (clés existantes). Le `⚠` REDTXT sous 5 personnes porte en `title` le motif exact : sous ce seuil un bulletin scellé est refusé par `circle_audience_guard`.

**Les facettes** — gabarit `MarketExplorer.tsx:318-331` (bordure 2.5px INK, `borderRadius` 11, fond INK quand active, `aria-pressed`) : « Tous (47) » · une puce par segment **portant nom et effectif** · « Sans segment (5) » · « Sans adresse (3) ». Une seule active à la fois ; le compteur est **dans** la puce, donc le chiffre existe même quand la facette n'est pas choisie.

> **Distinction capitale :** une puce de la **BANDE** filtre ; une puce sur une **LIGNE** de membre désigne son segment. Elles ne doivent **ni se ressembler ni se comporter pareil**. Aujourd'hui cliquer une puce de ligne **désaffecte silencieusement** (`:341-350`). **Correction : le texte de la puce de ligne devient inerte ; seul un `×` de 24×24 minimum retire**, avec l'`aria-label` existant `Org.segmentRemoveFromAria`.

**PERMET.** Chercher (nom + email, insensible à la casse et aux diacritiques via `normalize("NFD")`, **filtrage client** — les 200 lignes sont déjà en mémoire, aucune requête). Filtrer. Et **les six leviers qui quittent le tableau de bord, intacts** :

| Levier | Origine |
|---|---|
| Affecter un segment | `:353-365` |
| Retirer un segment d'un membre | `:341-350` |
| Retirer un membre (avec confirmation) | `:166-171` |
| Ajouter par collage et par fichier | `:373-431` + `buildPreview:66-93` |
| Créer un segment | `:518-535` |
| Supprimer un segment | `:229-234, :513` |

Plus, **en dette utile**, le **renommage de segment** — geste absent du produit : aujourd'hui renommer = détruire les rattachements (`ON DELETE CASCADE`). Aucune migration : la policy `segments_owner` est `for all`, donc un `updateSegment(id, {name, rank})` de cinq lignes dans `circles.ts`, jumeau de `deleteSegment` (`:152-156`), suffit.

**Le bloc d'ajout** est repris **tel quel**, mais glissé dans un `<details>` dont le `<summary>` réutilise `Org.addMembersTitle`, **ouvert par défaut seulement si `members.length === 0`** : c'est un geste d'amorçage, pas un geste quotidien.

**Le `<select>` par ligne et son remplacement.** Aujourd'hui chaque ligne monte un `<select>` de tous les segments non affectés, dans un `members.map` sans borne : **200 sélecteurs et jusqu'à 2 400 `<option>`** au premier rendu. Remplacement : la ligne n'affiche qu'un bouton `Org.segmentAdd` (existante) ; un état `segEditing: string | null` fait qu'**un seul `<select>` existe dans le document**, monté au clic, auto-focalisé, refermé au `onChange` ou `onBlur`. Prix assumé : deux clics au lieu d'un. Gain : 2 399 nœuds en moins, et combiné au bornage à 50, le pire cas passe de 200 sélecteurs à 1.

**Discipline d'écriture, obligatoire.** Chaque écriture pose son erreur **au contact de son champ** et n'applique l'état local **qu'en cas de succès**. Aujourd'hui `toggleMemberSegment` (`:236-243`), `removeSegment` (`:229-234`) et `onRemoveMember` (`:166-171`) écrivent l'état **sans aucun `try/catch`** : l'écran affirme un rattachement que la base n'a pas, **et la consultation part à un segment amputé**. Reprendre ces fonctions telles quelles transporterait le défaut dans l'écran qui sert précisément à préparer un ciblage. Resynchroniser par `listMemberSegments`.

Et `addSegment` **impute aujourd'hui tout échec à un doublon** (`:223-226`) : le nouveau code doit **lire le message** et ne rendre `Org.segmentDuplicate` que sur la violation de l'index unique `scrutin_segments_space_name_key` sur `(space_id, lower(name))` — sinon un échec réseau s'affiche comme « ce nom existe déjà ».

**ÉTATS VIDES — deux, à ne pas confondre :**
- **nº1, cercle sans membre** : `Org.noMembers` (existante) + le `<details>` d'ajout ouvert.
- **nº2, recherche ou facette sans résultat** — *celui qui manque partout aujourd'hui* : `Org.membersNoMatch` + bouton `Org.clearFilters`. **JAMAIS `Org.noMembers`** : dire « Aucun membre » à quelqu'un qui en a 200 et a mal tapé trois lettres est un mensonge d'écran.

**OUVRE VERS.** Rien — c'est une feuille. Retour par `Org.backToSpace` **et** par le bouton du navigateur (les facettes passent par `router.replace`).

**SOURCE.** `listMembers` (`events.ts:248`), `listSegments`/`createSegment`/`deleteSegment`/`listMemberSegments`/`assignSegment`/`unassignSegment` (`circles.ts:130-189`, **vérifiés**), repris tels quels. `updateSegment` à écrire (5 lignes, zéro migration). **Aucune RPC neuve.** Doit refaire pour son compte **les trois sorties du §0**.

---

### §9 — `/espaces/<id>/consultations` — titre « Consultations »

**MONTRE.** Lien retour `Org.backToSpace` ; `<h1>` = `Org.events` ; la rangée de facettes de public ; puis **trois blocs triés PAR ÉTAT et non par date** : « En cours » (`status='open'`) · « Brouillons » · « Closes » (repliées dans un `<details>` — ensemble fixe de trois blocs, pas une collection cachée).

Aujourd'hui `listEvents` trie `created_at desc` (`events.ts:321-330`, **vérifié**), donc **une consultation ouverte se cache sous trois brouillons plus récents**.

Chaque ligne reprend le gabarit enrichi du §3.

**La facette « public convoqué »** : « Tous » + une puce par valeur distincte d'`audience_label` + **une puce distincte « Public non enregistré »** pour `null`.

> **J'accepte la correction 1 de Sceptique 2 sur ce point précis.** Agréger les `null` sous « Tout le cercle » regrouperait sous une seule puce des consultations aux rosters **entièrement différents** — puisque tout le parcours `EventEditor` écrit `null`. La puce s'appelle donc **« Public non enregistré »** (`Org.audienceUnknown`, neuve), et **`Org.audienceAll` (« Tout le cercle ») n'est employée qu'après la voie (a) du P2**, quand le label est réellement écrit à l'ouverture.

Le filtre porte sur le **texte figé à la convocation**, jamais sur le segment d'aujourd'hui. C'est la bonne sémantique : « les consultations qui ont convoqué X », pas « celles qu'un membre de X verrait aujourd'hui ». Ce filtre ne révèle rien : l'animateur sait déjà ce qu'il a convoqué, puisque c'est lui qui l'a choisi. **Aucun seuil ne s'y applique.**

**PERMET.** Filtrer, chercher, ouvrir. **Aucune écriture** : la gestion d'une consultation appartient à `/evenement/<id>`, qui la porte déjà entièrement.

**Ce que la vue ne fait JAMAIS** : ventiler la participation **par segment** (ce croisement se manipule tant que `scrutin_event_members` ne fige pas le segment à la convocation — la table ne porte aucune colonne de segment) ; afficher un ratio quand le public convoqué compte moins de 5 personnes ; afficher un dépouillement ; nommer les non-répondants ; rafraîchir un compteur en direct.

**OUVRE VERS.** `/evenement/<id>` ; retour `/espaces/<id>`.

**SOURCE.** `listEvents` + `audience_label` ajouté à `EVENT_COLS` et `EventRow` ; participation par la **même** `get_space_event_stats`, appelée une fois. Trois sorties du §0 refaites.

---

## 4. Ce qui disparaît de la page actuelle, et où ça va

| Lignes | Élément actuel | Destination | Forme d'arrivée |
|---|---|---|---|
| `53-93` | `splitLine`, `looksLikeHeader`, `buildPreview` | **§8** `/membres` | tel quel (sort du bundle du tableau de bord) |
| `269` | Lien retour `Org.back` | **§1** | inchangé |
| `270-272` | `<h1>` **inerte** | **§1** | `<input>` de renommage, `onBlur → updateSpace({name})` |
| `273` | `Org.spaceDashSubtitle` | **supprimé** | remplacé par la ligne de 4 chiffres |
| `282-301` | Carte d'action, 2 boutons | **§2** | + compteur du jour, + case `join_open`, + avertissement |
| `304-309` | Titre « Membres » + compteur | **§4** | + « 12 segments · 3 sous le seuil » |
| `312` | `Org.noMembers` | **§7 / §8** | §7 si cercle neuf, §8 en état vide nº1 |
| `313-370` | **`members.map` NU, sans borne** | **§8** | liste bornée à 50 + recherche + facettes |
| `335-352` | Puces de segment **cliquables = désaffectation** | **§8** | **texte inerte + `×` 24×24 séparé** |
| `353-365` | **`<select>` par ligne** (2 400 `<option>`) | **§8** | **un seul `<select>`, monté au clic** (`segEditing`) |
| `368` | Croix de retrait de membre | **§8** | inchangée (28×28) |
| `373-431` | Bloc collage + aperçu + import | **§7 et §8** | §7 en place (seul geste) ; §8 dans un `<details>` |
| `437` | Titre `Org.circle` | **§5** | réécrit « Ouvrir les adhésions » |
| `438-446` | **Case `join_open`** | **§2** | là où son absence fait échouer le bouton |
| `450-452` | `circleErr` **unique, au-dessus d'un repli** | **§5 / §8** | erreur **au contact du champ** concerné |
| `454` | **`{space?.join_open && (`** | **supprimé** | c'est le problème A : il enfermait les segments |
| `458-461` | `<details>` `Org.circleSettings` | **§5** | conservé (usage légitime : champs fixes) |
| `464-478` | Lien d'adhésion + copie | **§5** | `<code>` → lien ouvrable ; copie **attend la promesse** |
| `480-490` | `chat_url` | **§5** | + coche verte transitoire |
| `492-499` | Pitch | **§5** | + coche verte transitoire |
| `501-536` | **Bloc segments (création/suppression)** | **§8** | descend **avec** l'affectation (bloquant 2) |
| `507-517` | Puces de segment sans effectif | **§4 (lecture) + §8 (gestion)** | **+ effectif, + ⚠ < 5**, triées |
| `513` | `×` de ~15 px sans padding | **§8** | croix 24×24 conforme WCAG 2.5.8 |
| `538-552` | Rythme `solicit_per_day` | **§5** | + coche verte ; **son chiffre remonte au §2** |
| `560-562` | Titre + `Org.eventsSubtitle` | **§3** | sous-titre **supprimé** (itinéraire faux) |
| `564` | `Org.noEvents` | **§3** | état vide **avec CTA dedans** |
| `565-572` | Liste des consultations (titre + statut) | **§3 (≤3 en cours) + §9 (toutes)** | lignes enrichies, tri par état |
| `568-570` | Capitales espacées | **§3 / §9** | pastille `MesScrutinsScreen.tsx:104-124` |
| `576-606` | Zone rouge | **§6** | inchangée, sauf `try/catch` sur `:190-194` |

**Aucun des 15 leviers n'est perdu.** Tous sont réattribués nommément.

---

## 5. Le sort des 17 problèmes

| | Problème | Sort | Où, et sous quelle condition |
|---|---|---|---|
| **A** | Segments enfermés sous `join_open` (`:454`) | **réglé (§4 + §8)** | La condition `{space?.join_open && (` **disparaît**. ⚠ **Ne se livre qu'avec L** : côté base, `circle_audience_guard` renvoie encore `not_a_circle` si `not s.join_open` (`:53`) — sans la case remontée au §2, on créerait des segments qu'on ne peut toujours pas viser. |
| **B** | Création et affectation séparées de ~170 l. | **réglé (§8)** — *et non « aggravé »* | **Uniquement parce que j'applique le bloquant 2** : création **et** affectation descendent ensemble en `/membres`. Le tableau ne porte que l'état. Mieux qu'avant : la sous-vue porte la barre de puces filtrantes. |
| **C** | Ordre d'amorçage, 252 l. sur 342 | **réglé (§1-§6)** | Par soustraction : les deux blocs expulsés (`:313-370`, `:373-431`) **sont** les 252 lignes. Hauteur désormais **constante**, indépendante de la taille du cercle. |
| **D** | Un seul chiffre d'état sur toute la page | **réglé (§1, §2, §3, §4, §5)** | Rendu **obligatoire** par la contrainte : sans énumération, il ne reste que des chiffres. Tous dérivés, zéro requête neuve en P0. |
| **E** | Ligne de consultation = titre + statut | **réglé (§3 + §9)** | `closes_at` et `secret_ballot` sont **déjà** dans `EVENT_COLS` et ont **zéro occurrence** dans le fichier. `audience_label` : voir la réserve du §3. |
| **F** | Aucune participation affichée | **réglé (§3), P2** | Un chiffre unique, chargé **une fois**, sur la consultation en cours. **Bloqué derrière H.** |
| **G** | `countEventVoters` vaut 0 en scellé | **réglé (§3)** | Le chiffre vient de `scrutin_event_signins` via RPC, **jamais** de `countEventVoters`. ⚠ **Correction de l'audit** : `countEventVoters` **a un appelant vivant** (`EventEditor.tsx:170`) — **ne pas le supprimer**. |
| **H** | Dépouillement lisible pendant le vote | **sans objet ici — mais BLOQUANT pour F** | Autre lot. La contrainte **réduit** l'exposition (plus de colonne de compteurs) mais ne la ferme pas : `EventEditor.tsx:164-182` sonde la même donnée toutes les 12 s. |
| **I** | Seuil comptant des bulletins, pas des personnes | **sans objet** | Défaut de base pur, lot sécurité, avant toute exposition de participation. |
| **J** | Seuil de 5 sur l'union, jamais sur chacun | **réglé côté SIGNAL (§4 + §8)** | La faille se corrige **en base** (`audience-p1.sql:65-68`). Le ⚠ par segment est le signal visible. **Le vrai lieu du signal reste `CreateAudienceBlock.tsx:102-112`** — le `<select>` de ciblage n'affiche aucun effectif : l'animateur choisit à l'aveugle et se fait refuser au lancement. |
| **K** | `get_event_voted_members` exposé, wrapper mort | **sans objet — dissous** | **Vérifié** : `getVotedMemberIds` (`events.ts:540`) a **zéro appelant** ; le seul appel restant est serveur (`api/events/[id]/remind/route.ts`, via `supabase.rpc` direct). Le seul écran qui l'aurait justifié — une liste nominative de non-répondants — est désormais interdit. Suppression du wrapper + `revoke`, **sans arbitrage**. |
| **L** | Bouton principal échoue sur `join_open=false` | **réglé (§2)** | Avertissement portant la case. ⚠ **Nuance** : les deux boutons n'ont pas le même défaut — `actionAsk` est refusé **trop tard** ; `actionSequence` **n'est jamais refusé**, `EventEditor` ouvrant par un `updateEvent` nu qui ne passe par **aucune** garde. |
| **M** | Plafond du jour répondu après lancement | **réglé (§2)** | Compteur dérivé, **début de jour en UTC**. ⚠ **Corrigé** : ne désactiver que « Poser une question » — un brouillon ne consomme rien. |
| **N** | Aucun effectif de segment nulle part | **réglé (§4 + §8)** | `useMemo` d'inversion de `memberSegs`. Borné à 6 puces + excédent. Aucun geste destructeur sur ces puces. |
| **O** | Six écritures muettes, `load()` avalant tout | **réglé (§0) — PRÉALABLE, plus une finition** | `try/catch` sur `:131-133, 154-156, 169, 190-194, 231, 237-238`. ⚠ **Deux drapeaux par vague**, pas un `finally` global. Sans O, la contrainte livrée seule est **strictement pire** que l'état actuel : « 0 membre · 0 consultation » est un tableau plausible et faux. |
| **P** | Nom du cercle inerte | **réglé (§1)** | `<input>`, `onBlur → updateSpace({name})`. `renameSpace` (**zéro appelant, vérifié**) se supprime. |
| **Q** | Vocabulaire | **sans objet** | Réglé par 87962b6. **Résidu** : `Org.eventsSubtitle` (« Créez-en une depuis la carte du haut ») devient faux → supprimé × 4 langues. |

**Bilan : 0 problème perdu.** 10 réglés sur le tableau de bord, 4 dans une sous-vue, 3 sans objet. **B n'est plus « aggravé »** — à la seule condition que le bloquant 2 soit appliqué.

**Problème NEUF créé par la contrainte, couvert par le §7** : l'état vide. Un cercle qui vient de naître n'a rien à gouverner ; une grille de zéros y serait plus décourageante que la page actuelle.

---

## 6. Les lots

### P0 — livrable seul · **zéro migration, zéro RPC**

**Apporte** : §0 (deux drapeaux) · §1 (4 chiffres + renommage) · §2 (compteur UTC + case + avertissement) · §3 **sans participation et sans nombre de questions** · §4 (segments en lecture, hors `join_open`) · §5 **sans le chiffre de demandes** · §6 · §7 · §8 `/membres` complet · §9 `/consultations` **sans participation, avec la facette limitée aux labels non-null + « Public non enregistré »**.

Plus : `audience_label` ajouté à `EVENT_COLS` et `EventRow` (**2 lignes**) ; `updateSegment` dans `circles.ts` (**5 lignes**) ; suppression de `renameSpace` et `getVotedMemberIds` ; `try/catch` sur les six écritures muettes ; copie qui attend la promesse ; `robots` noindex sur les 2 routes neuves **et** sur les 2 existantes.

**Coûte** : ~15 clés i18n neuves × 4 langues (`spaceNotFound`, `renameSpaceAria`, `needsCircleForAudience`, `audienceUnknown`, `searchMembers`, `filterAll`, `filterNoSegment`, `filterNoEmail`, `membersNoMatch`, `clearFilters`, `showMore`, libellés d'excédent et de mise en route), 2 réécritures (`Org.circle` → « Ouvrir les adhésions », `Org.members`), 1 suppression (`Org.eventsSubtitle`). **Insérer au même rang dans les 4 fichiers** — `scripts/i18n-parity.mjs` auto-découvre les locales et cassera le build sur un oubli. Le ciblage quotidien s'allonge d'un clic (atténué par les puces pré-filtrées).

### P1 — deux RPC, aucune donnée de bulletin

**Apporte** :
- `get_space_join_pending(p_space_id)` → **`{count int, oldest_at timestamptz}`**, `security definer`. Rend le §5 actionnable.
- `get_space_event_stats(p_space_id)` → par consultation : **`polls_count`, `convened_count`** (et **rien sur les bulletins**). Complète la ligne 2 du §3 et du §9 : nombre de questions, et « N convoqués » quand `audience_label` est null.

**Coûte** : deux fonctions SQL. **Le piège déjà consigné, non négociable** :
```sql
revoke all on function public.get_space_event_stats(uuid) from public, anon;
grant execute on function public.get_space_event_stats(uuid) to authenticated;
```
**`grant to authenticated` NE SUFFIT PAS : PUBLIC détient l'EXECUTE par défaut.** `revoke` **avant** le `grant`, dans cet ordre. Et `get_space_join_pending` ne renvoie **jamais** de nom ni d'adresse : `scrutin_join_requests` a la RLS active et **zéro policy délibérément** — rendre une adresse rouvrirait l'oracle d'appartenance que ce zéro-policy protège.

### P2 — après le correctif H, et pas avant

**Apporte** : `signed_count` ajouté à `get_space_event_stats` → le **ratio d'émargement** « 18/24 ont émargé » au §3 et au §9, avec le plancher de 5 convoqués. Plus : voie (a) sur `audience_label` — écrire le label au passage brouillon→ouvert dans `EventEditor` (un `update`, pas une migration), ce qui rend `Org.audienceAll` enfin légitime. Plus : `assign_segment_bulk(p_member_ids uuid[], p_segment_id uuid)` + barre de sélection multiple en `/membres`. Plus : effectif et ⚠ portés dans `CreateAudienceBlock.tsx:102-112` (le vrai lieu du signal J).

**Coûte** : **ORDRE NON NÉGOCIABLE.** `get_event_results_owner` ne teste pas le statut, `event_results_payload` renvoie `'closed'` en dur, et `EventEditor.tsx:643` monte les résultats dès `status !== 'draft'`. Un compteur de participation dit alors à l'animateur **le moment exact** où envoyer un lien individuel et relire le delta : **la variation d'une voix EST le bulletin de cette personne.**

**Non tranché, à ne pas livrer sans décision** : la sélection multiple sans `assign_segment_bulk` est une boucle de N appels REST (`assignSegment` est unitaire, `circles.ts:173`). Douze membres passent, deux cents non. Soit on borne l'action à la page visible (50), soit on écrit la RPC.

---

## 7. Critères de recette

**Chargement et mensonges d'écran**
1. Couper le réseau, ouvrir `/espaces/<id>` → carte d'erreur + « Réessayer ». **Jamais** « 0 membre · 0 consultation », **jamais** la carte de mise en route.
2. Laisser passer la vague 1 et faire échouer la vague 2 (bloquer `scrutin_segments`) → §1 et §3 se rendent ; le §4 affiche **« segments indisponibles — Réessayer »** ; le 4ᵉ chiffre « sans segment » **est absent**. Jamais « 0 segment ».
3. Coller `/espaces/<id-d-un-autre>/membres` dans une session tierce → **« Ce cercle n'existe pas, ou vous ne l'animez pas »**. Jamais une vue « Membres » vide.
4. Même test sur `/espaces/<id>/consultations`.

**La contrainte**
5. Cercle de 200 membres : ouvrir le tableau de bord, inspecter le DOM → **zéro `<option>`, zéro ligne de membre, zéro `<select>`**. Compter les nœuds : la hauteur de page est la même qu'avec 8 membres.
6. Cercle à 12 segments → **au plus 6 puces**, les `< 5` en tête, puis « + 6 autres segments → ».
7. Cercle à 5 consultations ouvertes, `solicit_per_day` nul → **3 lignes**, triées par `closes_at` croissant, **« + 2 en cours » en CORAL** (pas en gris), lié à `?etat=ouvert`.
8. Une consultation à `closes_at` null → triée **en dernier**, jamais devant une échéance datée.
9. Cliquer le titre « AG 2026 » sur le tableau de bord → `/evenement/<id>` **en un seul clic** (non-régression contre `:565-572`).

**Les portes**
10. Cercle avec 3 membres sans email → « 3 sans adresse » en REDTXT ; cliquer → `/membres?filtre=sans-email`, liste déjà filtrée sur ces 3.
11. Cercle **100 % importé** → le chiffre « par le lien » **n'apparaît pas** (pas de « 0 » décoratif).
12. Cercle **sans aucun segment** → le chiffre « sans segment » **n'apparaît pas** (sinon il vaudrait 47 en rouge sur un cercle sain).
13. Cliquer la puce « Avancé · 3 » → `/membres?segment=<uuid>`, filtrée. Bouton retour du navigateur → **tableau de bord**, pas un état de filtre intermédiaire.
14. Changer 12 fois de facette dans `/membres`, puis bouton retour → **une seule pression** ramène au tableau de bord (preuve que c'est `router.replace`).
15. Chercher « dupont » dans `/membres`, copier l'URL → **la chaîne cherchée n'y figure pas**.

**Les gardes et les refus**
16. Cercle `join_open = false` (le défaut) → l'avertissement du §2 est visible **avant** tout clic, et porte la case. Cocher la case → l'avertissement disparaît sans rechargement.
17. Cercle avec `solicit_per_day = 2` et 2 consultations non-brouillons créées aujourd'hui → « 2 / 2 » en REDTXT ; **« Poser une question » désactivé** ; **« Préparer une consultation » RESTE ACTIF** et aboutit à un brouillon.
18. À 23 h 30 heure locale (UTC+2), vérifier que le compteur du jour correspond au refus réel de la base (calcul en UTC).

**Le public convoqué**
19. Créer une consultation par « Préparer une consultation », convoquer 6 membres sur 47, ouvrir → la ligne 2 du §3 affiche **« 6 convoqués »** (P1) ou **omet le public** (P0). **Jamais « Tout le cercle ».**
20. Dans `/consultations`, cette consultation tombe sous la puce **« Public non enregistré »**, jamais sous « Tout le cercle ».
21. Renommer un segment dans `/membres` → une consultation **déjà tenue** qui l'avait convoqué garde son ancien `audience_label`. **L'histoire n'est pas réécrite.**

**Les écritures qui mentaient**
22. `/membres`, bloquer le réseau, cliquer « + segment » sur un membre → l'écran **n'affiche pas** le rattachement, l'erreur apparaît **au contact de la ligne**. Recharger : la base et l'écran concordent.
23. Créer un segment nommé « Lyon » alors qu'il existe → `Org.segmentDuplicate`. Créer un segment **réseau coupé** → un message d'erreur réseau, **pas** « ce nom existe déjà ».
24. Cliquer le **texte** d'une puce de segment sur une ligne de membre → **rien ne se passe** (non-régression contre la désaffectation silencieuse `:341-350`). Seul le `×` retire, et il mesure ≥ 24×24.
25. Zone rouge, réseau coupé, retaper le nom exact, valider → message d'erreur visible, **pas** de `push` vers `/espaces`.
26. Renommer le cercle en ligne, quitter le champ, recharger → le nouveau nom persiste.
27. Cliquer « Copier le lien » dans un contexte non sécurisé (http) → **un échec visible**, jamais la coche verte.

**Les états vides**
28. Cercle neuf (0 membre, 0 consultation) → **carte de mise en route seule**, avec le bloc de collage. Aucun « 0 » nulle part.
29. Ajouter un membre → la page bascule **d'elle-même** sur §1-§6 ; le bloc de collage **disparaît** du tableau de bord.
30. Cercle à 40 membres, 0 consultation → tableau de bord normal, la carte §3 rendant son état vide **avec le CTA dedans**.
31. `/membres`, chercher « zzzz » sur 200 membres → **`Org.membersNoMatch` + « Effacer les filtres »**, jamais `Org.noMembers`.

**Build et parité**
32. `npm run build` (preview arrêté) passe — `tsc` ne lint pas, et eslint casse le déploiement Vercel silencieusement.
33. `scripts/i18n-parity.mjs` passe sur les 4 locales.
34. Aucune page ne rend `useSearchParams` hors d'une frontière `<Suspense>` (sinon le prerender Next 15 échoue).

---

## Corrections des sceptiques que j'ÉCARTE

**Sceptique 1, complément « 2 closes récentes + compteur » — ÉCARTÉ.** L'argument est recevable sur la forme : deux lignes respectent le plafond ≤ 6. Mais elles échouent au critère (b) **au sens utile** : une consultation close ne porte **aucune décision** — rien à relancer, rien à clore, rien à surveiller. Elles occuperaient du vertical au-dessus de la ligne de flottaison mobile pour une information dont le compteur-lien donne déjà l'accès, et rouvriraient le tri par récence que le §9 remplace précisément par un tri par état.

*Concession, à coût nul :* le compteur-lien porte une **date**, pas seulement un nombre — « 17 closes · la dernière le 3 août ». L'archive devient située sans consommer une seule ligne. `closes_at` est déjà chargé.

**Sceptique 1, grief implicite du « mur de compteurs » — ÉCARTÉ contre le §3 retenu.** Il ne tient pas contre 3 lignes × 4 chiffres d'état, qui répondent bien à « lesquelles ». Il tenait contre les variantes 2 et 3 — **que je barre** (bloquant 1). Le grief est donc traité par suppression de sa cause, non par assouplissement de la règle.

**Sceptique 1, § « 5 requêtes en 2 vagues, ×3 » — ÉCARTÉ comme argument contre les routes.** Le fait est exact (le retour navigateur remonte `SpaceDashboard` et rappelle `load()`), mais il vise le **découpage**, pas la contrainte : il existe déjà aujourd'hui entre le tableau de bord et `/evenement/<id>`. La réponse, si le volume devient un sujet, est **une RPC d'agrégats côté cercle** — pas un retour au dépliage en place. Consigné comme dette, pas comme objection.

---

**Point de sécurité découvert pendant la vérification, hors périmètre de ce lot, à ouvrir séparément :** `EventEditor.tsx:229-230` ouvre une consultation par `updateEvent(eventId, { status: 'open' })` — un `update` direct qui contourne **entièrement** `circle_audience_guard`. Le seuil de 5 en scellé, le plafond `solicit_per_day` et le refus `not_a_circle` ne s'appliquent donc **qu'au parcours `/new`**. Tant que ce chemin reste ouvert, aucun avertissement d'écran ne doit être présenté comme une garantie.