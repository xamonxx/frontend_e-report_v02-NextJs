import withPWAInit, { runtimeCaching } from "@ducanh2912/next-pwa";

const isProduction = process.env.NODE_ENV === 'production'
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isProduction ? '' : " 'unsafe-eval'"}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: https:${isProduction ? '' : ' http:'}`,
  "font-src 'self' data:",
  `connect-src 'self' https: wss:${isProduction ? '' : ' http: ws:'}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
].join('; ')

const unsafeRuntimeCacheNames = new Set([
  "apis",
  "next-data",
  "pages",
  "pages-rsc",
  "pages-rsc-prefetch",
  "cross-origin",
]);

const staticAssetRuntimeCaching = runtimeCaching.filter(
  (entry) => !unsafeRuntimeCacheNames.has(entry.options?.cacheName)
);

const withPWA = withPWAInit({
  dest: "public",
  sw: "sw-v2.js",
  disable: process.env.NODE_ENV === "development",
  cacheStartUrl: false,
  dynamicStartUrl: false,
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
  // Tree-shake barrel-heavy paket icon/util: hanya modul yang benar dipakai
  // yang ikut ke bundle. Kena semua halaman, murah, tanpa ubah kode komponen.
  experimental: {
    optimizePackageImports: ['lucide-react', 'date-fns', 'recharts', 'framer-motion'],
  },
  async rewrites() {
    // Keep the upstream target server-only when same-origin API mode is on.
    const apiUrl = process.env.API_PROXY_TARGET || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
    return [
      {
        source: '/api/v1/:path*',
        destination: `${apiUrl}/api/v1/:path*`,
      },
      {
        source: '/sanctum/:path*',
        destination: `${apiUrl}/sanctum/:path*`,
      },
      {
        source: '/broadcasting/auth',
        destination: `${apiUrl}/broadcasting/auth`,
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
          // SECURITY FIX 2026-07-29: Add security headers
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000',
          },
          {
            key: 'Content-Security-Policy',
            value: contentSecurityPolicy,
          },
        ],
      },
    ]
  },
};

export default withPWA(nextConfig);
