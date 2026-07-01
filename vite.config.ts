import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import { sentryVitePlugin } from "@sentry/vite-plugin";
import path from "path";

const sentryAuthToken = process.env.SENTRY_AUTH_TOKEN;

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
  plugins: [
    react(),
    // Only upload source maps when a build token is present (CI/Vercel); local
    // builds without the token still succeed and simply skip the upload.
    ...(sentryAuthToken
      ? [
          sentryVitePlugin({
            org: process.env.SENTRY_ORG,
            project: process.env.SENTRY_PROJECT,
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
