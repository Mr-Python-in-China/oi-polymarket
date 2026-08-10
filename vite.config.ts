import { unstable_reactRouterRSC as reactRouterRSC } from "@react-router/dev/vite";
import rsc from "@vitejs/plugin-rsc";
import { defineConfig } from "vite";
import { envOnlyMacros } from "vite-env-only";
import devtoolsJson from "vite-plugin-devtools-json";

export default defineConfig({
  plugins: [reactRouterRSC(), rsc(), devtoolsJson(), envOnlyMacros()],
  resolve: {
    tsconfigPaths: true,
  },
  server: {
    host: process.env.VITE_DEV_HOST || undefined,
    port: 12968,
  },
});
