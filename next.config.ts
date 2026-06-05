import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root; an unrelated lockfile higher up the tree otherwise
  // makes Turbopack guess the wrong project directory.
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
