import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  server: {
    port: 5173,
    proxy: { "/api": { target: "http://localhost:4000", changeOrigin: true } },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id: string) => {
          if (/node_modules\/(react|react-dom|react-router|react-router-dom|scheduler)\//.test(id)) return "react";
          if (/node_modules\/(@tanstack|axios|zustand)\//.test(id)) return "query";
          return undefined;
        },
      },
    },
  },
});
