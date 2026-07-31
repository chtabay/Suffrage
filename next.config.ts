import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  // VERIFY_DIST : construire ailleurs que dans .next, pour verifier un build
  // sans pietiner le serveur de dev d une autre session sur le meme dossier.
  ...(process.env.VERIFY_DIST ? { distDir: process.env.VERIFY_DIST } : {}),
};

const withNextIntl = createNextIntlPlugin();
export default withNextIntl(nextConfig);
