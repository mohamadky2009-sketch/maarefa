import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

const apiPlugin = (): Plugin => ({
  name: "marifa-api",
  async configureServer(server) {
    const [{ default: express }, { createApiRouter }] = await Promise.all([
      import("express"),
      import("./api/router.js"),
    ]);
    const app = express();
    app.use("/api", createApiRouter());
    server.middlewares.use(app);
  },
});

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  base: '/',
  server: {
    host: "0.0.0.0",
    port: 5000,
    allowedHosts: true,
    hmr: { overlay: false },
    watch: {
      ignored: ['**/.bun/**', '**/.cache/**', '**/node_modules/.cache/**'],
    },
  },
  plugins: [
    react(),
    apiPlugin(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: [
      "react",
      "react-dom",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
      "@tanstack/react-query",
      "@tanstack/query-core",
    ],
  },
}));
