import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { Bricolage_Grotesque, Plus_Jakarta_Sans } from "next/font/google";
import InstallFab from "@/components/pwa/InstallFab";
import { routing } from "@/i18n/routing";
import "../globals.css";

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
  },
};

export const viewport: Viewport = {
  themeColor: "#16213A",
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: Readonly<{ children: React.ReactNode; params: Promise<{ locale: string }> }>) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const messages = await getMessages();
  return (
    <html lang={locale}>
      <body className={`${display.variable} ${body.variable}`}>
        <NextIntlClientProvider messages={messages}>
          {children}
          <InstallFab />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
