import { unstable_reactRouterRSC as reactRouterRSC } from "@react-router/dev/vite";
import rsc from "@vitejs/plugin-rsc";
import { defineConfig } from "vite";
import devtoolsJson from "vite-plugin-devtools-json";

export default defineConfig({
  plugins: [reactRouterRSC(), rsc(), devtoolsJson()],
  resolve: {
    tsconfigPaths: true,
  },
  server: {
    port: 12968,
  },
});
