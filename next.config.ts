import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  // VERIFY_DIST : construire ailleurs que dans .next, pour verifier un build
  // sans pietiner le serveur de dev d une autre session sur le meme dossier.
  ...(process.env.VERIFY_DIST ? { distDir: process.env.VERIFY_DIST } : {}),

  // UNANIMO EST DEVENU BANALO — et une salle de jeu se partage par son lien.
  //
  // ⚠️ LE CODE DE SALLE DOIT SURVIVRE À LA REDIRECTION. Quelqu'un a pu envoyer
  // « /games/unanimo/HJ4KMP » dans une conversation avant le renommage ; la
  // salle, elle, vit sept jours. Rediriger vers la seule racine du jeu ferait
  // atterrir ses invités sur un écran de création, sans un mot d'explication et
  // sans moyen de retrouver la partie. Le `:code` est donc repris tel quel.
  //
  // Et le préfixe de langue aussi : `/es/games/unanimo/…` doit rester espagnol.
  // Le français n'a pas de préfixe, d'où les deux règles par cas.
  async redirects() {
    return [
      { source: "/games/unanimo/:code", destination: "/games/banalo/:code", permanent: true },
      { source: "/games/unanimo", destination: "/games/banalo", permanent: true },
      { source: "/:locale(en|es|pcm)/games/unanimo/:code", destination: "/:locale/games/banalo/:code", permanent: true },
      { source: "/:locale(en|es|pcm)/games/unanimo", destination: "/:locale/games/banalo", permanent: true },
    ];
  },
};

const withNextIntl = createNextIntlPlugin();
export default withNextIntl(nextConfig);
