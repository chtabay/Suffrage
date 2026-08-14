"use client";

// LA PRISE DE VUE — dans la page, jamais dans l'appareil photo du téléphone.
//
// ⚠️ POURQUOI `getUserMedia` ET PAS `<input capture>`, ET C'EST VÉRIFIÉ SUR
// SOURCES. Avec le sélecteur de fichier, sur iOS la photo n'entre pas dans la
// pellicule — mais sur Android c'est INDÉMONTRABLE : Chromium garde un JPEG en
// clair jusqu'à une heure dans son stockage privé, et surtout l'application
// photo du constructeur peut écrire SA propre copie dans la galerie (cas
// documenté, jamais résolu). Au gîte, onze téléphones font plusieurs marques.
//
// Ici, l'application photo n'est JAMAIS lancée : le flux vient de la page, la
// vue est dessinée dans un canvas, et `toBlob` produit une image neuve. Aucun
// fichier n'est créé nulle part, et il n'y a jamais eu d'EXIF — la source est
// une image vidéo, pas un JPEG d'appareil. La promesse « la photo ne quitte pas
// ton téléphone » devient une propriété de l'architecture, pas une observation.
//
// ⚠️ LE FLUX S'OUVRE À LA PRISE ET SE FERME AUSSITÔT. Un flux laissé ouvert
// deux heures sur douze téléphones qui se verrouillent et changent d'écran est
// une source de bugs continue, et vide les batteries.
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { FANTOME_SKIN } from "@/lib/games/skin";
import { GBtn } from "@/components/games/ui";

const skin = FANTOME_SKIN;

export default function FantomeCamera({
  label,
  onShot,
  onClose,
}: {
  label: string;
  onShot: (blob: Blob) => Promise<void> | void;
  onClose: () => void;
}) {
  const t = useTranslations("Fantome");
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [denied, setDenied] = useState(false);
  const [shot, setShot] = useState<{ url: string; blob: Blob } | null>(null);
  const [busy, setBusy] = useState(false);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((tr) => tr.stop());
    streamRef.current = null;
  }, []);

  const start = useCallback(async () => {
    setDenied(false);
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 } },
        audio: false,
      });
      streamRef.current = s;
      if (videoRef.current) {
        videoRef.current.srcObject = s;
        await videoRef.current.play().catch(() => {});
      }
    } catch {
      // Refus, absence de caméra, ou contexte non sécurisé : la consigne se
      // passe, et ça ne coûte AUCUN point.
      setDenied(true);
    }
  }, []);

  useEffect(() => {
    void start();
    return stop;
  }, [start, stop]);

  const take = () => {
    const v = videoRef.current;
    if (!v || busy) return;
    setBusy(true);
    const c = document.createElement("canvas");
    // On borne le grand côté : douze photos pleine résolution saturent le
    // quota d'un vieux téléphone, et l'album se regarde à bout de bras.
    const max = 1280;
    const scale = Math.min(1, max / Math.max(v.videoWidth || max, v.videoHeight || max));
    c.width = Math.round((v.videoWidth || max) * scale);
    c.height = Math.round((v.videoHeight || max) * scale);
    c.getContext("2d")?.drawImage(v, 0, 0, c.width, c.height);
    c.toBlob(
      (b) => {
        setBusy(false);
        if (!b) return;
        stop();
        setShot({ url: URL.createObjectURL(b), blob: b });
      },
      "image/jpeg",
      0.82,
    );
  };

  const retake = () => {
    if (shot) URL.revokeObjectURL(shot.url);
    setShot(null);
    void start();
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 90,
        background: skin.ink,
        display: "grid",
        gridTemplateRows: "auto 1fr auto",
        gap: 10,
        padding: 14,
      }}
    >
      <div style={{ color: skin.paper, textAlign: "center" }}>
        <div style={{ fontFamily: skin.fontDisplay, fontWeight: 800, fontSize: 17, lineHeight: 1.3 }}>{label}</div>
        <div style={{ fontSize: 12.5, color: "#BFB4C9", marginTop: 5, lineHeight: 1.45 }}>{t("photo.where")}</div>
      </div>

      <div style={{ position: "relative", overflow: "hidden", borderRadius: skin.radius, background: "#000" }}>
        {shot ? (
          // `next/image` optimise des images SERVIES ; celle-ci est un blob local
          // qui ne quitte jamais l'appareil et sera effacé dans la minute. Le passer
          // par un optimiseur n'aurait aucun sens, et le ferait transiter là où tout
          // ce chantier s'applique à ce qu'il ne transite pas.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={shot.url} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
        ) : (
          <video
            ref={videoRef}
            playsInline
            muted
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        )}
        {denied ? (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "grid",
              placeItems: "center",
              padding: 20,
              color: skin.paper,
              fontSize: 14.5,
              textAlign: "center",
              lineHeight: 1.5,
            }}
          >
            {t("photo.denied")}
          </div>
        ) : null}
      </div>

      <div style={{ display: "grid", gap: 8 }}>
        {shot ? (
          <>
            <GBtn skin={skin} size="lg" full disabled={busy} onClick={() => void onShot(shot.blob)}>
              {t("photo.keep")}
            </GBtn>
            <GBtn skin={skin} variant="ghost" full onClick={retake}>
              {t("photo.retake")}
            </GBtn>
          </>
        ) : (
          <GBtn skin={skin} size="lg" full disabled={denied || busy} onClick={take}>
            📷 {t("photo.cta")}
          </GBtn>
        )}
        <button
          type="button"
          onClick={() => {
            stop();
            onClose();
          }}
          style={{
            border: "none",
            background: "transparent",
            color: "#BFB4C9",
            fontSize: 13.5,
            fontWeight: 700,
            padding: "10px 0",
            cursor: "pointer",
            textDecoration: "underline",
          }}
        >
          {t("photo.skip")}
        </button>
      </div>
    </div>
  );
}
