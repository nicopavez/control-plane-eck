import { fileURLToPath } from "url";
import path from "path";

const siteDir = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  images: {
    unoptimized: true,
  },
  // Pin the workspace root to this package: the monorepo's other packages
  // are still being scaffolded, so letting Next infer the root from a stray
  // lockfile elsewhere in the repo is unreliable.
  outputFileTracingRoot: siteDir,
};

export default nextConfig;
