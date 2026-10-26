import vinext from "vinext";
import { defineConfig } from "vite";

// Local bindings for development and tests. For a real deployment, create the
// D1 database with `wrangler d1 create demo-gym-pos` and add the identifier it
// prints to your own (untracked) Wrangler configuration.
const localBindingConfig = {
  main: "./worker/index.ts",
  compatibility_flags: ["nodejs_compat"],
  assets: {
    binding: "ASSETS",
    run_worker_first: true,
  },
  triggers: {
    // Minute 7 avoids the busiest top-of-hour window. The processor applies
    // each incident's configured reminder interval and local idempotency keys.
    crons: ["7 * * * *"],
  },
  d1_databases: [
    {
      binding: "DB",
      database_name: "demo-gym-pos",
    },
  ],
};

export default defineConfig(async () => {
  // Keep Wrangler and Miniflare state project-local. These are non-secret tool
  // settings; application environment belongs in ignored `.env*` files.
  process.env.WRANGLER_WRITE_LOGS ??= "false";
  process.env.WRANGLER_LOG_PATH ??= ".wrangler/logs";
  process.env.MINIFLARE_REGISTRY_PATH ??= ".wrangler/registry";

  // Wrangler snapshots its log path while the Cloudflare plugin is imported.
  const { cloudflare } = await import("@cloudflare/vite-plugin");

  return {
    plugins: [
      vinext(),
      cloudflare({
        viteEnvironment: { name: "rsc", childEnvironments: ["ssr"] },
        config: localBindingConfig,
      }),
    ],
  };
});
