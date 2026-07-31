"use client";

// La page personnelle du membre : ses consultations, et le départ en un clic.
// C'est la contrepartie concrète du lien d'adhésion — on ne demande une adresse
// que si on donne, avec, une adresse pour partir.
import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { getMemberHome, leaveCircle, type MemberHome as Home } from "@/lib/db/circles";
import { CircleShell } from "./CircleJoinForm";
import { FONT_DISPLAY, GREEN, INK, MUTED, REDTXT, SUBINK } from "./theme";

const card = {
  background: "#fff",
  border: `2.5px solid ${INK}`,
  borderRadius: 18,
  padding: "22px 24px",
  boxShadow: `5px 5px 0 ${INK}`,
} as const;

export default function MemberHome({ token }: { token: string }) {
  const t = useTranslations("Circle");
  const locale = useLocale();
  const params = useSearchParams();
  const [home, setHome] = useState<Home | null>(null);
  // `?quitter=1` (pied des emails) ouvre directement la confirmation de départ,
  // sans jamais partir tout seul : un lien visité par un antivirus ne doit pas
  // désinscrire quelqu'un.
  const [confirmLeave, setConfirmLeave] = useState(params.get("quitter") === "1");
  const [left, setLeft] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setHome(await getMemberHome(token));
    } catch {
      setHome({ status: "invalid" });
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const doLeave = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const r = await leaveCircle(token);
      if (r.status === "ok") setLeft(true);
    } catch {
      /* on retombe sur l'écran courant */
    }
    setBusy(false);
  };

  if (!home) return <CircleShell><div style={{ ...card, color: MUTED }}>{t("loading")}</div></CircleShell>;

  if (left)
    return (
      <CircleShell>
        <div style={card}>
          <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 22 }}>{t("leftTitle")}</div>
          <div style={{ color: SUBINK, marginTop: 8, lineHeight: 1.55 }}>{t("leftDesc")}</div>
          {home.chat_url && (
            <div style={{ color: SUBINK, marginTop: 10, fontSize: 13.5, lineHeight: 1.5 }}>{t("leaveChatWarning")}</div>
          )}
        </div>
      </CircleShell>
    );

  if (home.status !== "ok")
    return (
      <CircleShell>
        <div style={card}>
          <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 22 }}>{t("invalidTitle")}</div>
          <div style={{ color: SUBINK, marginTop: 8, lineHeight: 1.55 }}>{t("memberInvalidDesc")}</div>
        </div>
      </CircleShell>
    );

  const open = (home.consultations ?? []).filter((c) => c.status === "open");
  const past = (home.consultations ?? []).filter((c) => c.status === "closed");
  const base = locale === "fr" ? "" : `/${locale}`;

  return (
    <CircleShell>
      <div style={card}>
        <div style={{ fontWeight: 700, color: SUBINK, fontSize: 14 }}>{home.circle}</div>
        <h1 style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 25, letterSpacing: "-0.02em", margin: "4px 0 0" }}>
          {t("memberHi", { name: home.name ?? "" })}
        </h1>
        {home.solicit_per_day != null && (
          <p style={{ color: MUTED, marginTop: 7, fontSize: 13, lineHeight: 1.5 }}>
            {t("promisePace", { n: home.solicit_per_day })}
          </p>
        )}
        {/* Ce que le cercle sait de vous, et depuis quand. Un membre importé n'a
            rien demandé : on le lui dit franchement plutôt que de le laisser
            deviner pourquoi il reçoit ces emails. */}
        {/* Ses segments. Même principe que la date de consentement : ce qui décide
            de ce qu'il reçoit doit lui être lisible, pas deviné. */}
        {(home.segments ?? []).length > 0 && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
            {(home.segments ?? []).map((name) => (
              <span key={name} style={{ fontSize: 12, fontWeight: 800, color: INK, border: `1.5px solid ${INK}`, borderRadius: 8, padding: "2px 8px" }}>
                {name}
              </span>
            ))}
          </div>
        )}
        {home.consent_at && (
          <p style={{ color: MUTED, marginTop: 6, fontSize: 12.5, lineHeight: 1.5 }}>
            {home.self_joined
              ? t("memberSince", { date: new Date(home.consent_at).toLocaleDateString(locale) })
              : t("memberAdded", { date: new Date(home.consent_at).toLocaleDateString(locale) })}
          </p>
        )}
      </div>

      {/* ---- La conversation de groupe ----
          Facultative, et jamais présentée comme un prolongement automatique de
          l'adhésion : y entrer expose SON NUMÉRO à tous les autres membres, ce
          qui est l'inverse de ce qu'on lui promet sur l'email. On l'écrit sous le
          bouton, il décide. */}
      {home.chat_url && (
        <div style={{ ...card, marginTop: 16 }}>
          <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 17 }}>{t("chatTitle")}</div>
          <div style={{ color: SUBINK, marginTop: 7, fontSize: 14, lineHeight: 1.5 }}>{t("chatDesc")}</div>
          <a
            href={home.chat_url}
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: "inline-flex", alignItems: "center", gap: 9, marginTop: 13, textDecoration: "none", fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 15, border: `2.5px solid ${INK}`, background: "#25D366", color: "#fff", padding: "11px 18px", borderRadius: 11 }}
          >
            💬 {t("chatCta")}
          </a>
          <div style={{ fontSize: 12.5, color: MUTED, marginTop: 10, lineHeight: 1.5 }}>{t("chatPhoneWarning")}</div>
        </div>
      )}

      {open.length > 0 && (
        <div style={{ ...card, marginTop: 16 }}>
          <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 17 }}>{t("openConsultations")}</div>
          <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
            {open.map((c) => (
              <a
                key={c.token}
                href={`${base}/e/${c.token}`}
                style={{ display: "block", textDecoration: "none", color: INK, border: `2px solid ${INK}`, borderRadius: 12, padding: "12px 14px" }}
              >
                <div style={{ fontWeight: 800, fontSize: 15 }}>{c.title}</div>
                <div style={{ fontSize: 12.5, color: c.voted ? GREEN : MUTED, fontWeight: 700, marginTop: 3 }}>
                  {c.voted ? t("alreadyVoted") : t("toVote")}
                  {c.secret_ballot ? ` · ${t("sealedTag")}` : ` · ${t("namedTag")}`}
                  {c.audience ? ` · ${t("audienceTag", { audience: c.audience })}` : ""}
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      {past.length > 0 && (
        <div style={{ ...card, marginTop: 16 }}>
          <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 17 }}>{t("pastConsultations")}</div>
          <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
            {past.map((c) => (
              <a
                key={c.token}
                href={`${base}/e/${c.token}`}
                style={{ display: "block", textDecoration: "none", color: INK, border: `2px solid #e3e3e3`, borderRadius: 12, padding: "12px 14px" }}
              >
                <div style={{ fontWeight: 800, fontSize: 15 }}>{c.title}</div>
                <div style={{ fontSize: 12.5, color: MUTED, fontWeight: 700, marginTop: 3 }}>
                  {t("seeResults")}
                  {c.audience ? ` · ${t("audienceTag", { audience: c.audience })}` : ""}
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      {open.length === 0 && past.length === 0 && (
        <div style={{ ...card, marginTop: 16, color: SUBINK, lineHeight: 1.55 }}>{t("noConsultations")}</div>
      )}

      {/* ---- Le départ. Toujours visible, jamais enterré. ---- */}
      <div style={{ ...card, marginTop: 16 }}>
        {!confirmLeave ? (
          <button
            onClick={() => setConfirmLeave(true)}
            style={{ background: "none", border: "none", padding: 0, cursor: "pointer", fontFamily: "inherit", fontSize: 13.5, fontWeight: 700, color: REDTXT, textDecoration: "underline" }}
          >
            {t("leaveCta")}
          </button>
        ) : (
          <>
            <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 17 }}>{t("leaveConfirmTitle")}</div>
            <div style={{ color: SUBINK, marginTop: 7, fontSize: 14, lineHeight: 1.5 }}>{t("leaveConfirmDesc")}</div>
            {/* Placet n'a aucune prise sur WhatsApp : sans cette phrase, « je pars
                en un clic » deviendrait faux pour qui a rejoint le groupe. */}
            {home.chat_url && (
              <div style={{ color: REDTXT, marginTop: 8, fontSize: 13.5, fontWeight: 700, lineHeight: 1.5 }}>
                {t("leaveChatWarning")}
              </div>
            )}
            <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
              <button
                onClick={doLeave}
                disabled={busy}
                style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 15, cursor: "pointer", border: `2.5px solid ${INK}`, background: REDTXT, color: "#fff", padding: "11px 18px", borderRadius: 11 }}
              >
                {busy ? t("submitting") : t("leaveConfirmCta")}
              </button>
              <button
                onClick={() => setConfirmLeave(false)}
                style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 15, cursor: "pointer", border: `2.5px solid ${INK}`, background: "#fff", color: INK, padding: "11px 18px", borderRadius: 11 }}
              >
                {t("cancel")}
              </button>
            </div>
          </>
        )}
      </div>
    </CircleShell>
  );
}
