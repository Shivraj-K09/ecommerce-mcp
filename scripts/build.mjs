import { build } from "esbuild";
import { chmodSync } from "node:fs";
import { resolve } from "node:path";

const outputFile = resolve("build/index.js");

await build({
  bundle: true,
  entryPoints: ["src/index.ts"],
  format: "cjs",
  outfile: outputFile,
  platform: "node",
  target: "node20",
  alias: {
    "@modelcontextprotocol/sdk/server/express": resolve(
      "node_modules/@modelcontextprotocol/sdk/dist/esm/server/express.js",
    ),
    "@modelcontextprotocol/sdk/server/streamableHttp": resolve(
      "node_modules/@modelcontextprotocol/sdk/dist/esm/server/streamableHttp.js",
    ),
  },
});

chmodSync(outputFile, 0o755);
