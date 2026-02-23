import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@shared": path.resolve(__dirname, "../packages/shared/src"),
    },
  },
  server: {
    port: 5234,
    proxy: {
      "/api": {
        target: "http://localhost:3150",
        changeOrigin: true,
        timeout: 120000,
      },
    },
  },
});
