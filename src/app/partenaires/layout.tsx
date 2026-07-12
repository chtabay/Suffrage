import { Bricolage_Grotesque, Plus_Jakarta_Sans } from "next/font/google";
import "../globals.css";

// Root layout du segment /partenaires (hors [locale] : pages partenaires en
// français, servies aussi sous les sous-domaines partenaires via le middleware).
const display = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-display",
});

const body = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-body",
});

export default function PartnersLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className={`${display.variable} ${body.variable}`} style={{ margin: 0 }}>
        {children}
      </body>
    </html>
  );
}
