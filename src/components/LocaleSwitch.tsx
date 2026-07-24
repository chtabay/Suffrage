"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { CREAM, INK } from "@/components/scrutin/theme";

// Libellés du sélecteur : code ISO par défaut (FR/EN/ES), nom lisible sinon.
const LABELS: Record<string, string> = { pcm: "Pidgin" };

/**
 * Bascule de langue COMPACTE : une seule pastille (locale courante) qui déplie
 * un petit menu. Quatre langues en rangée saturaient la Nav — le choix de langue
 * est un réglage occasionnel, pas une action de premier niveau.
 */
export default function LocaleSwitch() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Clic hors du menu → fermeture (comportement attendu d'un dropdown).
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  return (
    <div ref={ref} style={{ position: "relative", flex: "none" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="listbox"
        style={{
          fontWeight: 700,
          fontSize: 12.5,
          cursor: "pointer",
          border: `2px solid ${INK}`,
          borderRadius: 10,
          background: open ? INK : CREAM,
          color: open ? "#fff" : INK,
          padding: "8px 12px",
        }}
      >
        🌐 {LABELS[locale] ?? locale.toUpperCase()} ▾
      </button>
      {open && (
        <div
          role="listbox"
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            zIndex: 200,
            minWidth: 110,
            background: "#fff",
            border: `2px solid ${INK}`,
            borderRadius: 10,
            boxShadow: `3px 3px 0 ${INK}`,
            overflow: "hidden",
          }}
        >
          {routing.locales.map((l) => {
            const active = l === locale;
            return (
              <button
                key={l}
                role="option"
                aria-selected={active}
                onClick={() => {
                  setOpen(false);
                  router.replace(pathname, { locale: l });
                }}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: "pointer",
                  border: "none",
                  background: active ? INK : "#fff",
                  color: active ? "#fff" : INK,
                  padding: "9px 14px",
                }}
              >
                {LABELS[l] ?? l.toUpperCase()}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
