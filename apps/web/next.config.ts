import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Permite importar el dominio TS crudo desde @platica/core sin pre-build.
  transpilePackages: ["@platica/core"],
};

export default nextConfig;
