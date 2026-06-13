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
      "no-restricted-syntax": [
        "error",
        {
          selector: "ImportNamespaceSpecifier",
          message:
            "Use named imports instead of `import * as`. Import only the symbols you need (e.g. `import { forwardRef } from \"react\"`).",
        },
      ],
    },
  },
  {
    // Vendored shadcn/ui primitives intentionally co-export `cva` variants and hooks
    // (e.g. buttonVariants, useFormField), and AuthContext co-exports the `useAuth` hook
    // with its provider — both idiomatic patterns the Fast Refresh rule can't model.
    files: ["src/components/ui/**/*.{ts,tsx}", "src/contexts/**/*.{ts,tsx}"],
    rules: {
      "react-refresh/only-export-components": "off",
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
  {
    // Playwright E2E specs and fixtures run in Node, not the browser, and fixtures
    // export `test`/`expect` helpers that the Fast Refresh rule cannot model.
    files: ["e2e/**/*.ts"],
    languageOptions: {
      globals: globals.node,
    },
    rules: {
      "react-refresh/only-export-components": "off",
      // Playwright fixtures use a `use(value)` callback that is not a React hook.
      "react-hooks/rules-of-hooks": "off",
    },
  },
);
