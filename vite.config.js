import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

// Post-build plugin: inject Supabase credentials into dist/live.html.
// live.html is a standalone HTML page (no React bundle) that polls Supabase directly.
// It's copied from public/ to dist/ untouched by Vite, so we replace the placeholders here.
function injectLiveEnv(env) {
  return {
    name: "inject-live-env",
    apply: "build",
    closeBundle() {
      const distPath = join(process.cwd(), "dist", "live.html");
      const url = env.VITE_SUPABASE_URL || "";
      const key = env.VITE_SUPABASE_ANON_KEY || "";
      if (!url || !key) {
        console.warn("⚠️ live.html: VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY missing — viewer won't work!");
        console.warn("   Add these to your Vercel environment variables.");
      }
      try {
        let html = readFileSync(distPath, "utf-8");
        html = html
          .replace(/__SUPABASE_URL__/g, url)
          .replace(/__SUPABASE_KEY__/g, key);
        writeFileSync(distPath, html);
        console.log(`✓ live.html: Supabase credentials injected (URL=${url ? "set" : "EMPTY"}, KEY=${key ? "set" : "EMPTY"})`);
      } catch (e) {
        console.warn("⚠️ Could not inject live.html credentials:", e.message);
      }
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [react(), injectLiveEnv(env)],
  };
});
