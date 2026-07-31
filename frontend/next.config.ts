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
      { protocol: "http", hostname: "localhost", port: "8000" },
    ],
  },

  // Suppress hydration warnings from browser extensions
  onDemandEntries: {
    // Keep page bundles in memory longer to avoid re-compiling on nav
    maxInactiveAge: 60 * 1000,
    pagesBufferLength: 10,
  },
};

export default nextConfig;
