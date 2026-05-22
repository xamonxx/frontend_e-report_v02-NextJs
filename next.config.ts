import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
  allowedDevOrigins: ['192.168.1.22:3000', '192.168.1.22', '192.168.18.12:3000', '192.168.18.12'],
};

export default nextConfig;
