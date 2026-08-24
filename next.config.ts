import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

// There is a stray package-lock.json on the drive root above this project, so
// Next infers the workspace root as that directory. Pin it here.
const nextConfig: NextConfig = {
  turbopack: {
    root: path.dirname(fileURLToPath(import.meta.url)),
  },
};

export default nextConfig;
