import type { NextConfig } from "next";

const apiUrl = process.env.API_URL ?? "http://localhost:5000";

const nextConfig: NextConfig = {
  // school subdomains in development (abc.localhost:3000) load dev assets from the same server
  allowedDevOrigins: ["*.localhost"],

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },

  // Same-host API: the browser calls /api/v1 on the page's own host and Next
  // forwards it to Express with X-Forwarded-Host set to that host.
  async rewrites() {
    return [{ source: "/api/v1/:path*", destination: `${apiUrl}/api/v1/:path*` }];
  },
};

export default nextConfig;
