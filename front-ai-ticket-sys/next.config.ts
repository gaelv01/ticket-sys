import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.100.5"],
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
