import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ignore lint & type errors
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
