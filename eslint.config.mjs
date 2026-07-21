// @ts-check
import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import prettier from "eslint-config-prettier";

export default tseslint.config(
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.turbo/**",
      "**/.expo/**",
      "**/coverage/**",
      "vendor/**",
      ".sandcastle/**",
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,
  {
    // CommonJS tool configs (Babel/Metro/Tailwind in the Expo app).
    files: ["**/*.config.js", "**/*.config.cjs"],
    rules: {
      "no-undef": "off",
      "@typescript-eslint/no-require-imports": "off",
    },
  },
);
