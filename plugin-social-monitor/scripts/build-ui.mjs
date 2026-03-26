import esbuild from "esbuild";
import path from "node:path";
import { fileURLToPath } from "node:url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
await esbuild.build({
  entryPoints: [path.join(__dirname, "../src/ui/index.tsx")],
  outfile: path.join(__dirname, "../dist/ui/index.js"),
  bundle: true, format: "esm", platform: "browser", target: ["es2022"], sourcemap: true,
  external: ["react", "react-dom", "react/jsx-runtime", "@paperclipai/plugin-sdk/ui"],
  logLevel: "info",
});
