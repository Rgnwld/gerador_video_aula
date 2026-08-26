import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdf-parse"],
  // Sem isso, cada escrita no banco SQLite (prisma/dev.db) é detectada pelo
  // watcher do dev server e dispara um rebuild/fast-refresh desnecessário.
  webpack: (config) => {
    config.watchOptions = {
      ...config.watchOptions,
      ignored: ["**/node_modules/**", "**/.next/**", "**/prisma/dev.db*"],
    };
    return config;
  },
};

export default nextConfig;
