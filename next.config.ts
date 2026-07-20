import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  async redirects() {
    return [
      // The landing page advertises playsync.fun/live as the spectator URL;
      // query strings carry through, so /live?code=X joins a session directly.
      {
        source: "/live",
        destination: "/tournament",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
