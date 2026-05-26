import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    checkout: "src/checkout.ts",
  },
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
  splitting: false,
  minify: false,
  target: "es2021",
  outExtension({ format }) {
    return { js: format === "cjs" ? ".cjs" : ".js" };
  },
});
