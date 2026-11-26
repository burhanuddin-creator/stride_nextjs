import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Site images are pre-built responsive WebP sets rendered through <picture> (src/components/ui/Photo.tsx,
      // scripts/build-image-imports.mjs); next/image would change the markup and loading behaviour of the design.
      "@next/next/no-img-element": "off",
      // Project convention (carried over from the Vite site): a leading underscore marks an intentionally unused value.
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", destructuredArrayIgnorePattern: "^_", ignoreRestSiblings: true },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Test output.
    "playwright-report/**",
    "test-results/**",
  ]),
]);

export default eslintConfig;
