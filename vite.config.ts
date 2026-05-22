import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@codemirror/language-data": new URL("./src/codemirrorLanguageDataShim.ts", import.meta.url).pathname
    }
  },
  build: {
    chunkSizeWarningLimit: 700
  },
  server: {
    host: "0.0.0.0",
    port: 8201,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8200",
        changeOrigin: true
      },
      "/data": {
        target: "http://127.0.0.1:8200",
        changeOrigin: true
      },
      "/.profiles": {
        target: "http://127.0.0.1:8200",
        changeOrigin: true
      }
    }
  }
});
