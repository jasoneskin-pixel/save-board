import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root to this project. Without this, Turbopack infers the
  // root from the nearest lockfile and picks up a stray package-lock.json in the
  // parent home directory, emitting a warning and resolving from the wrong root.
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
