import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Samodzielny build pod Dockera / Coolify
  output: "standalone",
  // PGlite (lokalna baza do developmentu) i pg nie powinny być bundlowane
  serverExternalPackages: ["@electric-sql/pglite", "pg"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
