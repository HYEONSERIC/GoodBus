import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // server/ is a separate Express + TypeScript project with its own
    // tsconfig (already excluded from the root tsconfig.json) — it isn't
    // part of the Next.js app this eslint-config-next setup targets.
    "server/**",
    // pm2 process config — plain CommonJS (.cjs) by design, not app code.
    "deploy/**",
  ]),
]);

export default eslintConfig;
