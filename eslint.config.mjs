import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["src/domain/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "react",
                "react/**",
                "next",
                "next/**",
                "@/app/**",
                "@/components/**",
                "@/features/**",
                "@/server/**",
                "@/lib/**",
                "../app/**",
                "../components/**",
                "../features/**",
                "../server/**",
                "../lib/**",
              ],
              message:
                "Domain rules must remain independent of framework, UI, storage and server adapters.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/features/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "@/app/**/page",
                "@/app/**/layout",
                "@/app/**/route",
                "@/server/**",
                "@/lib/supabase/server",
              ],
              message:
                "Feature UI consumes typed transports or server actions, never route implementations or server repositories.",
            },
          ],
        },
      ],
    },
  },
  globalIgnores([
    "public/map-worker/**",
    ".tools/**",
    "test-results/**",
    "playwright-report/**",
    ".next/**",
    "coverage/**",
    "next-env.d.ts",
    "supabase/.temp/**",
  ]),
]);
