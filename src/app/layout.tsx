import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Plus_Jakarta_Sans } from "next/font/google";
import InstallFab from "@/components/pwa/InstallFab";
import "./globals.css";

const display = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["500", "700", "800"],
  variable: "--font-display",
});

const body = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
});

export const metadata: Metadata = {
  // Indispensable : sans base absolue, l'image Open Graph est résolue sur
  // localhost en prod et WhatsApp/réseaux n'affichent pas l'aperçu.
  metadataBase: new URL("https://placet.app"),
  title: "Placet — Votez vraiment comme il faut",
  description:
    "Concevez votre mode de scrutin (majoritaire, deux tours, Condorcet, jugement majoritaire, grands électeurs…), comparez avantages et inconvénients, puis dépouillez pour de vrai.",
  openGraph: {
    type: "website",
    siteName: "Placet",
    locale: "fr_FR",
  },
};

export const viewport: Viewport = {
  themeColor: "#16213A",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className={`${display.variable} ${body.variable}`}>
        {children}
        <InstallFab />
      </body>
    </html>
  );
}
