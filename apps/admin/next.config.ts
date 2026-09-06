import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Workspace packages ship TypeScript source; Next must transpile them.
  transpilePackages: ["@kse/types", "@kse/validation", "@kse/shared"],
};

export default nextConfig;
