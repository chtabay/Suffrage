"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { CREAM, INK } from "@/components/scrutin/theme";

// Libellés du sélecteur : code ISO par défaut (FR/EN/ES), nom lisible sinon.
const LABELS: Record<string, string> = { pcm: "Pidgin" };

/** Bascule de langue : conserve le chemin courant, change la locale. */
export default function LocaleSwitch() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  return (
    <div style={{ display: "inline-flex", border: `2px solid ${INK}`, borderRadius: 10, overflow: "hidden", flex: "none" }}>
      {routing.locales.map((l) => {
        const active = l === locale;
        return (
          <button
            key={l}
            onClick={() => router.replace(pathname, { locale: l })}
            aria-pressed={active}
            style={{
              fontWeight: 700,
              fontSize: 12.5,
              cursor: "pointer",
              border: "none",
              background: active ? INK : CREAM,
              color: active ? "#fff" : INK,
              padding: "8px 11px",
            }}
          >
            {LABELS[l] ?? l.toUpperCase()}
          </button>
        );
      })}
    </div>
  );
}
