import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    "bin/solana-deps": "bin/solana-deps.ts",
  },
  format: ["cjs", "esm"],
  dts: true,
  clean: true,
  shims: true,
});
