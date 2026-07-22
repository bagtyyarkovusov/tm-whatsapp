import path from "path";

import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "react-native": path.resolve(__dirname, "src/test/react-native-stub.tsx"),
    },
  },
  test: {
    environment: "node",
    globals: true,
    include: [
      "src/**/*.{test,spec}.{ts,tsx}",
      "app/**/*.{test,spec}.{ts,tsx}",
      "components/**/*.{test,spec}.{ts,tsx}",
    ],
  },
  esbuild: {
    jsx: "automatic",
  },
});
