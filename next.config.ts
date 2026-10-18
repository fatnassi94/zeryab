import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Saving a song to the club library sends its MusicXML through a Server Action.
    serverActions: { bodySizeLimit: "4mb" },
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  images: {
    remotePatterns: [{ protocol: "https", hostname: "dwmboexuyjdahprjavxo.supabase.co" }],
  },
};

export default nextConfig;
