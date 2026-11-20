// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// Never set ssr.external or resolve.external: the Worker has no runtime module resolution, so
// the build fails. Never add compression (compressPublicAssets, vite-plugin-compression):
// hosting already compresses at the edge.
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import type { PluginOption } from "vite";
import { VitePWA } from "vite-plugin-pwa";

// Files from public/ are copied after the worker is generated, so list them by hand with a
// content hash: a changed icon is re-downloaded, an unchanged one is kept.
const PUBLIC_FILES = ["/manifest.webmanifest", "/favicon.ico", "/icon-192.png", "/icon-512.png", "/apple-touch-icon.png"];
const publicEntries = PUBLIC_FILES.map((url) => ({
  url,
  revision: createHash("md5").update(readFileSync(`public${url}`)).digest("hex"),
}));

// Offline mode: a generated service worker at /sw.js. It is registered only by src/lib/pwa.ts,
// which refuses dev, iframes and Lovable previews so the editor never serves stale pages.
const offline = VitePWA({
  strategies: "generateSW",
  registerType: "autoUpdate",
  injectRegister: null,
  filename: "sw.js",
  manifest: false, // public/manifest.webmanifest is the one source of truth
  devOptions: { enabled: false },
  integration: {
    // TanStack Start builds the browser files into their own folder; the worker and its
    // precache list must come from that folder, never from the server bundle.
    configureOptions(config, options) {
      const clientOutDir = config.environments?.["client"]?.build.outDir;
      if (clientOutDir) options.outDir = clientOutDir;
    },
  },
  workbox: {
    globPatterns: ["**/*.{js,css,woff2,png,svg,ico,webmanifest}"],
    globIgnores: ["**/sw.js", "**/workbox-*.js"],
    additionalManifestEntries: publicEntries,
    navigateFallback: null,
    cleanupOutdatedCaches: true,
    clientsClaim: true,
    skipWaiting: true,
    runtimeCaching: [
      {
        // Pages: always try the internet first, fall back to the last copy when offline.
        // src/lib/pwa.ts pre-fetches every screen with the x-kitanda-offline header.
        urlPattern: ({ request, url, sameOrigin }) =>
          sameOrigin &&
          !url.pathname.startsWith("/~oauth") &&
          !url.pathname.startsWith("/api/") &&
          (request.mode === "navigate" || request.headers.get("x-kitanda-offline") === "1"),
        handler: "NetworkFirst",
        options: {
          cacheName: "kitanda-pages",
          networkTimeoutSeconds: 5,
          matchOptions: { ignoreVary: true, ignoreSearch: true },
          cacheableResponse: { statuses: [200] },
          expiration: { maxEntries: 40 },
        },
      },
      {
        // Uploaded photos live under content-addressed paths, so a cached copy never goes stale.
        urlPattern: ({ url, sameOrigin }) => sameOrigin && url.pathname.startsWith("/__l5e/assets-v1/"),
        handler: "CacheFirst",
        options: {
          cacheName: "kitanda-photos",
          cacheableResponse: { statuses: [200] },
          expiration: { maxEntries: 60 },
        },
      },
      {
        urlPattern: ({ url }) => url.origin === "https://fonts.googleapis.com" || url.origin === "https://fonts.gstatic.com",
        handler: "StaleWhileRevalidate",
        options: {
          cacheName: "kitanda-fonts",
          cacheableResponse: { statuses: [0, 200] },
          expiration: { maxEntries: 20 },
        },
      },
    ],
  },
});

// Only the browser build gets a service worker.
const clientOnly = (plugins: PluginOption[]): PluginOption[] =>
  plugins.map((p) =>
    p && typeof p === "object" && "name" in p ? { ...p, applyToEnvironment: (env: { name: string }) => env.name === "client" } : p,
  );

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  plugins: clientOnly(offline),
});
