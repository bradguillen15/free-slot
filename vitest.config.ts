import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: [
      "src/**/*.{test,spec}.{ts,tsx}",
      "supabase/functions/_shared/**/*.test.ts",
    ],
    coverage: {
      provider: "v8",
      include: [
        "src/lib/**/*.ts",
        "src/components/dashboard/**/*.{ts,tsx}",
        "src/pages/DashboardPage/**/*.{ts,tsx}",
        "src/pages/WeekPage.tsx",
      ],
      // schedule.ts is data-only (preset constants, no logic).
      exclude: ["src/lib/schedule.ts", "**/*.{test,spec}.{ts,tsx}"],
      reporter: ["text", "html", "lcov"],
      thresholds: { lines: 85 },
    },
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
