import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Include curs.html în bundle-ul rutei /admin/curs (citit cu fs la runtime pe Vercel).
  outputFileTracingIncludes: {
    "/admin/curs": ["./app/admin/curs/curs.html"],
  },
};

export default nextConfig;
