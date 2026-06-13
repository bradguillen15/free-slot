import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
  {
    files: ["src/pages/**/*.{ts,tsx}", "src/components/**/*.{ts,tsx}"],
    ignores: ["src/pages/Auth.tsx"],
    rules: {
      "no-restricted-imports": ["error", {
        paths: [{
          name: "@/integrations/supabase/client",
          message: "Use dataStore React Query hooks for reads and dataStore mutations for writes. Direct Supabase is reserved for lib/, AuthContext, and integrations/.",
        }],
      }],
    },
  },
  {
    files: [
      "src/pages/DashboardPage.tsx",
      "src/pages/DashboardPage/**/*.{ts,tsx}",
      "src/pages/SettingsPage.tsx",
      "src/pages/Onboarding.tsx",
      "src/components/OnboardingGate.tsx",
      "src/components/dashboard/WeeklyReviewModal.tsx",
      "src/components/dashboard/WeeklyReviewModal/**/*.{ts,tsx}",
      "src/components/week/AIPlanPanel.tsx",
      "src/components/activities/PriorityRanker.tsx",
      "src/components/activities/PriorityRanker/**/*.{ts,tsx}",
    ],
    rules: {
      "no-restricted-imports": "off",
    },
  },
  {
    // Test files legitimately import the Supabase client to mock and assert against it;
    // the "use dataStore in guest-capable views" guard only applies to production code.
    files: ["**/*.test.{ts,tsx}", "src/test/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": "off",
    },
  },
);
