import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import { sentryVitePlugin } from "@sentry/vite-plugin";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";

const sentryAuthToken = process.env.SENTRY_AUTH_TOKEN;
const sentryOrg = process.env.SENTRY_ORG;
const sentryProject = process.env.SENTRY_PROJECT;
const sentryUploadConfigured = Boolean(
  sentryAuthToken && sentryOrg && sentryProject,
);
const sentryUploadPartiallyConfigured = Boolean(
  sentryAuthToken && (!sentryOrg || !sentryProject),
);

if (sentryUploadPartiallyConfigured) {
  console.warn(
    "[sentry] SENTRY_AUTH_TOKEN is set but SENTRY_ORG and/or SENTRY_PROJECT are missing; source map upload will be skipped.",
  );
}

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  // "hidden" emits source maps for Sentry upload without referencing them from
  // the served bundles, so end users never receive the original sources.
  build: {
    sourcemap: "hidden",
  },
  define: {
    "import.meta.env.VERCEL_ENV": JSON.stringify(process.env.VERCEL_ENV ?? ""),
  },
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "pwa-192x192.png", "pwa-512x512.png", "pwa-512x512-maskable.png"],
      manifest: {
        name: "FreeSlot",
        short_name: "FreeSlot",
        description: "FreeSlot maps your week, tracks your focus, and uses AI to plan time for the activities you actually care about.",
        theme_color: "#3399FF",
        background_color: "#0B0D12",
        start_url: "/app",
        scope: "/",
        display: "standalone",
        icons: [
          {
            src: "pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "pwa-512x512-maskable.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        navigateFallback: "/index.html",
        globPatterns: ["**/*.{css,html,ico,png,svg,woff2,webmanifest}"],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
      },
    }),
    ...(sentryUploadConfigured
      ? [
          sentryVitePlugin({
            org: sentryOrg,
            project: sentryProject,
            authToken: sentryAuthToken,
            sourcemaps: {
              // Remove emitted maps after upload so they are never served statically.
              filesToDeleteAfterUpload: ["./dist/**/*.map"],
            },
          }),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
  },
});
