"use client";

// La vue marché — la grille interactive de /explorer.
// Spécification : docs/participant-spec.md §5 bis.
//
// Le serveur rend la grille initiale (les composants client sont AUSSI rendus en
// HTML côté serveur : le SEO ne perd rien) ; l'interactivité — recherche,
// épingles, pagination — prend le relais à l'hydratation, sans double-fetch.
//
// Ce qu'on n'affiche PAS, et c'est un choix de la spec : ni prix, ni volume, ni
// « tendance » — un scrutin n'a pas ce signal avant sa clôture, et la plupart
// sont secrets. Le signal honnête d'une carte est le temps qui reste et la
// participation.
import { useCallback, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useAuth } from "@/lib/auth/useAuth";
import {
  cardIntent,
  cardIsOpen,
  fetchMarket,
  getMyPins,
  togglePin,
  type CardIntent,
  type MyPin,
  type PublicPollCard,
} from "@/lib/db/publicFeed";
import { intlLocale } from "@/i18n/locales";
import { CORAL, FONT_BODY, FONT_DISPLAY, GREEN, GREENTXT, INK, MUTED, SUBINK } from "./theme";

const PAGE = 24;

export default function MarketExplorer({ initialCards }: { initialCards: PublicPollCard[] }) {
  const t = useTranslations("Explore");
  const th = useTranslations("Home");
  const locale = useLocale();
  const { user } = useAuth();
  const fmt = new Intl.DateTimeFormat(intlLocale(locale), { day: "numeric", month: "short", year: "numeric" });

  const [cards, setCards] = useState<PublicPollCard[]>(initialCards);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"all" | "pins">("all");
  const [pins, setPins] = useState<MyPin[] | null>(null);
  const [exhausted, setExhausted] = useState(initialCards.length < 12);
  const [loading, setLoading] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Recherche : 300 ms après la dernière frappe, EN BASE (jokers échappés côté
  // SQL). La grille initiale du serveur reste affichée tant qu'on n'a pas tapé.
  const runSearch = useCallback((q: string) => {
    setSearch(q);
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(async () => {
      setLoading(true);
      try {
        const rows = await fetchMarket({ limit: PAGE, search: q || null });
        setCards(rows);
        setExhausted(rows.length < PAGE);
      } catch {
        /* la grille précédente reste affichée */
      }
      setLoading(false);
    }, 300);
  }, []);

  const loadMore = async () => {
    const last = cards[cards.length - 1];
    if (!last || loading) return;
    setLoading(true);
    try {
      const rows = await fetchMarket({ limit: PAGE, search: search || null, before: last.published_at });
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

  const openPins = async () => {
    setTab("pins");
    try {
      setPins(await getMyPins());
    } catch {
      setPins([]);
    }
  };

  const onTogglePin = async (token: string) => {
    try {
      const pinned = await togglePin(token);
      setCards((l) => l.map((c) => (c.token === token ? { ...c, pinned } : c)));
      // L'onglet Épinglés se recharge à sa prochaine ouverture.
      setPins(null);
    } catch {
      /* l'état affiché reste celui du serveur */
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
  const intentBadge = (it: CardIntent) => (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: INTENTS[it].color, color: "#fff", border: `2px solid ${INK}`, borderRadius: 20, padding: "3px 10px", fontWeight: 700, fontSize: 11.5 }}>
      {INTENTS[it].icon} {th(INTENTS[it].labelKey)}
    </span>
  );

  const card = (p: PublicPollCard) => {
    const open = cardIsOpen(p);
    return (
      <div
        key={p.token}
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          gap: 10,
          background: "#fff",
          border: `2.5px solid ${INK}`,
          borderRadius: 15,
          padding: "15px 16px",
          boxShadow: `4px 4px 0 ${p.pinned ? CORAL : open ? GREEN : INK}`,
        }}
      >
        {/* L'épingle : réservée au connecté — un contrôle inopérant est pire
            qu'absent, l'anonyme garde la vitrine d'avant. 28×28 : cible conforme. */}
        {user && (
          <button
            onClick={() => onTogglePin(p.token)}
            aria-pressed={p.pinned}
            aria-label={p.pinned ? t("unpinAria", { question: p.question }) : t("pinAria", { question: p.question })}
            title={p.pinned ? t("unpin") : t("pin")}
            style={{ position: "absolute", top: 9, right: 9, width: 28, height: 28, display: "grid", placeItems: "center", border: `2px solid ${INK}`, borderRadius: 9, background: p.pinned ? CORAL : "#fff", color: p.pinned ? "#fff" : INK, cursor: "pointer", fontSize: 14, lineHeight: 1 }}
          >
            📌
          </button>
        )}
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
        {user && (
          <div style={{ display: "flex", gap: 7 }}>
            {(["all", "pins"] as const).map((k) => (
              <button
                key={k}
                onClick={() => (k === "pins" ? openPins() : setTab("all"))}
                aria-pressed={tab === k}
                style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 13.5, cursor: "pointer", border: `2.5px solid ${INK}`, background: tab === k ? INK : "#fff", color: tab === k ? "#fff" : INK, padding: "10px 15px", borderRadius: 11 }}
              >
                {k === "all" ? t("tabAll") : `📌 ${t("tabPinned")}`}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ---- onglet Épinglés : les DEUX sortes ---- */}
      {tab === "pins" ? (
        <div style={{ marginTop: 22 }}>
          {pins === null ? (
            <div style={{ color: MUTED }}>{t("loading")}</div>
          ) : pins.length === 0 ? (
            <div style={{ background: "#fff", border: `2.5px solid ${INK}`, borderRadius: 15, padding: "22px 20px" }}>
              <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 17 }}>{t("pinnedEmpty")}</div>
              <div style={{ color: SUBINK, marginTop: 6, lineHeight: 1.5, fontSize: 14 }}>{t("pinnedEmptyHint")}</div>
            </div>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {pins.map((pin) => (
                <a
                  key={`${pin.route}-${pin.url_token}`}
                  href={`/${pin.route}/${pin.url_token}`}
                  style={{ display: "flex", alignItems: "center", gap: 12, textDecoration: "none", color: INK, background: "#fff", border: `2.5px solid ${INK}`, borderRadius: 13, padding: "13px 15px" }}
                >
                  <span style={{ flex: 1 }}>
                    <span style={{ display: "block", fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 15.5 }}>
                      {pin.kind === "circle" ? pin.title : pin.question}
                    </span>
                    <span style={{ display: "block", fontSize: 12.5, color: MUTED, fontWeight: 600, marginTop: 3 }}>
                      {pin.kind === "circle" && pin.circle ? `${t("circleTag", { name: pin.circle })} · ` : ""}
                      {pin.status === "closed" ? t("closedBadge") : t("openBadge")}
                    </span>
                  </span>
                  <span aria-hidden style={{ fontWeight: 800, color: SUBINK }}>→</span>
                </a>
              ))}
            </div>
          )}
        </div>
      ) : (
        <>
          {/* ---- grille publique ---- */}
          {cards.length === 0 && !loading ? (
            <div style={{ marginTop: 22, background: "#fff", border: `2.5px solid ${INK}`, borderRadius: 15, padding: "22px 20px", color: SUBINK, lineHeight: 1.5 }}>
              {t("searchNoResults", { q: search })}
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(min(100%,300px),1fr))", gap: 14, marginTop: 22 }}>
              {cards.map(card)}
            </div>
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
