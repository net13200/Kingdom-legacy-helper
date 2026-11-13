import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";

// Files in public/ that the service worker should cache for offline use.
const PUBLIC_FILES = [
  "manifest.webmanifest",
  "splash.js",
  "icon.svg",
  "icon-192.png",
  "icon-512.png",
  "icon-maskable-512.png",
  "apple-touch-icon.png",
];

/**
 * Writes sw.js at build time with the full list of built files, so the
 * whole app is cached on first visit and works offline afterwards.
 */
function serviceWorker(): Plugin {
  return {
    name: "kingdom-ledger-sw",
    apply: "build",
    generateBundle(_options, bundle) {
      const files = ["./", ...PUBLIC_FILES.map((f) => "./" + f), ...Object.keys(bundle).map((f) => "./" + f)];
      // Any change to any built file gives the worker a new version, so phones pick up updates.
      const hash = createHash("sha256");
      for (const item of Object.values(bundle)) hash.update(item.type === "chunk" ? item.code : item.source);
      for (const f of PUBLIC_FILES) hash.update(readFileSync("public/" + f));
      const version = hash.digest("hex").slice(0, 12);
      const template = readFileSync("src/sw-template.js", "utf8");
      const source = template
        .replace("__VERSION__", JSON.stringify(version))
        .replace("__PRECACHE__", JSON.stringify(files, null, 2));
      this.emitFile({ type: "asset", fileName: "sw.js", source });
    },
  };
}

export default defineConfig({
  // Relative base: works on GitHub Pages project sites, Netlify and locally.
  base: "./",
  plugins: [react(), serviceWorker()],
});
