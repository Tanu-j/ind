import type { NextConfig } from "next";

const indexNowKey = process.env.INDEXNOW_KEY;

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/dashboard/admin/platform-keys",
        destination: "/dashboard/platform-keys",
        permanent: false,
      },
    ];
  },
  async rewrites() {
    if (!indexNowKey) return [];
    return [
      {
        source: `/${indexNowKey}.txt`,
        destination: "/api/indexnow/key",
      },
    ];
  },
};

export default nextConfig;
