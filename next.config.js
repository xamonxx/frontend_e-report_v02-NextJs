import path from "node:path";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    root: path.resolve("."),
  },
  allowedDevOrigins: ['192.168.1.22:3000', '192.168.1.22', '192.168.18.12:3000', '192.168.18.12'],
};

export default withPWA(nextConfig);
