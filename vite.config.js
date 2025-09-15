import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    proxy: {
      // If your backend serves /api/* (e.g. http://localhost:4000/api/auth/me)
      "/api": {
        target: "http://localhost:4000",
        changeOrigin: true,
        secure: false,
        // DO NOT rewrite if your backend expects the /api prefix
        // rewrite: (p) => p, // (leave commented)
      },

      // If your backend serves at root (e.g. http://localhost:4000/auth/me),
      // then use this instead:
      // "/api": {
      //   target: "http://localhost:4000",
      //   changeOrigin: true,
      //   secure: false,
      //   rewrite: (p) => p.replace(/^\/api/, ""),
      // },
    },
  },
});
