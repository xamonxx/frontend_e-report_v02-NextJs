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
  output: 'standalone',
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: 'https://api-ereport.interiorcustom.id/api/v1/:path*',
      },
      {
        source: '/sanctum/:path*',
        destination: 'https://api-ereport.interiorcustom.id/sanctum/:path*',
      },
    ]
  },
};

export default withPWA(nextConfig);
