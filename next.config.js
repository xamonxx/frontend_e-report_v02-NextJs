import withPWAInit, { runtimeCaching } from "@ducanh2912/next-pwa";

const unsafeRuntimeCacheNames = new Set([
  "apis",
  "next-data",
  "pages",
  "pages-rsc",
  "pages-rsc-prefetch",
]);

const staticAssetRuntimeCaching = runtimeCaching.filter(
  (entry) => !unsafeRuntimeCacheNames.has(entry.options?.cacheName)
);

const withPWA = withPWAInit({
  dest: "public",
  sw: "sw-v2.js",
  disable: process.env.NODE_ENV === "development",
  cacheStartUrl: false,
  cacheOnFrontEndNav: false,
  aggressiveFrontEndNavCaching: false,
  reloadOnOnline: true,
  workboxOptions: {
    runtimeCaching: staticAssetRuntimeCaching,
  },
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  // NOTE: 'output: standalone' sengaja TIDAK dipakai. Hostinger Web Apps
  // menjalankan `next start` dengan build .next standar, jadi default Next
  // paling kompatibel. (standalone hanya perlu untuk Docker / `node server.js`.)
  allowedDevOrigins: ['100.105.166.15'],
  async rewrites() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
    return [
      {
        source: '/api/v1/:path*',
        destination: `${apiUrl}/api/v1/:path*`,
      },
      {
        source: '/sanctum/:path*',
        destination: `${apiUrl}/sanctum/:path*`,
      },
    ]
  },
  async headers() {
    return [
      {
        source: '/sw-v2.js',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
        ],
      },
      {
        // Everything except /_next/* (hashed, immutable assets keep their own
        // long cache). HTML document routes must be revalidated so a new deploy
        // is never served as stale HTML that points at chunk files the new build
        // already deleted (ChunkLoadError / 404 / "Application error").
        source: '/((?!_next/).*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
        ],
      },
    ]
  },
};

export default withPWA(nextConfig);
