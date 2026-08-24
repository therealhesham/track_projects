import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

// There is a stray package-lock.json on the drive root above this project, so
// Next infers the workspace root as that directory. Pin it here.
const nextConfig: NextConfig = {
  output: "standalone",
  turbopack: {
    root: path.dirname(fileURLToPath(import.meta.url)),
  },
};

// Server Actions reject a request whose Origin does not match the Host. Behind
// a reverse proxy the two differ and every action dies with "This page couldn't
// load", so the public domains have to be listed here. ALLOWED_ORIGINS is a
// comma-separated list baked in at build time — see the Dockerfile build arg.
const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

if (allowedOrigins.length > 0) {
  nextConfig.experimental = { serverActions: { allowedOrigins } };
}

export default nextConfig;
