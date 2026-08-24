import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Remove strict mode double-render in dev (reduces flicker / double fetch)
  reactStrictMode: false,

  // Enable modern compiler transforms
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },

  // Compress responses
  compress: true,

  // Images optimisation (pass-through for localhost backend URLs)
  images: {
    remotePatterns: [
      { protocol: "http", hostname: "localhost" },
      { protocol: "http", hostname: "127.0.0.1" },
    ],
  },

  // Suppress hydration warnings from browser extensions
  onDemandEntries: {
    // Keep page bundles in memory longer to avoid re-compiling on nav
    maxInactiveAge: 60 * 1000,
    pagesBufferLength: 10,
  },

  // Proxy storage assets and backend API requests to backend
  async rewrites() {
    return [
      {
        source: "/storage/:path*",
        destination: "http://127.0.0.1:8000/storage/:path*",
      },
      {
        source: "/api/:path*",
        destination: "http://127.0.0.1:8000/api/:path*",
      },
    ];
  },
};

export default nextConfig;


