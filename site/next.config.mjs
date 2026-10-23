import { fileURLToPath } from "url";
import path from "path";

const siteDir = path.dirname(fileURLToPath(import.meta.url));

// Set when deploying under a subpath, e.g. GitHub Pages at /control-plane-eck.
const basePath = process.env.PAGES_BASE_PATH ?? "";

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  images: {
    unoptimized: true,
  },
  basePath,
  assetPrefix: basePath || undefined,
  // Pin the workspace root to this package: the monorepo's other packages
  // live outside it, so letting Next infer the root from a stray lockfile
  // elsewhere in the repo is unreliable.
  outputFileTracingRoot: siteDir,
};

export default nextConfig;
