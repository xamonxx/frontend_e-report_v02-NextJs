import { FlatCompat } from "@eslint/eslintrc";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { defineConfig, globalIgnores } from "eslint/config";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = defineConfig([
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "warn",
      "@typescript-eslint/no-unused-expressions": "warn",
      "@next/next/no-html-link-for-pages": "off",
      // Logo/avatar disajikan dari host API yang di-resolve saat runtime
      // (localhost / IP LAN / domain produksi), jadi next/image remotePatterns
      // tak bisa mencocokkan host yang berubah-ubah. <img> disengaja.
      "@next/next/no-img-element": "off",
    }
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "public/sw-*.js",
    "public/workbox-*.js",
    "public/worker-*.js",
  ]),
]);

export default eslintConfig;
