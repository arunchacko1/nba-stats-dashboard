import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root; an unrelated lockfile higher up the tree otherwise
  // makes Turbopack guess the wrong project directory.
  turbopack: {
    root: __dirname,
  },
  // The home page prerenders live standings from a full-season game sweep. Under
  // the balldontlie free tier's rate limit that sweep waits out a couple of
  // ~60s throttles (~2 min total), so lift the default 60s page-generation cap.
  staticPageGenerationTimeout: 300,
  // Player headshots are served by ESPN, keyed by the same athlete id as our data.
  images: {
    remotePatterns: [{ protocol: "https", hostname: "a.espncdn.com" }],
  },
};

export default nextConfig;
