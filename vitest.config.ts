import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    setupFiles: ["./tests/setup.ts"],
    testTimeout: 20_000,
    hookTimeout: 30_000,
    pool: "forks",
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
    server: {
      deps: {
        external: ["typeorm", "@node-rs/argon2", "pg", "reflect-metadata"],
        inline: [/@react-pdf/, "fontkit", "unicode-properties", "pdfkit"],
      },
    },
  },
  resolve: {
    conditions: ["node", "require", "default"],
    dedupe: ["graphql"],
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  esbuild: {
    target: "es2022",
  },
});
