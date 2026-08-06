"use client";

// La vue marché — la grille interactive de /explorer.
// Spécification : docs/participant-spec.md §5 bis et §5 ter.
//
// Le serveur rend la grille initiale (les composants client sont AUSSI rendus en
// HTML côté serveur : le SEO ne perd rien) ; l'interactivité — recherche,
// épingles, pagination — prend le relais à l'hydratation, sans double-fetch.
//
// DEUX SOURCES, UNE GRILLE. Le catalogue public (`get_public_polls`, ouvert à
// tous) et les consultations des cercles dont je suis membre
// (`get_my_circle_cards`, réservée à mon compte). Elles ne sont PAS réunies dans
// une même requête : la clause « public et approuvé » de la première est sa
// propriété de sûreté, et on ne la desserre pas. Deux appels, deux blocs, une
// page.
//
// Ce qu'on n'affiche PAS, et c'est un choix de la spec : ni prix, ni volume, ni
// « tendance » — un scrutin n'a pas ce signal avant sa clôture, et la plupart
// sont secrets. Le signal honnête d'une carte est le temps qui reste, la
// participation, et pour ce qui m'est adressé : « ai-je répondu ».
import { useCallback, useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useAuth } from "@/lib/auth/useAuth";
import {
  cardIntent,
  cardIsOpen,
  fetchMarket,
  togglePin,
  type CardIntent,
  type PublicPollCard,
} from "@/lib/db/publicFeed";
import { fetchMyCircleCards, toggleCirclePin, type CircleCard } from "@/lib/db/participation";
import { intlLocale } from "@/i18n/locales";
import { CORAL, FONT_BODY, FONT_DISPLAY, GREEN, GREENTXT, INK, MUTED, SUBINK } from "./theme";

const PAGE = 24;

/** Tout ce que je peux voir / mes cercles seuls / ce que j'ai épinglé. */
type Facet = "all" | "circles" | "pins";

export default function MarketExplorer({ initialCards }: { initialCards: PublicPollCard[] }) {
  const t = useTranslations("Explore");
  const th = useTranslations("Home");
  const locale = useLocale();
  const { user } = useAuth();
  const fmt = new Intl.DateTimeFormat(intlLocale(locale), { day: "numeric", month: "short", year: "numeric" });

  const [cards, setCards] = useState<PublicPollCard[]>(initialCards);
  const [mine, setMine] = useState<CircleCard[]>([]);
  const [search, setSearch] = useState("");
  const [facet, setFacet] = useState<Facet>("all");
  // Le serveur en rend PAGE d'un coup : comparer à 12 faisait apparaître un
  // « Voir plus » sans rien à charger dès qu'il y avait entre 12 et 24 scrutins.
  const [exhausted, setExhausted] = useState(initialCards.length < PAGE);
  const [loading, setLoading] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Mes consultations : un seul chargement, à la connexion. Le volume est borné
  // par `solicit_per_day` — les filtrer ensuite en mémoire est instantané, là où
  // un aller-retour par frappe ne servirait à rien.
  //
  // La dépendance est l'IDENTIFIANT, pas l'objet : `onAuthStateChange` rend un
  // nouvel objet utilisateur à chaque rafraîchissement de jeton, ce qui
  // relancerait la requête sans qu'aucune appartenance ait changé.
  const uid = user?.id ?? null;
  useEffect(() => {
    if (!uid) {
      setMine([]);
      return;
    }
    let vivant = true;
    fetchMyCircleCards()
      .then((rows) => {
        if (vivant) setMine(rows);
      })
      .catch(() => {
        /* la grille publique reste entière : une erreur ici n'en prive personne */
      });
    return () => {
      vivant = false;
    };
  }, [uid]);

  // Le catalogue public. `pinnedOnly` suit la facette : « Épinglés » n'est plus
  // une liste à part, c'est la même grille filtrée.
  const loadPublic = useCallback(async (q: string, f: Facet) => {
    if (f === "circles") return; // cette facette ne montre que les miennes
    setLoading(true);
    try {
      const rows = await fetchMarket({ limit: PAGE, search: q || null, pinnedOnly: f === "pins" });
      setCards(rows);
      setExhausted(rows.length < PAGE);
    } catch {
      /* la grille précédente reste affichée */
    }
    setLoading(false);
  }, []);

  // Recherche : 300 ms après la dernière frappe, EN BASE pour le catalogue
  // (jokers échappés côté SQL). La grille initiale du serveur reste affichée
  // tant qu'on n'a pas tapé.
  const runSearch = useCallback(
    (q: string) => {
      setSearch(q);
      if (debounce.current) clearTimeout(debounce.current);
      debounce.current = setTimeout(() => void loadPublic(q, facet), 300);
    },
    [facet, loadPublic],
  );

  const pickFacet = (f: Facet) => {
    setFacet(f);
    void loadPublic(search, f);
  };

  const loadMore = async () => {
    const last = cards[cards.length - 1];
    if (!last || loading) return;
    setLoading(true);
    try {
      const rows = await fetchMarket({
        limit: PAGE,
        search: search || null,
        pinnedOnly: facet === "pins",
        before: last.published_at,
      });
      // Les épinglés remontent en tête côté serveur : en pagination par curseur de
      // date, on écarte les doublons éventuels plutôt que de raisonner sur l'ordre.
      const known = new Set(cards.map((c) => c.token));
      const fresh = rows.filter((r) => !known.has(r.token));
      setCards((c) => [...c, ...fresh]);
      setExhausted(rows.length < PAGE);
    } catch {
      /* noop */
    }
    setLoading(false);
  };

  const onTogglePin = async (token: string) => {
    try {
      const pinned = await togglePin(token);
      setCards((l) => l.map((c) => (c.token === token ? { ...c, pinned } : c)));
    } catch {
      /* l'état affiché reste celui du serveur */
    }
  };

  const onToggleCirclePin = async (token: string) => {
    try {
      const pinned = await toggleCirclePin(token);
      setMine((l) => l.map((c) => (c.token === token ? { ...c, pinned } : c)));
    } catch {
      /* idem */
    }
  };

  // ------------------------------------------------------------------ rendu

  // À l'IDENTIQUE de la carte rendue par le serveur : même taxonomie
  // (Décider / Sonder / Trouver une date), mêmes couleurs, mêmes libellés Home —
  // la grille hydratée ne doit pas se distinguer de la grille SEO.
  const INTENTS: Record<CardIntent, { color: string; icon: string; labelKey: string }> = {
    decide: { color: CORAL, icon: "🏆", labelKey: "doorVoteTitle" },
    survey: { color: "#2A9D8F", icon: "📊", labelKey: "doorSurveyTitle" },
    date: { color: "#5B5BD6", icon: "📅", labelKey: "doorDateTitle" },
  };
  const badge = (bg: string, children: React.ReactNode) => (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: bg, color: "#fff", border: `2px solid ${INK}`, borderRadius: 20, padding: "3px 10px", fontWeight: 700, fontSize: 11.5 }}>
      {children}
    </span>
  );
  const intentBadge = (it: CardIntent) => badge(INTENTS[it].color, `${INTENTS[it].icon} ${th(INTENTS[it].labelKey)}`);

  const shell = (pinned: boolean, open: boolean) =>
    ({
      position: "relative",
      display: "flex",
      flexDirection: "column",
      gap: 10,
      background: "#fff",
      border: `2.5px solid ${INK}`,
      borderRadius: 15,
      padding: "15px 16px",
      boxShadow: `4px 4px 0 ${pinned ? CORAL : open ? GREEN : INK}`,
    }) as const;

  // L'épingle : réservée au connecté — un contrôle inopérant est pire qu'absent,
  // l'anonyme garde la vitrine d'avant. 28×28 : cible conforme (WCAG 2.5.8).
  const pinButton = (pinned: boolean, label: string, onClick: () => void) => (
    <button
      onClick={onClick}
      aria-pressed={pinned}
      aria-label={pinned ? t("unpinAria", { question: label }) : t("pinAria", { question: label })}
      title={pinned ? t("unpin") : t("pin")}
      style={{ position: "absolute", top: 9, right: 9, width: 28, height: 28, display: "grid", placeItems: "center", border: `2px solid ${INK}`, borderRadius: 9, background: pinned ? CORAL : "#fff", color: pinned ? "#fff" : INK, cursor: "pointer", fontSize: 14, lineHeight: 1 }}
    >
      📌
    </button>
  );

  const card = (p: PublicPollCard) => {
    const open = cardIsOpen(p);
    return (
      <div key={`v-${p.token}`} style={shell(p.pinned, open)}>
        {user && pinButton(p.pinned, p.question, () => onTogglePin(p.token))}
        <Link href={`/v/${p.token}`} style={{ display: "flex", flexDirection: "column", gap: 10, textDecoration: "none", color: INK, flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", paddingRight: user ? 30 : 0 }}>
            {intentBadge(cardIntent(p))}
            <span style={{ fontSize: 11.5, fontWeight: 800, color: "#fff", background: open ? GREENTXT : INK, border: `1.5px solid ${INK}`, borderRadius: 7, padding: "2px 7px" }}>
              {open ? `● ${t("openBadge")}` : `■ ${t("closedBadge")}`}
            </span>
            <span style={{ fontSize: 12, color: MUTED, fontWeight: 600 }}>
              {open && p.closes_at
                ? t("closesOn", { date: fmt.format(new Date(p.closes_at)) })
                : t("publishedOn", { date: fmt.format(new Date(p.published_at)) })}
            </span>
          </div>
          <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 17, lineHeight: 1.2 }}>{p.question}</div>
          {p.description && (
            <div style={{ fontSize: 13, color: MUTED, lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
              {p.description}
            </div>
          )}
          <div style={{ marginTop: "auto", fontSize: 12.5, color: MUTED, fontWeight: 600 }}>
            🗳 {t("ballots", { count: p.ballot_count })} · {t("options", { count: p.options.length })}
          </div>
        </Link>
      </div>
    );
  };

  // La carte d'une CONSULTATION DE CERCLE. L'unité est la suite, pas la question :
  // une AG à huit résolutions est une chose à faire, pas huit cartes. D'où
  // l'avancement « n / total » là où la carte publique montre des bulletins — je
  // ne peux pas savoir combien d'autres ont répondu à un scrutin scellé, mais je
  // sais toujours où j'en suis.
  const circleCard = (c: CircleCard) => {
    const open = c.status === "open";
    const done = c.answered >= c.questions && c.questions > 0;
    return (
      <div key={`e-${c.token}`} style={shell(c.pinned, open)}>
        {pinButton(c.pinned, c.title, () => onToggleCirclePin(c.token))}
        <Link href={`/e/${c.token}`} style={{ display: "flex", flexDirection: "column", gap: 10, textDecoration: "none", color: INK, flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", paddingRight: 30 }}>
            {badge(INK, `👥 ${c.circle}`)}
            <span style={{ fontSize: 11.5, fontWeight: 800, color: "#fff", background: open ? GREENTXT : INK, border: `1.5px solid ${INK}`, borderRadius: 7, padding: "2px 7px" }}>
              {open ? `● ${t("openBadge")}` : `■ ${t("closedBadge")}`}
            </span>
            {open && c.closes_at && (
              <span style={{ fontSize: 12, color: MUTED, fontWeight: 600 }}>
                {t("closesOn", { date: fmt.format(new Date(c.closes_at)) })}
              </span>
            )}
          </div>
          <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 17, lineHeight: 1.2 }}>{c.title}</div>
          {c.audience_label && <div style={{ fontSize: 13, color: MUTED, fontWeight: 600 }}>{c.audience_label}</div>}
          <div style={{ marginTop: "auto", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", fontSize: 12.5, fontWeight: 700 }}>
            {/* « Ai-je répondu » : le signal que la §4 de la spec désigne comme le
                seul qui vaille ici. Rouge quand rien n'est fait — c'est une file
                d'attente, pas un catalogue. */}
            <span style={{ color: done ? GREENTXT : c.answered === 0 ? CORAL : SUBINK }}>
              {done ? `✓ ${t("answeredAll")}` : c.answered === 0 ? t("toAnswer") : t("answeredSome", { done: c.answered, total: c.questions })}
            </span>
            <span style={{ color: MUTED, fontWeight: 600 }}>
              · {t("questionCount", { count: c.questions })} · {c.secret_ballot ? `🔒 ${t("sealed")}` : `👁 ${t("named")}`}
            </span>
          </div>
        </Link>
      </div>
    );
  };

  // Recherche sur mes consultations : en mémoire, la liste étant déjà complète.
  // Volontairement AUSSI naïve que le `ilike` du catalogue (pas de dépliage des
  // accents) : deux blocs de la même page ne doivent pas répondre autrement au
  // même mot.
  const q = search.trim().toLowerCase();
  const mineShown = mine.filter(
    (c) => (facet !== "pins" || c.pinned) && (!q || `${c.title} ${c.circle}`.toLowerCase().includes(q)),
  );
  // Le bloc « mes cercles » ne s'affiche que s'il a quelque chose à dire — sauf
  // sur sa propre facette, où l'état vide EST la réponse à la question posée.
  // Un utilisateur sans cercle ne doit pas voir de cadre vide à chaque visite.
  const showMine = Boolean(user) && (mineShown.length > 0 || facet === "circles");
  const showPublic = facet !== "circles";
  // Sur « Tout », le bloc personnel est ÉCRÊTÉ à six cartes : il ne doit pas
  // repousser le catalogue sous la ligne de flottaison. L'écrêtage est dit, pas
  // silencieux — le compte exact des cartes masquées mène à leur facette.
  const MINE_PREVIEW = 6;
  const mineHidden = facet === "all" ? Math.max(0, mineShown.length - MINE_PREVIEW) : 0;
  const mineList = facet === "all" ? mineShown.slice(0, MINE_PREVIEW) : mineShown;
  const grid = { display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(min(100%,300px),1fr))", gap: 14, marginTop: 14 } as const;
  const heading = (label: string, hint?: string) => (
    <div style={{ marginTop: 26 }}>
      <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 18 }}>{label}</div>
      {hint && <div style={{ fontSize: 13, color: MUTED, marginTop: 3, lineHeight: 1.45 }}>{hint}</div>}
    </div>
  );
  const emptyCard = (title: string, hint?: string) => (
    <div style={{ marginTop: 16, background: "#fff", border: `2.5px solid ${INK}`, borderRadius: 15, padding: "22px 20px" }}>
      <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 17 }}>{title}</div>
      {hint && <div style={{ color: SUBINK, marginTop: 6, lineHeight: 1.5, fontSize: 14 }}>{hint}</div>}
    </div>
  );

  return (
    <div style={{ marginTop: 26 }}>
      {/* ---- barre d'outils ---- */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <input
          value={search}
          onChange={(e) => runSearch(e.target.value)}
          placeholder={t("searchPlaceholder")}
          aria-label={t("searchPlaceholder")}
          style={{ flex: "1 1 240px", fontFamily: FONT_BODY, fontSize: 15, fontWeight: 600, padding: "11px 14px", border: `2.5px solid ${INK}`, borderRadius: 12, background: "#fff" }}
        />
        {/* Les facettes n'existent que pour le connecté : sans compte il n'y a ni
            cercle ni épingle, et trois boutons dont deux vides seraient un
            mensonge d'interface. */}
        {user && (
          <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
            {(["all", "circles", "pins"] as const).map((k) => (
              <button
                key={k}
                onClick={() => pickFacet(k)}
                aria-pressed={facet === k}
                style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 13.5, cursor: "pointer", border: `2.5px solid ${INK}`, background: facet === k ? INK : "#fff", color: facet === k ? "#fff" : INK, padding: "10px 15px", borderRadius: 11 }}
              >
                {k === "all" ? t("tabAll") : k === "circles" ? `👥 ${t("tabCircles")}` : `📌 ${t("tabPinned")}`}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ---- ce qui m'est adressé, EN TÊTE : personne d'autre ne le voit, et
           c'est la seule partie de cette page où il y a quelque chose à faire ---- */}
      {showMine && (
        <>
          {heading(t("sectionCircles"), t("sectionCirclesHint"))}
          {mineShown.length > 0 ? (
            <div style={grid}>{mineList.map(circleCard)}</div>
          ) : (
            emptyCard(t("circlesEmpty"), t("circlesEmptyHint"))
          )}
          {mineHidden > 0 && (
            <button
              onClick={() => pickFacet("circles")}
              style={{ marginTop: 12, fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 13.5, cursor: "pointer", border: `2px solid ${INK}`, background: "#fff", color: INK, padding: "9px 14px", borderRadius: 11 }}
            >
              {t("seeAllCircles", { count: mineHidden })}
            </button>
          )}
        </>
      )}

      {/* ---- le catalogue public ---- */}
      {showPublic && (
        <>
          {/* Le titre du catalogue ne sert qu'à le distinguer du bloc au-dessus :
              seul, il répéterait le h1 de la page. */}
          {showMine && heading(t("sectionPublic"))}
          {cards.length === 0 && !loading ? (
            q ? (
              <div style={{ marginTop: 16, background: "#fff", border: `2.5px solid ${INK}`, borderRadius: 15, padding: "22px 20px", color: SUBINK, lineHeight: 1.5 }}>
                {t("searchNoResults", { q: search })}
              </div>
            ) : facet === "pins" ? (
              // Rien d'épinglé NULLE PART : le message ne s'affiche qu'une fois,
              // sous les deux blocs, sinon il se répéterait à l'identique.
              mineShown.length === 0 ? emptyCard(t("pinnedEmpty"), t("pinnedEmptyHint")) : null
            ) : (
              emptyCard(t("empty"))
            )
          ) : (
            <div style={grid}>{cards.map(card)}</div>
          )}
          {!exhausted && cards.length > 0 && (
            <div style={{ marginTop: 22, textAlign: "center" }}>
              <button
                onClick={loadMore}
                disabled={loading}
                style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 14.5, cursor: "pointer", border: `2.5px solid ${INK}`, background: "#fff", color: INK, padding: "11px 20px", borderRadius: 12, opacity: loading ? 0.6 : 1 }}
              >
                {loading ? t("loading") : t("loadMore")}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
