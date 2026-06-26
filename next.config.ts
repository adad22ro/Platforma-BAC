import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    middlewareRuntime: "nodejs",
  },
};

export default nextConfig;
