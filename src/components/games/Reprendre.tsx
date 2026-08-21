"use client";

// REPRENDRE — ce qu'on a en cours sur CET appareil.
//
// LE PROBLÈME QU'IL RÈGLE. Les jeux se jouent sans compte : le siège vit dans
// le `localStorage`, sous `placet.game.<CODE>`. L'appareil sait donc très bien
// où l'on a joué — mais aucun écran ne le lui demandait, et sans le lien sous
// la main on ne retrouvait plus sa partie. Anodin pour une soirée d'Alibi qu'on
// joue d'un bloc ; bloquant pour une partie d'échecs qui dure des jours.
//
// ⚠️ CE N'EST PAS UN HISTORIQUE, ET IL NE FAUT PAS QUE ÇA LE DEVIENNE. On ne
// montre que ce qui est encore JOUABLE. Une liste de parties passées serait un
// nom qui persiste au-delà de la salle — exactement ce que la règle de
// modération du dépôt interdit (« on entre par code, la salle est jetable, tout
// s'efface en sept jours »). La purge fait le ménage : une salle disparue ne
// ressort pas de la base, et on oublie son siège en même temps.
//
// ⚠️ ET ON N'AFFICHE RIEN TANT QU'ON N'A PAS RÉPONDU. Un bloc « Reprendre »
// qui apparaît puis disparaît parce que la salle était purgée est pire que pas
// de bloc du tout.
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { gameBySlug, roomPath } from "@/lib/games/catalog";
import { mesParties, mesSieges, oublierSiege, type PartieEnCours } from "@/lib/games/room";
import type { GameSkin } from "@/lib/games/skin";

export default function Reprendre({ skin }: { skin: GameSkin }) {
  const t = useTranslations("Games");
  const [parties, setParties] = useState<PartieEnCours[] | null>(null);

  useEffect(() => {
    let mort = false;
    void (async () => {
      const sieges = mesSieges();
      if (!sieges.length) {
        if (!mort) setParties([]);
        return;
      }
      try {
        const vivantes = await mesParties(sieges);
        if (mort) return;
        // La purge a emporté les autres : on oublie leur siège pour ne pas
        // redemander à la base, à chaque visite, des salles qui n'existent plus.
        const restantes = new Set(vivantes.map((p) => p.code));
        for (const s of sieges) if (!restantes.has(s.code.toUpperCase())) oublierSiege(s.code);
        setParties(vivantes);
      } catch {
        // Hors ligne, ou base injoignable : on ne montre rien plutôt qu'une
        // liste dont on ne sait pas si elle est vraie.
        if (!mort) setParties([]);
      }
    })();
    return () => {
      mort = true;
    };
  }, []);

  if (!parties || !parties.length) return null;

  return (
    <section style={{ marginTop: 22 }}>
      <h2
        style={{
          fontFamily: skin.fontDisplay,
          fontWeight: 800,
          fontSize: 19,
          letterSpacing: "-0.01em",
          margin: "0 0 3px",
          color: skin.ink,
        }}
      >
        {t("reprendre.titre")}
      </h2>
      <p style={{ fontSize: 13, color: skin.muted, margin: "0 0 11px", lineHeight: 1.45 }}>
        {t("reprendre.aide")}
      </p>
      <div style={{ display: "grid", gap: 8 }}>
        {parties.map((p) => {
          // ⚠️ UN SLUG PEUT NE PLUS ÊTRE AU CATALOGUE. `unanimo` a été renommé
          // `banalo`, et la base accepte les DEUX valeurs le temps que la purge
          // emporte les anciennes salles. Une salle de l'ancien nom ne doit pas
          // faire tomber la liste : on la saute.
          const jeu = gameBySlug(p.game);
          if (!jeu) return null;
          return (
            <Link
              key={p.code}
              href={roomPath(p.game, p.code)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 11,
                padding: "11px 13px",
                border: `${skin.border}px solid ${skin.ink}`,
                borderRadius: skin.radius - 4,
                background: skin.paper,
                color: skin.ink,
                textDecoration: "none",
              }}
            >
              <span
                aria-hidden
                style={{
                  width: 38,
                  height: 38,
                  flex: "none",
                  display: "grid",
                  placeItems: "center",
                  fontSize: 20,
                  borderRadius: 11,
                  border: `2px solid ${skin.ink}`,
                  background: jeu.skin.accent2,
                }}
              >
                {jeu.emoji}
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: "block", fontFamily: skin.fontDisplay, fontWeight: 800, fontSize: 15.5 }}>
                  {t(`${jeu.slug}.name`)}
                </span>
                <span style={{ display: "block", fontSize: 12.5, color: skin.muted, fontWeight: 700 }}>
                  {/* Les clés sont écrites EN CLAIR, une par état : le contrôle
                      de parité ne voit pas une clé passée en variable, et un
                      état sans libellé s'afficherait « Games.reprendre.x ». */}
                  {p.status === "lobby"
                    ? t("reprendre.salon")
                    : p.status === "ended"
                      ? t("reprendre.finie")
                      : t("reprendre.enCours")}
                </span>
              </span>
              <span
                style={{
                  fontFamily: skin.fontDisplay,
                  fontWeight: 800,
                  fontSize: 15,
                  letterSpacing: "0.13em",
                  color: skin.muted,
                  flex: "none",
                }}
              >
                {p.code}
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
