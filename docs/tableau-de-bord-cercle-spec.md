# Tableau de bord de cercle — `/espaces/[id]` (`SpaceDashboard.tsx`)

> **Trois amendements postérieurs à la rédaction, à lire avant d'exécuter.**
>
> 1. **Vocabulaire** — le §2 retient « groupe » pour `scrutin_spaces`. L'arbitrage
>    rendu ensuite retient **« cercle »** (commit `87962b6`) : « groupe » porte
>    trois autres sens vivants, dont le groupe WhatsApp, et le corpus SEO
>    `/methodes` l'emploie 32 fois comme mot ordinaire. Partout où ce document
>    écrit « groupe » au sens de `scrutin_spaces`, lire **cercle**. Le reste du
>    §2 (« Membres » au lieu de « Corps électoral », le titre de la carte
>    d'adhésion, « adhérents » réservé à `self_joined`) est **déjà livré**.
> 2. **La faille de soustraction ENTRE consultations n'est pas traitée par ce
>    document**, et elle commande le lot P1. Voir §5.2 C4, qui ne borne que le
>    cas intra-consultation : deux consultations scellées sur des publics qui ne
>    diffèrent que d'une personne passent l'une et l'autre le seuil de 5, et la
>    différence des dépouillements rend le bulletin exact de cette personne. Le
>    compteur « n/N ont émargé » (E6) dit à l'animateur le moment exact où
>    frapper. **P1 ne se livre donc pas sans une garde inter-consultations** :
>    refuser d'ouvrir en scellé si la différence symétrique avec le public d'une
>    consultation scellée antérieure du même cercle est **strictement comprise
>    entre 0 et 5** (zéro exclu : deux consultations sur le MÊME public ne
>    révèlent personne, et c'est le cas le plus fréquent).
> 3. **C1 est plus urgent que le tableau de bord.** `get_event_results_owner` ne
>    teste pas le statut et `event_results_payload` renvoie `'closed'` en dur :
>    l'animateur d'une consultation scellée **ouverte** lit le dépouillement en
>    direct, et le bouton « copier le lien » par convoqué lui permet de le faire
>    varier d'une personne à la fois. C'est indépendant de ce chantier.

*Spécification prête à réaliser. Rédigée après relecture du composant (609 lignes, rendu 267→607), de `src/lib/db/{events,circles,participation}.ts`, des migrations `20260731-cercles-lot{1,2}`, `20260801-cercles-segments`, `20260805-audience-p1`, et de la base (`get_spaces_with_stats`, `close_expired_polls`, `cron.job`, `information_schema.columns`).*

---

## 0. Dédoublonnage des constats

Les six experts ont produit 50 constats. Après recoupement il reste **17 problèmes distincts**. Les fusions :

| Problème retenu | Constats qui le disaient | Statut de vérification |
|---|---|---|
| **A.** Les segments sont enfermés sous `join_open` : un groupe à liste importée ne peut en créer aucun | 4, 25, 38, 43 | ✅ `SpaceDashboard.tsx:454` enveloppe 458-554 ; `20260805-audience-p1.sql:53` renvoie `not_a_circle` |
| **B.** Création et affectation d'un segment séparées de ~170 lignes | 4, 26, 38 | ✅ création 504-536, affectation 335-367 |
| **C.** L'ordre vertical est celui de l'amorçage, pas de l'usage (252 lignes sur 342 aux deux cartes de setup, 15 aux objets vivants) | 2, 42 | ✅ mesuré : membres 304-432, cercle 435-557, suites 560-574 |
| **D.** Un seul chiffre d'état sur toute la page (`memberCount`, 307) ; `previewAdd/Dup/Bad` (402-404) décrivent le presse-papier | 3, 14, 42 | ✅ |
| **E.** La ligne d'une suite n'affiche que titre + statut, alors que `closes_at`, `quorum`, `secret_ballot`, `created_at` sont déjà en mémoire | 3, 13, 46 | ✅ `EVENT_COLS` (`events.ts:136-137`) les charge, zéro occurrence dans le composant |
| **F.** Aucune participation : `load()` (118-134) ne touche ni `scrutin_event_members` ni `scrutin_event_signins` | 3, 9, 22 | ✅ imports exhaustifs 7-30 |
| **G.** En scellé, `countEventVoters` vaut structurellement 0 | 9, 22 | ✅ `events.ts:589-601` filtre `.not("event_member_id","is",null)` ; le bulletin scellé est écrit `null` (`lot1:114-115`) et masqué par `scrutin_ballots_hide_secret` (`lot1:69-72`) |
| **H.** En scellé, le dépouillement est lisible **pendant** que le vote est ouvert → attaque différentielle | 10, 17 | ✅ `get_event_results_owner` (`lot1:241-252`) ne teste pas le statut ; `event_results_payload` renvoie `'status','closed'` en dur (`lot1:214`) ; `EventEditor.tsx:643` monte les résultats dès `status !== "draft"` |
| **I.** Le seuil de 5 compte des **bulletins**, pas des votants | 18 | ✅ `lot1:180-186` : `count(*)` sur tous les `scrutin_ballots` de l'événement |
| **J.** Le seuil porte sur l'**union** des segments visés, jamais sur chacun | 19 | ✅ `audience-p1.sql:65-68` : un seul `count(distinct ms.member_id)` |
| **K.** `get_event_voted_members` est exécutable depuis le navigateur et livre la liste nominative des émargés | 21 | ✅ `grant … to authenticated` (`lot1:289`) ; `getVotedMemberIds` (`events.ts:540`) n'a **aucun appelant** |
| **L.** Le CTA en tête de page échoue en base sur tout groupe `join_open = false` (défaut), et le refus est générique | 1, 29 | ✅ `LaunchedScreen.tsx:213-216` ne traite que `too_small`/`capped` |
| **M.** Le plafond du jour n'est répondu qu'après lancement | 11 | ✅ garde `audience-p1.sql:84-90` ; aucun compteur dans la page |
| **N.** Aucun effectif de segment nulle part | 12, 26, 29 | ✅ `memberSegs` est chargé (107, 128-130) et jamais agrégé |
| **O.** Six écritures échouent en silence ; `load()` en échec produit une page « groupe vide » ; pas de garde « ce groupe n'est pas le mien » | 8, 27, 34, 36, 37 | ✅ `catch { /* noop */ }` 131-133, 154-156 ; aucun try sur 169, 231, 237-238, 190-194 ; le rendu ne teste jamais `space === null` |
| **P.** Le nom du groupe est inerte ; `renameSpace` existe sans appelant | 5 | ✅ `events.ts:234`, zéro appelant |
| **Q.** Vocabulaire : « Corps électoral » / « Cercle » / « groupe » / « votes » sur un même parcours | 31, 45, 47, 49 | ✅ `Org.members` = « Corps électoral » face à `Org.membersSubtitle` = « Les membres du groupe » |

**Écarté / hors périmètre de cette page** (à ne pas mélanger au chantier) :

- Constat 44 (`Launched.myPolls` = « Mes consultations » alors que l'écran s'appelle « Mes scrutins ») : vrai, mais c'est l'écran de lancement, pas le tableau de bord. → ticket séparé.
- Constats 24, 47 (`Feed.named` manquant, `Org.statOpen` dit « vote ») : vrais, autres surfaces.
- Constat 32 (`join_cap` / `join_closes_at` sans interface) : vrai (`events.ts:17-18` les type, `SpacePatch` les accepte, aucun composant ne les règle) → retenu, mais en **P2**, ce n'est pas ce que le fondateur demande.
- Constat 50 (`#FFB627` en dur ligne 414 au lieu de `YELLOW`, `theme.ts:11`) : vrai, trivial, embarqué en P0.
- Constat 40 (`REDTXT = "#d23b3b"` à 4,37:1) : vrai, embarqué en P0 — un seul token, 64 usages.
- Constat 30 (segment non renommable, `deleteSegment` cascade via `20260801-cercles-segments.sql:48-51`) : vrai → P2.
- **Corrigé par rapport aux experts** : `get_spaces_with_stats` n'est **pas** `security definer` — c'est une fonction `sql stable` qui s'appuie sur la RLS, et elle ne renvoie que `id, name, created_at, members, events_open, events_closed, events_draft`. Le type `SpaceStats extends Space` (`events.ts:212-217`) promet donc `join_open`, `join_token`, `pitch`… que la RPC ne renvoie pas. Ne pas la réutiliser telle quelle pour cette page.
- **Corrigé aussi** : le constat 13 affirme qu'aucune tâche planifiée n'existe. En réalité `close_expired_polls(p_secret)` existe en base (elle ferme les **scrutins**, pas les **suites**) et un `cron.job` actif (`0 */2 * * *`) appelle l'edge function `resolve-tick`. L'infrastructure existe ; il manque l'équivalent au niveau `scrutin_events`. → P2.

---

## 1. Le parti de la page

Sept décisions, à tenir sans négocier :

1. **La page répond d'abord à « où en est mon groupe ? »**, ensuite à « que puis-je saisir ? ». Tout bloc de saisie qu'on touche une fois à l'ouverture est replié.
2. **Aucun chiffre inventé.** Chaque nombre affiché a une ligne dans le tableau §4 : soit il est dérivé de ce qui est déjà chargé, soit il vient d'une RPC nommée ici.
3. **En scellé, on montre l'émargement, jamais le bulletin.** `scrutin_event_signins` a été créé pour ça (`lot1:25-36`). Le dépouillement n'est pas une donnée de tableau de bord.
4. **On ne pose aucun compteur de participation avant d'avoir fermé le dépouillement scellé en cours de vote** (problème H). Sinon on ne fait pas un tableau de bord, on outille une attaque différentielle.
5. **Segments et adhésion sont deux choses indépendantes.** Segmenter sert à cibler ; ouvrir les adhésions sert à recruter. Rien en base ne les lie : le contrôle de propriété (`audience-p1.sql:52`), le seuil de 5 (`:47`) et « tout le segment ou rien » tiennent seuls l'invariant.
6. **Aucune route ne change.** `/espaces/[id]`, `?espace=`, `scrutin_spaces` restent. Précédent P3 : une URL n'est pas un libellé, et elle est déjà dans des emails.
7. **Le rendu ne ment jamais sur son état.** Chargement, échec, et « ce groupe n'est pas le mien » sont trois écrans distincts, aucun n'est « groupe vide ».

---

## 2. Vocabulaire tranché pour cette page

Le fondateur demande « adhérents cercle, segments ». Voici le compromis, et pourquoi.

| Objet | Mot à l'écran | Ce qui disparaît | Raison |
|---|---|---|---|
| `scrutin_spaces` | **groupe** | « Cercle » comme nom d'objet côté organisateur | Un mot par objet. « Groupe » est déjà le mot de `Nav.spaces`, du titre `Org.spacesTitle`, du champ de création. « Cercle » reste **exclusivement** le mot du membre (`Circle.*`, `/cercle/`, `/m/<token>`) — où il est déjà cohérent. |
| `join_open = true` | **adhésions ouvertes** (un **état**, pas un objet) | La carte titrée « Cercle » (`Org.circle`, ligne 1052) | En base, « cercle » n'est pas un objet mais un prédicat (`lot2:34-35`). L'écran doit dire la même chose. |
| `scrutin_members` | **Membres** | « Corps électoral » (`Org.members`) | Le mot est démenti dans sa propre carte : `Org.memberCount` dit « membres », `Org.membersSubtitle` dit « Les membres du groupe », `Org.noMembers` dit « Aucun membre ». En ES, « Cuerpo electoral » / « censo » est le vocabulaire d'une élection légale — faux pour une association. Garder « Corps électoral » **uniquement** dans `Org.convene` (contexte d'assemblée). |
| `scrutin_members` avec `self_joined = true` | **adhérents** | — | C'est ici que le mot du fondateur est **exact** : un adhérent est quelqu'un qui a rejoint par le lien. La ligne de compteur devient « 47 membres · **12 adhérents par le lien** » quand `join_open`. Un import n'est pas une adhésion, et Placet ne prétend pas détenir l'adhésion (contrainte 3). |
| `scrutin_segments` | **Segments** | — | Seul mot du produit sans homonyme. « Listes » entre en collision avec `Methods.list` (scrutin de liste), « sous-groupes » avec « groupe ». Le sens est porté par les noms que le groupe donne (« Adhésion avancée · 12 »), pas par le mot générique. |
| `scrutin_events` | **suites de questions** (organisateur) / **consultation** (votant) | — | Tranché en P3, ne pas rouvrir. |

**Trois libellés à réécrire, chacun a un seul appelant** — renommage sans effet de bord :

- `Org.members` (rendu `SpaceDashboard.tsx:306`) : « Corps électoral » → **« Membres »**
- `Org.circle` (rendu `:437`) : « Cercle » → **« Ouvrir les adhésions »** (le titre dit ce qu'on y fait, règle P0)
- `Org.actionsHint` (rendu `:284`) : la phrase « Cette page gère les listes et les groupes » emploie « groupes » au sens de segments, deux lignes sous un « ce groupe » au sens de `scrutin_spaces` → **« Cette page gère les membres et leurs segments. »**

---

## 3. La page, section par section, dans l'ordre d'affichage

> Convention de lecture : **MONTRE** = ce qui est visible sans interaction. **PERMET** = les gestes. **SOURCE** renvoie au §4.

### §3.0 — Les trois sorties avant le rendu

Avant toute chose, trois écrans distincts (problème O). Aujourd'hui les seules gardes portent sur l'auth (`:264-265`) et le rendu ne teste jamais `space === null`.

```
if (!ready)   → carte « Chargement… » (Org.loading, existe)
if (loadErr)  → carte d'erreur + bouton « Réessayer » qui rappelle load()
if (!space)   → carte « Ce groupe n'existe pas, ou vous ne l'animez pas »
                + lien Org.back ; clé neuve Org.spaceNotFound × 4 langues
```

Implémentation : `const [ready, setReady] = useState(false)` et `const [loadErr, setLoadErr] = useState(false)` ; dans `load()` (118-134) remplacer `catch { /* noop */ }` par `catch { setLoadErr(true) }` et poser `setReady(true)` dans un `finally`.

### §3.1 — En-tête (remplace 269-273)

**MONTRE** — le lien retour `Org.back` ; le nom du groupe ; une ligne d'état à trois chiffres, en corps de texte, séparés par des points médians :

> **47 membres** · 12 adhérents par le lien · **3 sans adresse**

Le troisième n'apparaît que s'il est > 0, en `REDTXT`, cliquable → filtre la liste des membres sur ces personnes (problème : aujourd'hui l'animateur découvre les orphelins au moment où la base refuse l'ouverture, avec un message qui ne dit ni combien ni lesquels — `SpaceDashboard.tsx:207-208` jette le nombre que l'exception porte pourtant, `lot2:343`).

**PERMET** — renommer le groupe **en ligne**, sur le patron exact de `EventEditor.tsx:357-365` : un `<input>` aux styles typographiques du `h1`, `onBlur={() => saveCircle({ name })}`, Entrée → blur, `aria-label` sur une clé neuve `Org.renameSpaceAria`. `updateSpace` gère déjà `patch.name` (`events.ts:196`). Aujourd'hui la seule action portant sur le nom est la carte de suppression, et ce nom part dans `Org.createForGroup` et dans les emails d'adhésion.

**SOURCE** — S1, S2, S3.

### §3.2 — Barre d'action (remplace 282-301)

**MONTRE** — dans l'ordre :

1. Le **compteur de sollicitations du jour**, seulement si `space.solicit_per_day != null` : « 1 / 2 sollicitations aujourd'hui ». En `REDTXT` quand le plafond est atteint. **SOURCE S4.**
2. Si `!space.join_open` **et** que le groupe a au moins un segment ou que l'animateur a déjà tenté : une ligne d'avertissement qui **porte la case elle-même** — `<label><input type="checkbox" onChange={e => saveCircle({ join_open: e.target.checked })}/> Ce groupe doit accepter les adhésions pour recevoir une consultation</label>`. Clé neuve `Org.needsCircleForAudience`.

**PERMET** — les deux boutons existants (`actionAsk` → `/new?espace=<id>`, `actionSequence` → crée un brouillon et pousse vers `/evenement/<id>`), **désactivés** quand `todayCount >= solicit_per_day`, avec le compteur pour explication.

**Pourquoi ici et pas ailleurs** : le CTA le plus contrasté de la page échoue en base pour tout groupe `join_open = false` — c'est-à-dire par défaut (`lot2:22`) — et le refus n'apparaît qu'à la fin du parcours de création sous le libellé `Launched.audienceKo` (« L'envoi au groupe n'a pas abouti »), qui décrit une panne là où c'est un réglage manquant. Deux corrections possibles : (a) la case remontée ici ; (b) supprimer la ligne 53 de `circle_audience_guard`. **Retenu : (a) en P0** (zéro migration, zéro risque), **(b) en P2** avec la note que la garde ne perd rien — la propriété (`:52`), le seuil de 5 (`:47`) et « tout le segment ou rien » ne dépendent pas de `join_open`.

En complément, **P0 aussi** : ajouter dans `LaunchedScreen.tsx` après la ligne 216 une branche `status === "not_a_circle"` et une branche `"bad_segment"`, avec deux clés neuves. Aujourd'hui les deux tombent dans le `else` générique.

### §3.3 — Consultations (remonte de 560-574 juste sous la barre d'action)

**C'est le cœur du tableau de bord.** Elle passe de 15 lignes en bas de page à la première carte informative.

**MONTRE** — un en-tête `Org.events` + le bouton `actionSequence` **dans la carte** (aujourd'hui le sous-titre `Org.eventsSubtitle` dit littéralement « Créez-en une depuis la carte du haut », soit un itinéraire écrit à l'intérieur d'une page de 342 lignes de rendu).

Trois blocs **triés par état**, pas par `created_at` (aujourd'hui `listEvents` trie `created_at desc` — `events.ts:321-330` — donc une suite ouverte se cache sous trois brouillons plus récents) :

```
▸ En cours (n)      status = 'open' ET (closes_at null OU closes_at > now)
▸ À échéance passée status = 'open' ET closes_at <= now     ← statut menteur, cf. P2
▸ Brouillons (n)
▸ Closes (n)                                    repliées dans un <details>
```

Chaque ligne, sur le gabarit de carte de `MesScrutinsScreen.tsx:104-124` (pastille bordure 2px `INK`, `borderRadius: 20`) et non plus des capitales espacées :

```
┌────────────────────────────────────────────────────────────┐
│ AG 2026 — budget et cotisations              [ EN COURS ]  │
│ Adhésion avancée · 🔒 scellé · 3 questions                 │
│ Ferme le 14 août · 18/24 ont émargé                        │
└────────────────────────────────────────────────────────────┘
```

- ligne 2 : `audience_label` (« Adhésion avancée », ou `Org.audienceAll` = « tout le groupe » si `null`) · régime (`Explore.sealed` / `Explore.named`, clés existantes) · nombre de questions
- ligne 3 : échéance (`Explore.closesOn`, clé existante) · participation

**PERMET** — cliquer → `/evenement/<id>`. Rien d'autre : pas de renommage ni de suppression en ligne (la suppression d'une suite détruit des bulletins scellés irrécupérables — voir §7).

**Filtre (« observables par segments/cercle », la demande du fondateur)** — au-dessus de la liste, une rangée de puces : « Tous » + une puce par valeur distincte de `audience_label` présente dans les suites du groupe, + « Tout le groupe » pour `null`. Le filtre porte sur le **texte figé** de la convocation, pas sur le segment courant : `audience_label` est explicitement un instantané textuel pour qu'un segment renommé ou supprimé ne réécrive pas l'histoire d'une consultation tenue (`20260801-cercles-segments.sql:86-87`). C'est la bonne sémantique — « les consultations qui ont convoqué X », pas « les consultations qu'un membre de X verrait aujourd'hui ».

**SOURCE** — E1 à E6.

### §3.4 — Membres (reprend 304-432, réordonnée, segments intégrés)

**MONTRE**, dans cet ordre :

1. Titre `Org.members` (→ « Membres ») + compteur `Org.memberCount`, avec `aria-live="polite"`.
2. **La barre des segments** — remontée ici depuis 504-536, hors de `join_open` et hors du `<details>` (problèmes A et B). Chaque segment est une puce affichant **son nom et son effectif** :

   ```
   [ 1 Roulage · 12 ]  [ 2 Standard · 7 ]  [ 3 Avancé · 3 ⚠ ]  [ + segment ]
   ```

   - Cliquer une puce **filtre la liste des membres** dessous. Aujourd'hui cliquer une puce de segment **désaffecte silencieusement** (`:341-350`, `onClick → toggleMemberSegment(…, false)`) : le geste le plus naturel est destructeur.
   - Le `⚠` en `REDTXT` apparaît quand l'effectif < 5, avec le titre « moins de 5 : bulletin scellé impossible » — c'est le seuil `v_min constant int := 5` de `circle_audience_guard` (`audience-p1.sql:47`), qui refuse aujourd'hui après la composition de la question.
   - La suppression passe par une croix **distincte**, 28×28 comme celle des membres (`:368`), avec `aria-label` paramétré par le nom du segment. Aujourd'hui c'est un `×` de ~15 px (`:513`, `padding: 0`, `fontSize: 15`), sous le minimum WCAG 2.5.8 (24×24), annoncé « × » au lecteur d'écran, dans une liste de puces serrées.
3. Un champ de **recherche** filtrant sur nom + email, et une puce « sans segment ». Rendu borné à **50 lignes** avec « Voir les N suivants » (aujourd'hui `members.map` nu, sans borne, sans recherche, sans repli — plus un `<select>` de tous les segments **par ligne** : 200 membres × 12 segments = 200 sélecteurs et 2 400 options montés d'un coup).
4. La liste des membres, inchangée dans son contenu (nom, badge `tagSelfJoined`/`tagImported`, email, `×N` si `weight > 1`, puces de segments, croix de retrait).

**PERMET** — créer un segment (champ + bouton, sous la barre de puces) ; affecter/retirer un segment ; retirer un membre ; **ajouter des membres**, désormais dans un `<details>` dont le `<summary>` réutilise `Org.addMembersTitle`, **ouvert par défaut seulement si `members.length === 0`**. Le collage, l'aperçu et l'import de fichier sont conservés tels quels.

**Erreurs** — trois états distincts remplacent l'unique `circleErr` rendu ligne 450, au-dessus d'un repli dont deux des quatre émetteurs sont à l'intérieur :

| État | Rendu | Émetteurs actuels |
|---|---|---|
| `segErr` | sous le champ de nom de segment | `addSegment` (`:225`), `removeSegment`, `toggleMemberSegment` |
| `memberErr` | sous le bouton « Ajouter N » | `onAddMembers` (`:154`), `onRemoveMember` (`:169`) |
| `circleErr` | sous la case « Ouvrir aux adhésions » | `saveCircle` (`:208`), `saveChatUrl` (`:248`) |

Et `addSegment` cesse d'imputer tout échec à un doublon : le `catch` (223-226) doit lire le message et ne rendre `Org.segmentDuplicate` que sur violation de l'index `scrutin_segments_space_name_key` (`20260801-cercles-segments.sql:41-42`). `removeSegment` (229-234) et `toggleMemberSegment` (236-243) reçoivent un `try/catch` qui **n'applique la mise à jour d'état qu'en cas de succès** et relance `listMemberSegments(spaceId)` pour resynchroniser — aujourd'hui l'état local est écrit même si l'appel a échoué, donc l'écran affirme un rattachement que la base n'a pas, et la consultation partira à un segment amputé.

**SOURCE** — S1, S2, S3, G1.

### §3.5 — Ouvrir les adhésions (reprend 435-557, allégée)

**MONTRE** — titre `Org.circle` (→ « Ouvrir les adhésions »), sous-titre `Org.circleSubtitle`, la case `join_open`. Quand `join_open` : **« k demandes en attente de confirmation »** (SOURCE **R2**) — sans liste, sans email. Aujourd'hui, entre le partage du lien et l'apparition d'un membre confirmé, l'animateur ne peut pas distinguer « personne n'a cliqué » de « dix personnes ont demandé et l'email de confirmation n'arrive pas », et la fenêtre de 72 h (`lot2:60-69`) rend le second cas irrattrapable.

**PERMET**, sous `join_open`, dans le `<details>` existant `Org.circleSettings` :

- Le lien `/cercle/<join_token>`. Le `<code>` (466) devient un **lien ouvrable** dans un nouvel onglet — « Voir la page d'adhésion telle que la voit un futur membre » — le bouton Copier restant à côté. C'est la seule page où le pitch et l'engagement de rythme s'affichent, et l'animateur ne l'a jamais vue.
- Le bouton Copier **attend la promesse** : `navigator.clipboard?.writeText(url).then(…).catch(() => setCircleErr(t("copyFailed")))`, et l'absence d'API est traitée comme un échec. Aujourd'hui (468-477) le passage au vert « Copié » est inconditionnel — hors contexte sécurisé ou permission refusée, l'animateur colle autre chose dans WhatsApp et l'échec ne se manifeste qu'à l'autre bout.
- Lien de conversation, pitch, rythme de sollicitation : inchangés, mais chacun avec une **coche verte transitoire** au succès d'enregistrement, sur le patron de `copiedJoin`. Aujourd'hui l'animateur prend un engagement opposable à ses membres (`Circle.promisePace`) sans savoir s'il a été enregistré.
- **Ne contient plus les segments.**

### §3.6 — Zone rouge (inchangée, 576-606)

Le lien « Supprimer le groupe » puis la carte rouge à recopie du nom. Un seul changement : `onDeleteSpace` (190-194) reçoit un `try/catch` et ne pousse vers `/espaces` qu'en cas de succès — aujourd'hui l'animateur retape le nom exact, le bouton ne fait rien, et il conclut que Placet ne sait pas supprimer.

---

## 4. Chaque chiffre et sa source

**Légende du coût** : `dérivé` = calculé côté client sur des données déjà chargées, zéro requête. `colonne` = déjà chargée, il suffit de l'afficher. `RPC` = à écrire.

### Chiffres du groupe

| Réf | Chiffre | Source exacte | Coût |
|---|---|---|---|
| **S1** | N membres | `members.length` — `listMembers` (`events.ts:248`, `MEMBER_COLS`) | dérivé (déjà affiché, `:307`) |
| **S2** | dont k **adhérents par le lien** | `members.filter(m => m.self_joined)` — colonne `scrutin_members.self_joined`, déjà dans `MEMBER_COLS` (`events.ts:135`) | dérivé |
| **S3** | k **sans adresse** | `members.filter(m => !m.email?.trim())` — colonne `scrutin_members.email` | dérivé |
| **S4** | j / cap **sollicitations aujourd'hui** | `events.filter(e => e.status !== "draft" && new Date(e.created_at) >= startOfToday).length` face à `space.solicit_per_day`. **Reprendre littéralement la définition de la garde** : `status <> 'draft' and created_at >= date_trunc('day', now())` (`audience-p1.sql:85-87`), sinon écran et base divergent | dérivé |
| **G1** | effectif de chaque segment | `useMemo` sur `memberSegs` (`Record<memberId, segmentId[]>`, chargé `:128-130` via `listMemberSegments`, `circles.ts:159`) : inverser en `Record<segmentId, count>` | dérivé |
| **S5** | « +k ce mois-ci » *(optionnel, P1)* | `members.filter(m => m.consent_at && new Date(m.consent_at) >= subMonths(now,1))`. `consent_at` est posé à l'import (`events.ts:273`) comme à l'adhésion (`lot2:211-212`). **Traiter `null` comme « avant le suivi »**, jamais comme récent | dérivé |
| **R2** | k **demandes en attente** | **RPC à écrire** : `get_space_join_pending(p_space_id uuid) returns int`, `security definer`. `scrutin_join_requests` a la RLS active et **zéro policy** délibérément (`lot2:80-82`) : la file contient des emails non confirmés. La RPC ne renvoie **qu'un nombre** — jamais une adresse — pour ne pas rouvrir l'oracle d'appartenance que ce zéro-policy protège | RPC (P1) |

```sql
-- P1
create or replace function public.get_space_join_pending(p_space_id uuid)
returns int language sql stable security definer set search_path to 'public' as $$
  select count(*)::int
    from scrutin_join_requests r
    join scrutin_spaces s on s.id = r.space_id
   where r.space_id = p_space_id and s.owner_id = auth.uid()
     and r.confirmed_at is null and r.expires_at > now();
$$;
revoke all on function public.get_space_join_pending(uuid) from public, anon;
grant execute on function public.get_space_join_pending(uuid) to authenticated;
```

> ⚠️ **Piège déjà consigné** : `grant … to authenticated` ne suffit pas, `PUBLIC` a l'`EXECUTE` par défaut. Le `revoke … from public, anon` est obligatoire, dans cet ordre.

### Chiffres d'une consultation

| Réf | Chiffre | Source exacte | Coût |
|---|---|---|---|
| **E1** | titre, statut | `EventRow.title`, `.status` — `EVENT_COLS` | colonne (déjà affiché) |
| **E2** | échéance | `EventRow.closes_at` — dans `EVENT_COLS` (`events.ts:137`), **jamais rendu** (zéro occurrence de `closes_at` dans `SpaceDashboard.tsx`) | colonne |
| **E3** | régime scellé/nominatif | `EventRow.secret_ballot` — dans `EVENT_COLS`, jamais rendu. Clés `Explore.sealed` / `Explore.named` existent | colonne |
| **E4** | public convoqué | `scrutin_events.audience_label` — la colonne **existe en base** (vérifié) mais **manque à `EVENT_COLS`** (`events.ts:136-137`) et au type `EventRow` (`:49-71`). Ajouter les deux : 2 lignes, zéro migration | colonne (2 lignes) |
| **E5** | nombre de questions | **pas disponible** dans `listEvents`. Deux options : (a) `listEvents` fait un second `select event_id from scrutin_polls in (ids)` et compte côté client ; (b) la RPC E6 le renvoie. **Retenu : (b)**, pour ne pas ajouter une requête en P0 — le nombre de questions n'apparaît donc qu'en P1 | RPC (P1) |
| **E6** | **participation « n / N ont émargé »** | **RPC à écrire** : `get_space_event_stats(p_space_id uuid)`. Voir ci-dessous | RPC (P1) |

**Pourquoi une RPC et pas une lecture directe** : `countEventVoters` (`events.ts:589-601`) lit `scrutin_ballots` et filtre `.not("event_member_id","is",null)`. Or en scellé le bulletin est écrit `event_member_id = null` (`lot1:114-115`) **et** la policy restrictive `scrutin_ballots_hide_secret` (`lot1:69-72`) retire ces lignes de toute lecture directe, y compris pour l'animateur. Le compteur vaut donc **structurellement 0** sur exactement le régime pour lequel tout le chantier des cercles a été construit — l'animateur lit « 0/12 ont voté » alors que huit personnes ont répondu, et relance ou referme.

```sql
-- P1. Agrégats SEULEMENT : aucun event_member_id, aucun nom, aucune date.
-- signed_on est au jour près (lot1:34) et ne ressort JAMAIS : une horodate est
-- un canal de jointure avec le bulletin.
create or replace function public.get_space_event_stats(p_space_id uuid)
returns jsonb language sql stable security definer set search_path to 'public' as $$
  select coalesce(jsonb_object_agg(e.id, jsonb_build_object(
    'questions', (select count(*) from scrutin_polls p where p.event_id = e.id),
    'convened',  (select count(*) from scrutin_event_members em where em.event_id = e.id),
    'signed',    case when e.secret_ballot
                   then (select count(distinct s.event_member_id)
                           from scrutin_event_signins s
                           join scrutin_polls p on p.id = s.poll_id
                          where p.event_id = e.id)
                   else (select count(distinct b.event_member_id)
                           from scrutin_ballots b
                           join scrutin_polls p on p.id = b.poll_id
                          where p.event_id = e.id and b.event_member_id is not null)
                 end
  )), '{}'::jsonb)
  from scrutin_events e
  join scrutin_spaces s on s.id = e.space_id
  where e.space_id = p_space_id and s.owner_id = auth.uid();
$$;
revoke all on function public.get_space_event_stats(uuid) from public, anon;
grant execute on function public.get_space_event_stats(uuid) to authenticated;
```

**Deux règles d'affichage indissociables de cette RPC** :

- **(a)** `signed` n'est affiché en scellé que si `convened >= 5`. En dessous, la ligne n'affiche que `convened` (« 3 convoqués »). Un « 2/3 » sur trois personnes est déjà une désignation partielle.
- **(b)** Le rafraîchissement est de **60 s en scellé** (contre 12 s aujourd'hui dans `EventEditor.tsx:170-182`). Un compteur qui bouge à la seconde, corrélé à l'envoi d'un lien individuel (`EventEditor.tsx:475` donne un bouton « copier le lien » **par convoqué**), redevient un canal d'attribution. Sur le tableau de bord, le chiffre est chargé **une fois** au montage : pas de polling du tout.

Une fois E6 en place : **supprimer** `countEventVoters` et `countResolutionVotes` de `events.ts` et rebrancher `EventEditor.tsx:148` et `:170` dessus, pour qu'un futur écran ne puisse pas les rebrancher.

---

## 5. Consultations × segments — à quelles conditions

C'est le point le plus délicat de la demande. Deux choses très différentes se cachent derrière « consultations observables par segments ».

### 5.1 — Filtrer les consultations par le public convoqué → **autorisé sans condition**

Une liste de consultations restreinte à celles qui ont convoqué « Adhésion avancée ». Le filtre porte sur `scrutin_events.audience_label`, un **texte figé à la convocation**. Il ne révèle rien : l'animateur sait déjà ce qu'il a convoqué, puisque c'est lui qui l'a choisi. Aucune condition, aucun seuil. **P0.**

### 5.2 — Ventiler la participation d'une consultation par segment → **P2, sous cinq conditions cumulatives**

Afficher « Avancé : 3/5 · Standard : 6/7 » sur une consultation scellée. C'est légitime **en principe** — `scrutin_event_signins` a été créé exactement pour dire « qui a participé, sans dire quoi » — et **dangereux en pratique**. Les cinq conditions :

**C1 — Le dépouillement scellé doit d'abord être fermé pendant le vote.**
C'est un **préalable bloquant**, pas une condition d'affichage. Aujourd'hui `get_event_results_owner` ne teste jamais le statut (`lot1:241-252`), contrairement à la porte votant qui l'exige (`:235`), et `event_results_payload` renvoie `'status','closed'` **en dur** (`:214`) — le client croit toujours lire un scrutin clos. L'animateur note le décompte, envoie le lien personnel d'Alice seule, recharge : **la variation d'une voix EST le bulletin d'Alice**. Le seuil de 5 ne protège que le premier affichage, jamais les deltas. Tant que ceci tient, **tout** compteur de participation ajouté multiplie l'attaque.

```sql
-- Dans event_results_payload, juste après « select * into v_event » (lot1:175) :
if v_event.secret_ballot and v_event.status <> 'closed' then
  return jsonb_build_object('status','not_closed','title',v_event.title);
end if;
-- et remplacer le littéral ligne 214 par v_event.status.
```
Côté écran : `EventEditor.tsx:643` passe de `ev.status !== "draft"` à `(!ev.secret_ballot || ev.status === "closed")`, avec un encart « résultats au dépouillement » entre-temps ; et `reopenEvent` (`:666`) n'est rendu que si `!ev.secret_ballot` — rouvrir une urne scellée close, c'est autoriser le différentiel une clôture plus tard.

**C2 — Le seuil compte des personnes, pas des bulletins.**
`lot1:180-186` compte `count(*)` sur **tous** les `scrutin_ballots` de l'événement. Une suite scellée de 5 résolutions à laquelle **une seule personne** répond produit 5 bulletins : le seuil passe, et chaque résolution s'affiche avec exactement un bulletin — la totalité des réponses d'un individu identifiable. À remplacer par `count(distinct s.event_member_id)` sur `scrutin_event_signins`, **plus** un seuil par résolution dans la sous-requête `ballots` (`:196-207`) : une résolution ajoutée en cours de route ne doit pas hériter du seuil franchi par ses voisines.

**C3 — Seuil de cellule : 5 convoqués minimum dans le segment.**
Une cellule sous 5 affiche `—`, jamais `0` (un zéro est déjà une information : « personne dans Avancé n'a répondu »).

**C4 — Tout ou rien.**
Si **une seule** cellule est masquée, elle se recalcule par soustraction du total. Donc : **dès qu'un segment du croisement est sous le seuil, la ventilation entière est refusée** et seul le total est affiché. C'est la même faille que celle du seuil sur l'union des segments (`audience-p1.sql:65-68`) : « Avancé » (2) + « Débutant » (4) = 6 ≥ 5, la garde accepte ; deux consultations légales et une soustraction rendent les 2 bulletins d'« Avancé ». Correctif jumeau à poser en même temps :

```sql
-- Dans circle_audience_guard, avant le test de seuil (audience-p1.sql:78) :
if v_targeted and coalesce(p_sealed, true) then
  if exists (select 1 from scrutin_member_segments ms
               join scrutin_members m on m.id = ms.member_id
              where ms.segment_id = any(p_segment_ids) and m.space_id = s.id
              group by ms.segment_id having count(distinct ms.member_id) < v_min) then
    return jsonb_build_object('status','too_small','roster',v_min-1,'min',v_min,'audience',v_label);
  end if;
end if;
```

**C5 — Le segment doit être figé à la convocation.**
C'est l'attaque **nouvelle** que la ventilation introduit, et aucun expert ne l'a vue. `scrutin_event_members` ne porte **aucune colonne de segment** (vérifié en base : `id, event_id, member_id, name, email, district, weight, token, invited_at, created_at, self_enrolled`). Une ventilation calculée en joignant la convocation d'hier au rattachement `scrutin_member_segments` **d'aujourd'hui** est donc manipulable : l'animateur crée un segment jetable, y déplace Marie seule, relit la ventilation, et lit son émargement à elle. Remède obligatoire avant toute ventilation :

```sql
-- P2, préalable à la ventilation.
alter table public.scrutin_event_members
  add column if not exists segment_label text;
comment on column public.scrutin_event_members.segment_label is
  'Segment du membre FIGÉ à la convocation. Sans ce gel, ventiler la participation
   par segment se manipule : déplacer un membre dans un segment jetable puis relire
   la ventilation isole son émargement.';
-- alimenté dans set_poll_audience (audience-p1.sql:148-156) et
-- open_circle_consultation (:200-206), au moment du insert … select.
```

**Et en mode NOMINATIF ?** Aucune de ces conditions ne s'applique. L'animateur a déjà le droit de voir qui a répondu quoi (`get_event_named_answers`, `20260801-cercles-mode-nominatif.sql`), le votant en est averti avant de voter (`LivretVote.tsx:180-184`). La ventilation par segment est autorisée sans seuil — sous réserve de C5, qui reste nécessaire pour que le chiffre soit **juste**, pas pour qu'il soit sûr.

### 5.3 — Ce qui n'est jamais affiché sur cette page

- **Le dépouillement.** Un tableau de bord ne compte pas les voix. Les résultats vivent dans `/evenement/<id>`, derrière C1.
- **La liste nominative des non-répondants.** Elle est licite en soi, mais sur un résultat unanime elle attribue nommément le même vote à chacun. Aujourd'hui `get_event_voted_members` est exécutable **depuis le navigateur** (`grant … to authenticated`, `lot1:289`), et son wrapper client `getVotedMemberIds` (`events.ts:540`) **n'a aucun appelant**. À faire en P1 :
  - `revoke execute on function public.get_event_voted_members(uuid) from authenticated;`
  - supprimer `getVotedMemberIds` de `events.ts`
  - remplacer par `get_reminder_targets(p_event_id uuid)` `security definer`, réservée au propriétaire, appelée **par la route serveur seule** (`src/app/api/events/[id]/remind/route.ts:78`), qui applique la règle : **en scellé, si le nombre de non-émargés est < 3, elle renvoie TOUS les convoqués** au lieu des seuls retardataires. Relancer trois personnes de trop est un désagrément ; nommer les deux derniers non-votants est une divulgation. Et la route cesse de renvoyer `pending` au client (`:118`) : en scellé, `pending` est déjà une mesure du secret.
- **Un compteur qui bouge en direct** sur une consultation scellée (voir E6 règle b).

---

## 6. Le sceau posé à la main, qui contourne tout

Hors périmètre strict de la page, mais **à embarquer dans le même lot que C1-C5**, sinon la page affichera des chiffres protégés sur des consultations qui ne le sont pas.

La case « bulletin scellé » de `EventEditor.tsx:573-596` est un `updateEvent(ev.id, { secret_ballot: on })`, c'est-à-dire un `update` nu (`events.ts:353-360`). La convocation y est un `insert` nu (`events.ts:424-438`). L'ouverture ne teste que le nombre de résolutions (`EventEditor.tsx:659`). `circle_audience_guard` n'est appelée que par `set_poll_audience` et `open_circle_consultation` — et `setPollAudience` n'a qu'un appelant, `useScrutin.ts:654`, le parcours `/new?espace=`. Donc : **le bouton « Créer une suite de questions » de cette page mène au seul chemin qui contourne l'intégralité des garanties du cercle.** Convoquer 2 membres, cocher « scellé », poser 3 questions : le seuil de dépouillement est franchi (C2) et deux personnes sont dépouillées comme si l'anonymat tenait. Le commentaire de `audience-p1.sql:38` promet pourtant que « tout chemin menant à une audience roster y passe » : c'est vrai pour l'audience, faux pour le scellé posé à la main.

Remède — **un trigger, pas une garde d'interface** :

```sql
create or replace function public.scrutin_events_sealed_guard()
returns trigger language plpgsql set search_path to 'public' as $$
begin
  if new.secret_ballot and new.status = 'open' and coalesce(old.status,'') <> 'open'
     and (select count(*) from scrutin_event_members where event_id = new.id) < 5 then
    raise exception 'sealed_needs_5';
  end if;
  return new;
end $$;
```
Plus, côté écran, le bouton `openEvent` (`EventEditor.tsx:657-663`) désactivé avec `Org.sealedTooFew` (clé existante) quand `ev.secret_ballot && convened.length < 5`, pour que le refus soit lisible avant le clic.

Et dans `set_poll_audience`, avant la ligne 136 : refuser de basculer le régime d'un événement dont **une autre** résolution porte déjà des bulletins, et **retirer `status = 'open'`** de l'`update` (`:138-140`) — donner une audience à une question ne doit jamais rouvrir une consultation close. Aujourd'hui, adjoindre une question par le parcours normal à une suite scellée déjà votée la rend nominative : `poll_is_secret` répond alors NON pour les résolutions déjà votées, la policy restrictive les rouvre à la lecture, et les votants qui avaient lu « votre réponse ne sera rattachée à personne » (`Livret.sealedExplain`) reliront « Réponse nominative » sur la même page.

---

## 7. Ce qui disparaît de la page actuelle, et où ça va

| Ce qui disparaît | Ligne(s) | Destination |
|---|---|---|
| Le bloc **Segments** hors de la carte « Cercle » | 501-536 | → carte **Membres**, §3.4, hors de `join_open` et hors du `<details>` |
| La condition `{space?.join_open && (` autour des segments | 454 | → supprimée ; ne subsiste que pour lien / conversation / pitch / rythme |
| Le sous-titre `Org.eventsSubtitle` « Créez-en une depuis la carte du haut » | 562 / `fr.json:1094` | → réécrit dans les 4 fichiers sans cette phrase ; le bouton `actionSequence` est **dans** la carte |
| L'état vide `Org.noEvents` sans bouton | 564 | → état vide **avec** CTA, sur le patron de `MesScrutinsScreen.tsx:200-230` |
| Le titre `Org.members` = « Corps électoral » | 306 / `fr.json:1030` | → « Membres ». Le mot ne survit que dans `Org.convene` (contexte d'assemblée) |
| Le titre `Org.circle` = « Cercle » | 437 / `fr.json:1052` | → « Ouvrir les adhésions » |
| Le `<h1>` inerte | 270-272 | → `<input>` de renommage, patron `EventEditor.tsx:357-365` |
| Le statut en capitales espacées | 568-570 | → pastille du gabarit `MesScrutinsScreen.tsx:104-124` |
| L'unique `circleErr` au-dessus du `<details>` | 450-452 | → **trois** états au contact de leur champ (§3.4) |
| Les `catch { /* noop */ }` et les `await` nus | 131-133, 154-156, 169, 184-186, 190-194, 231, 237-238 | → `try/catch` posant l'état d'erreur de la carte concernée |
| Le commentaire orphelin « Cible de la prochaine consultation » + le trou de 2 lignes | 110, 212-213 | → supprimés (vestiges du formulaire retiré en P3) |
| Le commentaire `{/* ---- Événements ---- */}` | 559 | → `{/* ---- Consultations ---- */}` (le mot a disparu de l'écran en P3, pas des commentaires) |
| `#FFB627` en dur | 414 | → `YELLOW` de `theme.ts:11`, ajouté à l'import ligne 32. Idem `SpacesHome.tsx:350` |
| `REDTXT = "#d23b3b"` (4,37:1 sur blanc, 4,06 sur crème) | `theme.ts:21` | → `#C62828` (~5,1:1 / ~4,8:1). Le fichier a déjà fait ce raisonnement pour `CORAL` (`:7-10`) et `GREENTXT` (`:15-20`) ; le rouge est resté à quelques centièmes du seuil, ce qui est le pire endroit où s'arrêter. 64 usages, une seule constante |
| Les 8 clés mortes `Org.ask*` (`askTitle`, `askSubtitle`, `askPlaceholder`, `askCta`, `asking`, `askCapped`, `askTooSmall`, `askTooSmallSegment`) | `fr.json:1077-1084` | → **supprimées des 4 fichiers** (32 valeurs). Zéro appelant dans `src/` ; ne pas confondre avec `Org.askAudience*`, utilisé par `CreateAudienceBlock.tsx:105-121` |
| `Org.weight`, `Org.confirmDeleteSpace` | `fr.json:1050, 1101` | → supprimées, zéro appelant |
| `countEventVoters`, `countResolutionVotes` | `events.ts:578-601` | → supprimées après rebranchement d'`EventEditor` sur E6 (P1) |
| `getVotedMemberIds` | `events.ts:540-545` | → supprimée + `revoke` de la RPC (P1, §5.3) |
| `renameSpace` | `events.ts:234` | → soit branchée sur le `h1`, soit supprimée au profit de `updateSpace({ name })`. **Retenu : supprimée**, `updateSpace` gère déjà `patch.name` (`:196`) |
| La suppression d'une suite par un `confirm()` natif | `EventEditor.tsx:251-255` | → **P2** : carte rouge à recopie du titre, sur le patron de `SpaceDashboard.tsx:581-605`, affichant le nombre de résolutions et d'émargements, et **refus pur** quand `status === "closed"` (les bulletins scellés sont irrécupérables par construction — ils n'ont jamais porté de nom) |

**Ce qui ne bouge pas** : la route `/espaces/[id]`, le paramètre `?espace=`, le nom de table `scrutin_spaces`, le type `Space`, la clé `Nav.spaces`, le `<details>` natif des réglages (accessible au clavier sans une ligne de JS), le bloc de collage de membres et son aperçu, la carte rouge de suppression du groupe.

---

## 8. Découpage en lots

### P0 — La page devient un tableau de bord · **zéro migration, zéro RPC**

Livrable seul, et c'est l'essentiel : à lui seul il règle A, B, C, D, E, L, M, N, O, P, Q.

**Apporte**
- L'ordre d'usage : consultations en 2ᵉ position, amorçage replié (C).
- Les segments dans la carte des membres, avec leurs effectifs et le `⚠ < 5` — donc utilisables par un groupe qui ne veut pas ouvrir d'adhésions (A, B, N).
- Le compteur de sollicitations du jour et la case `join_open` remontée sous le CTA : plus d'échec après composition (L, M).
- Les lignes de consultation enrichies : échéance, régime, public convoqué, tri par état, filtre par public (E, §5.1).
- Recherche + filtre + bornage à 50 sur les membres.
- Trois chiffres d'en-tête, dont « k sans adresse » cliquable (D).
- Trois sorties de rendu distinctes, six écritures qui parlent, erreurs au contact du champ (O).
- Nom renommable en ligne (P).
- Trois libellés réécrits, 10 clés mortes supprimées, `YELLOW` et `REDTXT` normalisés (Q).
- Deux branches de refus nommées dans `LaunchedScreen` (`not_a_circle`, `bad_segment`).

**Coûte**
- `SpaceDashboard.tsx` : réécriture de la structure de rendu (~342 lignes réorganisées, +80 nettes pour recherche/filtres/états). Toute la logique métier existe déjà.
- `events.ts` : `audience_label` ajouté à `EVENT_COLS` et à `EventRow` (2 lignes) ; `renameSpace` supprimée.
- `theme.ts` : 1 constante.
- `LaunchedScreen.tsx` : 2 branches.
- i18n : ~12 clés neuves × 4 langues, 3 réécrites × 4, 10 supprimées × 4. **La parité de lignes des 4 fichiers (1 354 lignes, 1 292 clés) impose d'insérer au même rang partout** — le garde-fou de parité auto-découvre les locales.
- **Aucun risque de régression sur le secret** : rien de nouveau n'est affiché sur les bulletins.

**Ne fait pas** : aucune participation affichée. La ligne d'une consultation dit « Ferme le 14 août · 🔒 scellé · Adhésion avancée », jamais « n/N ». C'est volontaire — voir P1.

### P1 — La participation, et la sécurité qui la rend affichable · **1 migration**

**L'ordre à l'intérieur du lot n'est pas négociable** : la sécurité d'abord, le chiffre ensuite.

**Apporte**
1. **Sécurité (préalable)** : C1 (dépouillement scellé fermé avant clôture, statut réel au lieu du littéral, `reopenEvent` interdit en scellé) ; C2 (seuil en émargeants distincts + seuil par résolution) ; le trigger `sealed_needs_5` (§6) ; `set_poll_audience` qui ne rouvre plus un événement clos et ne bascule plus le régime après vote ; `revoke get_event_voted_members from authenticated` + `get_reminder_targets` avec la règle des 3.
2. **Le chiffre** : `get_space_event_stats` (E6) → « 18/24 ont émargé » sur chaque ligne, plus « 3 questions » (E5). `EventEditor` rebranché dessus ; `countEventVoters` / `countResolutionVotes` supprimées.
3. `get_space_join_pending` (R2) → « k demandes en attente ».
4. S5 (« +k ce mois-ci »), dérivé.

**Coûte**
- Une migration `20260807-tableau-de-bord-groupe.sql` : 2 RPC neuves, 3 fonctions modifiées (`event_results_payload`, `set_poll_audience`, `get_event_voted_members`), 1 trigger, 3 `revoke`.
- **Point d'attention** : `revoke` sur `get_event_voted_members` casse le chemin **client** — vérifier que le seul appel restant est celui de la route serveur (`remind/route.ts:78`), qui agit avec la session de l'organisateur. C'est exactement le piège de la règle 5 du `README` des migrations, et l'incident qui a fait naître ce dossier.
- Fermer le dépouillement en cours de vote est un **changement de comportement visible** pour tout animateur d'une consultation scellée ouverte. Il faut l'encart de remplacement (« résultats au dépouillement, le … »), sinon c'est une régression perçue.

### P2 — Le croisement fin, et les paramètres qui manquent · **1 migration**

**Apporte**
- La **ventilation participation × segment**, sous C3/C4/C5 : colonne `scrutin_event_members.segment_label` figée à la convocation, seuil de cellule à 5, all-or-nothing, alimentation dans `set_poll_audience` et `open_circle_consultation`.
- Le **seuil par segment** dans `circle_audience_guard` (C4, correctif de la faille par soustraction).
- `join_cap` et `join_closes_at` réglables (`Space` les type `:17-18`, `SpacePatch` les accepte `:169-170`, aucune migration nécessaire) — sans quoi `Circle.fullTitle` / `Circle.fullDesc` (« Ce cercle a atteint le nombre de membres qu'il s'était fixé ») sont une promesse écrite en 4 langues qui ne correspond à aucun réglage.
- Le **statut honnête** : `close_expired_events()` sur le modèle de `close_expired_polls(p_secret)` qui existe déjà en base, branchée sur le `cron.job` actif (`0 */2 * * *` → `resolve-tick`). Sans elle, « OUVERT » s'affiche sur une consultation qui n'accepte plus un bulletin (`cast_event_ballot` refuse — `lot1:96-99` — mais laisse la colonne à `'open'`), et le convoqué la garde indéfiniment dans « ce qui vous attend » (`20260805-mon-feed-p2.sql:48` filtre sur `status = 'open'` sans regarder `closes_at`).
- `updateSegment(id, { name?, rank? })` : renommer un segment sans détruire ses rattachements (`deleteSegment` cascade — `20260801-cercles-segments.sql:48-51`) ; case « échelle » sortie de la condition `segments.length === 0` (`:530`).
- Suppression d'une suite : carte rouge à recopie, refus si `status === 'closed'`.
- Retirer `if not s.join_open then return 'not_a_circle'` de `circle_audience_guard` (`audience-p1.sql:53`) : l'invariant tient sans lui.
- `aria-label` sur les six champs sans étiquette ; `<ul>/<li>` sur les trois listes.

**Coûte**
- La ventilation est la seule fonctionnalité du chantier qui **ajoute une surface d'attaque**. Elle ne se livre pas sans C5, et C5 ne rétroagit pas : les consultations déjà tenues n'auront pas de `segment_label` et devront afficher « ventilation indisponible » plutôt qu'un chiffre calculé sur les segments d'aujourd'hui.
- `close_expired_events` change ce que voient **tous** les membres (`get_my_feed`, `/m/<token>`), pas seulement l'animateur.

---

## 9. Critères de recette

**P0** — Sur un groupe neuf, `join_open = false`, 8 membres importés : je crée un segment sans rien cocher ; la puce affiche « 8 » ; j'affecte 3 personnes, la puce passe à « 3 » avec `⚠` ; le CTA « Créer une interrogation » porte l'avertissement et sa case ; je coche, je lance, la consultation apparaît en tête avec échéance, régime et public. Je coupe le réseau et recharge : j'obtiens une carte d'erreur avec « Réessayer », **jamais** « Aucun membre ». J'ouvre l'URL d'un groupe qui n'est pas le mien : « Ce groupe n'existe pas, ou vous ne l'animez pas ».

**P1** — Consultation scellée, 12 convoqués, 8 émargements : la page affiche « 8/12 ont émargé » (aujourd'hui : 0/12), et `/evenement/<id>` refuse le dépouillement tant que la suite est ouverte. Consultation scellée à 3 convoqués : la ligne dit « 3 convoqués », sans ratio. Suite scellée de 5 questions, une seule répondante : le dépouillement reste refusé après clôture (`too_few` sur 1 émargeante, pas 5 bulletins). Convoquer 2 membres et tenter d'ouvrir en scellé : refusé en base.

**P2** — Consultation ayant convoqué « Avancé » (2) + « Standard » (6) en scellé : **refusée à la création** (C4). Consultation sur 3 segments ≥ 5 chacun : ventilation affichée ; je déplace un membre entre segments, la ventilation **ne bouge pas** (C5). Consultation tenue avant P2 : « ventilation indisponible ».

---

**Fichiers touchés, chemins absolus** : `D:\Suffrage\src\components\scrutin\SpaceDashboard.tsx` (le gros du travail), `D:\Suffrage\src\components\scrutin\EventEditor.tsx`, `D:\Suffrage\src\components\scrutin\LaunchedScreen.tsx`, `D:\Suffrage\src\components\scrutin\theme.ts`, `D:\Suffrage\src\lib\db\events.ts`, `D:\Suffrage\src\lib\db\circles.ts`, `D:\Suffrage\src\app\api\events\[id]\remind\route.ts`, `D:\Suffrage\messages\{fr,en,es,pcm}.json`, et une migration neuve par lot dans `D:\Suffrage\supabase\migrations\`.