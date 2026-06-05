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
};

export default nextConfig;
